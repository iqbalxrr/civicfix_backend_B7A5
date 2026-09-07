import { z } from "zod";

export const initiatePaymentSchema = z.object({
  complaintId: z.string().min(1),
});
