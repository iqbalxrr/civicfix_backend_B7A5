import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(500).optional(),
  slaHours: z.coerce.number().int().min(1).max(720).default(72),
  departmentId: z.string().min(1),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  slaHours: z.coerce.number().int().min(1).max(720).optional(),
  departmentId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
