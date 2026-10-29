import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateRiskProfile, ensureAssetAttributesAndCharacteristics } from "@/lib/security";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const assetClass = searchParams.get("class");
  const lifecycle = searchParams.get("lifecycle");
  const quadrantParam = searchParams.get("quadrant");
  const criticalOnly = searchParams.get("critical_only") === "true";

  const assets = await prisma.asset.findMany({
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

  const enrichedAssets = assets.map((asset) => {
    const risk = calculateRiskProfile(asset.characteristics, asset.attributes);
    return {
      id: asset.id,
      pixxel_asset_id: asset.pixxel_asset_id,
      name: asset.name,
      short_code: asset.short_code,
      asset_class_id: asset.asset_class_id,
      type: asset.type,
      lifecycle_status: asset.lifecycle_status,
      description: asset.description,
      business_owner: asset.business_owner,
      technical_owner: asset.technical_owner,
      vendor: asset.vendor,
      app_url: asset.app_url,
      doc_url: asset.doc_url,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
      risk,
      activeCharacteristics: asset.characteristics
        .filter((c) => c.enabled === 1)
        .map((c) => ({
          id: c.characteristic.id,
          name: c.characteristic.name,
          risk_level: c.characteristic.risk_level,
        })),
    };
  });

  // Apply filtering
  let filtered = enrichedAssets;

  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(search) ||
        (a.short_code && a.short_code.toLowerCase().includes(search)) ||
        (a.vendor && a.vendor.toLowerCase().includes(search)) ||
        (a.business_owner && a.business_owner.toLowerCase().includes(search))
    );
  }

  if (assetClass && assetClass !== "all") {
    filtered = filtered.filter((a) => a.asset_class_id === assetClass);
  }

  if (lifecycle && lifecycle !== "all") {
    filtered = filtered.filter((a) => a.lifecycle_status === lifecycle);
  }

  if (quadrantParam && quadrantParam !== "all") {
    const qNum = parseInt(quadrantParam, 10);
    if (!isNaN(qNum)) {
      filtered = filtered.filter((a) => a.risk.quadrant === qNum);
    }
  }

  if (criticalOnly) {
    filtered = filtered.filter((a) => a.risk.criticalNonCompliantCount > 0);
  }

  // Summary counts for header stats
  const totalCount = enrichedAssets.length;
  const criticalFocusCount = enrichedAssets.filter((a) => a.risk.quadrant === 1).length;
  const criticalDeficienciesCount = enrichedAssets.filter((a) => a.risk.criticalNonCompliantCount > 0).length;
  const highExposureCount = enrichedAssets.filter((a) => a.risk.inherentScore >= 50).length;
  const assessedCount = enrichedAssets.filter((a) => a.risk.compliantCount + a.risk.nonCompliantCount > 0).length;

  return NextResponse.json({
    assets: filtered,
    stats: {
      total: totalCount,
      criticalFocus: criticalFocusCount,
      criticalDeficiencies: criticalDeficienciesCount,
      highExposure: highExposureCount,
      assessed: assessedCount,
    },
  });
}
