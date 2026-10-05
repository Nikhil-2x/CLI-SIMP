import { AlertTriangle, Inbox, Loader2, WifiOff } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <Loader2 className="size-6 animate-spin text-[#2563EB]" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-xs text-slate-400">Fetching from the KavachX data layer…</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Inbox className="size-5" />
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-500">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/50 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
        <WifiOff className="size-5" />
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-900">Data unavailable</p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function AssessmentFailedState({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
      <div>
        <p className="text-sm font-semibold text-red-800">Assessment failed</p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-red-700">{error}</p>
        <p className="mt-2 text-xs text-red-600">Partial scanner results are preserved. Retry resumes from the failed step.</p>
      </div>
    </div>
  );
}
