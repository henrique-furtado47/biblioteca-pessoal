import { profilesService } from "./profiles.service";
import { supabase } from "./supabase";

export const reviewsService = {
  /** Mapa reviewId -> { likeCount, liked, commentCount } para um conjunto de avaliações. */
  async interactionsMap(reviewIds, meId) {
    if (!reviewIds.length) return {};
    const [likes, comments] = await Promise.all([
      supabase
        .from("review_likes")
        .select("review_id, user_id")
        .in("review_id", reviewIds),
      supabase
        .from("review_comments")
        .select("review_id")
        .in("review_id", reviewIds),
    ]);
    const likeRows = likes.data ?? [];
    const commentRows = comments.data ?? [];
    const map = {};
    for (const rid of reviewIds) {
      const lk = likeRows.filter((x) => x.review_id === rid);
      map[rid] = {
        likeCount: lk.length,
        liked: lk.some((x) => x.user_id === meId),
        commentCount: commentRows.filter((x) => x.review_id === rid).length,
      };
    }
    return map;
  },

  /** Retorna os perfis de quem curtiu uma avaliação, do mais recente ao mais antigo. */
  async getLikers(reviewId) {
    const { data, error } = await supabase
      .from("review_likes")
      .select("user_id, created_at")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    if (!rows.length) return [];
    return profilesService.getByIds(rows.map((r) => r.user_id));
  },

  async toggleLike(reviewId, userId, liked) {
    if (liked) {
      const { error } = await supabase
        .from("review_likes")
        .delete()
        .eq("review_id", reviewId)
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("review_likes")
        .insert({ review_id: reviewId, user_id: userId });
      if (error && error.code !== "23505") throw error;
    }
  },

  async listComments(reviewId, meId) {
    const { data, error } = await supabase
      .from("review_comments")
      .select("id, review_id, user_id, body, parent_id, created_at")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = data ?? [];
    const commentIds = rows.map((r) => r.id);
    const [profiles, likes] = await Promise.all([
      profilesService.getByIds([...new Set(rows.map((r) => r.user_id))]),
      commentIds.length
        ? supabase
            .from("review_comment_likes")
            .select("comment_id, user_id")
            .in("comment_id", commentIds)
        : Promise.resolve({ data: [] }),
    ]);
    const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const likeRows = likes.data ?? [];
    return rows.map((r) => {
      const lk = likeRows.filter((l) => l.comment_id === r.id);
      return {
        ...r,
        author: pMap[r.user_id] || null,
        like_count: lk.length,
        liked: lk.some((l) => l.user_id === meId),
      };
    });
  },

  async addComment(reviewId, userId, body, parentId = null) {
    const { data, error } = await supabase
      .from("review_comments")
      .insert({
        review_id: reviewId,
        user_id: userId,
        body: body.trim(),
        parent_id: parentId,
      })
      .select("id, review_id, user_id, body, parent_id, created_at")
      .single();
    if (error) throw error;
    return data;
  },

  async toggleCommentLike(commentId, userId, liked) {
    if (liked) {
      const { error } = await supabase
        .from("review_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("review_comment_likes")
        .insert({ comment_id: commentId, user_id: userId });
      if (error && error.code !== "23505") throw error;
    }
  },
};
