import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { CHANGELOG } from "@/data/changelog";
import { DEFAULT_ROLE_PERMISSIONS } from "@/data/nav";
import { getDbDialect, getSqliteFilePath } from "./setup";
import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

let initialized = false;

export async function initDb() {
  if (initialized) return;

  const dialect = getDbDialect();

  try {
    if (dialect === "sqlite") {
      await initSqliteDb();
    } else {
      await initMysqlDb();
    }

    // Dialect-agnostic seeding via Prisma ORM
    await seedBaseData();

    // Seed security posture asset classes, attributes, and characteristics
    const { seedDefaultSecurityData } = await import("./security");
    await seedDefaultSecurityData();

    initialized = true;
  } catch (e) {
    console.error("[initDb] failed:", e);
    throw e;
  }
}

async function initSqliteDb() {
  const filePath = getSqliteFilePath();
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'pending',
      theme TEXT NOT NULL DEFAULT 'dark',
      avatar INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      label TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATETIME NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role TEXT NOT NULL,
      nav_key TEXT NOT NULL,
      PRIMARY KEY (role, nav_key)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL,
      prefix TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      expires_at DATETIME,
      created_by INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pixxel_sync_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_url TEXT NOT NULL DEFAULT 'http://192.168.100.252:3000',
      api_key TEXT,
      last_sync_at DATETIME,
      last_sync_status TEXT,
      last_sync_message TEXT,
      assets_synced_count INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asset_classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      pixxel_asset_id TEXT UNIQUE,
      name TEXT NOT NULL,
      short_code TEXT,
      asset_class_id TEXT NOT NULL DEFAULT 'application',
      type TEXT NOT NULL DEFAULT 'SaaS',
      lifecycle_status TEXT NOT NULL DEFAULT 'Production',
      description TEXT,
      business_owner TEXT,
      technical_owner TEXT,
      vendor TEXT,
      app_url TEXT,
      doc_url TEXT,
      raw_sync_data TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_assets_asset_class_id ON assets(asset_class_id);
    CREATE INDEX IF NOT EXISTS idx_assets_lifecycle_status ON assets(lifecycle_status);

    CREATE TABLE IF NOT EXISTS attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      asset_class_id TEXT NOT NULL DEFAULT 'application',
      risk_level TEXT NOT NULL DEFAULT 'High',
      weight INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_attributes_asset_class_id ON attributes(asset_class_id);

    CREATE TABLE IF NOT EXISTS asset_attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      attribute_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not assessed',
      notes TEXT,
      updated_by TEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(asset_id, attribute_id),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS characteristics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      risk_level TEXT NOT NULL DEFAULT 'High',
      weight INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asset_characteristics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      characteristic_id INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      updated_by TEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(asset_id, characteristic_id),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (characteristic_id) REFERENCES characteristics(id) ON DELETE CASCADE
    );
  `);
  db.close();
}

async function initMysqlDb() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\`            INT NOT NULL AUTO_INCREMENT,
      \`email\`         VARCHAR(200) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`name\`          VARCHAR(200) NULL,
      \`role\`          VARCHAR(20) NOT NULL DEFAULT 'user',
      \`status\`        VARCHAR(20) NOT NULL DEFAULT 'pending',
      \`theme\`         VARCHAR(10) NOT NULL DEFAULT 'dark',
      \`avatar\`        SMALLINT NULL DEFAULT NULL,
      \`created_at\`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`users_email_key\` (\`email\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`audit_logs\` (
      \`id\`          INT NOT NULL AUTO_INCREMENT,
      \`user_id\`     INT NULL,
      \`action\`      VARCHAR(50) NOT NULL,
      \`resource\`    VARCHAR(100) NOT NULL,
      \`resource_id\` VARCHAR(100) NULL,
      \`details\`     TEXT NULL,
      \`ip\`          VARCHAR(45) NULL,
      \`created_at\`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      KEY \`audit_logs_user_id_fk\` (\`user_id\`),
      CONSTRAINT \`audit_logs_user_id_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`feature_flags\` (
      \`key\`         VARCHAR(50) NOT NULL,
      \`enabled\`     TINYINT(1) NOT NULL DEFAULT 1,
      \`label\`       VARCHAR(100) NOT NULL,
      \`description\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`key\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`changelog\` (
      \`id\`          INT NOT NULL AUTO_INCREMENT,
      \`date\`        DATE NOT NULL,
      \`description\` TEXT NOT NULL,
      \`created_at\`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`changelog_unique\` (\`date\`, \`description\`(200))
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`role_permissions\` (
      \`role\`    VARCHAR(20) NOT NULL,
      \`nav_key\` VARCHAR(50) NOT NULL,
      PRIMARY KEY (\`role\`, \`nav_key\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`api_keys\` (
      \`id\`         INT NOT NULL AUTO_INCREMENT,
      \`key_hash\`   VARCHAR(64) NOT NULL,
      \`prefix\`     VARCHAR(12) NOT NULL,
      \`name\`       VARCHAR(200) NOT NULL,
      \`contact\`    VARCHAR(200) NOT NULL,
      \`expires_at\` DATETIME NULL,
      \`created_by\` INT NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`last_used\`  DATETIME NULL,
      \`active\`     TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`api_keys_prefix\` (\`prefix\`),
      KEY \`api_keys_created_by\` (\`created_by\`),
      CONSTRAINT \`api_keys_created_by_fk\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`pixxel_sync_config\` (
      \`id\`                  INT NOT NULL AUTO_INCREMENT,
      \`server_url\`          VARCHAR(255) NOT NULL DEFAULT 'http://192.168.100.252:3000',
      \`api_key\`             TEXT NULL,
      \`last_sync_at\`        DATETIME NULL,
      \`last_sync_status\`    VARCHAR(50) NULL,
      \`last_sync_message\`   TEXT NULL,
      \`assets_synced_count\` INT NOT NULL DEFAULT 0,
      \`created_at\`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`asset_classes\` (
      \`id\`          VARCHAR(50) NOT NULL,
      \`name\`        VARCHAR(100) NOT NULL,
      \`description\` TEXT NULL,
      \`created_at\`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`assets\` (
      \`id\`               VARCHAR(36) NOT NULL,
      \`pixxel_asset_id\`  VARCHAR(100) NULL,
      \`name\`             VARCHAR(255) NOT NULL,
      \`short_code\`       VARCHAR(50) NULL,
      \`asset_class_id\`   VARCHAR(50) NOT NULL DEFAULT 'application',
      \`type\`             VARCHAR(50) NOT NULL DEFAULT 'SaaS',
      \`lifecycle_status\` VARCHAR(50) NOT NULL DEFAULT 'Production',
      \`description\`      TEXT NULL,
      \`business_owner\`   VARCHAR(255) NULL,
      \`technical_owner\`  VARCHAR(255) NULL,
      \`vendor\`           VARCHAR(255) NULL,
      \`app_url\`          VARCHAR(500) NULL,
      \`doc_url\`          VARCHAR(500) NULL,
      \`raw_sync_data\`    LONGTEXT NULL,
      \`created_at\`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`assets_pixxel_asset_id_key\` (\`pixxel_asset_id\`),
      KEY \`assets_asset_class_id_idx\` (\`asset_class_id\`),
      KEY \`assets_lifecycle_status_idx\` (\`lifecycle_status\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`attributes\` (
      \`id\`             INT NOT NULL AUTO_INCREMENT,
      \`name\`           VARCHAR(150) NOT NULL,
      \`description\`    TEXT NULL,
      \`asset_class_id\` VARCHAR(50) NOT NULL DEFAULT 'application',
      \`risk_level\`     VARCHAR(20) NOT NULL DEFAULT 'High',
      \`weight\`         INT NOT NULL DEFAULT 5,
      \`sort_order\`     INT NOT NULL DEFAULT 0,
      \`active\`         TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      KEY \`attributes_asset_class_id_idx\` (\`asset_class_id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`asset_attributes\` (
      \`id\`           INT NOT NULL AUTO_INCREMENT,
      \`asset_id\`     VARCHAR(36) NOT NULL,
      \`attribute_id\` INT NOT NULL,
      \`status\`       VARCHAR(30) NOT NULL DEFAULT 'Not assessed',
      \`notes\`        TEXT NULL,
      \`updated_by\`   VARCHAR(150) NULL,
      \`updated_at\`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`asset_attributes_unique\` (\`asset_id\`, \`attribute_id\`),
      CONSTRAINT \`asset_attributes_asset_fk\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`asset_attributes_attribute_fk\` FOREIGN KEY (\`attribute_id\`) REFERENCES \`attributes\` (\`id\`) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`characteristics\` (
      \`id\`          INT NOT NULL AUTO_INCREMENT,
      \`name\`        VARCHAR(150) NOT NULL,
      \`description\` TEXT NULL,
      \`risk_level\`  VARCHAR(20) NOT NULL DEFAULT 'High',
      \`weight\`      INT NOT NULL DEFAULT 5,
      \`sort_order\`  INT NOT NULL DEFAULT 0,
      \`active\`      TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS \`asset_characteristics\` (
      \`id\`                INT NOT NULL AUTO_INCREMENT,
      \`asset_id\`          VARCHAR(36) NOT NULL,
      \`characteristic_id\` INT NOT NULL,
      \`enabled\`           TINYINT(1) NOT NULL DEFAULT 0,
      \`notes\`             TEXT NULL,
      \`updated_by\`        VARCHAR(150) NULL,
      \`updated_at\`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`asset_characteristics_unique\` (\`asset_id\`, \`characteristic_id\`),
      CONSTRAINT \`asset_characteristics_asset_fk\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`asset_characteristics_characteristic_fk\` FOREIGN KEY (\`characteristic_id\`) REFERENCES \`characteristics\` (\`id\`) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `;
}

async function seedBaseData() {
  // Sync changelog entries from static data
  for (const entry of CHANGELOG) {
    const existing = await prisma.changelog.findFirst({
      where: {
        date: new Date(entry.date),
        description: entry.description,
      },
    });
    if (!existing) {
      await prisma.changelog.create({
        data: {
          date: new Date(entry.date),
          description: entry.description,
        },
      });
    }
  }

  // Seed default flags
  const defaultFlags = [
    { key: "signup", label: "Sign Up", description: "Allow new users to register an account" },
    { key: "dashboard", label: "Dashboard", description: "Show the dashboard page in the navigation" },
    { key: "menu", label: "Navigation Menu", description: "Show navigation links in the sidebar" },
  ];
  for (const f of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {},
      create: {
        key: f.key,
        enabled: 1,
        label: f.label,
        description: f.description,
      },
    });
  }

  // Seed default role permissions
  for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const nav_key of keys) {
      await prisma.rolePermission.upsert({
        where: {
          role_nav_key: {
            role,
            nav_key,
          },
        },
        update: {},
        create: {
          role,
          nav_key,
        },
      });
    }
  }

  // Seed admin from env if configured
  const adminEmail = process.env.ADMIN_EMAIL;
  const rawAdminHash = process.env.ADMIN_PASSWORD_HASH;
  if (adminEmail && rawAdminHash) {
    const adminHash = rawAdminHash.replace(/\\\\\$/g, "$").replace(/\\\$/g, "$");
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password_hash: adminHash,
          name: "System Administrator",
          role: "admin",
          status: "approved",
        },
      });
    } else if (existing.password_hash.includes("\\$")) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password_hash: adminHash },
      });
    }
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
