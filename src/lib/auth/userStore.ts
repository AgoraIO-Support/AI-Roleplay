import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { isDatabaseConfigured, prisma } from "@/src/lib/db/prisma";
import type { AppRole } from "@/lib/types";

export type SafeAuthUser = {
  id: string;
  email: string;
  name: string;
  position?: string;
  role: AppRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
  position?: string | null;
  role: AppRole | string;
  isActive?: boolean | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

function requireDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is required. User accounts are loaded only from AppUser records.");
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPasswordHash(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toIsoString(value: string | Date | undefined) {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : value.toISOString();
}

function isAppRole(value: unknown): value is AppRole {
  return value === "root_admin" || value === "course_admin" || value === "trainee";
}

function toSafeUser(user: AuthUserRecord): SafeAuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    position: user.position ?? undefined,
    role: isAppRole(user.role) ? user.role : "trainee",
    isActive: user.isActive !== false,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}

export async function listAuthUsers() {
  requireDatabase();
  const users = await prisma.appUser.findMany({ orderBy: { name: "asc" } });
  return users.map((user) => toSafeUser(user));
}

export async function findAuthUserById(userId: string) {
  requireDatabase();
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  return user ? toSafeUser(user) : null;
}

export async function findAuthUserByCredentials(email: string, password: string) {
  requireDatabase();
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.appUser.findUnique({ where: { email: normalizedEmail } });

  if (!user || user.isActive === false || !verifyPasswordHash(password, user.passwordHash)) {
    return null;
  }

  return toSafeUser(user);
}

export async function createAuthUser(input: {
  email: string;
  name: string;
  position?: string;
  role: AppRole;
  password: string;
}) {
  requireDatabase();
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const position = input.position?.trim() || "";
  const password = input.password;

  if (!email || !name || !isAppRole(input.role) || password.length < 8) {
    throw new Error("Name, valid email, role, and an 8+ character password are required.");
  }

  const emailExists = Boolean(await prisma.appUser.findUnique({ where: { email } }));
  if (emailExists) {
    throw new Error("A user with that email already exists.");
  }

  const user = await prisma.appUser.create({
    data: {
      id: `user-${Date.now()}-${randomBytes(4).toString("hex")}`,
      email,
      name,
      position,
      role: input.role,
      isActive: true,
      passwordHash: createPasswordHash(password),
    },
  });

  return toSafeUser(user);
}

export async function changeAuthUserPassword(userId: string, password: string) {
  requireDatabase();
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  try {
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: { passwordHash: createPasswordHash(password) },
    });
    return toSafeUser(user);
  } catch {
    return null;
  }
}

export async function changeAuthUserRole(userId: string, role: AppRole) {
  requireDatabase();
  if (!isAppRole(role)) {
    throw new Error("Valid role is required.");
  }

  try {
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: { role },
    });
    return toSafeUser(user);
  } catch {
    return null;
  }
}

export async function updateAuthUserDetails(
  userId: string,
  input: {
    email: string;
    name: string;
    position?: string;
    role: AppRole;
    isActive?: boolean;
  },
) {
  requireDatabase();
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const position = input.position?.trim() || "";
  const isActive = input.isActive !== false;

  if (!email || !name || !isAppRole(input.role)) {
    throw new Error("Name, valid email, and role are required.");
  }

  const emailExists = Boolean(
    await prisma.appUser.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    }),
  );

  if (emailExists) {
    throw new Error("A user with that email already exists.");
  }

  try {
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: {
        email,
        name,
        position,
        role: input.role,
        isActive,
      },
    });

    return toSafeUser(user);
  } catch {
    return null;
  }
}

export async function deleteAuthUser(userId: string) {
  requireDatabase();

  try {
    await prisma.appUser.delete({ where: { id: userId } });
    return true;
  } catch {
    return false;
  }
}
