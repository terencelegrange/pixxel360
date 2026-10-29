"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PlottedAsset {
  id: string;
  pixxel_asset_id: string | null;
  name: string;
  short_code: string | null;
  asset_class_id: string;
  type: string;
  lifecycle_status: string;
  business_owner: string | null;
  technical_owner: string | null;
  vendor: string | null;
  app_url: string | null;
  x: number;
  y: number;
  quadrant: 1 | 2 | 3 | 4;
  inherentScore: number;
  inherentLevel: string;
  criticalNonCompliantCount: number;
  highNonCompliantCount: number;
  compliantCount: number;
  nonCompliantCount: number;
  notAssessedCount: number;
  compliancePercentage: number;
  criticalFailed: string[];
  highFailed: string[];
  activeChars: string[];
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<PlottedAsset[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [assetClasses, setAssetClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedLifecycle, setSelectedLifecycle] = useState("all");
  const [hoveredAsset, setHoveredAsset] = useState<PlottedAsset | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | 1 | 2 | 3 | 4>("all");

  async function loadQuadrantData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass !== "all") params.set("class", selectedClass);
      if (selectedLifecycle !== "all") params.set("lifecycle", selectedLifecycle);

      const res = await fetch(`/api/reports/security-quadrant?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets);
        setSummary(data.summary);
        setAssetClasses(data.assetClasses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuadrantData();
  }, [selectedClass, selectedLifecycle]);

  const filteredForTable = activeTab === "all" ? assets : assets.filter((a) => a.quadrant === activeTab);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Security Posture Quadrant
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Gartner-style 360° matrix evaluating Inherent Exposure against Critical Security Control Deficiencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 transition"
          >
            Assets Directory
          </Link>
          <Link
            href="/security-assessment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 transition"
          >
            Security Assessment
          </Link>
          <Link
            href="/settings/sync-to-pixxel"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
          >
            Sync Assets
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Q1: Top Right */}
        <div
          onClick={() => setActiveTab(activeTab === 1 ? "all" : 1)}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 1
              ? "bg-red-500/15 border-red-500 ring-2 ring-red-500/30"
              : "bg-white dark:bg-slate-900 border-red-500/30 hover:border-red-500/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Q1: Critical Priority</p>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <p className="mt-2 text-3xl font-black text-red-600 dark:text-red-400">{summary?.q1Count ?? 0}</p>
          <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/70">
            High exposure + 1+ critical attribute failures (Top-Right)
          </p>
        </div>

        {/* Q2: Top Left */}
        <div
          onClick={() => setActiveTab(activeTab === 2 ? "all" : 2)}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 2
              ? "bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/30"
              : "bg-white dark:bg-slate-900 border-orange-500/30 hover:border-orange-500/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Q2: Internal Risk</p>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-orange-600 dark:text-orange-400">{summary?.q2Count ?? 0}</p>
          <p className="mt-1 text-xs text-orange-700/80 dark:text-orange-300/70">
            Lower exposure + critical attribute failures (Top-Left)
          </p>
        </div>

        {/* Q4: Bottom Right */}
        <div
          onClick={() => setActiveTab(activeTab === 4 ? "all" : 4)}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 4
              ? "bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/30"
              : "bg-white dark:bg-slate-900 border-blue-500/30 hover:border-blue-500/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Q4: Hardened Critical</p>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">{summary?.q4Count ?? 0}</p>
          <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/70">
            High exposure + all critical controls compliant (Bottom-Right)
          </p>
        </div>

        {/* Q3: Bottom Left */}
        <div
          onClick={() => setActiveTab(activeTab === 3 ? "all" : 3)}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 3
              ? "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30"
              : "bg-white dark:bg-slate-900 border-emerald-500/30 hover:border-emerald-500/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Q3: Low Risk</p>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{summary?.q3Count ?? 0}</p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/70">
            Low exposure + compliant controls (Bottom-Left)
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm text-xs">
        <span className="font-bold text-gray-700 dark:text-slate-300">Filter Quadrant:</span>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Asset Classes</option>
          {assetClasses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedLifecycle}
          onChange={(e) => setSelectedLifecycle(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Lifecycles</option>
          <option value="Production">Production</option>
          <option value="In Development">In Development</option>
          <option value="Approved">Approved</option>
          <option value="Proposed">Proposed</option>
          <option value="Sunset">Sunset</option>
        </select>

        <div className="ml-auto text-xs text-gray-500 dark:text-slate-400 font-medium">
          Showing {assets.length} evaluated assets
        </div>
      </div>

      {/* QUADRANT MATRIX VISUALIZATION */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="relative">
          {/* Axis Labels */}
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            <span>Critical Control Deficiencies (Y-Axis)</span>
            <span>Target: Top-Right = Priority Action</span>
          </div>

          {/* 2x2 Matrix Container */}
          <div className="relative aspect-[16/10] min-h-[460px] w-full border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-gray-50/20 dark:bg-slate-950/40">
            {/* Quadrant Background Zones */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {/* Q2: Top-Left (Internal Risk) */}
              <div className="bg-orange-500/5 dark:bg-orange-950/10 border-r border-b border-gray-200 dark:border-slate-800 p-4 relative">
                <span className="text-xs font-extrabold text-orange-600/60 dark:text-orange-400/50 uppercase tracking-widest">
                  Q2: Internal Risk (Weak Controls)
                </span>
              </div>

              {/* Q1: Top-Right (Critical Priority) */}
              <div className="bg-red-500/10 dark:bg-red-950/20 border-b border-gray-200 dark:border-slate-800 p-4 relative">
                <span className="text-xs font-black text-red-600/80 dark:text-red-400/80 uppercase tracking-widest">
                  ★ Q1: CRITICAL PRIORITY (High Exposure + Deficiencies)
                </span>
                <span className="absolute bottom-3 right-3 text-[10px] text-red-500/60 font-semibold uppercase">
                  Most Critical →
                </span>
              </div>

              {/* Q3: Bottom-Left (Low Risk) */}
              <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border-r border-gray-200 dark:border-slate-800 p-4 relative flex flex-col justify-end">
                <span className="text-xs font-extrabold text-emerald-600/60 dark:text-emerald-400/50 uppercase tracking-widest">
                  Q3: Low Risk (Protected &amp; Internal)
                </span>
              </div>

              {/* Q4: Bottom-Right (Hardened Critical) */}
              <div className="bg-blue-500/5 dark:bg-blue-950/10 p-4 relative flex flex-col justify-end">
                <span className="text-xs font-extrabold text-blue-600/60 dark:text-blue-400/50 uppercase tracking-widest">
                  Q4: Hardened Critical (High Exposure, Defended)
                </span>
              </div>
            </div>

            {/* Center Crosshairs */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-300/80 dark:bg-slate-700/80 -translate-x-1/2" />
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-300/80 dark:bg-slate-700/80 -translate-y-1/2" />
            </div>

            {/* Plotted Asset Points */}
            {assets.map((asset) => {
              const posX = asset.x;
              const posY = 100 - asset.y;

              const isQ1 = asset.quadrant === 1;
              const isQ2 = asset.quadrant === 2;
              const isQ4 = asset.quadrant === 4;

              const pinColor = isQ1
                ? "bg-red-600 border-white text-white shadow-md shadow-red-500/40 ring-2 ring-red-400/50"
                : isQ2
                ? "bg-orange-500 border-white text-white shadow-md shadow-orange-500/30"
                : isQ4
                ? "bg-blue-600 border-white text-white shadow-md shadow-blue-500/30"
                : "bg-emerald-600 border-white text-white shadow-sm";

              return (
                <div
                  key={asset.id}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  onMouseEnter={() => setHoveredAsset(asset)}
                  onMouseLeave={() => setHoveredAsset(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform hover:scale-125 group"
                >
                  <Link href={`/assets/${asset.id}`} className="block">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${pinColor}`}
                      title={`${asset.name} (Quadrant ${asset.quadrant})`}
                    >
                      {asset.name.charAt(0)}
                    </div>
                  </Link>
                </div>
              );
            })}

            {/* Hover Tooltip / Detail Card */}
            {hoveredAsset && (
              <div
                style={{
                  left: `${Math.min(Math.max(hoveredAsset.x, 15), 85)}%`,
                  top: `${hoveredAsset.y > 50 ? 55 : 20}%`,
                }}
                className="absolute z-30 -translate-x-1/2 pointer-events-none w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xl text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{hoveredAsset.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 capitalize">{hoveredAsset.asset_class_id} • {hoveredAsset.type}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    hoveredAsset.quadrant === 1
                      ? "bg-red-500/10 text-red-600 border-red-500/20"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700"
                  }`}>
                    Q{hoveredAsset.quadrant}
                  </span>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Inherent Exposure:</span>
                    <strong className="text-gray-800 dark:text-slate-200">{hoveredAsset.inherentScore}/100</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Controls Compliance:</span>
                    <strong className="text-gray-800 dark:text-slate-200">{hoveredAsset.compliancePercentage}%</strong>
                  </div>
                </div>

                {hoveredAsset.criticalFailed.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-1.5">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Critical Control Failures:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hoveredAsset.criticalFailed.map((c, idx) => (
                        <span key={idx} className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 text-[10px] px-1.5 py-0.2 rounded font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {hoveredAsset.activeChars.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-1.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Characteristics:</p>
                    <p className="text-[11px] text-gray-700 dark:text-slate-300 mt-0.5 line-clamp-1">
                      {hoveredAsset.activeChars.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom X-Axis Label */}
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-2">
            <span>← Low Inherent Exposure</span>
            <span>Inherent Exposure (Characteristics: Internet Facing, PII, PCI) →</span>
          </div>
        </div>
      </div>

      {/* Quadrant Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {activeTab === "all" ? "All Evaluated Assets" : `Quadrant ${activeTab} Asset Breakdown`}
          </h2>
          <span className="text-xs text-gray-500 dark:text-slate-400">{filteredForTable.length} assets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Asset</th>
                <th className="px-4 py-3.5">Quadrant</th>
                <th className="px-4 py-3.5">Inherent Exposure</th>
                <th className="px-4 py-3.5">Critical Control Gaps</th>
                <th className="px-4 py-3.5">Compliance</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredForTable.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50/75 dark:hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 dark:text-white">{asset.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{asset.asset_class_id} • {asset.type}</p>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      asset.quadrant === 1
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        : asset.quadrant === 2
                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                        : asset.quadrant === 4
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}>
                      Q{asset.quadrant}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs">
                    <strong className="text-gray-900 dark:text-white">{asset.inherentScore} / 100</strong>
                    <div className="text-[11px] text-gray-500 truncate max-w-xs">
                      {asset.activeChars.length > 0 ? asset.activeChars.join(", ") : "None tagged"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-xs">
                    {asset.criticalFailed.length > 0 ? (
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {asset.criticalFailed.join(", ")}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">None</span>
                    )}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold">
                    {asset.compliancePercentage}%
                  </td>

                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Assess &amp; Remediate →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
