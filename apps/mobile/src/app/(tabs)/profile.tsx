import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Typography, Button } from "@/components/ui";
import { LogIn, UserCircle } from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";

import CustomerProfileScreen from "../customer/profile";
import MerchantProfileScreen from "../merchant/profile";
import DriverProfileScreen from "../driver/profile";

type Role = 'customer' | 'courier' | 'merchant' | 'guest';

export default function ProfileGateway() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole('guest');
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const r = (profile as any)?.role;
        if (r === 'customer') setRole('customer');
        else if (r === 'driver') setRole('courier');
        else if (r === 'merchant') setRole('merchant');
        else setRole('guest');
      } catch (error) {
        console.error("Error checking role in profile gateway:", error);
        setRole('guest');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
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
      <View style={[styles.centered, { backgroundColor: colors.bgBase, padding: TOKENS.spacing.xl }]}>
        <UserCircle size={80} color={colors.textDisabled} style={{ marginBottom: TOKENS.spacing.lg }} />
        
        <Typography variant="h2" align="center" style={{ marginBottom: TOKENS.spacing.md }}>
          حسابي
        </Typography>
        
        <Typography variant="body" color="secondary" align="center" style={{ marginBottom: TOKENS.spacing.xl }}>
          سجل دخولك للوصول إلى طلباتك، مفضلاتك، وإعدادات حسابك الشخصي.
        </Typography>

        {/* Guest Banner - Required by Handoff */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => router.push("/login")}
          style={[styles.guestBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
        >
          <Typography variant="h3" color="brand" align="center">
            يجب عليك التسجيل أولًا
          </Typography>
        </TouchableOpacity>

        <Button
          title="تسجيل الدخول / إنشاء حساب"
          onPress={() => router.push("/login")}
          icon={<LogIn size={20} color={colors.textOnBrand} />}
          style={{ width: '100%', marginTop: TOKENS.spacing.xl }}
        />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBanner: {
    width: '100%',
    padding: TOKENS.spacing.lg,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  }
});
