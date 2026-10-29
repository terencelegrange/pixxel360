"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Attribute {
  id: number;
  name: string;
  description: string | null;
  asset_class_id: string;
  risk_level: "Critical" | "High" | "Medium" | "Low";
  weight: number;
  sort_order: number;
  active: number;
}

interface AssetClass {
  id: string;
  name: string;
  description: string | null;
}

export default function AttributesSettingsPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formClass, setFormClass] = useState("application");
  const [formRisk, setFormRisk] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [formWeight, setFormWeight] = useState<number>(6);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings/attributes?asset_class_id=${selectedClass}`);
      if (res.ok) {
        const data = await res.json();
        setAttributes(data.attributes);
        setAssetClasses(data.assetClasses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  function openCreateModal() {
    setEditingAttr(null);
    setFormName("");
    setFormDescription("");
    setFormClass(selectedClass !== "all" ? selectedClass : "application");
    setFormRisk("High");
    setFormWeight(6);
    setFormSortOrder(attributes.length + 1);
    setShowModal(true);
  }

  function openEditModal(attr: Attribute) {
    setEditingAttr(attr);
    setFormName(attr.name);
    setFormDescription(attr.description || "");
    setFormClass(attr.asset_class_id);
    setFormRisk(attr.risk_level);
    setFormWeight(attr.weight);
    setFormSortOrder(attr.sort_order);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);

    try {
      if (editingAttr) {
        // Update
        const res = await fetch(`/api/settings/attributes/${editingAttr.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            asset_class_id: formClass,
            risk_level: formRisk,
            weight: formWeight,
            sort_order: formSortOrder,
          }),
        });
        if (res.ok) {
          setShowModal(false);
          await loadData();
        }
      } else {
        // Create
        const res = await fetch("/api/settings/attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            asset_class_id: formClass,
            risk_level: formRisk,
            weight: formWeight,
            sort_order: formSortOrder,
          }),
        });
        if (res.ok) {
          setShowModal(false);
          await loadData();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(attr: Attribute) {
    if (!confirm(`Are you sure you want to delete attribute "${attr.name}"? This will remove assessments for this attribute across all assets.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/settings/attributes/${attr.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleRiskChange(risk: "Critical" | "High" | "Medium" | "Low") {
    setFormRisk(risk);
    if (risk === "Critical") setFormWeight(10);
    else if (risk === "High") setFormWeight(6);
    else if (risk === "Medium") setFormWeight(3);
    else setFormWeight(1);
  }

  const riskBadgeStyles = {
    Critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    High: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    Medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    Low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-2">
          <Link href="/settings" className="hover:text-gray-900 dark:hover:text-white transition">Settings</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Attributes</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Security Attributes</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Security controls (SSO, MFA, Audit logs, SCIM) automatically assigned to assets by class.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Attribute
          </button>
        </div>
      </div>

      {/* Asset Class Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setSelectedClass("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            selectedClass === "all"
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          All Asset Classes
        </button>
        {assetClasses.map((ac) => (
          <button
            key={ac.id}
            onClick={() => setSelectedClass(ac.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedClass === ac.id
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            {ac.name}
          </button>
        ))}
      </div>

      {/* Attributes List */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Loading attributes...
          </div>
        ) : attributes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-gray-900 dark:text-white">No attributes found</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Click &quot;Add Attribute&quot; to configure your first security control.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Attribute Name</th>
                  <th className="px-4 py-3.5">Asset Class</th>
                  <th className="px-4 py-3.5">Risk Level</th>
                  <th className="px-4 py-3.5">Risk Weight</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {attributes.map((attr) => (
                  <tr key={attr.id} className="hover:bg-gray-50/75 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{attr.name}</p>
                      {attr.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 max-w-lg line-clamp-1">{attr.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                        {assetClasses.find(c => c.id === attr.asset_class_id)?.name || attr.asset_class_id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${riskBadgeStyles[attr.risk_level]}`}>
                        {attr.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-slate-300 font-mono text-xs">
                      {attr.weight} pts
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(attr)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(attr)}
                        className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingAttr ? "Edit Security Attribute" : "Add Security Attribute"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Attribute Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. SSO (Single Sign-On)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Asset Class
                </label>
                <select
                  value={formClass}
                  onChange={(e) => setFormClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Asset Classes</option>
                  {assetClasses.map((ac) => (
                    <option key={ac.id} value={ac.id}>{ac.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Risk Level (Weight)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Critical", "High", "Medium", "Low"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleRiskChange(lvl)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        formRisk === lvl
                          ? riskBadgeStyles[lvl] + " ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                          : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1">
                  Description / Verification Criteria
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Details on what is assessed and what constitutes compliance..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingAttr ? "Update Attribute" : "Create Attribute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
