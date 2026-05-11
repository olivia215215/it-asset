import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export interface AuthUser {
  userId: string;
  role: "EMPLOYEE" | "MANAGER" | "IT_ADMIN" | "EXECUTIVE";
  deptId: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "it-asset-dev-secret-change-in-production";
const secretKey = new TextEncoder().encode(AUTH_SECRET);

export async function verifyAuth(
  request: NextRequest,
): Promise<AuthUser> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.sub as string,
      role: payload.role as AuthUser["role"],
      deptId: payload.deptId as string,
    };
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}

export function requireOneOf(
  user: AuthUser,
  ...roles: AuthUser["role"][]
): void {
  if (!roles.includes(user.role)) {
    throw new AuthError("Insufficient permissions", 403);
  }
}
