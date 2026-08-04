import React from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  I18nManager 
} from "react-native";
import { Typography } from "./Typography";
import { TOKENS } from "@/constants/tokens";
import { ThemeType, DEFAULT_THEME } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  theme?: ThemeType;
  icon?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onSeeAll,
  theme = DEFAULT_THEME,
  icon,
}) => {
  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.container, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.titleRow, isRTL && { flexDirection: "row-reverse" }]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Typography variant="h2" align="right">
          {title}
        </Typography>
      </View>

      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.button}>
          <Typography variant="caption" color="brand" align="right" style={styles.seeAllText}>
            {"عرض الكل"}
          </Typography>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.sm,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    padding: TOKENS.spacing.xs,
  },
  seeAllText: {
    fontWeight: "600",
  }
});
