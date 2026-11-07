import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  HeartIcon,
  InfoIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type ComponentProps, useEffect, useState } from "react";
import { formatBytes, formatDateTime } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";

export type LightboxPhoto = {
  id: string;
  fileName: string;
  takenAt: string;
  width: number;
  height: number;
  originalBytes: number;
  camera: string | null;
  exposure: string | null;
  favorite: boolean;
  latitude: number | null;
  longitude: number | null;
};

function ToolButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full text-[#f4f4f5] hover:bg-white/10",
        className,
      )}
      {...props}
    />
  );
}

function StepButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-12 flex-none cursor-pointer items-center justify-center rounded-full bg-white/10 text-[#f4f4f5] hover:bg-white/20",
        className,
      )}
      {...props}
    />
  );
}

export function Lightbox<T extends LightboxPhoto>({
  photos,
  index,
  shareToken,
  canDownload,
  owner,
  paused = false,
  onIndexChange,
  onClose,
  onToggleFavorite,
  onDelete,
}: {
  photos: T[];
  index: number;
  shareToken?: string;
  canDownload: boolean;
  owner: boolean;
  paused?: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onToggleFavorite?: (photo: T) => void;
  onDelete?: (photo: T) => void;
}) {
  const [info, setInfo] = useState(true);
  const photo = photos[index];
  const step = (delta: number) => onIndexChange((index + delta + photos.length) % photos.length);

  useEffect(() => {
    for (const neighbor of [photos[index - 1], photos[index + 1]]) {
      if (neighbor) new Image().src = photoUrl(neighbor.id, "display", shareToken);
    }
  }, [photos, index, shareToken]);

  // 確認ダイアログを閉じるとフォーカスが body に戻るので window で受ける
  useEffect(() => {
    if (paused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const hasLocation = photo.latitude != null && photo.longitude != null;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-40 flex flex-col overflow-auto bg-[#0b0b0c] text-[#f4f4f5] outline-none"
        >
          <DialogPrimitive.Title className="sr-only">写真の拡大表示</DialogPrimitive.Title>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <DialogPrimitive.Close asChild>
                <ToolButton aria-label="閉じる">
                  <XIcon className="size-[22px]" />
                </ToolButton>
              </DialogPrimitive.Close>
              <span className="text-sm text-[#a1a1aa]">
                {index + 1} / {photos.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onToggleFavorite && (
                <ToolButton
                  aria-label="お気に入り"
                  aria-pressed={photo.favorite}
                  onClick={() => onToggleFavorite(photo)}
                >
                  <HeartIcon className={cn("size-5", photo.favorite && "fill-current")} />
                </ToolButton>
              )}
              {canDownload && (
                <a
                  aria-label="ダウンロード"
                  href={photoUrl(photo.id, "original", shareToken)}
                  download={photo.fileName}
                  className="flex size-11 items-center justify-center rounded-full text-[#f4f4f5] hover:bg-white/10"
                >
                  <DownloadIcon className="size-5" />
                </a>
              )}
              {onDelete && (
                <ToolButton aria-label="写真を削除" onClick={() => onDelete(photo)}>
                  <Trash2Icon className="size-5" />
                </ToolButton>
              )}
              <ToolButton
                aria-label="詳細情報"
                aria-pressed={info}
                onClick={() => setInfo(!info)}
                className={cn(info && "bg-white/14")}
              >
                <InfoIcon className="size-5" />
              </ToolButton>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-wrap">
            <div className="flex min-h-[360px] min-w-0 flex-[999_1_560px] items-center justify-center gap-3 px-4 pt-2 pb-6">
              {photos.length > 1 && (
                <StepButton aria-label="前の写真" onClick={() => step(-1)}>
                  <ChevronLeftIcon className="size-[22px]" />
                </StepButton>
              )}
              <img
                key={photo.id}
                src={photoUrl(photo.id, "display", shareToken)}
                alt={photo.fileName}
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                className="h-[min(68vh,640px)] max-w-[calc(100%-7.5rem)] rounded-sm object-contain max-sm:h-auto"
              />
              {photos.length > 1 && (
                <StepButton aria-label="次の写真" onClick={() => step(1)}>
                  <ChevronRightIcon className="size-[22px]" />
                </StepButton>
              )}
            </div>
            {info && (
              <aside
                aria-label="写真の詳細"
                className="flex max-w-full flex-[1_1_300px] flex-col gap-5 border-l border-[#27272a] px-6 max-sm:border-t max-sm:border-l-0 max-sm:pt-5 pt-2 pb-6 text-sm"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold break-all">{photo.fileName}</span>
                  <span className="text-[#a1a1aa]">{formatDateTime(photo.takenAt)}</span>
                </div>
                <dl className="grid grid-cols-[88px_1fr] gap-3">
                  <dt className="text-[#a1a1aa]">場所</dt>
                  <dd>
                    {hasLocation
                      ? `${photo.latitude!.toFixed(4)}, ${photo.longitude!.toFixed(4)}`
                      : "—"}
                  </dd>
                  <dt className="text-[#a1a1aa]">カメラ</dt>
                  <dd>{photo.camera ?? "—"}</dd>
                  <dt className="text-[#a1a1aa]">設定</dt>
                  <dd>{photo.exposure ?? "—"}</dd>
                  <dt className="text-[#a1a1aa]">サイズ</dt>
                  <dd>
                    {photo.width} × {photo.height} · {formatBytes(photo.originalBytes)}
                  </dd>
                  {owner && (
                    <>
                      <dt className="text-[#a1a1aa]">追加した人</dt>
                      <dd>あなた</dd>
                    </>
                  )}
                </dl>
              </aside>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
