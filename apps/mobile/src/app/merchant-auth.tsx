import React from "react";
import { AuthScreen } from "../components/auth/AuthScreen";

export default function MerchantAuthPage() {
  return (
    <AuthScreen 
      role="merchant"
      titleAr="إنشاء حساب التاجر"
      subtitleAr="أنشئ متجرك وابدأ البيع بعد اعتماد حسابك"
    />
  );
}
