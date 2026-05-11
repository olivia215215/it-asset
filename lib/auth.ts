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

const demoTokenPrefix = "demo-token-";

const demoUserMap: Record<string, AuthUser> = {
  EMPLOYEE:  { userId: "demo-emp",  role: "EMPLOYEE",  deptId: "dept-tech" },
  MANAGER:   { userId: "demo-mgr",  role: "MANAGER",   deptId: "dept-tech" },
  IT_ADMIN:  { userId: "demo-it",   role: "IT_ADMIN",  deptId: "dept-it" },
  EXECUTIVE: { userId: "demo-exec", role: "EXECUTIVE", deptId: "dept-mgmt" },
};

export async function verifyAuth(
  request: NextRequest,
): Promise<AuthUser> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

  // Demo token: bypass JWT verification
  if (token.startsWith(demoTokenPrefix)) {
    const tokenBody = token.slice(demoTokenPrefix.length);
    const lastDash = tokenBody.lastIndexOf("-");
    if (lastDash === -1) {
      throw new AuthError("Invalid demo token");
    }
    const role = tokenBody.slice(0, lastDash);
    const authUser = demoUserMap[role];
    if (!authUser) {
      throw new AuthError("Invalid demo token");
    }
    return authUser;
  }

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
