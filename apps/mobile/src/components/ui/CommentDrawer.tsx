import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { getCommentsForTarget, addComment, GalleryComment } from "@/services/comment.service";

interface CommentDrawerProps {
  visible: boolean;
  targetType: "gallery_image" | "product";
  targetId: string;
  currentUserId?: string;
  currentUserRole?: string;
  onClose: () => void;
}

const CommentDrawer: React.FC<CommentDrawerProps> = ({
  visible,
  targetType,
  targetId,
  currentUserId,
  currentUserRole,
  onClose,
}) => {
  const { colors, tokens } = useAppTheme();
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getCommentsForTarget(targetType, targetId);
    setComments(data);
    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => {
    if (visible) {
      load();
    }
  }, [visible, load]);

  const handleSend = async () => {
    if (!text.trim() || !currentUserId) {
      Alert.alert("تنبيه", "يرجى كتابة تعليق أولاً");
      return;
    }
    setSubmitting(true);
    const { comment, error } = await addComment(
      targetType,
      targetId,
      currentUserId,
      currentUserRole || "customer",
      text
    );
    setSubmitting(false);
    if (error) {
      Alert.alert("خطأ", error);
    } else if (comment) {
      setComments((prev) => [...prev, comment]);
      setText("");
    }
  };

  const renderItem = ({ item }: { item: GalleryComment }) => (
    <View style={[styles.commentBubble, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
      <Text style={[styles.commentRole, { color: colors.primary }]}>
        {item.user_role === "merchant" ? "تاجر" : item.user_role === "courier" ? "مندوب" : "عميل"}
      </Text>
      <Text style={[styles.commentText, { color: colors.textPrimary }]}>{item.comment_text}</Text>
      <Text style={[styles.commentDate, { color: colors.textDisabled }]}>
        {new Date(item.created_at).toLocaleString("ar-DZ")}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>التعليقات</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: tokens.spacing.md, flexGrow: 1 }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                لا توجد تعليقات بعد. كن أول من يعلق!
              </Text>
            }
            refreshing={loading}
            onRefresh={load}
          />

          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="اكتب تعليقاً..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={submitting || !text.trim()}
              style={[styles.sendBtn, { backgroundColor: submitting || !text.trim() ? colors.textDisabled : colors.primary }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: TOKENS.radius.lg,
    borderTopRightRadius: TOKENS.radius.lg,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  commentBubble: {
    padding: TOKENS.spacing.sm,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.sm,
  },
  commentRole: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    textAlign: "right",
    lineHeight: 20,
  },
  commentDate: {
    fontSize: 10,
    textAlign: "left",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: TOKENS.spacing.xl,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: TOKENS.radius.full,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    fontSize: 14,
    textAlign: "right",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CommentDrawer;
