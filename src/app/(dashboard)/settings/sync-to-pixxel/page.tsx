"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SyncConfig {
  id?: number;
  server_url: string;
  api_key_masked: string;
  has_api_key: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  assets_synced_count: number;
}

export default function SyncToPixxelPage() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [syncMode, setSyncMode] = useState<"api" | "database">("api");
  const [serverUrl, setServerUrl] = useState("http://192.168.100.252:3000");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  async function loadConfig() {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/pixxel-sync");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.server_url) setServerUrl(data.server_url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/pixxel-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          server_url: serverUrl,
          api_key: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Pixxel connection settings saved successfully." });
        setApiKey("");
        await loadConfig();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save configuration." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/pixxel-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          sync_source: syncMode,
          server_url: serverUrl,
          api_key: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to connect to Pixxel server." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error testing connection." });
    } finally {
      setTesting(false);
    }
  }

  async function handleSyncNow() {
    if (!confirm(`This will pull asset records from Pixxel (${syncMode === "api" ? "via API" : "via direct database"}) and update local asset security profiles. Continue?`)) {
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/pixxel-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_now",
          sync_source: syncMode,
          server_url: serverUrl,
          api_key: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: data.message });
        await loadConfig();
      } else {
        setMessage({ type: "error", text: data.error || "Synchronization failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error initiating sync." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-2">
          <Link href="/settings" className="hover:text-gray-900 dark:hover:text-white transition">Settings</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Sync to Pixxel</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Sync to Pixxel</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Pull organizational assets from Pixxel to evaluate 360° security posture.
            </p>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing || testing || (syncMode === "api" && !config?.has_api_key && !apiKey)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {syncing ? "Syncing Assets..." : `Sync to Pixxel (${syncMode.toUpperCase()})`}
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          message.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
            : message.type === "error"
            ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300"
            : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300"
        }`}>
          <div className="font-medium">{message.text}</div>
        </div>
      )}

      {/* Sync Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Sync Status &amp; Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Status</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                config?.last_sync_status === "SUCCESS"
                  ? "bg-emerald-500"
                  : config?.last_sync_status === "FAILED"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`} />
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {config?.last_sync_status || "Not Configured"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Assets Synced</p>
            <p className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {config?.assets_synced_count ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Last Synced</p>
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              {config?.last_sync_at ? new Date(config.last_sync_at).toLocaleString() : "Never"}
            </p>
          </div>
        </div>

        {config?.last_sync_message && (
          <div className="mt-4 text-xs text-gray-500 dark:text-slate-400 italic">
            Last message: {config.last_sync_message}
          </div>
        )}
      </div>

      {/* Sync Mode Selector */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Connection Method</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setSyncMode("api")}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
              syncMode === "api"
                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/20"
                : "border-gray-200 dark:border-slate-800 hover:border-gray-300"
            }`}
          >
            <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center ${syncMode === "api" ? "border-indigo-600 bg-indigo-600" : "border-gray-400"}`}>
              {syncMode === "api" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Pixxel REST API</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Connects over HTTP/HTTPS to your Pixxel API using an API Key.
              </p>
            </div>
          </div>

          <div
            onClick={() => setSyncMode("database")}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
              syncMode === "database"
                ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/20"
                : "border-gray-200 dark:border-slate-800 hover:border-gray-300"
            }`}
          >
            <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center ${syncMode === "database" ? "border-indigo-600 bg-indigo-600" : "border-gray-400"}`}>
              {syncMode === "database" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Direct Server Database (Same Server)</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Pulls directly from co-located <code className="text-indigo-500 font-mono">pixxel_dev</code> on 192.168.100.204.
              </p>
            </div>
          </div>
        </div>

        {/* API Settings Form */}
        {syncMode === "api" ? (
          <form onSubmit={handleSaveConfig} className="pt-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1.5">
                Pixxel Server URL
              </label>
              <input
                type="url"
                required
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.100.252:3000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Base URL of the running Pixxel server. Pixxel360 will query the `/api/assets` endpoint.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1.5">
                Pixxel API Key / Bearer Token
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.has_api_key ? `Configured (${config.api_key_masked}) — enter new key to replace` : "Enter Pixxel API Key"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Sent in the HTTP request as <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-[11px]">Authorization: Bearer &lt;API_KEY&gt;</code> and <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono text-[11px]">X-API-Key</code> headers.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-gray-900 text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!config?.has_api_key && !apiKey)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-300 transition disabled:opacity-50"
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-2 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/60 text-xs space-y-2">
              <p className="font-bold text-gray-900 dark:text-white text-sm">Direct Server Co-location Details</p>
              <p className="text-gray-600 dark:text-slate-400">
                Server: <code className="font-mono text-indigo-500 font-bold">192.168.100.204:3306</code><br />
                Source Database: <code className="font-mono text-indigo-500 font-bold">pixxel_dev</code> (assets table)<br />
                Target Database: <code className="font-mono text-indigo-500 font-bold">pixxel360</code> (assets + security matrices)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-300 transition disabled:opacity-50"
              >
                {testing ? "Checking..." : "Verify Database Access"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How it works banner */}
      <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-gray-600 dark:text-slate-400 space-y-2">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">How Pixxel Synchronization Works</p>
        <p>
          1. <strong>Pull:</strong> Pixxel360 pulls the asset registry (via API or direct database).
        </p>
        <p>
          2. <strong>Auto-Assignment:</strong> For each asset class (e.g. Application), Pixxel360 binds configured security controls (SSO, MFA, Audit Logging, SCIM) in <em>Not assessed</em> status.
        </p>
        <p>
          3. <strong>Security Quadrant:</strong> Unavoidable characteristics (Internet Facing, PII, PCI) feed into Inherent Exposure (X-axis) and attribute compliance feeds into Critical Deficiencies (Y-axis) on the Gartner-style quadrant.
        </p>
      </div>
    </div>
  );
}
