import { prisma } from "./prisma";

export interface RiskMetrics {
  inherentScore: number;
  inherentLevel: "Critical" | "High" | "Medium" | "Low";
  totalAttributes: number;
  compliantCount: number;
  nonCompliantCount: number;
  criticalNonCompliantCount: number;
  highNonCompliantCount: number;
  notAssessedCount: number;
  notApplicableCount: number;
  compliancePercentage: number;
  quadrantX: number; // 0 - 100
  quadrantY: number; // 0 - 100
  quadrant: 1 | 2 | 3 | 4; // 1 = Top-Right, 2 = Top-Left, 3 = Bottom-Left, 4 = Bottom-Right
}

export const RISK_WEIGHTS: Record<string, number> = {
  Critical: 10,
  High: 6,
  Medium: 3,
  Low: 1,
};

export async function seedDefaultSecurityData() {
  try {
    // 1. Seed Asset Classes
    const defaultClasses = [
      { id: "application", name: "Application", description: "Software applications, web apps, SaaS platforms, and internal services" },
      { id: "networking", name: "Networking", description: "Routers, switches, load balancers, DNS, and network appliances" },
      { id: "security-appliance", name: "Security Appliance", description: "Firewalls, WAFs, IDS/IPS, and security monitors" },
      { id: "cloud-infrastructure", name: "Cloud Infrastructure", description: "IaaS, cloud accounts, Kubernetes clusters, and compute nodes" },
      { id: "database", name: "Database", description: "Relational, document, and columnar data stores" },
      { id: "general", name: "General / Other", description: "General organizational assets and systems" },
    ];

    for (const c of defaultClasses) {
      await prisma.assetClass.upsert({
        where: { id: c.id },
        update: { name: c.name, description: c.description },
        create: { id: c.id, name: c.name, description: c.description },
      });
    }

    // 2. Seed Default Attributes (applicable to all asset classes by default)
    const defaultAttributes = [
      { name: "SSO (Single Sign-On)", asset_class_id: "all", risk_level: "Critical", weight: 10, sort_order: 1, description: "Integration with corporate identity provider (SAML / OIDC / Azure AD / Okta)" },
      { name: "MFA (Multi-Factor Authentication)", asset_class_id: "all", risk_level: "Critical", weight: 10, sort_order: 2, description: "Enforced multi-factor authentication for all logins and administrator access" },
      { name: "Centralized Audit Logging", asset_class_id: "all", risk_level: "High", weight: 6, sort_order: 3, description: "Security events, logins, and administrative changes forwarded to central SIEM" },
      { name: "SCIM Automated Deprovisioning", asset_class_id: "all", risk_level: "Medium", weight: 3, sort_order: 4, description: "Automated account deactivation when employees leave the organisation" },
      { name: "Role-Based Access Control (RBAC)", asset_class_id: "all", risk_level: "High", weight: 6, sort_order: 5, description: "Granular permissions enforcing least-privilege principles" },
      { name: "Secrets & Vault Management", asset_class_id: "all", risk_level: "Critical", weight: 10, sort_order: 6, description: "No hardcoded credentials, API keys stored in centralized secrets manager" },
      { name: "Vulnerability Scanning & Patching", asset_class_id: "all", risk_level: "High", weight: 6, sort_order: 7, description: "Regular scanning of dependencies and infrastructure vulnerabilities" },
      { name: "Data Encryption in Transit & at Rest", asset_class_id: "all", risk_level: "Critical", weight: 10, sort_order: 8, description: "Enforced TLS 1.2+ for network transit and AES-256 for persistent data" },
    ];

    for (const attr of defaultAttributes) {
      const existing = await prisma.attribute.findFirst({
        where: { name: attr.name, asset_class_id: attr.asset_class_id },
      });
      if (!existing) {
        await prisma.attribute.create({ data: attr });
      }
    }

    // 3. Seed Default Characteristics
    const defaultCharacteristics = [
      { name: "Public / Internet Facing", risk_level: "High", weight: 8, sort_order: 1, description: "Directly accessible from the public internet without requiring internal VPN" },
      { name: "Holds PII Data", risk_level: "Critical", weight: 10, sort_order: 2, description: "Stores or processes Personally Identifiable Information (customer or employee data)" },
      { name: "Holds PCI / Cardholder Data", risk_level: "Critical", weight: 10, sort_order: 3, description: "Stores, processes, or transmits credit card or payment transaction data" },
      { name: "Holds Financial / Payroll Data", risk_level: "High", weight: 7, sort_order: 4, description: "Contains company financial ledgers, payroll records, or banking information" },
      { name: "Third-Party Hosted (SaaS)", risk_level: "Medium", weight: 4, sort_order: 5, description: "Managed and hosted by external SaaS vendor outside private cloud boundary" },
      { name: "Mission Critical Availability", risk_level: "Critical", weight: 9, sort_order: 6, description: "Severe financial or operational impact if the service experiences downtime" },
    ];

    for (const char of defaultCharacteristics) {
      const existing = await prisma.characteristic.findFirst({
        where: { name: char.name },
      });
      if (!existing) {
        await prisma.characteristic.create({ data: char });
      }
    }

    // 4. Seed Default Sync Config if missing
    const syncConfig = await prisma.pixxelSyncConfig.findFirst();
    if (!syncConfig) {
      await prisma.pixxelSyncConfig.create({
        data: {
          server_url: "http://192.168.100.252:3000",
          api_key: "",
          last_sync_status: "NOT_CONFIGURED",
          last_sync_message: "Configure Pixxel API Key in settings to initiate sync",
          assets_synced_count: 0,
        },
      });
    }
  } catch (err) {
    console.error("[seedDefaultSecurityData] error:", err);
  }
}

/**
 * Automatically binds all applicable attributes and characteristics to an asset
 */
export async function ensureAssetAttributesAndCharacteristics(assetId: string, assetClassId: string = "application") {
  // Find applicable attributes: matching asset_class_id or 'all'
  const attributes = await prisma.attribute.findMany({
    where: {
      active: 1,
      OR: [{ asset_class_id: assetClassId }, { asset_class_id: "all" }],
    },
  });

  for (const attr of attributes) {
    await prisma.assetAttribute.upsert({
      where: {
        asset_id_attribute_id: {
          asset_id: assetId,
          attribute_id: attr.id,
        },
      },
      update: {}, // don't overwrite if already assessed
      create: {
        asset_id: assetId,
        attribute_id: attr.id,
        status: "Not assessed",
      },
    });
  }

  // Find all active characteristics
  const characteristics = await prisma.characteristic.findMany({
    where: { active: 1 },
  });

  for (const char of characteristics) {
    await prisma.assetCharacteristic.upsert({
      where: {
        asset_id_characteristic_id: {
          asset_id: assetId,
          characteristic_id: char.id,
        },
      },
      update: {},
      create: {
        asset_id: assetId,
        characteristic_id: char.id,
        enabled: 0,
      },
    });
  }
}

/**
 * Computes risk metrics and quadrant placement for an asset
 */
export function calculateRiskProfile(
  characteristics: { characteristic: { risk_level: string; weight: number }; enabled: number }[],
  attributes: { attribute: { risk_level: string; weight: number }; status: string }[]
): RiskMetrics {
  // 1. Inherent Exposure Score (X axis)
  let totalCharacteristicWeight = 0;
  let maxPossibleCharacteristicWeight = 0;

  for (const c of characteristics) {
    const w = c.characteristic.weight || RISK_WEIGHTS[c.characteristic.risk_level] || 5;
    maxPossibleCharacteristicWeight += w;
    if (c.enabled === 1) {
      totalCharacteristicWeight += w;
    }
  }

  // Normalize inherent exposure score to 0 - 100
  const inherentScore = maxPossibleCharacteristicWeight > 0
    ? Math.round((totalCharacteristicWeight / maxPossibleCharacteristicWeight) * 100)
    : 0;

  let inherentLevel: "Critical" | "High" | "Medium" | "Low" = "Low";
  if (inherentScore >= 60) inherentLevel = "Critical";
  else if (inherentScore >= 40) inherentLevel = "High";
  else if (inherentScore >= 20) inherentLevel = "Medium";

  // 2. Security Attribute Deficiencies (Y axis)
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let criticalNonCompliantCount = 0;
  let highNonCompliantCount = 0;
  let notAssessedCount = 0;
  let notApplicableCount = 0;
  let totalAssessedOrApplicable = 0;

  for (const a of attributes) {
    const riskLevel = a.attribute.risk_level;
    if (a.status === "Complies") {
      compliantCount++;
      totalAssessedOrApplicable++;
    } else if (a.status === "Non compliant") {
      nonCompliantCount++;
      totalAssessedOrApplicable++;
      if (riskLevel === "Critical") criticalNonCompliantCount++;
      else if (riskLevel === "High") highNonCompliantCount++;
    } else if (a.status === "Not assessed") {
      notAssessedCount++;
      totalAssessedOrApplicable++;
    } else if (a.status === "Not applicable") {
      notApplicableCount++;
    }
  }

  const compliancePercentage = totalAssessedOrApplicable > 0
    ? Math.round((compliantCount / totalAssessedOrApplicable) * 100)
    : 0;

  // Quadrant coordinates (0 to 100):
  // X: Inherent Exposure (Characteristics)
  // X = 50 is center divide.
  const quadrantX = Math.min(Math.max(inherentScore, 5), 95);

  // Y: Critical Deficiencies
  // User spec: "the top right will show assets where there are at least 1 critical attribute,
  // the further to the top right the more critical attributes etc."
  // Y >= 50 represents 1 or more critical non-compliant attributes!
  let quadrantY = 10;
  if (criticalNonCompliantCount > 0) {
    // 50 (1 critical) up to 95 (4+ critical)
    quadrantY = Math.min(50 + (criticalNonCompliantCount * 12) + (highNonCompliantCount * 4), 95);
  } else if (highNonCompliantCount > 0) {
    // High non-compliant only: 30 - 45
    quadrantY = Math.min(25 + (highNonCompliantCount * 6), 45);
  } else if (notAssessedCount > 0) {
    // Not assessed: neutral 20 - 30
    quadrantY = Math.min(15 + Math.round((notAssessedCount / (attributes.length || 1)) * 15), 30);
  } else {
    // All compliant: 5 - 15
    quadrantY = 10;
  }

  // Quadrants definition:
  // 1: Top-Right (X >= 50 && Y >= 50) -> Critical Focus (High Exposure + Critical Attribute Deficiencies)
  // 2: Top-Left  (X < 50 && Y >= 50)  -> Internal Vulnerability (Lower Exposure + Critical Attribute Deficiencies)
  // 3: Bottom-Left (X < 50 && Y < 50) -> Low Risk (Lower Exposure + Compliant Controls)
  // 4: Bottom-Right (X >= 50 && Y < 50) -> Hardened Critical (High Exposure + Compliant Controls)
  let quadrant: 1 | 2 | 3 | 4 = 3;
  if (quadrantX >= 50 && quadrantY >= 50) quadrant = 1;
  else if (quadrantX < 50 && quadrantY >= 50) quadrant = 2;
  else if (quadrantX < 50 && quadrantY < 50) quadrant = 3;
  else quadrant = 4;

  return {
    inherentScore,
    inherentLevel,
    totalAttributes: attributes.length,
    compliantCount,
    nonCompliantCount,
    criticalNonCompliantCount,
    highNonCompliantCount,
    notAssessedCount,
    notApplicableCount,
    compliancePercentage,
    quadrantX,
    quadrantY,
    quadrant,
  };
}
