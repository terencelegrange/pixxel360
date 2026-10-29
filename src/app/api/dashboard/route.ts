import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateRiskProfile } from "@/lib/security";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Users stats
  const [totalUsers]   = await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM users`;
  const [pendingUsers] = await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM users WHERE status = 'pending'`;
  const [approvedUsers]= await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM users WHERE status = 'approved'`;
  const [auditCount]   = await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM audit_logs`;

  // Assets stats
  const assets = await prisma.asset.findMany({
    include: {
      characteristics: { include: { characteristic: true } },
      attributes: { include: { attribute: true } },
    },
  });

  let q1Count = 0;
  let q2Count = 0;
  let q3Count = 0;
  let q4Count = 0;
  let criticalDeficiencies = 0;
  let totalCompliancePct = 0;

  for (const a of assets) {
    const risk = calculateRiskProfile(a.characteristics, a.attributes);
    if (risk.quadrant === 1) q1Count++;
    else if (risk.quadrant === 2) q2Count++;
    else if (risk.quadrant === 3) q3Count++;
    else q4Count++;

    if (risk.criticalNonCompliantCount > 0) {
      criticalDeficiencies++;
    }
    totalCompliancePct += risk.compliancePercentage;
  }

  const avgCompliance = assets.length > 0 ? Math.round(totalCompliancePct / assets.length) : 0;
  const syncConfig = await prisma.pixxelSyncConfig.findFirst();

  const recentAssets = await prisma.asset.findMany({
    orderBy: { updated_at: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      asset_class_id: true,
      type: true,
      lifecycle_status: true,
      updated_at: true,
    },
  });

  return NextResponse.json({
    totalUsers: Number(totalUsers.c),
    pendingUsers: Number(pendingUsers.c),
    approvedUsers: Number(approvedUsers.c),
    auditCount: Number(auditCount.c),
    totalAssets: assets.length,
    q1Count,
    q2Count,
    q3Count,
    q4Count,
    criticalDeficiencies,
    avgCompliance,
    syncConfig: syncConfig ? {
      last_sync_at: syncConfig.last_sync_at,
      last_sync_status: syncConfig.last_sync_status,
      assets_synced_count: syncConfig.assets_synced_count,
    } : null,
    recentAssets,
  });
}
