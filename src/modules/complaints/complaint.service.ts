import {
  ComplaintStatus,
  type Priority,
  type Prisma,
  type Role,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { createAuditLog } from "../../utils/audit";
import { assertStatusTransition, generateTrackingId } from "../../utils/complaintHelpers";
import { buildMeta } from "../../utils/pagination";

type AuthUser = {
  id: string;
  role: Role;
  departmentId: string | null;
};

const complaintInclude = {
  category: { select: { id: true, name: true, slug: true, slaHours: true } },
  department: { select: { id: true, name: true, code: true } },
  citizen: { select: { id: true, name: true, email: true, phone: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  attachments: true,
  feedback: true,
  payments: {
    select: {
      id: true,
      amount: true,
      status: true,
      merchantInvoiceNumber: true,
      trxId: true,
      paidAt: true,
    },
  },
} satisfies Prisma.ComplaintInclude;

export const createComplaint = async (
  citizenId: string,
  input: {
    title: string;
    description: string;
    categoryId: string;
    location: string;
    latitude?: number;
    longitude?: number;
    priority: Priority;
    attachmentUrls?: string[];
  },
) => {
  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, deletedAt: null, isActive: true },
  });
  if (!category) throw new ApiError(404, "Category not found");

  const slaDueAt = new Date();
  const hours = input.priority === "PRIORITY" ? Math.max(12, Math.floor(category.slaHours / 2)) : category.slaHours;
  slaDueAt.setHours(slaDueAt.getHours() + hours);

  const complaint = await prisma.$transaction(async (tx) => {
    const created = await tx.complaint.create({
      data: {
        trackingId: generateTrackingId(),
        title: input.title,
        description: input.description,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        priority: input.priority,
        categoryId: category.id,
        departmentId: category.departmentId,
        citizenId,
        slaDueAt,
        status: ComplaintStatus.SUBMITTED,
        attachments: input.attachmentUrls?.length
          ? {
              create: input.attachmentUrls.map((url) => ({ url })),
            }
          : undefined,
      },
      include: complaintInclude,
    });

    await tx.complaintUpdate.create({
      data: {
        complaintId: created.id,
        actorId: citizenId,
        fromStatus: null,
        toStatus: ComplaintStatus.SUBMITTED,
        note: "Complaint submitted",
      },
    });

    return created;
  });

  await createAuditLog({
    actorId: citizenId,
    action: "COMPLAINT_CREATED",
    entityType: "Complaint",
    entityId: complaint.id,
    metadata: { trackingId: complaint.trackingId, priority: complaint.priority },
  });

  return complaint;
};

export const listComplaints = async (
  user: AuthUser,
  query: {
    page: number;
    limit: number;
    status?: ComplaintStatus;
    priority?: Priority;
    departmentId?: string;
    categoryId?: string;
    search?: string;
    sortBy?: "createdAt" | "updatedAt" | "slaDueAt" | "priority";
    sortOrder?: "asc" | "desc";
  },
) => {
  const where: Prisma.ComplaintWhereInput = { deletedAt: null };

  if (user.role === "CITIZEN") {
    where.citizenId = user.id;
  } else if (user.role === "STAFF") {
    where.departmentId = user.departmentId ?? undefined;
    if (!user.departmentId) {
      throw new ApiError(400, "Staff account is not assigned to a department");
    }
  }

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.departmentId && user.role === "ADMIN") where.departmentId = query.departmentId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { trackingId: { contains: query.search, mode: "insensitive" } },
      { location: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder ?? "desc";
  const skip = (query.page - 1) * query.limit;

  const [total, items] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: complaintInclude,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: query.limit,
    }),
  ]);

  return { items, meta: buildMeta(total, query.page, query.limit) };
};

export const getComplaintById = async (id: string, user: AuthUser) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...complaintInclude,
      updates: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (user.role === "CITIZEN" && complaint.citizenId !== user.id) {
    throw new ApiError(403, "You can only view your own complaints");
  }
  if (user.role === "STAFF" && complaint.departmentId !== user.departmentId) {
    throw new ApiError(403, "Complaint belongs to another department");
  }

  return complaint;
};

export const updateComplaint = async (
  id: string,
  user: AuthUser,
  data: {
    title?: string;
    description?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  },
) => {
  const complaint = await prisma.complaint.findFirst({ where: { id, deletedAt: null } });
  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (user.role === "CITIZEN") {
    if (complaint.citizenId !== user.id) throw new ApiError(403, "Forbidden");
    const editable: ComplaintStatus[] = [ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW];
    if (!editable.includes(complaint.status)) {
      throw new ApiError(400, "Complaint can only be edited before assignment");
    }
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data,
    include: complaintInclude,
  });

  await createAuditLog({
    actorId: user.id,
    action: "COMPLAINT_UPDATED",
    entityType: "Complaint",
    entityId: id,
    metadata: data,
  });

  return updated;
};

export const softDeleteComplaint = async (id: string, user: AuthUser) => {
  const complaint = await prisma.complaint.findFirst({ where: { id, deletedAt: null } });
  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (user.role === "CITIZEN") {
    if (complaint.citizenId !== user.id) throw new ApiError(403, "Forbidden");
    if (complaint.status !== ComplaintStatus.SUBMITTED) {
      throw new ApiError(400, "Only submitted complaints can be deleted by citizens");
    }
  } else if (user.role !== "ADMIN") {
    throw new ApiError(403, "Only admin or owner can soft-delete complaints");
  }

  const deleted = await prisma.complaint.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true, trackingId: true, deletedAt: true },
  });

  await createAuditLog({
    actorId: user.id,
    action: "COMPLAINT_SOFT_DELETED",
    entityType: "Complaint",
    entityId: id,
  });

  return deleted;
};

export const assignComplaint = async (
  id: string,
  actor: AuthUser,
  staffId: string,
  note?: string,
) => {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findFirst({ where: { id, deletedAt: null } });
    if (!complaint) throw new ApiError(404, "Complaint not found");

    if (actor.role === "STAFF" && complaint.departmentId !== actor.departmentId) {
      throw new ApiError(403, "Cannot assign complaints outside your department");
    }

    if (complaint.priority === "PRIORITY") {
      const paid = await tx.payment.findFirst({
        where: { complaintId: id, status: "COMPLETED" },
      });
      if (!paid) {
        throw new ApiError(402, "Priority complaint requires completed payment before assignment");
      }
    }

    const staff = await tx.user.findFirst({
      where: {
        id: staffId,
        role: "STAFF",
        deletedAt: null,
        isActive: true,
        departmentId: complaint.departmentId,
      },
    });
    if (!staff) {
      throw new ApiError(400, "Staff not found in this complaint's department");
    }

    if (complaint.assignedToId && complaint.assignedToId !== staffId) {
      // allow reassignment but prevent race: check status
    }

    const fromStatus = complaint.status;
    const toStatus =
      fromStatus === ComplaintStatus.SUBMITTED || fromStatus === ComplaintStatus.UNDER_REVIEW
        ? ComplaintStatus.ASSIGNED
        : fromStatus === ComplaintStatus.ASSIGNED || fromStatus === ComplaintStatus.IN_PROGRESS
          ? ComplaintStatus.ASSIGNED
          : null;

    if (!toStatus) {
      throw new ApiError(400, `Cannot assign complaint in status ${fromStatus}`);
    }

    if (fromStatus !== toStatus) {
      assertStatusTransition(fromStatus, toStatus);
    }

    const updated = await tx.complaint.update({
      where: { id },
      data: {
        assignedToId: staffId,
        status: toStatus,
      },
      include: complaintInclude,
    });

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        fromStatus,
        toStatus,
        note: note || `Assigned to ${staff.name}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "COMPLAINT_ASSIGNED",
        entityType: "Complaint",
        entityId: id,
        metadata: { staffId, fromStatus, toStatus },
      },
    });

    return updated;
  });
};

export const updateComplaintStatus = async (
  id: string,
  actor: AuthUser,
  status: ComplaintStatus,
  note?: string,
  rejectionReason?: string,
) => {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findFirst({ where: { id, deletedAt: null } });
    if (!complaint) throw new ApiError(404, "Complaint not found");

    if (actor.role === "STAFF") {
      if (complaint.departmentId !== actor.departmentId) {
        throw new ApiError(403, "Cannot update complaints outside your department");
      }
      if (complaint.assignedToId && complaint.assignedToId !== actor.id && actor.role === "STAFF") {
        // staff can update if same department even if not assigned - optional strictness:
        // require assignment for IN_PROGRESS/RESOLVED
        const needsAssignee: ComplaintStatus[] = [
          ComplaintStatus.IN_PROGRESS,
          ComplaintStatus.RESOLVED,
        ];
        if (needsAssignee.includes(status) && complaint.assignedToId !== actor.id) {
          throw new ApiError(403, "Only assigned staff can mark in-progress or resolved");
        }
      }
    }

    if (actor.role === "CITIZEN") {
      throw new ApiError(403, "Citizens cannot change status directly. Use cancel endpoint.");
    }

    assertStatusTransition(complaint.status, status);

    if (status === ComplaintStatus.REJECTED && !rejectionReason && !note) {
      throw new ApiError(400, "Rejection reason is required");
    }

    const updated = await tx.complaint.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === ComplaintStatus.REJECTED ? rejectionReason || note : complaint.rejectionReason,
        resolvedAt: status === ComplaintStatus.RESOLVED ? new Date() : complaint.resolvedAt,
      },
      include: complaintInclude,
    });

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        fromStatus: complaint.status,
        toStatus: status,
        note: note || rejectionReason || `Status changed to ${status}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "COMPLAINT_STATUS_UPDATED",
        entityType: "Complaint",
        entityId: id,
        metadata: { from: complaint.status, to: status },
      },
    });

    return updated;
  });
};

export const cancelComplaint = async (id: string, user: AuthUser, note?: string) => {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findFirst({ where: { id, deletedAt: null } });
    if (!complaint) throw new ApiError(404, "Complaint not found");

    if (user.role === "CITIZEN" && complaint.citizenId !== user.id) {
      throw new ApiError(403, "Forbidden");
    }

    assertStatusTransition(complaint.status, ComplaintStatus.CANCELLED);

    const updated = await tx.complaint.update({
      where: { id },
      data: { status: ComplaintStatus.CANCELLED },
      include: complaintInclude,
    });

    await tx.complaintUpdate.create({
      data: {
        complaintId: id,
        actorId: user.id,
        fromStatus: complaint.status,
        toStatus: ComplaintStatus.CANCELLED,
        note: note || "Complaint cancelled",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "COMPLAINT_CANCELLED",
        entityType: "Complaint",
        entityId: id,
      },
    });

    return updated;
  });
};

export const getMyAssigned = async (staffId: string, page: number, limit: number) => {
  const where: Prisma.ComplaintWhereInput = {
    deletedAt: null,
    assignedToId: staffId,
  };
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: complaintInclude,
      orderBy: [{ priority: "desc" }, { slaDueAt: "asc" }],
      skip,
      take: limit,
    }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

export const submitFeedback = async (
  complaintId: string,
  citizenId: string,
  rating: number,
  comment?: string,
) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
  });
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (complaint.citizenId !== citizenId) throw new ApiError(403, "Forbidden");
  const feedbackAllowed: ComplaintStatus[] = [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED];
  if (!feedbackAllowed.includes(complaint.status)) {
    throw new ApiError(400, "Feedback allowed only after resolution");
  }

  const existing = await prisma.feedback.findUnique({ where: { complaintId } });
  if (existing) throw new ApiError(409, "Feedback already submitted");

  const feedback = await prisma.$transaction(async (tx) => {
    const created = await tx.feedback.create({
      data: { complaintId, citizenId, rating, comment },
    });

    if (complaint.status === ComplaintStatus.RESOLVED) {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { status: ComplaintStatus.CLOSED },
      });
      await tx.complaintUpdate.create({
        data: {
          complaintId,
          actorId: citizenId,
          fromStatus: ComplaintStatus.RESOLVED,
          toStatus: ComplaintStatus.CLOSED,
          note: "Closed after citizen feedback",
        },
      });
    }

    return created;
  });

  await createAuditLog({
    actorId: citizenId,
    action: "FEEDBACK_SUBMITTED",
    entityType: "Feedback",
    entityId: feedback.id,
    metadata: { complaintId, rating },
  });

  return feedback;
};
