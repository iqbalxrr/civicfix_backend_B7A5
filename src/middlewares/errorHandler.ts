import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { sendError } from "../utils/ApiResponse";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, "Route not found"));
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      "Validation failed",
      400,
      err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return sendError(res, "Duplicate value violates unique constraint", 409, [
        { fields: err.meta?.target },
      ]);
    }
    if (err.code === "P2025") {
      return sendError(res, "Record not found", 404);
    }
  }

  if (env.NODE_ENV === "development") {
    console.error(err);
  }

  const message = err instanceof Error ? err.message : "Something went wrong";
  return sendError(res, message, 500);
};
