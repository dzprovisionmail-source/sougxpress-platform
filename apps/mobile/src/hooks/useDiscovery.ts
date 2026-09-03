import { useCallback, useEffect, useMemo, useState } from 'react';
import { DiscoveryLocation, DiscoverySnapshot, DEFAULT_DISCOVERY_CONFIG } from '@/features/marketplace/discovery/discovery.types';
import { evaluateDiscovery } from '@/features/marketplace/discovery/discovery.engine';

const TTL_MS = 5 * 60_000;

export const useDiscovery = <TStore = any, TProduct = any>(params: {
  stores: TStore[];
  products: TProduct[];
  mostLikedProducts: TProduct[];
  location: DiscoveryLocation;
  zoneNames: Record<string, string>;
}) => {
  const { stores, products, mostLikedProducts, location, zoneNames } = params;
  const [epoch, setEpoch] = useState(0);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState(0);

  const refresh = useCallback(() => setEpoch((value) => value + 1), []);
  const evaluationNow = useMemo(
    () => Date.now(),
    [epoch, stores, products, mostLikedProducts, location, zoneNames],
  );
  const snapshot = useMemo<DiscoverySnapshot<TStore, TProduct>>(() => ({
    stores,
    products,
    mostLikedProducts,
    context: {
      now: evaluationNow,
      location,
      zoneNames,
      sessionEpoch: epoch,
    },
  }), [stores, products, mostLikedProducts, location, zoneNames, epoch, evaluationNow]);

  const discovery = useMemo(() => evaluateDiscovery(snapshot, DEFAULT_DISCOVERY_CONFIG), [snapshot]);

  useEffect(() => {
    setLastEvaluatedAt(discovery.generatedAt);
  }, [discovery.generatedAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastEvaluatedAt >= TTL_MS) refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [lastEvaluatedAt, refresh]);

  return { ...discovery, refresh, isStale: Date.now() - lastEvaluatedAt >= TTL_MS };
};
