import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, I18nManager, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Typography } from '@/components/ui';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TOKENS } from '@/constants/tokens';
import { LOGO_WORDMARK } from '@/constants/brand';
import { getPlatformPublicProfile, PlatformPublicProfile } from '@/services/platform-profile.service';

export default function PlatformPublicProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { colors, tokens } = useAppTheme();
  const [profile, setProfile] = useState<PlatformPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPlatformPublicProfile(typeof slug === 'string' ? slug : 'soug-admin').then((result) => {
      if (mounted) {
        setProfile(result);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button
            variant="ghost"
            title="رجوع"
            icon={<ArrowLeft size={22} color={colors.textPrimary} style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />}
            onPress={() => router.back()}
            accessibilityLabel="رجوع"
          />
          <Typography variant="title" color="primary">الملف العام</Typography>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : profile ? (
          <Card style={[styles.profileCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Image source={profile.avatar_url ? { uri: profile.avatar_url } : LOGO_WORDMARK} style={styles.avatar} resizeMode="contain" />
            <View style={styles.officialRow}>
              <ShieldCheck size={18} color={colors.primary} />
              <Typography variant="caption" color="secondary">حساب رسمي</Typography>
            </View>
            <Typography variant="h1" color="primary" style={styles.name}>{profile.display_name}</Typography>
            <Typography variant="body" color="secondary" style={styles.bio}>{profile.bio}</Typography>
          </Card>
        ) : (
          <View style={styles.center}>
            <Typography variant="body" color="secondary">الحساب غير متاح</Typography>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: TOKENS.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: TOKENS.spacing.xl },
  headerSpacer: { width: 44 },
  center: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  profileCard: { alignItems: 'center', borderWidth: 1, padding: TOKENS.spacing.xl },
  avatar: { width: 120, height: 120, marginBottom: TOKENS.spacing.md },
  officialRow: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.spacing.xs, marginBottom: TOKENS.spacing.sm },
  name: { textAlign: 'center', writingDirection: 'rtl' },
  bio: { textAlign: 'center', writingDirection: 'rtl', marginTop: TOKENS.spacing.sm },
});
