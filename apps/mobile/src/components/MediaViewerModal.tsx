import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  useWindowDimensions,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { X, Heart, Star, Send, Trash2, MessageCircle, Eye } from "lucide-react-native";
import { getPromotionalViews } from "@/services/promotional-views.service";
import { StoreGalleryImage, StoreGalleryComment, Store, MediaType } from "@/types/schema-03-core";
import { Avatar } from "@/components/ui/Avatar";
import {
  getGalleryLikeCount,
  getUserGalleryLike,
  toggleGalleryLike,
  getGalleryComments,
  addGalleryComment,
  deleteGalleryComment,
  getGalleryRating,
  getUserGalleryRating,
  rateGalleryItem,
} from "@/services/store.service";

interface MediaViewerModalProps {
  visible: boolean;
  onClose: () => void;
  mediaItem: (Partial<StoreGalleryImage> & { media_type?: MediaType }) | null;
  store: Store | null;
  currentUserId: string | undefined;
  currentUserRole: string | undefined;
  identity?: string;
  onLikeUpdate?: () => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  visible,
  onClose,
  mediaItem,
  store,
  currentUserId,
  currentUserRole,
  identity,
  onLikeUpdate,
}) => {
  const { colors, tokens } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<StoreGalleryComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [rating, setRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingMode, setRatingMode] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [promoViews, setPromoViews] = useState<number | null>(null);

  const mediaType: MediaType = mediaItem?.media_type ?? "photo";
  const ownerId = store?.created_by ?? null;
  const mediaItemId = mediaItem?.id ?? "";
  const platformProfileSlug =
    identity === "soug-admin" && (currentUserRole === "founder" || currentUserRole === "admin")
      ? "soug-admin"
      : undefined;

  if (!visible || !mediaItem) return null;

  const canDeleteComment = (commentUserId: string): boolean => {
    if (currentUserId && currentUserId === commentUserId) return true;
    if (currentUserId && ownerId && currentUserId === ownerId) return true;
    if (currentUserRole === "founder") return true;
    return false;
  };

  const fetchLikeData = useCallback(async () => {
    if (!mediaItemId) return;
    const count = await getGalleryLikeCount(mediaItemId);
    setLikeCount(count);
    if (currentUserId) {
      const liked = await getUserGalleryLike(mediaItemId, currentUserId);
      setIsLiked(!!liked);
    } else {
      setIsLiked(false);
    }
  }, [mediaItemId, currentUserId]);

  const fetchComments = useCallback(async () => {
    if (!mediaItemId) return;
    setLoadingComments(true);
    const data = await getGalleryComments(mediaItemId);
    setComments(data);
    setLoadingComments(false);
  }, [mediaItemId]);

  const fetchRating = useCallback(async () => {
    if (!mediaItemId) return;
    const r = await getGalleryRating(mediaItemId);
    setRating(r);
    if (currentUserId) {
      const ur = await getUserGalleryRating(mediaItemId, currentUserId);
      setUserRating(ur);
    }
  }, [mediaItemId, currentUserId]);

  useEffect(() => {
    if (visible && mediaItemId) {
      fetchLikeData();
      fetchComments();
      fetchRating();
    }
  }, [visible, mediaItemId, fetchLikeData, fetchComments, fetchRating]);

  useEffect(() => {
    let cancelled = false;
    setPromoViews(null);
    if (!visible || !store?.id) return;

    getPromotionalViews("store", store.id, store.created_at ?? null)
      .then((promoData) => {
        if (cancelled) return;
        const value = promoData?.currentViews;
        setPromoViews(typeof value === "number" && Number.isFinite(value) ? value : null);
      })
      .catch(() => {
        if (!cancelled) setPromoViews(null);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, store?.id, store?.created_at]);

  const handleLikePress = async () => {
    if (!currentUserId) {
      Alert.alert("تسجيل الدخول مطلوب", "الرجاء تسجيل الدخول للمتابعة", [
        { text: "إلغاء", style: "cancel" },
        { text: "تسجيل الدخول", onPress: () => {} },
      ]);
      return;
    }
    setLiking(true);
    try {
      const nowLiked = await toggleGalleryLike(mediaItemId, currentUserId);
      setIsLiked(nowLiked);
      setLikeCount((prev) => (nowLiked ? prev + 1 : prev - 1));
      onLikeUpdate?.();
    } finally {
      setLiking(false);
    }
  };

  const handleRatingPress = async (star: number) => {
    if (!currentUserId) {
      Alert.alert("تسجيل الدخول مطلوب", "الرجاء تسجيل الدخول للمتابعة", [
        { text: "إلغاء", style: "cancel" },
        { text: "تسجيل الدخول", onPress: () => {} },
      ]);
      return;
    }
    setLiking(true);
    try {
      await rateGalleryItem(mediaItemId, currentUserId, star);
      const r = await getGalleryRating(mediaItemId);
      const ur = await getUserGalleryRating(mediaItemId, currentUserId);
      setRating(r);
      setUserRating(ur);
      setRatingMode(false);
    } finally {
      setLiking(false);
    }
  };

  const handleCommentPress = () => {
    if (!currentUserId) {
      Alert.alert("تسجيل الدخول مطلوب", "الرجاء تسجيل الدخول للمتابعة", [
        { text: "إلغاء", style: "cancel" },
        { text: "تسجيل الدخول", onPress: () => {} },
      ]);
      return;
    }
  };

  const handlePostComment = async () => {
    if (!currentUserId || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const result = await addGalleryComment(
        mediaItemId,
        currentUserId,
        commentText,
        platformProfileSlug,
      );
      if (result) {
        setCommentText("");
        await fetchComments();
      }
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!canDeleteComment(commentUserId)) return;
    Alert.alert("حذف التعليق", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const success = await deleteGalleryComment(commentId);
          if (success) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      if (diffHours < 1) return "الآن";
      if (diffHours < 24) return `${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} يوم`;
      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const renderComment = ({ item }: { item: StoreGalleryComment }) => (
    <View style={styles.commentRow}>
      <Avatar uri={item.user_avatar_url} name={item.user_name} size={36} />
      <View style={[styles.commentBubble, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right", marginBottom: 2 }}>
          {item.user_name || "مستخدم"} • {formatDate(item.created_at)}
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: "right", lineHeight: 18 }}>
          {item.content}
        </Text>
      </View>
      {canDeleteComment(item.user_id) && (
        <TouchableOpacity
          onPress={() => handleDeleteComment(item.id, item.user_id)}
          style={{ padding: 4, marginRight: 4 }}
        >
          <Trash2 size={14} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalBackdrop]} />
      </TouchableWithoutFeedback>

      <View style={[styles.modalContainer, { backgroundColor: colors.bgBase }]}>
        <View style={[styles.modalHeader]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {mediaType === "photo" ? (
            <Image
              source={{ uri: mediaItem.image_url }}
              style={{ width: "100%", alignSelf: "stretch", height: screenHeight * 0.65 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, width: "100%", alignSelf: "stretch", height: screenHeight * 0.65 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                [فيديو] {mediaItem.title || ""}
              </Text>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            {mediaItem.title ? (
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 4 }}>
                {mediaItem.title}
              </Text>
            ) : null}
            {mediaItem.caption ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", lineHeight: 18 }}>
                {mediaItem.caption}
              </Text>
            ) : null}
          </View>

          <View style={[styles.actionRow, { borderTopColor: colors.borderSubtle, borderBottomColor: colors.borderSubtle }]}>
            <TouchableOpacity
              onPress={handleLikePress}
              style={styles.actionButton}
              disabled={liking}
            >
              <Heart
                size={22}
                color={isLiked ? colors.error : colors.textSecondary}
                fill={isLiked ? colors.error : "transparent"}
              />
              <Text style={[styles.actionText, { color: isLiked ? colors.error : colors.textPrimary }]}>
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRatingMode(!ratingMode)}
              style={styles.actionButton}
            >
              <Star size={22} color={colors.primary} fill={colors.primary} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                {rating.average > 0
                  ? `${rating.average.toFixed(1)} (${rating.count})`
                  : "قيّم"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCommentPress}
              style={styles.actionButton}
            >
              <MessageCircle size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            {typeof promoViews === "number" && Number.isFinite(promoViews) ? (
              <View style={styles.actionButton}>
                <Eye size={20} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                  {promoViews.toLocaleString("ar-DZ")}
                </Text>
              </View>
            ) : null}
          </View>

          {ratingMode && (
            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRatingPress(star)}
                  disabled={liking}
                >
                  <Star
                    size={24}
                    color={star <= (userRating ?? 0) ? colors.primary : colors.textDisabled}
                    fill={star <= (userRating ?? 0) ? colors.primary : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600", textAlign: "right", marginBottom: 8 }}>
              التعليقات ({comments.length})
            </Text>
            {loadingComments ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : comments.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
                لا توجد تعليقات بعد. كن أول من يعلق!
              </Text>
            ) : (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {currentUserId ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.commentInputBar, { borderTopColor: colors.borderSubtle, backgroundColor: colors.bgElevated }]}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="أضف تعليقًا..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              style={[styles.commentInput, { color: colors.textPrimary, borderColor: colors.borderSubtle }]}
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={postingComment || !commentText.trim()}
              style={{ padding: 8 }}
            >
              {postingComment ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Send size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        ) : (
          <TouchableOpacity
            onPress={handleCommentPress}
            style={[styles.commentInputBar, { borderTopColor: colors.borderSubtle, backgroundColor: colors.bgElevated, padding: 12 }]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right" }}>
              سجّل الدخول لإضافة تعليق
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create<{ [key: string]: ViewStyle | TextStyle | any }>({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: "hidden",
  },
  modalHeader: {
    position: "absolute",
    top: 40,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  scrollContent: {
    flex: 1,
    marginTop: 60,
  },
  fullImage: {
    width: "100%",
    height: 400,
  },
  videoPlaceholder: {
    width: "100%",
    height: 400,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: "auto",
  },
  actionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actionButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  ratingSelector: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  commentRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  commentBubble: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  commentInputBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
  },
});

export default MediaViewerModal;
