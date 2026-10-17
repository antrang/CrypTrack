"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { fetchNews } from "@/lib/coingecko";
import type { NewsArticle } from "@/lib/types";

function timeAgo(unixSec: number): string {
  if (!unixSec) return "";
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NewsList({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const n = await fetchNews(symbol);
        if (!cancelled) setNews(n);
      } catch {
        if (!cancelled) setNews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return <div className="px-1 py-6 text-sm text-muted">Loading news…</div>;
  }
  if (!news || news.length === 0) {
    return (
      <div className="px-1 py-6 text-sm text-muted flex items-center gap-2">
        <Newspaper size={15} /> No recent news for {symbol}.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {news.map((a) => (
        <li key={a.id}>
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-3 rounded-xl border border-border bg-surface-2/40 p-2.5 hover:border-accent/50 transition-colors"
          >
            {a.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-lg bg-surface grid place-items-center">
                <Newspaper size={18} className="text-muted" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-accent">
                {a.title}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <span className="truncate">{a.source}</span>
                {a.publishedAt > 0 && <span>· {timeAgo(a.publishedAt)}</span>}
                <ExternalLink size={11} className="ml-auto opacity-0 group-hover:opacity-100" />
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
