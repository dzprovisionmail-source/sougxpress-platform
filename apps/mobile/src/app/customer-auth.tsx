import React from "react";
import { AuthScreen } from "../components/auth/AuthScreen";

export default function CustomerAuthPage() {
  return (
    <AuthScreen 
      role="customer"
      titleAr="إنشاء حساب العميل"
      subtitleAr="اكتشف المتاجر المحلية واطلب ما تحتاجه"
    />
  );
}
