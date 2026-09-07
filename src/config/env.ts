import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const vercelFallbackUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  BASE_URL: z.preprocess(
    (v) => (typeof v === "string" && v.length > 0 ? v : vercelFallbackUrl),
    z.string().url(),
  ),
  CLIENT_URL: z.preprocess(
    (v) =>
      typeof v === "string" && v.length > 0
        ? v
        : vercelFallbackUrl || "http://localhost:3000",
    z.string().url(),
  ),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BKASH_USERNAME: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BKASH_PASSWORD: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BKASH_APP_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BKASH_APP_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BKASH_BASE_URL: z
    .string()
    .default("https://tokenized.sandbox.bka.sh/v1.2.0-beta"),
  REDIS_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  CLOUDINARY_CLOUD_NAME: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  CLOUDINARY_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  CLOUDINARY_API_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  PRIORITY_FEE_BDT: z.coerce.number().default(50),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
