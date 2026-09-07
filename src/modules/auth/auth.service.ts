import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { Role } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { createAuditLog } from "../../utils/audit";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

const sanitizeUser = (user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  address: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  createdAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  address: user.address,
  avatarUrl: user.avatarUrl,
  departmentId: user.departmentId,
  createdAt: user.createdAt,
});

const issueTokens = async (user: {
  id: string;
  email: string;
  role: Role;
}) => {
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing && !existing.deletedAt) {
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      phone: input.phone,
      address: input.address,
      role: Role.CITIZEN,
    },
  });

  await createAuditLog({
    actorId: user.id,
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: user.id,
  });

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  if (!user || !user.passwordHash) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
};

export const googleLogin = async (idToken: string) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "Google OAuth is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new ApiError(401, "Invalid Google token");
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
      deletedAt: null,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split("@")[0],
        googleId: payload.sub,
        avatarUrl: payload.picture,
        role: Role.CITIZEN,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_REGISTERED_GOOGLE",
      entityType: "User",
      entityId: user.id,
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: payload.sub,
        avatarUrl: user.avatarUrl || payload.picture,
      },
    });
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
};

export const refreshTokens = async (refreshToken: string) => {
  let payload: { userId: string; email: string; role: Role };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      token: refreshToken,
      userId: payload.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) {
    throw new ApiError(401, "Refresh token revoked or expired");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, deletedAt: null, isActive: true },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
};

export const logoutUser = async (refreshToken: string) => {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { loggedOut: true };
};
