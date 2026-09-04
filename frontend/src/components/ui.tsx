import React from "react";
import { Loader2 } from "lucide-react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card ${className}`}>
      {children}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  scheduled: "bg-harbor-50 text-harbor-700",
  completed: "bg-clover-50 text-clover-600",
  cancelled: "bg-rose-50 text-rose-500",
  no_show: "bg-clay-50 text-clay-500",
  speech: "bg-harbor-50 text-harbor-700",
  hearing: "bg-violet-50 text-violet-500",
  both: "bg-clover-50 text-clover-600",
  active: "bg-clover-50 text-clover-600",
  inactive: "bg-rose-50 text-rose-500",
};

export function Badge({ label, kind }: { label: string; kind: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        badgeStyles[kind] ?? "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin text-harbor-500" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/50 py-16 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {subtitle ? <p className="max-w-sm text-sm text-slate-500">{subtitle}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-500">{message}</div>
  );
}
