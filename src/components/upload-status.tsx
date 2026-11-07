import { XIcon } from "lucide-react";
import type { UploadFailure } from "@/hooks/use-uploader";

export const IMAGE_ACCEPT = "image/*,.heic,.heif";

export function UploadStatus({
  total,
  finished,
  failures,
  running,
  onDismiss,
}: {
  total: number;
  finished: number;
  failures: UploadFailure[];
  running: boolean;
  onDismiss: () => void;
}) {
  if (total === 0 || (!running && failures.length === 0)) return null;

  return (
    <div
      role="status"
      className="fixed right-6 bottom-6 z-30 max-md:right-4 max-md:bottom-28 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2 rounded-2xl border border-border bg-popover p-4 text-sm shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 font-semibold">
        {running ? `${finished} / ${total} 枚をアップロード中` : `${failures.length} 枚を追加できませんでした`}
        {!running && (
          <button type="button" aria-label="閉じる" className="cursor-pointer" onClick={onDismiss}>
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      {running && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(finished / total) * 100}%` }} />
        </div>
      )}
      {failures.length > 0 && (
        <ul className="flex max-h-32 flex-col gap-1 overflow-auto text-[13px] text-muted-foreground">
          {failures.map((failure) => (
            <li key={failure.name} className="truncate">
              {failure.name}: {failure.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
