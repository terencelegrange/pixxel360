import { prisma } from "./prisma";

export async function isFlagEnabled(key: string): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });
    if (!flag) return true; // default to enabled if unknown
    return flag.enabled === 1;
  } catch {
    return true; // fail open
  }
}
