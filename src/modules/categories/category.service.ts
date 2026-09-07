import { prisma } from "../../config/prisma";
import { cacheDel, cacheGet, cacheSet } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";
import { createAuditLog } from "../../utils/audit";

const CACHE_KEY = "categories:list";

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const createCategory = async (
  data: {
    name: string;
    slug?: string;
    description?: string;
    slaHours: number;
    departmentId: string;
  },
  actorId: string,
) => {
  const department = await prisma.department.findFirst({
    where: { id: data.departmentId, deletedAt: null },
  });
  if (!department) throw new ApiError(404, "Department not found");

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug || toSlug(data.name),
      description: data.description,
      slaHours: data.slaHours,
      departmentId: data.departmentId,
    },
  });

  await cacheDel(CACHE_KEY);
  await createAuditLog({
    actorId,
    action: "CATEGORY_CREATED",
    entityType: "Category",
    entityId: category.id,
  });
  return category;
};

export const listCategories = async (departmentId?: string) => {
  const key = departmentId ? `${CACHE_KEY}:${departmentId}` : CACHE_KEY;
  const cached = await cacheGet<unknown[]>(key);
  if (cached) return cached;

  const categories = await prisma.category.findMany({
    where: {
      deletedAt: null,
      ...(departmentId ? { departmentId } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      slaHours: true,
      isActive: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });

  await cacheSet(key, categories, 120);
  return categories;
};

export const getCategoryById = async (id: string) => {
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
    include: { department: { select: { id: true, name: true, code: true } } },
  });
  if (!category) throw new ApiError(404, "Category not found");
  return category;
};

export const updateCategory = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    slaHours?: number;
    departmentId?: string;
    isActive?: boolean;
  },
  actorId: string,
) => {
  const existing = await prisma.category.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Category not found");

  if (data.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, deletedAt: null },
    });
    if (!department) throw new ApiError(404, "Department not found");
  }

  const category = await prisma.category.update({ where: { id }, data });
  await cacheDel(CACHE_KEY);
  await createAuditLog({
    actorId,
    action: "CATEGORY_UPDATED",
    entityType: "Category",
    entityId: id,
    metadata: data,
  });
  return category;
};


export const softDeleteCategory = async (id: string, actorId: string) => {
  const existing = await prisma.category.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Category not found");

  const category = await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await cacheDel(CACHE_KEY);
  await createAuditLog({
    actorId,
    action: "CATEGORY_SOFT_DELETED",
    entityType: "Category",
    entityId: id,
  });
  return category;
};
