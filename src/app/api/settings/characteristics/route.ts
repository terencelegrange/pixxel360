import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog, getIp } from "@/lib/audit";
import { RISK_WEIGHTS } from "@/lib/security";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const characteristics = await prisma.characteristic.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ characteristics });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, risk_level, weight, sort_order } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Characteristic name is required" }, { status: 400 });
  }

  const validRiskLevels = ["Critical", "High", "Medium", "Low"];
  const risk = validRiskLevels.includes(risk_level) ? risk_level : "High";
  const calculatedWeight = Number.isInteger(weight) && weight > 0 ? weight : (RISK_WEIGHTS[risk] || 5);

  const characteristic = await prisma.characteristic.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      risk_level: risk,
      weight: calculatedWeight,
      sort_order: Number.isInteger(sort_order) ? sort_order : 0,
      active: 1,
    },
  });

  // Automatically bind to all existing assets with enabled = 0
  const allAssets = await prisma.asset.findMany({ select: { id: true } });
  for (const asset of allAssets) {
    await prisma.assetCharacteristic.upsert({
      where: {
        asset_id_characteristic_id: {
          asset_id: asset.id,
          characteristic_id: characteristic.id,
        },
      },
      update: {},
      create: {
        asset_id: asset.id,
        characteristic_id: characteristic.id,
        enabled: 0,
      },
    });
  }

  await auditLog({
    userId: parseInt(session.sub, 10) || null,
    action: "CHARACTERISTIC_CREATED",
    resource: "characteristics",
    resourceId: String(characteristic.id),
    details: { name: characteristic.name, risk_level: characteristic.risk_level },
    ip: getIp(req),
  });

  return NextResponse.json(characteristic, { status: 201 });
}
