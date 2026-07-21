import React from "react";
import { AdminPageShell } from "./AdminPageShell";

interface FounderPageShellProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  showNotification?: boolean;
  showProfile?: boolean;
  scrollable?: boolean;
  style?: import("react-native").ViewStyle;
  contentStyle?: import("react-native").ViewStyle;
}

export const FounderPageShell: React.FC<FounderPageShellProps> = (props) => {
  return <AdminPageShell {...props} showLogout />;
};
