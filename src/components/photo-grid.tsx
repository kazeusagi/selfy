import { CheckIcon, EyeOffIcon, HeartIcon } from "lucide-react";
import { type CSSProperties, type TouchEvent, useRef } from "react";
import { MOBILE_COLUMNS_CLASS, useGridColumns } from "@/hooks/use-grid-columns";
import { formatDayHeading } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP = 10;

export type GridPhoto = {
  id: string;
  fileName: string;
  takenAt: string;
  favorite: boolean;
  width?: number;
  height?: number;
  hidden?: boolean;
};

// 長押しで選択を始める。指が動いたらスクロールとみなしてやめる
function useLongPress(onLongPress: (id: string) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  // 長押しのあとに来るクリックで写真が開いたり選択が戻ったりしないようにする
  const fired = useRef(false);

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }

  return {
    consumeClick() {
      const value = fired.current;
      fired.current = false;
      return value;
    },
    handlers: (id: string) => ({
      onTouchStart(event: TouchEvent) {
        cancel();
        fired.current = false;
        if (event.touches.length !== 1) return;
        start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        timer.current = setTimeout(() => {
          timer.current = null;
          fired.current = true;
          onLongPress(id);
        }, LONG_PRESS_MS);
      },
      onTouchMove(event: TouchEvent) {
        const origin = start.current;
        const touch = event.touches[0];
        if (
          event.touches.length !== 1 ||
          !origin ||
          Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > LONG_PRESS_SLOP
        ) {
          cancel();
        }
      },
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    }),
  };
}

export function PhotoGrid<T extends GridPhoto>({
  photos,
  shareToken,
  onOpen,
  selecting = false,
  selectedIds,
  onSelect,
}: {
  photos: T[];
  shareToken?: string;
  onOpen: (photo: T) => void;
  selecting?: boolean;
  selectedIds?: ReadonlySet<string>;
  // 渡すと選択できるようになる。選択を始めるかどうかは呼び出し側が決める
  onSelect?: (photos: T[], selected: boolean) => void;
}) {
  const grid = useGridColumns<HTMLDivElement>();
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const longPress = useLongPress((id) => {
    const photo = byId.get(id);
    if (photo && onSelect) onSelect([photo], !selectedIds?.has(id));
  });
  // 1〜2列では大きく表示されるので、サムネイルでは粗く見える
  const variant = grid.columns <= 2 ? "display" : "thumb";

  const days = new Map<string, T[]>();
  for (const photo of photos) {
    const day = photo.takenAt.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), photo]);
  }

  return (
    <div ref={grid.ref} style={grid.style} className="flex flex-col max-md:touch-pan-x max-md:touch-pan-y gap-7 max-md:gap-0">
      {[...days].map(([day, group]) => {
        const allSelected = group.every((photo) => selectedIds?.has(photo.id));
        return (
          <section key={day} className="flex flex-col gap-3 max-md:gap-0">
            <div className="flex items-center justify-between gap-3 max-md:px-4 max-md:pt-3.5 max-md:pb-2">
              <h2 className="text-[15px] font-semibold max-md:text-sm">{formatDayHeading(day)}</h2>
              {selecting && onSelect && (
                <button
                  type="button"
                  onClick={() => onSelect(group, !allSelected)}
                  className="cursor-pointer text-[13px] font-medium text-link-hover"
                >
                  {allSelected ? "選択を解除" : "この日を選択"}
                </button>
              )}
            </div>
            <div
              className={cn(
                "grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 max-md:gap-0.5",
                MOBILE_COLUMNS_CLASS,
              )}
            >
              {group.map((photo) => {
                const selected = selectedIds?.has(photo.id) ?? false;
                // 1列のときは切り抜かず、写真の縦横比のまま見せる
                const natural = grid.columns === 1 && photo.width && photo.height;
                return (
                  <div
                    key={photo.id}
                    data-photo-id={photo.id}
                    style={natural ? ({ "--photo-ratio": `${photo.width} / ${photo.height}` } as CSSProperties) : undefined}
                    className={cn("group relative aspect-square", natural && "max-md:aspect-(--photo-ratio)")}
                  >
                    <button
                      type="button"
                      aria-label={selecting ? `${photo.fileName} を選択` : `${photo.fileName} を拡大`}
                      aria-pressed={selecting ? selected : undefined}
                      onClick={() => {
                        if (longPress.consumeClick()) return;
                        if (selecting && onSelect) onSelect([photo], !selected);
                        else onOpen(photo);
                      }}
                      onContextMenu={(event) => onSelect && event.preventDefault()}
                      {...(onSelect ? longPress.handlers(photo.id) : {})}
                      className={cn(
                        "relative size-full cursor-zoom-in overflow-hidden rounded-md bg-muted select-none max-md:rounded-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [-webkit-touch-callout:none]",
                        selecting && "cursor-pointer",
                      )}
                    >
                      <img
                        src={photoUrl(photo.id, variant, shareToken)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className={cn(
                          "size-full object-cover",
                          photo.hidden && "opacity-50",
                          selected && "opacity-60",
                        )}
                      />
                      {photo.hidden && (
                        <EyeOffIcon
                          aria-label="非表示"
                          className="absolute top-2 right-2 size-[18px] text-white drop-shadow max-md:top-1.5 max-md:right-1.5 max-md:size-4"
                        />
                      )}
                      {photo.favorite && (
                        <HeartIcon
                          aria-hidden="true"
                          className="absolute right-2 bottom-2 size-[18px] fill-white text-white max-md:right-1.5 max-md:bottom-1.5 max-md:size-4"
                        />
                      )}
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-md border-[3px] border-primary max-md:rounded-none max-md:border-2"
                        />
                      )}
                    </button>
                    {onSelect && (
                      <button
                        type="button"
                        aria-label={`${photo.fileName} を選択`}
                        aria-pressed={selected}
                        tabIndex={selecting ? -1 : 0}
                        onClick={() => onSelect([photo], !selected)}
                        className={cn(
                          "absolute top-1.5 left-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white text-primary-foreground shadow-sm transition-opacity",
                          selected ? "border-primary bg-primary" : "bg-black/25",
                          // PC では重ねたときに出し、スマホでは選択中だけ出す
                          !selecting && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:hidden",
                          selecting && "max-md:pointer-events-none",
                        )}
                      >
                        {selected && <CheckIcon className="size-3.5" strokeWidth={3} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
