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
import { type ComponentProps, type TouchEvent, useEffect, useRef, useState } from "react";
import { SheetHandle } from "@/components/ui/dialog";
import { formatBytes, formatDateTime, formatShortDateTime } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";

const SWIPE_DISTANCE = 50;

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
        "flex size-11 cursor-pointer items-center justify-center rounded-full text-[#f4f4f5] hover:bg-white/10 max-sm:size-12",
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
        "flex size-12 flex-none cursor-pointer items-center justify-center rounded-full bg-white/10 text-[#f4f4f5] hover:bg-white/20 max-sm:absolute max-sm:inset-y-0 max-sm:z-10 max-sm:h-auto max-sm:w-16 max-sm:rounded-none max-sm:bg-transparent max-sm:hover:bg-transparent",
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
  // スマホでは詳細が写真に重なるので、閉じた状態から始める
  const [info, setInfo] = useState(() => window.matchMedia("(min-width: 640px)").matches);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const photo = photos[index];
  const step = (delta: number) => onIndexChange((index + delta + photos.length) % photos.length);

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(touch.clientY - start.y)) {
      step(dx < 0 ? 1 : -1);
    }
  }

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

  const actions = (
    <>
      {onToggleFavorite && (
        <ToolButton
          aria-label="お気に入り"
          aria-pressed={photo.favorite}
          onClick={() => onToggleFavorite(photo)}
        >
          <HeartIcon className={cn("size-5 max-sm:size-6", photo.favorite && "fill-current")} />
        </ToolButton>
      )}
      {canDownload && (
        <a
          aria-label="ダウンロード"
          href={photoUrl(photo.id, "original", shareToken)}
          download={photo.fileName}
          className="flex size-11 items-center justify-center rounded-full text-[#f4f4f5] hover:bg-white/10 max-sm:size-12"
        >
          <DownloadIcon className="size-5 max-sm:size-6" />
        </a>
      )}
      {onDelete && (
        <ToolButton aria-label="写真を削除" className="max-sm:order-last" onClick={() => onDelete(photo)}>
          <Trash2Icon className="size-5 max-sm:size-6" />
        </ToolButton>
      )}
      <ToolButton
        aria-label="詳細情報"
        aria-pressed={info}
        onClick={() => setInfo(!info)}
        className={cn(info && "bg-white/14")}
      >
        <InfoIcon className="size-5 max-sm:size-6" />
      </ToolButton>
    </>
  );

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-40 flex flex-col overflow-auto bg-[#0b0b0c] text-[#f4f4f5] outline-none max-sm:overflow-hidden"
        >
          <DialogPrimitive.Title className="sr-only">写真の拡大表示</DialogPrimitive.Title>
          <div className="flex h-14 flex-none items-center justify-between px-1.5 sm:hidden">
            <DialogPrimitive.Close asChild>
              <ToolButton aria-label="閉じる" className="max-sm:size-11">
                <XIcon className="size-6" />
              </ToolButton>
            </DialogPrimitive.Close>
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold">{formatShortDateTime(photo.takenAt)}</span>
              <span className="text-xs text-[#a1a1aa]">
                {index + 1} / {photos.length}
              </span>
            </div>
            <span aria-hidden="true" className="w-11" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 max-sm:hidden">
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
            <div className="flex items-center gap-1">{actions}</div>
          </div>
          <div className="flex min-h-0 flex-1 flex-wrap max-sm:flex-nowrap">
            <div
              className="flex min-h-[360px] min-w-0 flex-[999_1_560px] touch-pan-y touch-pinch-zoom items-center justify-center gap-3 px-4 pt-2 pb-6 max-sm:relative max-sm:min-h-0 max-sm:flex-1 max-sm:p-0"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {photos.length > 1 && (
                <StepButton aria-label="前の写真" className="max-sm:left-0" onClick={() => step(-1)}>
                  <ChevronLeftIcon className="size-[22px] max-sm:hidden" />
                </StepButton>
              )}
              <img
                key={photo.id}
                src={photoUrl(photo.id, "display", shareToken)}
                alt={photo.fileName}
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                className="h-[min(68vh,640px)] max-w-[calc(100%-7.5rem)] rounded-sm object-contain max-sm:absolute max-sm:inset-0 max-sm:size-full max-sm:max-w-none max-sm:rounded-none"
              />
              {photos.length > 1 && (
                <StepButton aria-label="次の写真" className="max-sm:right-0" onClick={() => step(1)}>
                  <ChevronRightIcon className="size-[22px] max-sm:hidden" />
                </StepButton>
              )}
            </div>
            {info && (
              <aside
                aria-label="写真の詳細"
                className="flex max-w-full flex-[1_1_300px] flex-col gap-5 border-l border-[#27272a] px-6 pt-2 pb-6 text-sm max-sm:absolute max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-20 max-sm:gap-4 max-sm:rounded-t-[20px] max-sm:border-l-0 max-sm:bg-[#1c1c1f] max-sm:px-5 max-sm:pt-2.5 max-sm:pb-8"
              >
                <SheetHandle />
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 flex-col gap-1 max-sm:gap-0.5">
                    <span className="text-base font-semibold break-all">{photo.fileName}</span>
                    <span className="text-[#a1a1aa]">{formatDateTime(photo.takenAt)}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="詳細を閉じる"
                    onClick={() => setInfo(false)}
                    className="-mt-2 -mr-3 flex size-11 flex-none cursor-pointer items-center justify-center text-[#a1a1aa] sm:hidden"
                  >
                    <XIcon className="size-5" />
                  </button>
                </div>
                <dl className="grid grid-cols-[88px_1fr] gap-3 max-sm:gap-y-2.5">
                  <dt className="text-[#a1a1aa]">場所</dt>
                  <dd>
                    {hasLocation
                      ? `${photo.latitude!.toFixed(4)}, ${photo.longitude!.toFixed(4)}`
                      : "—"}
                  </dd>
                  <dt className="text-[#a1a1aa]">カメラ</dt>
                  <dd>{photo.camera ?? "—"}</dd>
                  <dt className="text-[#a1a1aa] max-sm:hidden">設定</dt>
                  <dd className="max-sm:hidden">{photo.exposure ?? "—"}</dd>
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
          {photos.length > 1 && (
            <p className="pt-2 text-center text-xs text-[#a1a1aa] sm:hidden">左右にスワイプで前後の写真へ</p>
          )}
          <div className="flex h-[84px] flex-none items-center justify-around px-3 pb-5 sm:hidden">{actions}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
