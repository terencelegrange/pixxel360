"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CharacteristicItem {
  id: number;
  characteristic_id: number;
  enabled: number;
  notes: string | null;
  characteristic: {
    id: number;
    name: string;
    description: string | null;
    risk_level: "Critical" | "High" | "Medium" | "Low";
    weight: number;
  };
}

interface AttributeItem {
  id: number;
  attribute_id: number;
  status: "Not assessed" | "Complies" | "Non compliant" | "Not applicable";
  notes: string | null;
  attribute: {
    id: number;
    name: string;
    description: string | null;
    risk_level: "Critical" | "High" | "Medium" | "Low";
    weight: number;
  };
}

interface AssetDetail {
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
  characteristics: CharacteristicItem[];
  attributes: AttributeItem[];
}

interface RiskProfile {
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
  quadrantX: number;
  quadrantY: number;
  quadrant: 1 | 2 | 3 | 4;
}

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [risk, setRisk] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local assessment state
  const [charStates, setCharStates] = useState<Record<number, boolean>>({});
  const [attrStates, setAttrStates] = useState<Record<number, { status: "Not assessed" | "Complies" | "Non compliant" | "Not applicable"; notes: string }>>({});

  async function loadAsset() {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAsset(data.asset);
        setRisk(data.risk);

        // Initialize state maps
        const cMap: Record<number, boolean> = {};
        for (const c of data.asset.characteristics) {
          cMap[c.characteristic.id] = c.enabled === 1;
        }
        setCharStates(cMap);

        const aMap: Record<number, { status: any; notes: string }> = {};
        for (const a of data.asset.attributes) {
          aMap[a.attribute.id] = { status: a.status, notes: a.notes || "" };
        }
        setAttrStates(aMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAsset();
  }, [id]);

  function toggleCharacteristic(charId: number) {
    setCharStates((prev) => ({ ...prev, [charId]: !prev[charId] }));
  }

  function setAttributeStatus(attrId: number, status: "Not assessed" | "Complies" | "Non compliant" | "Not applicable") {
    setAttrStates((prev) => ({
      ...prev,
      [attrId]: { ...(prev[attrId] || { notes: "" }), status },
    }));
  }

  function setAttributeNotes(attrId: number, notes: string) {
    setAttrStates((prev) => ({
      ...prev,
      [attrId]: { ...(prev[attrId] || { status: "Not assessed" }), notes },
    }));
  }

  async function handleSaveAssessment() {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const charPayload = Object.entries(charStates).map(([cId, enabled]) => ({
        id: parseInt(cId, 10),
        enabled,
      }));

      const attrPayload = Object.entries(attrStates).map(([aId, data]) => ({
        id: parseInt(aId, 10),
        status: data.status,
        notes: data.notes,
      }));

      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characteristics: charPayload,
          attributes: attrPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAsset(data.asset);
        setRisk(data.risk);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const quadrantLabels: Record<number, { title: string; style: string; desc: string }> = {
    1: { title: "Quadrant 1: Critical Focus", style: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", desc: "High inherent exposure + 1 or more critical control deficiencies" },
    2: { title: "Quadrant 2: Internal Risk", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", desc: "Lower exposure + critical control deficiencies" },
    3: { title: "Quadrant 3: Low Risk", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", desc: "Lower exposure + compliant controls" },
    4: { title: "Quadrant 4: Hardened Critical", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", desc: "High inherent exposure + all critical controls compliant" },
  };

  const riskBadgeStyles = {
    Critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    High: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    Medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    Low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-gray-500 dark:text-slate-400">
        Loading asset security evaluation...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-16 text-center">
        <p className="text-base font-bold text-gray-900 dark:text-white">Asset not found</p>
        <Link href="/assets" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
          Return to Asset Inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb & Top Bar */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-2">
          <Link href="/assets" className="hover:text-gray-900 dark:hover:text-white transition">Assets</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">{asset.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{asset.name}</h1>
              {asset.short_code && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                  {asset.short_code}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Class: <strong className="text-gray-700 dark:text-slate-300 capitalize">{asset.asset_class_id}</strong> • Type: <span className="text-gray-700 dark:text-slate-300">{asset.type}</span> • Status: <span className="text-gray-700 dark:text-slate-300">{asset.lifecycle_status}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAssessment}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {saving ? "Saving Changes..." : "Save Assessment"}
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Security assessment and quadrant placement updated successfully!
        </div>
      )}

      {/* Hero Quadrant & Posture Card */}
      {risk && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${quadrantLabels[risk.quadrant].style}`}>
                  {quadrantLabels[risk.quadrant].title}
                </span>
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">
                  {risk.compliancePercentage}% Controls Compliant
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">
                {quadrantLabels[risk.quadrant].desc}
              </p>
            </div>

            <div className="flex items-center gap-6 divide-x divide-gray-200 dark:divide-slate-800">
              <div className="text-center px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Inherent Exposure</p>
                <p className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">{risk.inherentScore} <span className="text-xs font-bold">/ 100</span></p>
              </div>

              <div className="text-center px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Critical Gaps</p>
                <p className={`mt-1 text-2xl font-black ${risk.criticalNonCompliantCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {risk.criticalNonCompliantCount}
                </p>
              </div>

              <div className="text-center px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Quadrant (X, Y)</p>
                <p className="mt-1 text-sm font-mono font-bold text-gray-700 dark:text-slate-300">
                  ({risk.quadrantX}, {risk.quadrantY})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: INHERENT CHARACTERISTICS */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. Inherent Characteristics</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            What the asset inherently is — unavoidable traits that drive organizational exposure. Toggle all that apply.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {asset.characteristics.map((c) => {
            const isEnabled = charStates[c.characteristic.id] ?? false;
            return (
              <div
                key={c.characteristic.id}
                onClick={() => toggleCharacteristic(c.characteristic.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                  isEnabled
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/20"
                    : "bg-gray-50/50 dark:bg-slate-800/20 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{c.characteristic.name}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${riskBadgeStyles[c.characteristic.risk_level]}`}>
                      {c.characteristic.risk_level}
                    </span>
                  </div>
                  {c.characteristic.description && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {c.characteristic.description}
                    </p>
                  )}
                </div>

                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition ${
                  isEnabled
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                }`}>
                  {isEnabled && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: ATTRIBUTES ASSESSMENT */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. Security Attributes Assessment</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Security controls automatically assigned to the <strong className="capitalize">{asset.asset_class_id}</strong> asset class. Evaluate compliance status for each attribute.
          </p>
        </div>

        <div className="space-y-3">
          {asset.attributes.map((a) => {
            const current = attrStates[a.attribute.id] || { status: a.status, notes: a.notes || "" };
            return (
              <div
                key={a.attribute.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{a.attribute.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${riskBadgeStyles[a.attribute.risk_level]}`}>
                        {a.attribute.risk_level} Risk
                      </span>
                    </div>
                    {a.attribute.description && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">
                        {a.attribute.description}
                      </p>
                    )}
                  </div>

                  {/* Status Picker Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {(["Complies", "Non compliant", "Not assessed", "Not applicable"] as const).map((st) => {
                      const isSelected = current.status === st;
                      const styles: Record<string, string> = {
                        "Complies": isSelected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
                        "Non compliant": isSelected
                          ? "bg-red-600 text-white border-red-600"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/20",
                        "Not assessed": isSelected
                          ? "bg-gray-800 dark:bg-slate-200 text-white dark:text-gray-900 border-gray-800 dark:border-slate-200"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800",
                        "Not applicable": isSelected
                          ? "bg-slate-500 text-white border-slate-500"
                          : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800",
                      };

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setAttributeStatus(a.attribute.id, st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${styles[st]}`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Evidence / Remediation Notes Input */}
                <div>
                  <input
                    type="text"
                    value={current.notes}
                    onChange={(e) => setAttributeNotes(a.attribute.id, e.target.value)}
                    placeholder="Evidence, ticket reference, or remediation notes..."
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
