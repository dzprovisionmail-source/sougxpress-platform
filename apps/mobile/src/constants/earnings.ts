/**
 * Current delivery and subscription policy.
 * All monetary values are stored in minor units (centimes).
 */

export const FIXED_DELIVERY_FEE_MINOR = 15000; // 150 DZD
export const DRIVER_SUBSCRIPTION_PRICE_MINOR = 50000; // 500 DZD / month
export const MERCHANT_SUBSCRIPTION_PRICE_MINOR = 100000; // 1000 DZD / month
export const SUBSCRIPTION_TRIAL_MONTHS = 1;
export const DRIVER_SHARE_RATE = 1;
export const PLATFORM_SHARE_RATE = 0;

export interface EarningsSplit {
  feeMinor: number;
  driverShareMinor: number;
  platformShareMinor: number;
}

export const computeEarningsSplit = (deliveredCount: number): EarningsSplit => {
  const feeMinor = FIXED_DELIVERY_FEE_MINOR * Math.max(0, deliveredCount);
  return {
    feeMinor,
    driverShareMinor: feeMinor,
    platformShareMinor: 0,
  };
};

export const formatCurrency = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;
