"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

interface AttributeItem {
  id: number;
  name: string;
  description: string | null;
  risk_level: string;
  weight: number;
  status: "Complies" | "Non compliant" | "Not assessed" | "Not applicable";
  notes: string | null;
}

interface RingCategory {
  title: string;
  color: string;
  ringColor: string;
  icon: string;
  total: number;
  compliant: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  percentage: number;
  attributes: AttributeItem[];
}

interface CharacteristicCloudItem {
  id: number;
  name: string;
  description: string | null;
  risk_level: "Critical" | "High" | "Medium" | "Low";
  weight: number;
  enabled: boolean;
  notes: string | null;
  icon: string;
}

interface AssetSummary {
  id: string;
  name: string;
  short_code: string | null;
  asset_class_id: string;
  type: string;
  lifecycle_status: string;
  vendor: string | null;
}

interface SelectedAssetDetail {
  id: string;
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
  risk: {
    inherentScore: number;
    inherentLevel: string;
    totalAttributes: number;
    compliantCount: number;
    nonCompliantCount: number;
    criticalNonCompliantCount: number;
    highNonCompliantCount: number;
    compliancePercentage: number;
    quadrant: 1 | 2 | 3 | 4;
  };
  categoryRings: RingCategory[];
  severityRings: RingCategory[];
  characteristicsCloud: CharacteristicCloudItem[];
}

export default function ApplicationsReportPage() {
  const [allAssets, setAllAssets] = useState<AssetSummary[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupingMode, setGroupingMode] = useState<"category" | "severity">("category");
  const [activeRingIndex, setActiveRingIndex] = useState<number | null>(null);
  const [selectedChar, setSelectedChar] = useState<CharacteristicCloudItem | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load report data
  async function loadData(assetId?: string) {
    setLoading(true);
    try {
      const url = assetId
        ? `/api/reports/applications?assetId=${encodeURIComponent(assetId)}`
        : `/api/reports/applications`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAllAssets(data.assets || []);
        setSelectedAsset(data.selectedAsset || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered assets for dropdown search
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return allAssets.slice(0, 12);
    const q = searchQuery.toLowerCase();
    return allAssets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.short_code?.toLowerCase().includes(q) ||
        a.vendor?.toLowerCase().includes(q)
    );
  }, [allAssets, searchQuery]);

  const activeRings = selectedAsset
    ? groupingMode === "category"
      ? selectedAsset.categoryRings
      : selectedAsset.severityRings
    : [];

  const quadrantLabels: Record<number, { title: string; style: string }> = {
    1: { title: "Q1: Critical Focus", style: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
    2: { title: "Q2: Internal Risk", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
    3: { title: "Q3: Low Risk", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    4: { title: "Q4: Hardened Critical", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  };

  // SVG Concentric Ring geometry math (matches reference image)
  // Center is (200, 200) in a 400x400 viewbox
  const CX = 200;
  const CY = 200;
  const ringConfigs = [
    { radius: 130, strokeWidth: 20, capGlyph: "⌝" },  // Outer ring (Cyan / Blue)
    { radius: 98,  strokeWidth: 20, capGlyph: "»" },  // Middle ring (Green)
    { radius: 66,  strokeWidth: 20, capGlyph: "›" },  // Inner ring (Red)
  ];

  // Circumferential markers for 0, 20, 40, 60, 80, 100
  const tickMarkers = [
    { label: "100", pct: 100, x: 200, y: 35 },
    { label: "20",  pct: 20,  x: 355, y: 155 },
    { label: "40",  pct: 40,  x: 325, y: 320 },
    { label: "60",  pct: 60,  x: 75,  y: 320 },
    { label: "80",  pct: 80,  x: 45,  y: 155 },
  ];

  function getArcPath(cx: number, cy: number, r: number, percentage: number) {
    const clamped = Math.max(0, Math.min(percentage, 100));
    if (clamped === 0) return "";

    const angle = (clamped / 100) * 360;
    // Start from top (-90 degrees)
    const startAngle = -90;
    const endAngle = startAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);

    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    // Handle full 100% circle
    if (clamped >= 99.9) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`;
    }

    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  }

  // Calculate position for cap arrow/glyph
  function getCapPosition(cx: number, cy: number, r: number, percentage: number) {
    const clamped = Math.max(0, Math.min(percentage, 100));
    const angle = -90 + (clamped / 100) * 360;
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-1">
            <Link href="/reports/security-quadrant" className="hover:text-gray-900 dark:hover:text-white transition">Reports</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Applications 360</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Application Security Posture
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Concentric attribute category progress arcs and characteristic exposure word cloud.
          </p>
        </div>

        {/* Report View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <Link
            href="/reports/security-quadrant"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            Security Quadrant
          </Link>
          <Link
            href="/reports/applications"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
          >
            Applications 360
          </Link>
        </div>
      </div>

      {/* Asset Search & Quick Switcher Bar */}
      <div className="relative z-20">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Search applications by name, short code, vendor..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 whitespace-nowrap">Quick Select:</span>
            {allAssets.slice(0, 4).map((a) => (
              <button
                key={a.id}
                onClick={() => loadData(a.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                  selectedAsset?.id === a.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Results */}
        {dropdownOpen && searchQuery && (
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-30 divide-y divide-gray-100 dark:divide-slate-800">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    loadData(asset.id);
                    setDropdownOpen(false);
                    setSearchQuery("");
                  }}
                  className="p-3.5 hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{asset.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {asset.asset_class_id} • {asset.type} {asset.vendor ? `• ${asset.vendor}` : ""}
                    </p>
                  </div>
                  {asset.short_code && (
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                      {asset.short_code}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">No applications found matching "{searchQuery}"</div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-20 text-center text-sm text-gray-500 dark:text-slate-400 animate-pulse">
          Loading application security posture...
        </div>
      ) : selectedAsset ? (
        <>
          {/* Selected Asset Metadata Hero Banner */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{selectedAsset.name}</h2>
                {selectedAsset.short_code && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                    {selectedAsset.short_code}
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${quadrantLabels[selectedAsset.risk.quadrant]?.style}`}>
                  {quadrantLabels[selectedAsset.risk.quadrant]?.title}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Class: <strong className="text-gray-700 dark:text-slate-300 capitalize">{selectedAsset.asset_class_id}</strong>
                {selectedAsset.vendor && <> • Vendor: <span className="text-gray-700 dark:text-slate-300">{selectedAsset.vendor}</span></>}
                <> • Lifecycle: <span className="text-gray-700 dark:text-slate-300">{selectedAsset.lifecycle_status}</span></>
                {selectedAsset.technical_owner && <> • Owner: <span className="text-gray-700 dark:text-slate-300">{selectedAsset.technical_owner}</span></>}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/assets/${selectedAsset.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <span>Edit Assessment</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* MAIN 2-COLUMN DISPLAY: Left = Concentric Rings, Right = Characteristics Word Cloud */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT HALF: CONCENTRIC RINGS GRAPH */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Security Attributes Compliance</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Concentric progress arcs measuring control coverage across categories.
                  </p>
                </div>

                {/* Grouping Mode Switch */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    onClick={() => setGroupingMode("category")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      groupingMode === "category"
                        ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Categories
                  </button>
                  <button
                    onClick={() => setGroupingMode("severity")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      groupingMode === "severity"
                        ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Severity
                  </button>
                </div>
              </div>

              {/* Concentric Circular Gauge SVG */}
              <div className="relative flex items-center justify-center my-2">
                <svg viewBox="0 0 400 400" className="w-full max-w-[360px] aspect-square drop-shadow-sm select-none">
                  {/* Outer Circumferential Tick Marks (0, 20, 40, 60, 80, 100) */}
                  {tickMarkers.map((t) => (
                    <text
                      key={t.label}
                      x={t.x}
                      y={t.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[13px] font-bold fill-gray-400 dark:fill-slate-500"
                    >
                      {t.label}
                    </text>
                  ))}

                  {/* Concentric Rings (Background Rails & Progress Arcs) */}
                  {activeRings.map((ring, idx) => {
                    const cfg = ringConfigs[idx] || ringConfigs[2];
                    const isHovered = activeRingIndex === idx;
                    const capPos = getCapPosition(CX, CY, cfg.radius, ring.percentage);

                    return (
                      <g key={ring.title} className="transition-all duration-300">
                        {/* Background Gray Rail */}
                        <circle
                          cx={CX}
                          cy={CY}
                          r={cfg.radius}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={cfg.strokeWidth}
                          className="text-gray-100 dark:text-slate-800"
                        />

                        {/* Foreground Colored Arc */}
                        {ring.percentage > 0 && (
                          <path
                            d={getArcPath(CX, CY, cfg.radius, ring.percentage)}
                            fill="none"
                            stroke={ring.color}
                            strokeWidth={isHovered ? cfg.strokeWidth + 3 : cfg.strokeWidth}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out cursor-pointer filter drop-shadow-sm"
                            onMouseEnter={() => setActiveRingIndex(idx)}
                            onMouseLeave={() => setActiveRingIndex(null)}
                          />
                        )}

                        {/* Cap Arrow / Glyph (matching reference image) */}
                        {ring.percentage > 4 && (
                          <text
                            x={capPos.x}
                            y={capPos.y + 1}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-[11px] font-black fill-white pointer-events-none"
                          >
                            {cfg.capGlyph}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Center Score & Info */}
                  <circle cx={CX} cy={CY} r={46} className="fill-white dark:fill-slate-900" />
                  <text
                    x={CX}
                    y={CY - 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-2xl font-black fill-gray-900 dark:fill-white"
                  >
                    {activeRingIndex !== null
                      ? `${activeRings[activeRingIndex].percentage}%`
                      : `${selectedAsset.risk.compliancePercentage}%`}
                  </text>
                  <text
                    x={CX}
                    y={CY + 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-bold uppercase tracking-wider fill-gray-400 dark:fill-slate-500"
                  >
                    {activeRingIndex !== null ? activeRings[activeRingIndex].title : "Compliant"}
                  </text>
                </svg>
              </div>

              {/* Interactive Legend (matching bottom of user image) */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
                  {activeRings.map((ring, idx) => {
                    const isSelected = activeRingIndex === idx;
                    return (
                      <div
                        key={ring.title}
                        onClick={() => setActiveRingIndex(isSelected ? null : idx)}
                        className={`flex items-center gap-2 cursor-pointer p-1.5 px-2.5 rounded-xl transition ${
                          isSelected
                            ? "bg-gray-100 dark:bg-slate-800 font-bold"
                            : "hover:bg-gray-50 dark:hover:bg-slate-800/40 text-gray-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="font-extrabold text-sm" style={{ color: ring.color }}>
                          {ring.percentage}
                        </span>
                        <span
                          className="w-3.5 h-3.5 rounded-md flex-shrink-0"
                          style={{ backgroundColor: ring.color }}
                        />
                        <span className="font-medium text-gray-800 dark:text-slate-200">
                          {ring.title}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({ring.compliant}/{ring.total})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Attributes breakdown card when category is selected */}
                {activeRingIndex !== null && (
                  <div className="mt-4 p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200 dark:border-slate-700/60 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {activeRings[activeRingIndex].title} Attributes ({activeRings[activeRingIndex].compliant}/{activeRings[activeRingIndex].total} Compliant)
                      </p>
                      <button
                        onClick={() => setActiveRingIndex(null)}
                        className="text-[11px] text-gray-400 hover:text-gray-700"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {activeRings[activeRingIndex].attributes.map((attr) => (
                        <div
                          key={attr.id}
                          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-gray-800 dark:text-slate-200 truncate">{attr.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                            attr.status === "Complies"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : attr.status === "Non compliant"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {attr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT HALF: CHARACTERISTICS WORD CLOUD */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Inherent Characteristics Cloud</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Environmental exposure factors scaled by risk weight. Active traits are illuminated.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                    Exposure: {selectedAsset.risk.inherentScore}/100
                  </span>
                </div>

                {/* WORD CLOUD TAG CLUSTER */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 p-4 rounded-2xl bg-gray-50/40 dark:bg-slate-950/30 border border-dashed border-gray-200 dark:border-slate-800 min-h-[260px]">
                  {selectedAsset.characteristicsCloud.map((char) => {
                    const isEnabled = char.enabled;
                    const isCritical = char.risk_level === "Critical";
                    const isHigh = char.risk_level === "High";

                    // Word cloud sizing based on weight
                    const sizeStyle = isCritical
                      ? "text-sm sm:text-base font-black px-4 py-2.5"
                      : isHigh
                      ? "text-xs sm:text-sm font-bold px-3.5 py-2"
                      : "text-xs font-semibold px-3 py-1.5";

                    // Visual color based on active/inactive state and severity
                    const stateStyle = isEnabled
                      ? isCritical
                        ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-500/25 ring-2 ring-red-400/40 hover:scale-105"
                        : isHigh
                        ? "bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-500/25 ring-2 ring-orange-400/40 hover:scale-105"
                        : "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20 hover:scale-105"
                      : "border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-gray-400 dark:text-slate-500 hover:border-gray-400 hover:text-gray-700 dark:hover:text-slate-300 opacity-60";

                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => setSelectedChar(char)}
                        className={`inline-flex items-center gap-2 rounded-2xl border transition-all cursor-pointer select-none ${sizeStyle} ${stateStyle}`}
                        title={`${char.name} (${char.risk_level} Risk, Weight: ${char.weight}) - ${isEnabled ? "Active on this asset" : "Inactive"}`}
                      >
                        {/* Domain Icon */}
                        {char.icon === "globe" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                          </svg>
                        )}
                        {char.icon === "fingerprint" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                          </svg>
                        )}
                        {char.icon === "credit-card" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                        )}
                        {char.icon === "dollar-sign" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {char.icon === "cloud" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                          </svg>
                        )}
                        {char.icon === "server" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.7 4.95a2.25 2.25 0 011.8-1.05h9a2.25 2.25 0 011.8 1.05l1.65 3.6a4.5 4.5 0 01.9 2.7" />
                          </svg>
                        )}
                        {char.icon === "shield" && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        )}

                        <span>{char.name}</span>

                        {isEnabled && (
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Characteristic Detail Popover / Inspection Card */}
              {selectedChar ? (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        selectedChar.risk_level === "Critical"
                          ? "bg-red-500/10 text-red-600 border border-red-500/30"
                          : selectedChar.risk_level === "High"
                          ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                          : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                      }`}>
                        {selectedChar.risk_level} Risk (+{selectedChar.weight} pts)
                      </span>
                      <strong className="text-sm text-gray-900 dark:text-white">{selectedChar.name}</strong>
                    </div>
                    <button
                      onClick={() => setSelectedChar(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  {selectedChar.description && (
                    <p className="text-xs text-gray-600 dark:text-slate-300">
                      {selectedChar.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-gray-500">
                      Status on {selectedAsset.name}: <strong className={selectedChar.enabled ? "text-emerald-600" : "text-gray-500"}>{selectedChar.enabled ? "Active / Present" : "Not Tagged"}</strong>
                    </span>
                    <Link
                      href={`/assets/${selectedAsset.id}`}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Toggle in Assessment →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-slate-800/30 border border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
                  <span>Click any characteristic pill to inspect definition and risk weight.</span>
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    {selectedAsset.characteristicsCloud.filter((c) => c.enabled).length} Active Traits
                  </span>
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        <div className="p-16 text-center text-sm text-gray-500">No applications available to display.</div>
      )}
    </div>
  );
}
