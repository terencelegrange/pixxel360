import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog, getIp } from "@/lib/audit";
import { RISK_WEIGHTS } from "@/lib/security";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetClassId = searchParams.get("asset_class_id");

  const whereClause: any = {};
  if (assetClassId && assetClassId !== "all") {
    whereClause.OR = [
      { asset_class_id: assetClassId },
      { asset_class_id: "all" },
    ];
  }

  const attributes = await prisma.attribute.findMany({
    where: whereClause,
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });

  const assetClasses = await prisma.assetClass.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ attributes, assetClasses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, asset_class_id, risk_level, weight, sort_order } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Attribute name is required" }, { status: 400 });
  }

  const validRiskLevels = ["Critical", "High", "Medium", "Low"];
  const risk = validRiskLevels.includes(risk_level) ? risk_level : "High";
  const calculatedWeight = Number.isInteger(weight) && weight > 0 ? weight : (RISK_WEIGHTS[risk] || 5);

  const attribute = await prisma.attribute.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      asset_class_id: asset_class_id || "application",
      risk_level: risk,
      weight: calculatedWeight,
      sort_order: Number.isInteger(sort_order) ? sort_order : 0,
      active: 1,
    },
  });

  // Automatically bind to all existing matching assets in 'Not assessed' status
  const assetWhere: any = {};
  if (attribute.asset_class_id !== "all") {
    assetWhere.asset_class_id = attribute.asset_class_id;
  }
  const matchingAssets = await prisma.asset.findMany({
    where: assetWhere,
    select: { id: true },
  });

  for (const asset of matchingAssets) {
    await prisma.assetAttribute.upsert({
      where: {
        asset_id_attribute_id: {
          asset_id: asset.id,
          attribute_id: attribute.id,
        },
      },
      update: {},
      create: {
        asset_id: asset.id,
        attribute_id: attribute.id,
        status: "Not assessed",
      },
    });
  }

  await auditLog({
    userId: parseInt(session.sub, 10) || null,
    action: "ATTRIBUTE_CREATED",
    resource: "attributes",
    resourceId: String(attribute.id),
    details: { name: attribute.name, risk_level: attribute.risk_level, asset_class_id: attribute.asset_class_id },
    ip: getIp(req),
  });

  return NextResponse.json(attribute, { status: 201 });
}
