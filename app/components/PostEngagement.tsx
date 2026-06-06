"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ReactionKey = "like" | "love" | "insightful" | "support";

interface CommentItem {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

interface InteractionState {
  reactions: Record<ReactionKey, number>;
  comments: CommentItem[];
}

interface PostEngagementProps {
  slug: string;
  title: string;
  url: string;
  compact?: boolean;
  commentsOpen?: boolean;
}

const REACTIONS: Array<{ key: ReactionKey; label: string; icon: string }> = [
  { key: "like", label: "Thích", icon: "👍" },
  { key: "love", label: "Yêu thích", icon: "❤️" },
  { key: "insightful", label: "Hữu ích", icon: "💡" },
  { key: "support", label: "Ủng hộ", icon: "🙌" },
];

function emptyState(): InteractionState {
  return {
    reactions: { like: 0, love: 0, insightful: 0, support: 0 },
    comments: [],
  };
}

function shareTargets(url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const fullText = encodeURIComponent(`${title} ${url}`);
  return [
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Viber", href: `viber://forward?text=${fullText}` },
  ];
}

export default function PostEngagement({ slug, title, url, compact = false, commentsOpen = false }: PostEngagementProps) {
  const [state, setState] = useState<InteractionState>(emptyState);
  const [myReaction, setMyReaction] = useState<ReactionKey | "">("");
  const [copied, setCopied] = useState(false);
  const [commentOpen, setCommentOpen] = useState(commentsOpen);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const storageKey = `post-engagement:${slug}:reaction`;
  const authorKey = "post-engagement:comment-author";
  const targets = useMemo(() => shareTargets(url, title), [url, title]);
  const totalReactions = REACTIONS.reduce((sum, item) => sum + (state.reactions[item.key] || 0), 0);

  useEffect(() => {
    let cancelled = false;
    const localTimer = window.setTimeout(() => {
      if (cancelled) return;
      setMyReaction((window.localStorage.getItem(storageKey) as ReactionKey | null) || "");
      setAuthor(window.localStorage.getItem(authorKey) || "");
    }, 0);
    fetch(`/api/posts/interactions?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : emptyState())
      .then((data) => {
        if (!cancelled) setState({ ...emptyState(), ...data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      window.clearTimeout(localTimer);
    };
  }, [authorKey, slug, storageKey]);

  const chooseReaction = async (reaction: ReactionKey) => {
    const previousReaction = myReaction;
    const nextReaction = previousReaction === reaction ? "" : reaction;
    setMyReaction(nextReaction);
    window.localStorage.setItem(storageKey, nextReaction);
    setState((current) => {
      const next = { ...current, reactions: { ...current.reactions } };
      if (previousReaction) next.reactions[previousReaction] = Math.max(0, next.reactions[previousReaction] - 1);
      if (nextReaction) next.reactions[nextReaction] += 1;
      return next;
    });

    try {
      const response = await fetch("/api/posts/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, reaction: nextReaction, previousReaction }),
      });
      if (response.ok) setState(await response.json());
    } catch {
      setNotice("Chưa đồng bộ được cảm xúc, mình sẽ thử lại khi bạn thao tác tiếp.");
    }
  };

  const shareNative = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setNotice("Không mở được bảng chia sẻ, bạn có thể dùng các nút nền tảng bên dưới.");
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      window.localStorage.setItem(authorKey, author.trim());
      const response = await fetch("/api/posts/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: "comment", author, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được bình luận.");
      setState(data);
      setMessage("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không gửi được bình luận.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`post-engagement ${compact ? "compact" : ""}`} aria-label="Tương tác bài viết">
      <div className="engagement-summary">
        <span>{totalReactions} cảm xúc</span>
        <button type="button" onClick={() => setCommentOpen((value) => !value)}>
          {state.comments.length} bình luận
        </button>
      </div>

      <div className="reaction-row">
        {REACTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={myReaction === item.key ? "active" : ""}
            onClick={() => chooseReaction(item.key)}
            aria-pressed={myReaction === item.key}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
            <strong>{state.reactions[item.key] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="share-row social-share-row">
        <button type="button" onClick={shareNative}>{copied ? "Đã sao chép" : "Chia sẻ"}</button>
        {targets.map((target) => (
          <a key={target.label} href={target.href} target="_blank" rel="noreferrer">
            {target.label}
          </a>
        ))}
      </div>

      {notice ? <p className="engagement-notice">{notice}</p> : null}

      {commentOpen ? (
        <div className="comment-panel" id={`comments-${slug}`}>
          {state.comments.length > 0 ? (
            <div className="comment-list">
              {state.comments.slice().reverse().map((comment) => (
                <article key={comment.id} className="comment-item">
                  <div>
                    <strong>{comment.author}</strong>
                    <span>{new Date(comment.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <p>{comment.message}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="comment-empty">Chưa có bình luận nào.</p>
          )}

          {!compact ? (
            <form className="comment-form" onSubmit={submitComment}>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Tên của bạn"
                maxLength={80}
              />
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Viết bình luận..."
                rows={3}
                maxLength={1200}
              />
              <button type="submit" disabled={saving || !message.trim()}>
                {saving ? "Đang gửi" : "Gửi bình luận"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
