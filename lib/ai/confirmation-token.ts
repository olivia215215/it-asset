import { SignJWT, jwtVerify } from "jose";

const USED_TOKENS = new Set<string>();

function getSecretKey(): Uint8Array {
  const secret =
    (process.env.AUTH_SECRET ??
      "it-asset-dev-secret-change-in-production") + ":confirmation";
  return new TextEncoder().encode(secret);
}

export interface ConfirmationPayload {
  userId: string;
  action: string;
  params: Record<string, unknown>;
}

export async function generateConfirmationToken(
  payload: ConfirmationPayload,
): Promise<string> {
  const key = getSecretKey();

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("300s")
    .sign(key);

  return token;
}

export async function verifyConfirmationToken(
  token: string,
  userId: string,
): Promise<ConfirmationPayload | null> {
  if (USED_TOKENS.has(token)) {
    return null;
  }

  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key);

    if (payload.userId !== userId) {
      return null;
    }

    USED_TOKENS.add(token);

    return {
      userId: payload.userId as string,
      action: payload.action as string,
      params: payload.params as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}
