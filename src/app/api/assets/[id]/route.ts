import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog, getIp } from "@/lib/audit";
import { calculateRiskProfile, ensureAssetAttributesAndCharacteristics } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Ensure attributes and characteristics are current
  await ensureAssetAttributesAndCharacteristics(asset.id, asset.asset_class_id);

  const fullAsset = await prisma.asset.findUnique({
    where: { id },
    include: {
      characteristics: {
        include: { characteristic: true },
        orderBy: { characteristic: { sort_order: "asc" } },
      },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { sort_order: "asc" } },
      },
    },
  });

  if (!fullAsset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const risk = calculateRiskProfile(fullAsset.characteristics, fullAsset.attributes);

  return NextResponse.json({
    asset: fullAsset,
    risk,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { characteristics, attributes } = body;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const userName = session.name || session.email;

  // 1. Update characteristics if provided
  if (Array.isArray(characteristics)) {
    for (const item of characteristics) {
      if (typeof item.id === "number" && typeof item.enabled === "boolean") {
        await prisma.assetCharacteristic.upsert({
          where: {
            asset_id_characteristic_id: {
              asset_id: id,
              characteristic_id: item.id,
            },
          },
          update: {
            enabled: item.enabled ? 1 : 0,
            notes: item.notes !== undefined ? item.notes : undefined,
            updated_by: userName,
          },
          create: {
            asset_id: id,
            characteristic_id: item.id,
            enabled: item.enabled ? 1 : 0,
            notes: item.notes || null,
            updated_by: userName,
          },
        });
      }
    }
  }

  // 2. Update attributes if provided
  if (Array.isArray(attributes)) {
    const validStatuses = ["Not assessed", "Complies", "Non compliant", "Not applicable"];
    for (const item of attributes) {
      if (typeof item.id === "number" && validStatuses.includes(item.status)) {
        await prisma.assetAttribute.upsert({
          where: {
            asset_id_attribute_id: {
              asset_id: id,
              attribute_id: item.id,
            },
          },
          update: {
            status: item.status,
            notes: item.notes !== undefined ? item.notes : undefined,
            updated_by: userName,
          },
          create: {
            asset_id: id,
            attribute_id: item.id,
            status: item.status,
            notes: item.notes || null,
            updated_by: userName,
          },
        });
      }
    }
  }

  await auditLog({
    userId: parseInt(session.sub, 10) || null,
    action: "ASSET_ASSESSMENT_UPDATED",
    resource: "assets",
    resourceId: id,
    details: {
      name: asset.name,
      updatedCharacteristicsCount: characteristics?.length ?? 0,
      updatedAttributesCount: attributes?.length ?? 0,
    },
    ip: getIp(req),
  });

  // Re-fetch updated state
  const updatedAsset = await prisma.asset.findUnique({
    where: { id },
    include: {
      characteristics: {
        include: { characteristic: true },
        orderBy: { characteristic: { sort_order: "asc" } },
      },
      attributes: {
        include: { attribute: true },
        orderBy: { attribute: { sort_order: "asc" } },
      },
    },
  });

  const risk = calculateRiskProfile(updatedAsset!.characteristics, updatedAsset!.attributes);

  return NextResponse.json({
    ok: true,
    asset: updatedAsset,
    risk,
  });
}
