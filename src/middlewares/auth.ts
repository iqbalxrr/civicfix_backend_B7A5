import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  departmentId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized. Bearer token required");
    }

    const token = header.split(" ")[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, deletedAt: null, isActive: true },
      select: { id: true, email: true, role: true, departmentId: true },
    });

    if (!user) {
      throw new ApiError(401, "Unauthorized. User not found or inactive");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, "Unauthorized. Invalid or expired token"));
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden. Insufficient role permissions"));
    }
    return next();
  };
