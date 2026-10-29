import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { COOKIE, verifyToken, type JwtPayload } from "./jwt";

export * from "./jwt";

async function getSessionFromApiKey(rawKey: string): Promise<JwtPayload | null> {
  try {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const now = new Date();
    const key = await prisma.apiKey.findFirst({
      where: {
        key_hash: keyHash,
        active: 1,
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } },
        ],
      },
    });
    if (!key) return null;

    // Update last_used (fire and forget)
    prisma.apiKey.update({
      where: { id: key.id },
      data: { last_used: now },
    }).catch(() => {});

    // API keys get admin-level access
    return { sub: "apikey", email: "api", role: "admin", name: null };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  // 1. Check Authorization: Bearer header (API key support)
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer p360_") || authHeader?.startsWith("Bearer bp_")) {
    const rawKey = authHeader.slice(7);
    const session = await getSessionFromApiKey(rawKey);
    if (session) return session;
  }

  // 2. Fall back to cookie-based JWT
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
