import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  address: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional(),
});
