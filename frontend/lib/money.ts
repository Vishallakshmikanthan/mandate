/**
 * Money utilities for Mandate (Spec 8.1: amounts stored as integer minor units)
 */

export function formatMoney(amountMinor: number | undefined | null, currency: string = "USD"): string {
  if (amountMinor === undefined || amountMinor === null || isNaN(amountMinor)) {
    return "$0.00";
  }
  const dollars = amountMinor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function toMinorUnits(amountDecimal: number | string): number {
  const num = typeof amountDecimal === "string" ? parseFloat(amountDecimal) : amountDecimal;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function toMajorUnits(amountMinor: number): number {
  return amountMinor / 100;
}

