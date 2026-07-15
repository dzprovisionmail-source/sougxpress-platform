/**
 * Driver earnings policy for the Driver workspace.
 * The delivery fee paid by the customer is fixed at 150 DZD per delivery,
 * split 80% driver / 20% platform, confirmed by the product owner.
 */

export const FIXED_DELIVERY_FEE_MINOR = 15000; // 150.00 DZD
export const DRIVER_SHARE_RATE = 0.8;
export const PLATFORM_SHARE_RATE = 0.2;

export interface EarningsSplit {
  feeMinor: number;
  driverShareMinor: number;
  platformShareMinor: number;
}

export const computeEarningsSplit = (deliveredCount: number): EarningsSplit => {
  const feeMinor = FIXED_DELIVERY_FEE_MINOR * deliveredCount;
  return {
    feeMinor,
    driverShareMinor: Math.round(feeMinor * DRIVER_SHARE_RATE),
    platformShareMinor: Math.round(feeMinor * PLATFORM_SHARE_RATE),
  };
};

export const formatCurrency = (minor: number) => `${(minor / 100).toFixed(2)} د.ج`;
