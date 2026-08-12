import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Typography, Button } from "@/components/ui";
import { LogIn, ClipboardList, ShieldCheck } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { LOGO_ICON } from "@/constants/brand";

import CustomerOrdersScreen from "./orders-customer";
import CourierOrdersScreen from "./orders-courier";
import MerchantOrdersScreen from "./orders-merchant";

type Role = 'customer' | 'courier' | 'merchant' | 'guest';

export default function OrdersGateway() {
  const router = useRouter();
  const { colors } = useAppTheme();
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
        if (r === 'customer') setRole('customer');
        else if (r === 'driver') setRole('courier');
        else if (r === 'merchant') setRole('merchant');
        else setRole('guest');
      } catch (error) {
        console.error("Error checking role in orders gateway:", error);
        if (mounted) setRole('guest');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkRole();
    return () => { mounted = false; };
  }, []);

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
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
            <ClipboardList size={50} color={colors.primary} />
          </View>
          
          <Typography variant="h2" align="center" style={styles.title}>
            مرحبًا بك في Soug-XPRESS
          </Typography>
          
          <Typography variant="body" color="secondary" align="center" style={styles.description}>
            سجّل حسابك الآن لتتمكن من متابعة طلباتك، والتواصل مع المتاجر والموصلين في عين صفراء.
          </Typography>

          <Button
            title="التسجيل / الدخول"
            onPress={() => router.push("/login")}
            variant="primary"
            size="lg"
            icon={<LogIn size={20} color={colors.textOnBrand} />}
            style={styles.authButton}
          />

          <View style={[styles.infoBanner, { backgroundColor: colors.bgElevated }]}>
            <ShieldCheck size={18} color={colors.primary} />
            <Typography variant="caption" color="secondary" style={styles.infoText}>
              تتبع طلباتك في الوقت الحقيقي بعد تسجيل الدخول.
            </Typography>
          </View>
        </View>
      </View>
    );
  }

  switch (role) {
    case 'customer':
      return <CustomerOrdersScreen />;
    case 'courier':
      return <CourierOrdersScreen />;
    case 'merchant':
      return <MerchantOrdersScreen />;
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
  title: {
    marginBottom: TOKENS.spacing.md,
    fontWeight: '700',
  },
  description: {
    marginBottom: TOKENS.spacing.xl,
    lineHeight: 24,
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
