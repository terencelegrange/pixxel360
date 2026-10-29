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
  doc_url: string | null;
  updated_at: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLifecycle, setSelectedLifecycle] = useState("all");

  async function loadAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedClass !== "all") params.set("class", selectedClass);
      if (selectedLifecycle !== "all") params.set("lifecycle", selectedLifecycle);

      const res = await fetch(`/api/assets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: Asset[] = data.assets || [];
        if (selectedType !== "all") {
          list = list.filter((a) => a.type.toLowerCase() === selectedType.toLowerCase());
        }
        setAssets(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [search, selectedClass, selectedType, selectedLifecycle]);

  // Unique types and classes for filters
  const assetClasses = Array.from(new Set(assets.map((a) => a.asset_class_id))).filter(Boolean);
  const assetTypes = Array.from(new Set(assets.map((a) => a.type))).filter(Boolean);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-1">
            <span>Assets</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">All Assets</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Assets Directory
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Complete inventory of technology assets synchronized from Pixxel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/security-assessment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 transition"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Security Assessment
          </Link>
          <Link
            href="/settings/sync-to-pixxel"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Sync from Pixxel
          </Link>
        </div>
      </div>

      {/* Inventory Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Assets</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{assets.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Synchronized and registered</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Production Assets</p>
          <p className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {assets.filter((a) => a.lifecycle_status === "Production").length}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Active in production</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">SaaS Applications</p>
          <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">
            {assets.filter((a) => a.type.toLowerCase() === "saas").length}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Cloud hosted providers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Asset Classes</p>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{assetClasses.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Distinct technical categories</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets by name, short code, vendor, owner..."
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-72"
          />

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
          >
            <option value="all">All Asset Classes</option>
            {assetClasses.map((c) => (
              <option key={c} value={c} className="capitalize">{c}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            {assetTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedLifecycle}
            onChange={(e) => setSelectedLifecycle(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Lifecycles</option>
            <option value="Production">Production</option>
            <option value="In Development">In Development</option>
            <option value="Approved">Approved</option>
            <option value="Proposed">Proposed</option>
            <option value="Sunset">Sunset</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
          Showing <strong>{assets.length}</strong> assets
        </div>
      </div>

      {/* Asset Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Asset Name</th>
                <th className="px-4 py-4">Class</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Lifecycle</th>
                <th className="px-4 py-4">Vendor</th>
                <th className="px-4 py-4">Owners</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                    Loading assets inventory...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                    No assets found.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/75 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {asset.name}
                        </span>
                        {asset.short_code && (
                          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                            {asset.short_code}
                          </span>
                        )}
                      </div>
                      {asset.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                          {asset.description}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 capitalize">
                        {asset.asset_class_id}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300">
                      {asset.type}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        asset.lifecycle_status === "Production"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                          : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50"
                      }`}>
                        {asset.lifecycle_status}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300">
                      {asset.vendor || "—"}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                      {asset.technical_owner || asset.business_owner || "—"}
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {asset.app_url && (
                          <a
                            href={asset.app_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
                            title="Open Application URL"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        )}
                        <Link
                          href={`/assets/${asset.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                        >
                          <span>Assess Security</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
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
