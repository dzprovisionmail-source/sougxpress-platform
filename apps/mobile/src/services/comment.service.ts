import { supabase } from "../lib/supabase";

export interface GalleryComment {
  id: string;
  target_type: string;
  target_id: string;
  user_id: string;
  user_role: string;
  comment_text: string;
  created_at: string;
}

export const getCommentsForTarget = async (
  targetType: string,
  targetId: string
): Promise<GalleryComment[]> => {
  if (!targetType || !targetId) return [];
  const { data, error } = await supabase
    .from("gallery_comments")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
  return (data as GalleryComment[]) || [];
};

export const addComment = async (
  targetType: string,
  targetId: string,
  userId: string,
  userRole: string,
  commentText: string
): Promise<{ comment: GalleryComment | null; error: string | null }> => {
  if (!targetType || !targetId || !userId || !commentText.trim()) {
    return { comment: null, error: "بيانات غير مكتملة" };
  }

  const { data, error } = await supabase
    .from("gallery_comments")
    .insert({
      target_type: targetType,
      target_id: targetId,
      user_id: userId,
      user_role: userRole,
      comment_text: commentText.trim(),
    })
    .select()
    .single();

  if (error) {
    return { comment: null, error: error.message || "فشل إضافة التعليق" };
  }
  return { comment: data as GalleryComment, error: null };
};
