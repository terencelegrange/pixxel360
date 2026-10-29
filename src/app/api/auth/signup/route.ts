import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initDb, hashPassword } from "@/lib/initDb";
import { auditLog, getIp } from "@/lib/audit";
import { isFlagEnabled } from "@/lib/flags";

export async function POST(req: NextRequest) {
  await initDb();

  if (!(await isFlagEnabled("signup"))) {
    return NextResponse.json({ error: "Registrations are currently disabled" }, { status: 423 });
  }

  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const safeName = name?.trim() || null;

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password_hash: hash,
      name: safeName,
      role: "user",
      status: "pending",
    },
  });

  await auditLog({ action: "SIGNUP", resource: "users", resourceId: user.id, details: { email: normalizedEmail }, ip: getIp(req) });

  return NextResponse.json({ ok: true });
}
