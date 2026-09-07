import type { OpenAPIV3 } from "openapi-types";
import { env } from "../config/env";

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "CivicFix API",
    version: "1.0.0",
    description:
      "City Complaint & Service Platform backend. Roles: CITIZEN, STAFF, ADMIN. Use Authorize with Bearer JWT after login.",
  },
  servers: [
    {
      url: env.BASE_URL,
      description: "Current environment",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "Users" },
    { name: "Departments" },
    { name: "Categories" },
    { name: "Complaints" },
    { name: "Payments" },
    { name: "Admin" },
    { name: "Stats" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Stats"],
        summary: "Health check",
        responses: {
          "200": { description: "API is healthy" },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register citizen",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Karim Citizen" },
                  email: { type: "string", example: "new.citizen@example.com" },
                  password: { type: "string", example: "Citizen@12345" },
                  phone: { type: "string", example: "01711112222" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registered" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login (email/password)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "admin@civicfix.com" },
                  password: { type: "string", example: "Admin@12345" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful — copy accessToken for Authorize" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Google OAuth (GCP idToken)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["idToken"],
                properties: {
                  idToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Google login successful" },
        },
      },
    },
    "/api/v1/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Token refreshed" } },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (revoke refresh token)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Logged out" } },
      },
    },
    "/api/v1/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get my profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Profile" }, "401": { description: "Unauthorized" } },
      },
      patch: {
        tags: ["Users"],
        summary: "Update my profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  address: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
    },
    "/api/v1/departments": {
      get: {
        tags: ["Departments"],
        summary: "List departments",
        responses: { "200": { description: "Departments list" } },
      },
      post: {
        tags: ["Departments"],
        summary: "Create department (ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "code"],
                properties: {
                  name: { type: "string", example: "Parks & Recreation" },
                  code: { type: "string", example: "PRK" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/v1/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories",
        parameters: [
          {
            name: "departmentId",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Categories list" } },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category (ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "departmentId", "slaHours"],
                properties: {
                  name: { type: "string" },
                  departmentId: { type: "string" },
                  slaHours: { type: "integer", example: 48 },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/complaints": {
      get: {
        tags: ["Complaints"],
        summary: "List complaints (pagination/filter/search)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } },
          { name: "status", in: "query", schema: { type: "string", example: "SUBMITTED" } },
          { name: "priority", in: "query", schema: { type: "string", example: "PRIORITY" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", example: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", example: "desc" } },
        ],
        responses: { "200": { description: "Complaints list" } },
      },
      post: {
        tags: ["Complaints"],
        summary: "Create complaint (CITIZEN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "categoryId", "location"],
                properties: {
                  title: { type: "string", example: "Broken sidewalk near market" },
                  description: {
                    type: "string",
                    example: "The sidewalk is broken and dangerous for pedestrians especially at night.",
                  },
                  categoryId: { type: "string" },
                  location: { type: "string", example: "New Market, Dhaka" },
                  priority: { type: "string", enum: ["STANDARD", "PRIORITY"], example: "STANDARD" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Complaint created" } },
      },
    },
    "/api/v1/complaints/my-assigned": {
      get: {
        tags: ["Complaints"],
        summary: "My assigned complaints (STAFF)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Assigned list" } },
      },
    },
    "/api/v1/complaints/{id}": {
      get: {
        tags: ["Complaints"],
        summary: "Get complaint by id",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Complaint details" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["Complaints"],
        summary: "Update complaint",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  location: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Complaints"],
        summary: "Soft delete complaint",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Soft deleted" } },
      },
    },
    "/api/v1/complaints/{id}/assign": {
      post: {
        tags: ["Complaints"],
        summary: "Assign staff (STAFF/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["staffId"],
                properties: {
                  staffId: { type: "string" },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Assigned" } },
      },
    },
    "/api/v1/complaints/{id}/status": {
      patch: {
        tags: ["Complaints"],
        summary: "Update complaint status (STAFF/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    example: "UNDER_REVIEW",
                    enum: [
                      "SUBMITTED",
                      "UNDER_REVIEW",
                      "ASSIGNED",
                      "IN_PROGRESS",
                      "RESOLVED",
                      "CLOSED",
                      "REJECTED",
                      "CANCELLED",
                    ],
                  },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Status updated" } },
      },
    },
    "/api/v1/complaints/{id}/feedback": {
      post: {
        tags: ["Complaints"],
        summary: "Submit feedback (CITIZEN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                  comment: { type: "string", example: "Resolved quickly" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Feedback submitted" } },
      },
    },
    "/api/v1/payments/initiate": {
      post: {
        tags: ["Payments"],
        summary: "Initiate bKash payment for PRIORITY complaint",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["complaintId"],
                properties: {
                  complaintId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Returns bkashURL for payment" },
        },
      },
    },
    "/api/v1/payments/{id}": {
      get: {
        tags: ["Payments"],
        summary: "Get payment status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Payment details" } },
      },
    },
    "/api/v1/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users (ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } },
        ],
        responses: {
          "200": { description: "Users" },
          "403": { description: "Forbidden for non-admin" },
        },
      },
    },
    "/api/v1/admin/dashboard-stats": {
      get: {
        tags: ["Admin"],
        summary: "Dashboard stats (ADMIN)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Stats" } },
      },
    },
    "/api/v1/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "Audit logs (ADMIN)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Audit logs" } },
      },
    },
    "/api/v1/stats/public": {
      get: {
        tags: ["Stats"],
        summary: "Public city stats (cached)",
        responses: { "200": { description: "Public stats" } },
      },
    },
  },
};
