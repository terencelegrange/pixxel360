import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog, getIp } from "@/lib/audit";
import { RISK_WEIGHTS } from "@/lib/security";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { name, description, asset_class_id, risk_level, weight, sort_order, active } = body;

  const validRiskLevels = ["Critical", "High", "Medium", "Low"];
  const risk = validRiskLevels.includes(risk_level) ? risk_level : undefined;
  const calculatedWeight = risk ? (weight || RISK_WEIGHTS[risk]) : weight;

  const updated = await prisma.attribute.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(asset_class_id ? { asset_class_id } : {}),
      ...(risk ? { risk_level: risk } : {}),
      ...(calculatedWeight !== undefined ? { weight: calculatedWeight } : {}),
      ...(sort_order !== undefined ? { sort_order } : {}),
      ...(active !== undefined ? { active: active ? 1 : 0 } : {}),
    },
  });

  await auditLog({
    userId: parseInt(session.sub, 10) || null,
    action: "ATTRIBUTE_UPDATED",
    resource: "attributes",
    resourceId: String(id),
    details: { name: updated.name, risk_level: updated.risk_level },
    ip: getIp(req),
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  // Cascade delete asset_attributes first
  await prisma.assetAttribute.deleteMany({ where: { attribute_id: id } });
  const deleted = await prisma.attribute.delete({ where: { id } });

  await auditLog({
    userId: parseInt(session.sub, 10) || null,
    action: "ATTRIBUTE_DELETED",
    resource: "attributes",
    resourceId: String(id),
    details: { name: deleted.name },
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
