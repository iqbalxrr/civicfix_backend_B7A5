import { prisma } from "../../config/prisma";
import { cacheDel, cacheGet, cacheSet } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";
import { createAuditLog } from "../../utils/audit";

const CACHE_KEY = "departments:list";

export const createDepartment = async (
  data: { name: string; code: string; description?: string },
  actorId: string,
) => {
  const department = await prisma.department.create({ data });
  await cacheDel(CACHE_KEY);
  await createAuditLog({
    actorId,
    action: "DEPARTMENT_CREATED",
    entityType: "Department",
    entityId: department.id,
    metadata: { name: department.name, code: department.code },
  });
  return department;
};

export const listDepartments = async () => {
  const cached = await cacheGet<unknown[]>(CACHE_KEY);
  if (cached) return cached;

  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { categories: true, staff: true, complaints: true } },
    },
  });

  await cacheSet(CACHE_KEY, departments, 120);
  return departments;
};

export const getDepartmentById = async (id: string) => {
  const department = await prisma.department.findFirst({
    where: { id, deletedAt: null },
    include: {
      categories: { where: { deletedAt: null }, select: { id: true, name: true, slug: true, slaHours: true } },
      staff: {
        where: { deletedAt: null, role: "STAFF" },
        select: { id: true, name: true, email: true },
      },
    },
  });
  if (!department) throw new ApiError(404, "Department not found");
  return department;
};

export const updateDepartment = async (
  id: string,
  data: { name?: string; description?: string; isActive?: boolean },
  actorId: string,
) => {
  const existing = await prisma.department.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Department not found");

  const department = await prisma.department.update({ where: { id }, data });
  await cacheDel(CACHE_KEY);
  await createAuditLog({
    actorId,
    action: "DEPARTMENT_UPDATED",
    entityType: "Department",
    entityId: id,
    metadata: data,
  });
  return department;
};


export const softDeleteDepartment = async (id: string, actorId: string) => {
  const existing = await prisma.department.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Department not found");

  const department = await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await cacheDel(CACHE_KEY);
  await createAuditLog({
    actorId,
    action: "DEPARTMENT_SOFT_DELETED",
    entityType: "Department",
    entityId: id,
  });
  return department;
};
