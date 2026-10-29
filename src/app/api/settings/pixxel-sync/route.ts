import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog, getIp } from "@/lib/audit";
import { ensureAssetAttributesAndCharacteristics } from "@/lib/security";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.pixxelSyncConfig.findFirst();
  if (!config) {
    return NextResponse.json({
      server_url: "http://192.168.100.252:3000",
      api_key_masked: "",
      has_api_key: false,
      last_sync_at: null,
      last_sync_status: "NOT_CONFIGURED",
      last_sync_message: "Please configure Pixxel connection in settings",
      assets_synced_count: 0,
    });
  }

  const hasApiKey = Boolean(config.api_key && config.api_key.trim().length > 0);
  const maskedKey = hasApiKey
    ? config.api_key!.length > 8
      ? `${config.api_key!.slice(0, 4)}••••••••${config.api_key!.slice(-4)}`
      : "••••••••"
    : "";

  return NextResponse.json({
    id: config.id,
    server_url: config.server_url,
    api_key_masked: maskedKey,
    has_api_key: hasApiKey,
    last_sync_at: config.last_sync_at,
    last_sync_status: config.last_sync_status,
    last_sync_message: config.last_sync_message,
    assets_synced_count: config.assets_synced_count,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, sync_source = "api", server_url, api_key } = body;

  let config = await prisma.pixxelSyncConfig.findFirst();
  if (!config) {
    config = await prisma.pixxelSyncConfig.create({
      data: {
        server_url: server_url || "http://192.168.100.252:3000",
        api_key: api_key || "",
      },
    });
  }

  // 1. UPDATE CONFIG ACTION
  if (action === "update_config") {
    const updateData: { server_url?: string; api_key?: string } = {};
    if (server_url !== undefined) updateData.server_url = server_url.trim();
    if (api_key !== undefined && api_key !== "") updateData.api_key = api_key.trim();

    config = await prisma.pixxelSyncConfig.update({
      where: { id: config.id },
      data: updateData,
    });

    await auditLog({
      userId: parseInt(session.sub, 10) || null,
      action: "PIXXEL_CONFIG_UPDATED",
      resource: "pixxel_sync_config",
      details: { server_url: config.server_url },
      ip: getIp(req),
    });

    return NextResponse.json({ ok: true, message: "Configuration updated successfully" });
  }

  // 2. TEST CONNECTION ACTION
  if (action === "test_connection") {
    if (sync_source === "database") {
      try {
        const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
          "SELECT COUNT(*) AS c FROM pixxel_dev.assets"
        );
        const count = Number(rows[0]?.c ?? 0);
        return NextResponse.json({
          ok: true,
          message: `Connected successfully to Pixxel database! Found ${count} assets in pixxel_dev.`,
          count,
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          error: `Database connection error: ${err.message || String(err)}`,
        }, { status: 500 });
      }
    }

    const targetUrl = (server_url || config.server_url).replace(/\/+$/, "");
    const keyToUse = (api_key !== undefined && api_key !== "") ? api_key.trim() : config.api_key;

    if (!keyToUse) {
      return NextResponse.json({ ok: false, error: "API Key is required to test API connection" }, { status: 400 });
    }

    try {
      const endpoint = `${targetUrl}/api/assets`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${keyToUse}`,
          "X-API-Key": keyToUse,
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const count = Array.isArray(data) ? data.length : (data?.assets?.length ?? 0);
        return NextResponse.json({
          ok: true,
          message: `Connected successfully! Found ${count} assets on Pixxel server.`,
          status_code: resp.status,
          count,
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: `Pixxel server returned HTTP ${resp.status}: ${resp.statusText}`,
          status_code: resp.status,
        }, { status: 400 });
      }
    } catch (err: any) {
      return NextResponse.json({
        ok: false,
        error: `Failed to connect to ${targetUrl}: ${err.message || String(err)}`,
      }, { status: 502 });
    }
  }

  // 3. SYNC NOW ACTION
  if (action === "sync_now") {
    let assetList: any[] = [];

    if (sync_source === "database") {
      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          "SELECT id, name, short_code, category, type, lifecycle_status, description, business_owner, technical_owner, vendor, app_url, doc_url FROM pixxel_dev.assets"
        );
        assetList = rows;
      } catch (dbErr: any) {
        return NextResponse.json({
          ok: false,
          error: `Database sync error: ${dbErr.message || String(dbErr)}`,
        }, { status: 500 });
      }
    } else {
      const targetUrl = (server_url || config.server_url).replace(/\/+$/, "");
      const keyToUse = (api_key !== undefined && api_key !== "") ? api_key.trim() : config.api_key;

      if (!keyToUse) {
        return NextResponse.json({ ok: false, error: "API Key is required to sync via Pixxel API" }, { status: 400 });
      }

      try {
        const endpoint = `${targetUrl}/api/assets`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const resp = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${keyToUse}`,
            "X-API-Key": keyToUse,
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`Pixxel server returned HTTP ${resp.status}: ${resp.statusText}`);
        }

        const rawData = await resp.json();
        assetList = Array.isArray(rawData) ? rawData : (rawData?.assets || []);
      } catch (apiErr: any) {
        const errMsg = `API sync error: ${apiErr.message || String(apiErr)}`;
        await prisma.pixxelSyncConfig.update({
          where: { id: config.id },
          data: {
            last_sync_at: new Date(),
            last_sync_status: "FAILED",
            last_sync_message: errMsg,
          },
        });
        return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
      }
    }

    if (!assetList.length) {
      await prisma.pixxelSyncConfig.update({
        where: { id: config.id },
        data: {
          last_sync_at: new Date(),
          last_sync_status: "SUCCESS",
          last_sync_message: "Sync completed: 0 assets returned from Pixxel",
          assets_synced_count: 0,
        },
      });
      return NextResponse.json({ ok: true, synced: 0, message: "No assets found to sync" });
    }

    try {
      // Ensure asset classes exist in local DB
      const availableClasses = await prisma.assetClass.findMany();
      const classMap = new Map(availableClasses.map(c => [c.id.toLowerCase(), c.id]));
      const classNameMap = new Map(availableClasses.map(c => [c.name.toLowerCase(), c.id]));

      let createdCount = 0;
      let updatedCount = 0;

      for (const item of assetList) {
        const pixxelId = String(item.id || item.pixxel_asset_id || item.uuid || "");
        if (!pixxelId) continue;

        const name = item.name || "Untitled Asset";
        const rawCategory = (item.category || "Application").trim();
        const categoryKey = rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        let assetClassId = classMap.get(categoryKey) || classNameMap.get(rawCategory.toLowerCase());
        if (!assetClassId) {
          // Dynamically create new asset class
          const newClass = await prisma.assetClass.create({
            data: {
              id: categoryKey,
              name: rawCategory,
              description: `Imported asset class for ${rawCategory}`,
            },
          });
          assetClassId = newClass.id;
          classMap.set(categoryKey, assetClassId);
          classNameMap.set(rawCategory.toLowerCase(), assetClassId);
        }

        const assetData = {
          name,
          short_code: item.shortCode || item.short_code || null,
          asset_class_id: assetClassId,
          type: item.type || "SaaS",
          lifecycle_status: item.lifecycleStatus || item.lifecycle_status || "Production",
          description: item.description || null,
          business_owner: item.businessOwner || item.business_owner || null,
          technical_owner: item.technicalOwner || item.technical_owner || null,
          vendor: item.vendor || item.vendorName || item.vendor_name || null,
          app_url: item.appUrl || item.app_url || null,
          doc_url: item.docUrl || item.doc_url || null,
          raw_sync_data: JSON.stringify(item),
        };

        const existing = await prisma.asset.findUnique({
          where: { pixxel_asset_id: pixxelId },
        });

        let currentAssetId: string;
        if (existing) {
          await prisma.asset.update({
            where: { id: existing.id },
            data: assetData,
          });
          currentAssetId = existing.id;
          updatedCount++;
        } else {
          const newAsset = await prisma.asset.create({
            data: {
              id: pixxelId,
              pixxel_asset_id: pixxelId,
              ...assetData,
            },
          });
          currentAssetId = newAsset.id;
          createdCount++;
        }

        // Bind attributes & characteristics automatically
        await ensureAssetAttributesAndCharacteristics(currentAssetId, assetClassId);
      }

      const totalSynced = createdCount + updatedCount;
      const successMsg = `Successfully synced ${totalSynced} assets (${createdCount} new, ${updatedCount} updated).`;

      await prisma.pixxelSyncConfig.update({
        where: { id: config.id },
        data: {
          last_sync_at: new Date(),
          last_sync_status: "SUCCESS",
          last_sync_message: successMsg,
          assets_synced_count: totalSynced,
        },
      });

      await auditLog({
        userId: parseInt(session.sub, 10) || null,
        action: "PIXXEL_SYNC_SUCCESS",
        resource: "assets",
        details: { totalSynced, createdCount, updatedCount, source: sync_source },
        ip: getIp(req),
      });

      return NextResponse.json({
        ok: true,
        synced: totalSynced,
        created: createdCount,
        updated: updatedCount,
        message: successMsg,
      });
    } catch (err: any) {
      const errMsg = `Asset sync error: ${err.message || String(err)}`;
      await prisma.pixxelSyncConfig.update({
        where: { id: config.id },
        data: {
          last_sync_at: new Date(),
          last_sync_status: "FAILED",
          last_sync_message: errMsg,
        },
      });

      return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
