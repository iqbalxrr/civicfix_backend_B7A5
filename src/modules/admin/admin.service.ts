import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { createAuditLog } from "../../utils/audit";
import { buildMeta } from "../../utils/pagination";

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
  departmentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listUsers = async (page: number, limit: number, role?: Role, search?: string) => {
  const where = {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
};

export const updateUserRole = async (
  targetUserId: string,
  actorId: string,
  data: { role: Role; departmentId?: string | null; isActive?: boolean },
) => {
  const user = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
  if (!user) throw new ApiError(404, "User not found");

  if (data.role === Role.STAFF && !data.departmentId && !user.departmentId) {
    throw new ApiError(400, "STAFF users must belong to a department");
  }

  if (data.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: data.departmentId, deletedAt: null },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      role: data.role,
      departmentId:
        data.role === Role.CITIZEN
          ? null
          : data.departmentId === undefined
            ? user.departmentId
            : data.departmentId,
      isActive: data.isActive,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      isActive: true,
    },
  });

  await createAuditLog({
    actorId,
    action: "USER_ROLE_UPDATED",
    entityType: "User",
    entityId: targetUserId,
    metadata: data,
  });

  return updated;
};

export const getDashboardStats = async () => {
  const now = new Date();
  const [
    totalUsers,
    totalComplaints,
    openComplaints,
    resolvedComplaints,
    priorityComplaints,
    breachedSla,
    paymentsCompleted,
    feedbackAvg,
    byStatus,
    byDepartment,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.complaint.count({ where: { deletedAt: null } }),
    prisma.complaint.count({
      where: {
        deletedAt: null,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"] },
      },
    }),
    prisma.complaint.count({
      where: { deletedAt: null, status: { in: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.complaint.count({ where: { deletedAt: null, priority: "PRIORITY" } }),
    prisma.complaint.count({
      where: {
        deletedAt: null,
        slaDueAt: { lt: now },
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"] },
      },
    }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.complaint.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by: ["departmentId"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  return {
    totalUsers,
    totalComplaints,
    openComplaints,
    resolvedComplaints,
    priorityComplaints,
    breachedSla,
    paymentsCompleted,
    averageRating: feedbackAvg._avg.rating,
    feedbackCount: feedbackAvg._count,
    byStatus,
    byDepartment,
  };
};

export const listAuditLogs = async (page: number, limit: number, entityType?: string) => {
  const where = entityType ? { entityType } : {};
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};
