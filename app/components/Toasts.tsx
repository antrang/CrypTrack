"use client";
import { BellRing, X } from "lucide-react";

export interface Toast {
  id: string;
  title: string;
  body: string;
}

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 shadow-xl animate-in"
        >
          <BellRing size={18} className="text-up mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium">{t.title}</div>
            <div className="text-xs text-muted">{t.body}</div>
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-muted hover:text-foreground">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
