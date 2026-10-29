/**
 * lib/setup.ts — SERVER ONLY
 *
 * Utilities for reading and writing site.config.json.
 * This file is the source of truth for whether the application
 * has been configured. It must never be imported by client components.
 */
import fs from "fs";
import path from "path";

export type DbDialect = "mysql" | "sqlite";

export interface MysqlDbConfig {
  dialect: "mysql";
  host: string;
  port: number;
  user: string;
  password?: string;
  name: string;
}

export interface SqliteDbConfig {
  dialect: "sqlite";
  file: string;
}

export type DbConfig = MysqlDbConfig | SqliteDbConfig;

export interface SiteConfig {
  setupComplete: boolean;
  appName: string;
  orgName: string;
  db: DbConfig;
  pixxelServerUrl?: string;
}

const CONFIG_PATH = path.join(process.cwd(), "site.config.json");

export function isSetupComplete(): boolean {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return false;
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw) as SiteConfig;
    return config.setupComplete === true;
  } catch {
    return false;
  }
}

export function getSiteConfig(): SiteConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as SiteConfig;
  } catch {
    return null;
  }
}

export function writeSiteConfig(config: SiteConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getDbDialect(): DbDialect {
  const config = getSiteConfig();
  if (config?.db?.dialect) return config.db.dialect;
  if (process.env.DB_TYPE === "sqlite") return "sqlite";
  if (process.env.DATABASE_URL?.startsWith("file:")) return "sqlite";
  return "mysql";
}

export function getSqliteFilePath(): string {
  const config = getSiteConfig();
  if (config?.db?.dialect === "sqlite" && config.db.file) return config.db.file;
  if (process.env.DB_FILE) return process.env.DB_FILE;
  return path.join("data", "pixxel360.db");
}
