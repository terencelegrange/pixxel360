import { PrismaClient as MysqlClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "@/generated/sqlite-client";
import { getDbDialect, getSqliteFilePath, getSiteConfig } from "./setup";
import path from "path";

const g = globalThis as unknown as {
  _mysqlPrisma?: MysqlClient;
  _sqlitePrisma?: SqliteClient;
};

export function getPrismaClient(): any {
  const dialect = getDbDialect();
  if (dialect === "sqlite") {
    if (!g._sqlitePrisma) {
      const dbFile = getSqliteFilePath();
      const resolvedPath = path.isAbsolute(dbFile)
        ? dbFile
        : path.resolve(process.cwd(), dbFile);
      const url = `file:${resolvedPath}`;
      g._sqlitePrisma = new SqliteClient({
        datasources: { db: { url } },
        log: ["error"],
      });
    }
    return g._sqlitePrisma;
  }

  // MySQL dialect
  if (!g._mysqlPrisma) {
    const config = getSiteConfig();
    let url = process.env.DATABASE_URL;
    if (config?.db && config.db.dialect === "mysql") {
      const { user, password, host, port, name } = config.db;
      url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password || "")}@${host}:${port}/${name}`;
    }
    g._mysqlPrisma = new MysqlClient({
      ...(url ? { datasources: { db: { url } } } : {}),
      log: ["error"],
    });
  }
  return g._mysqlPrisma;
}

export function resetPrismaClient(): void {
  if (g._sqlitePrisma) {
    g._sqlitePrisma.$disconnect().catch(() => {});
    g._sqlitePrisma = undefined;
  }
  if (g._mysqlPrisma) {
    g._mysqlPrisma.$disconnect().catch(() => {});
    g._mysqlPrisma = undefined;
  }
}

export const prisma = new Proxy({} as MysqlClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
