"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Asset {
  id: string;
  pixxel_asset_id: string | null;
  name: string;
  short_code: string | null;
  asset_class_id: string;
  type: string;
  lifecycle_status: string;
  description: string | null;
  business_owner: string | null;
  technical_owner: string | null;
  vendor: string | null;
  app_url: string | null;
  risk: {
    inherentScore: number;
    inherentLevel: string;
    totalAttributes: number;
    compliantCount: number;
    nonCompliantCount: number;
    criticalNonCompliantCount: number;
    highNonCompliantCount: number;
    notAssessedCount: number;
    notApplicableCount: number;
    compliancePercentage: number;
    quadrant: 1 | 2 | 3 | 4;
  };
  activeCharacteristics: { id: number; name: string; risk_level: string }[];
}

export default function SecurityAssessmentPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedLifecycle, setSelectedLifecycle] = useState("all");
  const [selectedQuadrant, setSelectedQuadrant] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  async function loadAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedClass !== "all") params.set("class", selectedClass);
      if (selectedLifecycle !== "all") params.set("lifecycle", selectedLifecycle);
      if (selectedQuadrant !== "all") params.set("quadrant", selectedQuadrant);
      if (criticalOnly) params.set("critical_only", "true");

      const res = await fetch(`/api/assets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [search, selectedClass, selectedLifecycle, selectedQuadrant, criticalOnly]);

  const quadrantLabels: Record<number, { title: string; style: string }> = {
    1: { title: "Q1: Critical Focus", style: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
    2: { title: "Q2: Internal Risk", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
    3: { title: "Q3: Low Risk", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    4: { title: "Q4: Hardened Critical", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-1">
            <span>Security Assessment</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Controls Posture</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Security Controls Assessment
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Evaluate security controls compliance and inherent risk exposure across all organizational assets.
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
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 transition"
          >
            View Quadrant
          </Link>
          <Link
            href="/settings/sync-to-pixxel"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
          >
            Sync Assets
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Evaluated</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{stats?.totalAssets ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Synced organizational assets</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Q1: Critical Priority</p>
          <p className="mt-2 text-3xl font-black text-red-600 dark:text-red-400">{stats?.q1Count ?? 0}</p>
          <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/70">High exposure + critical control gaps</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Control Deficiencies</p>
          <p className="mt-2 text-3xl font-black text-orange-600 dark:text-orange-400">{stats?.totalNonCompliant ?? 0}</p>
          <p className="mt-1 text-xs text-orange-700/80 dark:text-orange-300/70">Failed security controls across assets</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Avg Compliance</p>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats?.avgCompliance ?? 0}%</p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/70">Overall controls compliance rate</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset name, short code, vendor..."
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
          />

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Asset Classes</option>
            <option value="application">Application</option>
            <option value="networking">Networking</option>
            <option value="security-appliance">Security Appliance</option>
            <option value="cloud-infrastructure">Cloud Infrastructure</option>
            <option value="database">Database</option>
            <option value="general">General</option>
          </select>

          <select
            value={selectedQuadrant}
            onChange={(e) => setSelectedQuadrant(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Quadrants</option>
            <option value="1">Q1: Critical Priority</option>
            <option value="2">Q2: Internal Risk</option>
            <option value="3">Q3: Low Risk</option>
            <option value="4">Q4: Hardened Critical</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={(e) => setCriticalOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Critical Gaps Only</span>
          </label>
        </div>

        <div className="text-xs text-gray-500 dark:text-slate-400">
          Showing <strong>{assets.length}</strong> assets
        </div>
      </div>

      {/* Assessment Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Asset</th>
                <th className="px-4 py-4">Risk Quadrant</th>
                <th className="px-4 py-4">Controls Compliance</th>
                <th className="px-4 py-4">Inherent Exposure</th>
                <th className="px-6 py-4 text-right">Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    Loading security posture data...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    No assets found matching filters.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/75 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white hover:text-indigo-600">
                              {asset.name}
                            </span>
                            {asset.short_code && (
                              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                                {asset.short_code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-400 capitalize mt-0.5">
                            {asset.asset_class_id} • {asset.type} {asset.vendor ? `• ${asset.vendor}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${quadrantLabels[asset.risk.quadrant]?.style}`}>
                        {quadrantLabels[asset.risk.quadrant]?.title}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="w-44 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800 dark:text-slate-200">{asset.risk.compliancePercentage}%</span>
                          <span className="text-[11px] text-gray-500">
                            {asset.risk.compliantCount}/{asset.risk.totalAttributes} controls
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${asset.risk.compliancePercentage}%` }}
                            className="bg-emerald-500 h-full rounded-full transition-all"
                          />
                          {asset.risk.criticalNonCompliantCount > 0 && (
                            <div
                              style={{ width: `${(asset.risk.criticalNonCompliantCount / (asset.risk.totalAttributes || 1)) * 100}%` }}
                              className="bg-red-500 h-full"
                              title={`${asset.risk.criticalNonCompliantCount} critical non-compliant controls`}
                            />
                          )}
                        </div>
                        {asset.risk.criticalNonCompliantCount > 0 && (
                          <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                            ⚠ {asset.risk.criticalNonCompliantCount} Critical Control Gap{asset.risk.criticalNonCompliantCount > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white text-xs">{asset.risk.inherentScore}</span>
                          <span className="text-gray-400 text-[10px]">/ 100</span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {asset.activeCharacteristics.slice(0, 2).map((c) => (
                            <span key={c.id} className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-medium">
                              {c.name}
                            </span>
                          ))}
                          {asset.activeCharacteristics.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{asset.activeCharacteristics.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition"
                      >
                        <span>Assess</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
