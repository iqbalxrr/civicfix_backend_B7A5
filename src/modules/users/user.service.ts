import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      address: true,
      avatarUrl: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const updateMe = async (
  userId: string,
  data: { name?: string; phone?: string; address?: string; avatarUrl?: string },
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      address: true,
      avatarUrl: true,
      departmentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};
