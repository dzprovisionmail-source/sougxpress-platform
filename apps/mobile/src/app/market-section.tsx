import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, Award, BadgePlus, MapPin, Store as StoreIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StoreCard } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/design/spacing';
import { typography } from '@/design/typography';
import { iconSizes } from '@/design/icons';

type SectionKey = 'featured' | 'new' | 'nearby' | 'all';

const SECTION_COPY: Record<SectionKey, { title: string; icon: typeof Award }> = {
  featured: { title: 'المتاجر المميزة', icon: Award },
  new: { title: 'المتاجر الجديدة', icon: BadgePlus },
  nearby: { title: 'المتاجر القريبة منك', icon: MapPin },
  all: { title: 'كل المتاجر', icon: StoreIcon },
};

const MarketSectionScreen = () => {
  const router = useRouter();
  const { colors, isRTL } = useAppTheme();
  const { section: rawSection } = useLocalSearchParams<{ section?: string }>();
  const section: SectionKey = rawSection === 'featured' || rawSection === 'new' || rawSection === 'nearby' ? rawSection : 'all';
  const { stores, loading, error } = useStores();
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });

  useEffect(() => {
    if (section !== 'nearby') return;
    let cancelled = false;
    const loadLocation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('customer_addresses').select('latitude, longitude').eq('customer_id', user.id).eq('is_default', true).maybeSingle();
      if (!cancelled) setCustomerLocation({ latitude: data?.latitude ?? null, longitude: data?.longitude ?? null });
    };
    loadLocation().catch(() => undefined);
    return () => { cancelled = true; };
  }, [section]);

  const visibleStores = useMemo(() => {
    const active = stores.filter((store: any) => store.status === 'active');
    if (section === 'featured') return active.filter((store: any) => store.is_featured === true);
    if (section === 'new') return [...active].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (section === 'nearby' && customerLocation.latitude !== null && customerLocation.longitude !== null) {
      const distance = (store: any) => {
        const lat = Number(store.latitude);
        const lon = Number(store.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Number.POSITIVE_INFINITY;
        const dLat = ((lat - customerLocation.latitude!) * Math.PI) / 180;
        const dLon = ((lon - customerLocation.longitude!) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(customerLocation.latitude! * Math.PI / 180) * Math.cos(lat * Math.PI / 180);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      return [...active].sort((a, b) => distance(a) - distance(b));
    }
    return active;
  }, [stores, section, customerLocation]);

  const copy = SECTION_COPY[section];
  const Icon = copy.icon;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="رجوع">
          <ArrowRight size={iconSizes.default} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Icon size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{copy.title}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /><Text style={[styles.status, { color: colors.textSecondary }]}>جاري التحميل...</Text></View>
      ) : error ? (
        <View style={styles.centered}><Text style={[styles.status, { color: colors.error }]}>{error}</Text></View>
      ) : (
        <FlatList
          data={visibleStores}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.centered}><Text style={[styles.status, { color: colors.textSecondary }]}>لا توجد متاجر في هذا القسم حاليًا</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.cell}>
              <StoreCard
                id={item.id}
                name={item.name}
                category={item.category_name || 'غير مصنف'}
                subcategory={item.sub_category}
                rating={item.rating?.toString() || '0.0'}
                coverImage={item.cover_url}
                logoImage={item.logo_url}
                store={item}
                compact
                marketDetails
                isFeatured={item.is_featured}
                address={item.address_line1 ?? item.city ?? ''}
                onPress={() => router.push({ pathname: '/store-details', params: { id: item.id } })}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 58, alignItems: 'center', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  column: { justifyContent: 'space-between' },
  cell: { width: '48.5%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  status: { ...typography.body, textAlign: 'center' },
});

export default MarketSectionScreen;
