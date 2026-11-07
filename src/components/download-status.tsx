import { DownloadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DownloadState } from "@/hooks/use-photo-download";

export function DownloadStatus({
  state,
  onShare,
  onDismiss,
}: {
  state: DownloadState;
  onShare: () => void;
  onDismiss: () => void;
}) {
  if (state.kind === "idle") return null;

  return (
    <div
      role="status"
      className="fixed right-6 bottom-24 z-40 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2 rounded-2xl border border-border bg-popover p-4 text-sm shadow-lg max-md:right-4 max-md:bottom-36"
    >
      <div className="flex items-center justify-between gap-2 font-semibold">
        {state.kind === "fetching" && `${state.done} / ${state.total} 枚を準備中`}
        {state.kind === "ready" && `${state.files.length} 枚の準備ができました`}
        {state.kind === "error" && <span className="text-destructive">{state.message}</span>}
        {state.kind !== "fetching" && (
          <button type="button" aria-label="閉じる" className="cursor-pointer" onClick={onDismiss}>
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      {state.kind === "fetching" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(state.done / state.total) * 100}%` }} />
        </div>
      )}
      {state.kind === "ready" && (
        <Button size="pill" className="font-semibold" onClick={onShare}>
          <DownloadIcon />
          写真を保存
        </Button>
      )}
    </div>
  );
}
