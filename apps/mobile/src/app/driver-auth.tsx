import React from "react";
import { AuthScreen } from "../components/auth/AuthScreen";

export default function DriverAuthPage() {
  return (
    <AuthScreen 
      role="driver"
      titleAr="تسجيل دخول الموصل"
      subtitleAr="انضم إلى فريق التوصيل بعد الموافقة"
    />
  );
}
