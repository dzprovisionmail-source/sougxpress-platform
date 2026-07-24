import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { Play } from "lucide-react-native";
import InlineVideoPlayer from "./InlineVideoPlayer";
import VideoUnavailableCard from "./VideoUnavailableCard";

const { width: SW } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SW * 0.7, 280);

export interface PublicVideoCardProps {
  provider: string;
  embed_url: string;
  embed_html: string | null;
  thumbnail_url: string | null;
  title: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  youtube: "يوتيوب",
  facebook: "فيسبوك",
  tiktok: "تيك توك",
  instagram: "إنستغرام",
};

const PROVIDER_COLORS: Record<string, string> = {
  youtube: "#FF0000",
  facebook: "#1877F2",
  tiktok: "#000000",
  instagram: "#E4405F",
};

export default function PublicStoreVideoCard(props: PublicVideoCardProps) {
  const { colors, tokens } = useAppTheme();
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  const providerLabel = PROVIDER_LABELS[props.provider] ?? props.provider;
  const providerColor = PROVIDER_COLORS[props.provider] ?? colors.primary;

  return (
    <View style={[styles.wrap, { width: CARD_WIDTH }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setPlayerError(false);
          setShowPlayer(true);
        }}
        style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
      >
        <View style={styles.mediaArea}>
          {props.thumbnail_url ? (
            <Image source={{ uri: props.thumbnail_url }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: "#1a1a2e" }]}>
              <Play size={32} color={colors.primary} fill={colors.primary} />
            </View>
          )}
          <View style={styles.playOverlay}>
            <View style={[styles.playCircle, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
              <Play size={22} color="#fff" fill="#fff" />
            </View>
          </View>
          <View style={[styles.providerBadge, { backgroundColor: providerColor }]}>
            <Text style={styles.providerText}>{providerLabel}</Text>
          </View>
        </View>
        <View style={{ padding: tokens.spacing.sm }}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {props.title || "فيديو"}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showPlayer} transparent animationType="fade" onRequestClose={() => setShowPlayer(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSurface }]}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{props.title || "فيديو"}</Text>
              <TouchableOpacity onPress={() => setShowPlayer(false)}>
                <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>إغلاق</Text>
              </TouchableOpacity>
            </View>

            {playerError ? (
              <VideoUnavailableCard />
            ) : (
              <InlineVideoPlayer
                embed_url={props.embed_url}
                embed_html={props.embed_html}
                thumbnail_url={props.thumbnail_url}
                title={props.title}
                provider={props.provider}
                onError={() => setPlayerError(true)}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  mediaArea: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  placeholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  providerBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    padding: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  closeBtn: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
