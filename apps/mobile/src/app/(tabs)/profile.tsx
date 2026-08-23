import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter, useGlobalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Typography, Button } from "@/components/ui";
import { LogIn, UserCircle, ShieldCheck } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { LOGO_ICON } from "@/constants/brand";

import CustomerProfileScreen from "../customer/profile";
import MerchantProfileScreen from "../merchant/profile";
import DriverProfileScreen from '../driver/profile';

type Role = 'customer' | 'courier' | 'merchant' | 'guest';

export default function ProfileGateway() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ preview?: string; identity?: string }>();
  const isSougAdminPreview = params.preview === "1" && params.identity === "soug-admin";
  const { colors, tokens } = useAppTheme();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (!user) {
          setRole('guest');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        const r = (profile as any)?.role;
        if (isSougAdminPreview && (r === 'founder' || r === 'admin')) {
          setRole('customer');
          return;
        }
        if (r === 'customer') setRole('customer');
        else if (r === 'driver') setRole('courier');
        else if (r === 'merchant') setRole('merchant');
        else setRole('guest');
      } catch (error) {
        console.error("Error checking role in profile gateway:", error);
        if (mounted) setRole('guest');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkRole();
    return () => { mounted = false; };
  }, [isSougAdminPreview]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (role === 'guest') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <View style={styles.content}>
          {/* Header Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
            <Image
              source={LOGO_ICON}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          </View>

          <Typography variant="h1" align="center" style={styles.title}>
            مرحبًا بك في سوق عين الصفراء
          </Typography>

          <Typography variant="body" color="secondary" align="center" style={styles.description}>
            سجّل حسابك للاستفادة من جميع خدمات Soug-XPRESS ومتابعة طلباتك بكل سهولة.
          </Typography>

          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Typography variant="caption" color="secondary" align="right">✓ طلب المنتجات من المتاجر المحلية</Typography>
            </View>
            <View style={styles.featureItem}>
              <Typography variant="caption" color="secondary" align="right">✓ تتبع مباشر لعمليات التوصيل</Typography>
            </View>
            <View style={styles.featureItem}>
              <Typography variant="caption" color="secondary" align="right">✓ حفظ المتاجر والمنتجات المفضلة</Typography>
            </View>
          </View>

          {/* Primary Action */}
          <Button
            title="التسجيل / الدخول"
            onPress={() => router.push("/login")}
            variant="primary"
            size="lg"
            icon={<LogIn size={20} color={colors.textOnBrand} />}
            style={styles.authButton}
          />

          {/* Secondary Info */}
          <View style={[styles.infoBanner, { backgroundColor: colors.bgElevated }]}>
            <ShieldCheck size={18} color={colors.primary} />
            <Typography variant="caption" color="secondary" style={styles.infoText}>
              بياناتك محمية وآمنة وفق معايير Soug-XPRESS.
            </Typography>
          </View>
        </View>
      </View>
    );
  }

  switch (role) {
    case 'customer':
      return <CustomerProfileScreen />;
    case 'courier':
      return <DriverProfileScreen />;
    case 'merchant':
      return <MerchantProfileScreen />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: TOKENS.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xl,
  },
  logoIcon: {
    width: 60,
    height: 60,
  },
  title: {
    marginBottom: TOKENS.spacing.md,
    fontWeight: '700',
  },
  description: {
    marginBottom: TOKENS.spacing.xl,
    lineHeight: 24,
    paddingHorizontal: TOKENS.spacing.md,
  },
  featuresList: {
    width: '100%',
    marginBottom: TOKENS.spacing["2xl"],
    gap: TOKENS.spacing.xs,
  },
  featureItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 4,
  },
  authButton: {
    width: '100%',
    marginBottom: TOKENS.spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    gap: TOKENS.spacing.sm,
    width: '100%',
  },
  infoText: {
    flex: 1,
    textAlign: 'right',
  }
});
