import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateRiskProfile, ensureAssetAttributesAndCharacteristics } from "@/lib/security";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim() || "";
  const requestedAssetId = searchParams.get("assetId");

  // Fetch all assets for the search dropdown / list
  const allAssets = await prisma.asset.findMany({
    select: {
      id: true,
      name: true,
      short_code: true,
      asset_class_id: true,
      type: true,
      lifecycle_status: true,
      vendor: true,
    },
    orderBy: { name: "asc" },
  });

  if (allAssets.length === 0) {
    return NextResponse.json({
      assets: [],
      selectedAsset: null,
    });
  }

  // Determine selected asset ID
  let targetId = requestedAssetId;
  if (!targetId || !allAssets.some((a) => a.id === targetId)) {
    // Prefer matching search if provided, otherwise first asset
    if (search) {
      const match = allAssets.find(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.short_code?.toLowerCase().includes(search) ||
          a.vendor?.toLowerCase().includes(search)
      );
      targetId = match ? match.id : allAssets[0].id;
    } else {
      targetId = allAssets[0].id;
    }
  }

  // Ensure attributes/characteristics are bound
  const currentAssetClass = allAssets.find((a) => a.id === targetId)?.asset_class_id || "application";
  await ensureAssetAttributesAndCharacteristics(targetId, currentAssetClass);

  // Fetch full details of the selected asset
  const asset = await prisma.asset.findUnique({
    where: { id: targetId },
    include: {
      characteristics: {
        include: { characteristic: true },
      },
      attributes: {
        include: { attribute: true },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const risk = calculateRiskProfile(asset.characteristics, asset.attributes);

  // Categorize attributes for the Concentric Rings (matching reference image rings)
  // 1. Identity & Access Governance (SSO, MFA, SCIM, RBAC)
  // 2. Security Operations & Monitoring (Audit Logging, Vulnerability Scanning)
  // 3. Data Protection & Cryptography (Secrets, Encryption)
  const iamKeywords = ["sso", "single sign-on", "mfa", "multi-factor", "scim", "rbac", "access", "identity"];
  const secOpsKeywords = ["audit", "log", "logging", "vulnerability", "scan", "patch", "monitor"];
  const dataProtKeywords = ["secret", "vault", "encrypt", "encryption", "tls", "aes", "key", "data"];

  const iamAttrs: any[] = [];
  const secOpsAttrs: any[] = [];
  const dataProtAttrs: any[] = [];

  for (const item of asset.attributes) {
    const lowerName = item.attribute.name.toLowerCase();
    if (iamKeywords.some((k) => lowerName.includes(k))) {
      iamAttrs.push(item);
    } else if (secOpsKeywords.some((k) => lowerName.includes(k))) {
      secOpsAttrs.push(item);
    } else if (dataProtKeywords.some((k) => lowerName.includes(k))) {
      dataProtAttrs.push(item);
    } else {
      // Default grouping based on risk
      if (item.attribute.risk_level === "Critical") dataProtAttrs.push(item);
      else if (item.attribute.risk_level === "High") secOpsAttrs.push(item);
      else iamAttrs.push(item);
    }
  }

  function summarizeCategory(title: string, color: string, ringColor: string, icon: string, items: any[]) {
    const total = items.length;
    const compliant = items.filter((i) => i.status === "Complies").length;
    const nonCompliant = items.filter((i) => i.status === "Non compliant").length;
    const notAssessed = items.filter((i) => i.status === "Not assessed").length;
    const notApplicable = items.filter((i) => i.status === "Not applicable").length;
    const percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;

    return {
      title,
      color,
      ringColor,
      icon,
      total,
      compliant,
      nonCompliant,
      notAssessed,
      notApplicable,
      percentage,
      attributes: items.map((i) => ({
        id: i.attribute.id,
        name: i.attribute.name,
        description: i.attribute.description,
        risk_level: i.attribute.risk_level,
        weight: i.attribute.weight,
        status: i.status,
        notes: i.notes,
      })),
    };
  }

  // Concentric ring categories:
  // Ring 1 (Outer): Blue/Cyan (#0284c7) -> Identity & Access
  // Ring 2 (Middle): Green (#16a34a) -> Security Operations
  // Ring 3 (Inner): Red (#dc2626) -> Data Protection
  const categoryRings = [
    summarizeCategory(
      "Identity & Access",
      "#0284c7",
      "#38bdf8",
      "identity",
      iamAttrs
    ),
    summarizeCategory(
      "Security Operations",
      "#16a34a",
      "#4ade80",
      "operations",
      secOpsAttrs
    ),
    summarizeCategory(
      "Data Protection",
      "#dc2626",
      "#f87171",
      "protection",
      dataProtAttrs
    ),
  ];

  // Also by severity
  const critAttrs = asset.attributes.filter((a) => a.attribute.risk_level === "Critical");
  const highAttrs = asset.attributes.filter((a) => a.attribute.risk_level === "High");
  const medLowAttrs = asset.attributes.filter((a) => a.attribute.risk_level === "Medium" || a.attribute.risk_level === "Low");

  const severityRings = [
    summarizeCategory("Critical Controls", "#dc2626", "#f87171", "shield-alert", critAttrs),
    summarizeCategory("High Risk Controls", "#ea580c", "#fb923c", "alert-triangle", highAttrs),
    summarizeCategory("Medium & Low Controls", "#2563eb", "#60a5fa", "check-circle", medLowAttrs),
  ];

  // Format characteristics for the Word Cloud
  // Assign icons and visual weights
  const iconMap: Record<string, string> = {
    public: "globe",
    internet: "globe",
    pii: "fingerprint",
    pci: "credit-card",
    financial: "dollar-sign",
    payroll: "dollar-sign",
    saas: "cloud",
    critical: "server",
    availability: "activity",
  };

  const characteristicsCloud = asset.characteristics.map((c) => {
    const nameLower = c.characteristic.name.toLowerCase();
    let icon = "shield";
    for (const [key, ic] of Object.entries(iconMap)) {
      if (nameLower.includes(key)) {
        icon = ic;
        break;
      }
    }

    return {
      id: c.characteristic.id,
      name: c.characteristic.name,
      description: c.characteristic.description,
      risk_level: c.characteristic.risk_level,
      weight: c.characteristic.weight,
      enabled: c.enabled === 1,
      notes: c.notes,
      icon,
    };
  });

  // Sort characteristics by weight descending so cloud has visual hierarchy
  characteristicsCloud.sort((a, b) => b.weight - a.weight);

  return NextResponse.json({
    assets: allAssets,
    selectedAsset: {
      id: asset.id,
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
      updated_at: asset.updated_at,
      risk,
      categoryRings,
      severityRings,
      characteristicsCloud,
    },
  });
}
