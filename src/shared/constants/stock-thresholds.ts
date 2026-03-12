export const DEFAULT_STOCK_THRESHOLDS = [
  { bloodType: "A+", threshold: 30 },
  { bloodType: "A-", threshold: 20 },
  { bloodType: "B+", threshold: 30 },
  { bloodType: "B-", threshold: 15 },
  { bloodType: "AB+", threshold: 20 },
  { bloodType: "AB-", threshold: 10 },
  { bloodType: "O+", threshold: 40 },
  { bloodType: "O-", threshold: 25 },
] as const;

const stockThresholdMap = new Map<string, number>(
  DEFAULT_STOCK_THRESHOLDS.map((item) => [item.bloodType, item.threshold])
);

export function getDefaultStockThreshold(bloodType: string): number {
  return stockThresholdMap.get(bloodType) ?? 0;
}

export function resolveStockThreshold(
  bloodType: string,
  threshold?: number | null
): number {
  if (typeof threshold === "number" && threshold > 0) {
    return threshold;
  }

  return getDefaultStockThreshold(bloodType);
}
