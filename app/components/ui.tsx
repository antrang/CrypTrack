"use client";
import { clsx } from "./clsx";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-border bg-surface/80 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-foreground">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "up" | "down" | "neutral" | "accent";
  className?: string;
}) {
  const tones: Record<string, string> = {
    up: "bg-up/12 text-up",
    down: "bg-down/12 text-down",
    accent: "bg-accent/12 text-accent",
    neutral: "bg-surface-2 text-muted",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function changeTone(v: number): "up" | "down" | "neutral" {
  if (v > 0) return "up";
  if (v < 0) return "down";
  return "neutral";
}
