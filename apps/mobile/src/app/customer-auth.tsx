import React from "react";
import { AuthScreen } from "../components/auth/AuthScreen";

export default function CustomerAuthPage() {
  return (
    <AuthScreen 
      role="customer"
      titleAr="تسجيل دخول العميل"
      subtitleAr="اكتشف المتاجر المحلية واطلب ما تحتاجه"
    />
  );
}
