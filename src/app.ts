import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { setupSwagger } from "./docs/swagger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import departmentRoutes from "./modules/departments/department.routes";
import categoryRoutes from "./modules/categories/category.routes";
import complaintRoutes from "./modules/complaints/complaint.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import adminRoutes from "./modules/admin/admin.routes";
import statsRoutes from "./modules/stats/stats.routes";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
      errors: [],
    },
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CivicFix API is healthy",
    data: { service: "civicfix-api", env: env.NODE_ENV },
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to CivicFix - City Complaint & Service Platform API",
    data: {
      version: "v1",
      docs: "/api-docs",
      openapi: "/api-docs.json",
      health: "/health",
    },
  });
});

setupSwagger(app);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/complaints", complaintRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/stats", statsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
