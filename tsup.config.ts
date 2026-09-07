import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  target: "node18",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  // Keep Prisma external so it can load its query engine binaries correctly
  external: ["@prisma/client", ".prisma/client"],
  noExternal: [
    "express",
    "cors",
    "helmet",
    "express-rate-limit",
    "bcryptjs",
    "jsonwebtoken",
    "zod",
    "dotenv",
    "axios",
    "ioredis",
    "cloudinary",
    "google-auth-library",
    "multer",
  ],
});
