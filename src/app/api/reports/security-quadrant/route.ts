import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateRiskProfile } from "@/lib/security";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetClass = searchParams.get("class");
  const lifecycle = searchParams.get("lifecycle");

  const whereClause: any = {};
  if (assetClass && assetClass !== "all") {
    whereClause.asset_class_id = assetClass;
  }
  if (lifecycle && lifecycle !== "all") {
    whereClause.lifecycle_status = lifecycle;
  }

  const assets = await prisma.asset.findMany({
    where: whereClause,
    include: {
      characteristics: {
        include: { characteristic: true },
      },
      attributes: {
        include: { attribute: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const plottedAssets = assets.map((asset) => {
    const risk = calculateRiskProfile(asset.characteristics, asset.attributes);

    const criticalFailed = asset.attributes
      .filter((a) => a.status === "Non compliant" && a.attribute.risk_level === "Critical")
      .map((a) => a.attribute.name);

    const highFailed = asset.attributes
      .filter((a) => a.status === "Non compliant" && a.attribute.risk_level === "High")
      .map((a) => a.attribute.name);

    const activeChars = asset.characteristics
      .filter((c) => c.enabled === 1)
      .map((c) => c.characteristic.name);

    return {
      id: asset.id,
      pixxel_asset_id: asset.pixxel_asset_id,
      name: asset.name,
      short_code: asset.short_code,
      asset_class_id: asset.asset_class_id,
      type: asset.type,
      lifecycle_status: asset.lifecycle_status,
      business_owner: asset.business_owner,
      technical_owner: asset.technical_owner,
      vendor: asset.vendor,
      app_url: asset.app_url,
      x: risk.quadrantX,
      y: risk.quadrantY,
      quadrant: risk.quadrant,
      inherentScore: risk.inherentScore,
      inherentLevel: risk.inherentLevel,
      criticalNonCompliantCount: risk.criticalNonCompliantCount,
      highNonCompliantCount: risk.highNonCompliantCount,
      compliantCount: risk.compliantCount,
      nonCompliantCount: risk.nonCompliantCount,
      notAssessedCount: risk.notAssessedCount,
      compliancePercentage: risk.compliancePercentage,
      criticalFailed,
      highFailed,
      activeChars,
    };
  });

  const quadrant1 = plottedAssets.filter((a) => a.quadrant === 1);
  const quadrant2 = plottedAssets.filter((a) => a.quadrant === 2);
  const quadrant3 = plottedAssets.filter((a) => a.quadrant === 3);
  const quadrant4 = plottedAssets.filter((a) => a.quadrant === 4);

  return NextResponse.json({
    assets: plottedAssets,
    summary: {
      total: plottedAssets.length,
      q1Count: quadrant1.length, // Top-Right (Critical Focus)
      q2Count: quadrant2.length, // Top-Left (Internal Risk)
      q3Count: quadrant3.length, // Bottom-Left (Low Risk)
      q4Count: quadrant4.length, // Bottom-Right (Hardened Critical)
    },
    assetClasses: await prisma.assetClass.findMany({ orderBy: { name: "asc" } }),
  });
}
