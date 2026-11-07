import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  HeartIcon,
  InfoIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type ComponentProps, type MouseEvent, type TouchEvent, useEffect, useRef, useState } from "react";
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
  hidden?: boolean;
  latitude: number | null;
  longitude: number | null;
  addedBy: string | null;
  deletable?: boolean;
};

function ToolButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full text-[#f4f4f5] hover:bg-white/10 max-md:size-12",
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
        "flex size-12 flex-none cursor-pointer items-center justify-center rounded-full bg-white/10 text-[#f4f4f5] hover:bg-white/20 max-md:absolute max-md:inset-y-0 max-md:z-10 max-md:h-auto max-md:w-16 max-md:rounded-none max-md:bg-transparent max-md:hover:bg-transparent",
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
  paused = false,
  onIndexChange,
  onClose,
  onToggleFavorite,
  onToggleHidden,
  onDelete,
}: {
  photos: T[];
  index: number;
  shareToken?: string;
  canDownload: boolean;
  paused?: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onToggleFavorite?: (photo: T) => void;
  onToggleHidden?: (photo: T) => void;
  onDelete?: (photo: T) => void;
}) {
  // スマホでは詳細が写真に重なるので、閉じた状態から始める
  const [info, setInfo] = useState(() => window.matchMedia("(min-width: 768px)").matches);
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

  // ブラウザの戻るで写真一覧に戻れるよう、開いている間だけ同じ URL の履歴を1つ積む
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    let pushed = true;
    history.pushState({ ...history.state, selfyLightbox: true }, "");
    const onPopState = () => {
      if (!pushed) return;
      pushed = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // ×ボタンや削除で閉じたときは、積んだ履歴を戻しておく
      if (pushed) history.back();
    };
  }, []);

  // 写真の外の黒い部分を押したら閉じる。写真は枠いっぱいに縮小して置くので、余白も img の上にある
  function onStageClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) return onClose();
    if (!(event.target instanceof HTMLImageElement)) return;
    const box = event.target.getBoundingClientRect();
    const ratio = photo.width / photo.height;
    const width = Math.min(box.width, box.height * ratio);
    const height = Math.min(box.height, box.width / ratio);
    const left = box.left + (box.width - width) / 2;
    const top = box.top + (box.height - height) / 2;
    const inside =
      event.clientX >= left && event.clientX <= left + width && event.clientY >= top && event.clientY <= top + height;
    if (!inside) onClose();
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
          <HeartIcon className={cn("size-5 max-md:size-6", photo.favorite && "fill-current")} />
        </ToolButton>
      )}
      {onToggleHidden && (
        <ToolButton
          aria-label={photo.hidden ? "表示する" : "非表示にする"}
          title={photo.hidden ? "表示する" : "非表示にする"}
          onClick={() => onToggleHidden(photo)}
        >
          {photo.hidden ? (
            <EyeIcon className="size-5 max-md:size-6" />
          ) : (
            <EyeOffIcon className="size-5 max-md:size-6" />
          )}
        </ToolButton>
      )}
      {canDownload && (
        <a
          aria-label="ダウンロード"
          href={photoUrl(photo.id, "original", shareToken)}
          download={photo.fileName}
          className="flex size-11 items-center justify-center rounded-full text-[#f4f4f5] hover:bg-white/10 max-md:size-12"
        >
          <DownloadIcon className="size-5 max-md:size-6" />
        </a>
      )}
      {onDelete && photo.deletable && (
        <ToolButton aria-label="写真を削除" className="max-md:order-last" onClick={() => onDelete(photo)}>
          <Trash2Icon className="size-5 max-md:size-6" />
        </ToolButton>
      )}
      <ToolButton
        aria-label="詳細情報"
        aria-pressed={info}
        onClick={() => setInfo(!info)}
        className={cn(info && "bg-white/14")}
      >
        <InfoIcon className="size-5 max-md:size-6" />
      </ToolButton>
    </>
  );

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-40 flex flex-col overflow-auto bg-[#0b0b0c] text-[#f4f4f5] outline-none max-md:overflow-hidden"
        >
          <DialogPrimitive.Title className="sr-only">写真の拡大表示</DialogPrimitive.Title>
          <div className="flex h-14 flex-none items-center justify-between px-1.5 md:hidden">
            <DialogPrimitive.Close asChild>
              <ToolButton aria-label="閉じる" className="max-md:size-11">
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
          <div className="flex items-center justify-between gap-3 px-4 py-3 max-md:hidden">
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
          <div className="flex min-h-0 flex-1 flex-wrap max-md:flex-nowrap">
            <div
              className="flex min-h-[360px] min-w-0 flex-[999_1_560px] touch-pan-y touch-pinch-zoom items-center justify-center gap-3 px-4 pt-2 pb-6 max-md:relative max-md:min-h-0 max-md:flex-1 max-md:p-0"
              onClick={onStageClick}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {photos.length > 1 && (
                <StepButton aria-label="前の写真" className="max-md:left-0" onClick={() => step(-1)}>
                  <ChevronLeftIcon className="size-[22px] max-md:hidden" />
                </StepButton>
              )}
              <img
                key={photo.id}
                src={photoUrl(photo.id, "display", shareToken)}
                alt={photo.fileName}
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                className="h-[min(68vh,640px)] max-w-[calc(100%-7.5rem)] rounded-sm object-contain max-md:absolute max-md:inset-0 max-md:size-full max-md:max-w-none max-md:rounded-none"
              />
              {photos.length > 1 && (
                <StepButton aria-label="次の写真" className="max-md:right-0" onClick={() => step(1)}>
                  <ChevronRightIcon className="size-[22px] max-md:hidden" />
                </StepButton>
              )}
            </div>
            {info && (
              <aside
                aria-label="写真の詳細"
                className="flex max-w-full flex-[1_1_300px] flex-col gap-5 border-l border-[#27272a] px-6 pt-2 pb-6 text-sm max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:gap-4 max-md:rounded-t-[20px] max-md:border-l-0 max-md:bg-[#1c1c1f] max-md:px-5 max-md:pt-2.5 max-md:pb-8"
              >
                <SheetHandle />
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 flex-col gap-1 max-md:gap-0.5">
                    <span className="text-base font-semibold break-all">{photo.fileName}</span>
                    <span className="text-[#a1a1aa]">{formatDateTime(photo.takenAt)}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="詳細を閉じる"
                    onClick={() => setInfo(false)}
                    className="-mt-2 -mr-3 flex size-11 flex-none cursor-pointer items-center justify-center text-[#a1a1aa] md:hidden"
                  >
                    <XIcon className="size-5" />
                  </button>
                </div>
                <dl className="grid grid-cols-[88px_1fr] gap-3 max-md:gap-y-2.5">
                  <dt className="text-[#a1a1aa]">場所</dt>
                  <dd>
                    {hasLocation
                      ? `${photo.latitude!.toFixed(4)}, ${photo.longitude!.toFixed(4)}`
                      : "—"}
                  </dd>
                  <dt className="text-[#a1a1aa]">カメラ</dt>
                  <dd>{photo.camera ?? "—"}</dd>
                  <dt className="text-[#a1a1aa] max-md:hidden">設定</dt>
                  <dd className="max-md:hidden">{photo.exposure ?? "—"}</dd>
                  <dt className="text-[#a1a1aa]">サイズ</dt>
                  <dd>
                    {photo.width} × {photo.height} · {formatBytes(photo.originalBytes)}
                  </dd>
                  {photo.addedBy && (
                    <>
                      <dt className="text-[#a1a1aa]">追加した人</dt>
                      <dd className="break-all">{photo.addedBy}</dd>
                    </>
                  )}
                </dl>
              </aside>
            )}
          </div>
          {photos.length > 1 && (
            <p className="pt-2 text-center text-xs text-[#a1a1aa] md:hidden">左右にスワイプで前後の写真へ</p>
          )}
          <div className="flex h-[84px] flex-none items-center justify-around px-3 pb-5 md:hidden">{actions}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
