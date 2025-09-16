import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

// Resolve a signing key; in production require SESSION_SECRET,
// in development fall back to a temporary, per-boot random key to avoid crashes.
const resolveKey = () => {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is not set.");
  }
  // Dev fallback – ephemeral key (sessions will be invalidated on restart)
  return randomBytes(32).toString("hex");
};
const encodedKey = new TextEncoder().encode(resolveKey());

export async function createSession(countryId: string, userId: string) {
  // const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
  const session = await encrypt({ countryId, userId, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

type SessionPayload = {
  countryId: string;
  userId: string;
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    if (!session) {
      return null;
    }
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch  {
    return null;
  }
}
