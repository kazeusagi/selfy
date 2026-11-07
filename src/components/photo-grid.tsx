import { CheckIcon, EyeOffIcon, HeartIcon } from "lucide-react";
import { type CSSProperties, memo, useMemo, useRef } from "react";
import { useDragSelect } from "@/hooks/use-drag-select";
import { MOBILE_COLUMNS_CLASS, useGridColumns } from "@/hooks/use-grid-columns";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDayHeading } from "@/lib/format";
import { type PhotoVariant, photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";

export type GridPhoto = {
  id: string;
  fileName: string;
  takenAt: string;
  favorite: boolean;
  width?: number;
  height?: number;
  hidden?: boolean;
};

type TileActions = {
  // 選択中ならタップで選び、そうでなければ拡大する
  tap: (photo: GridPhoto, selected: boolean) => void;
  select: (photo: GridPhoto, selected: boolean) => void;
};

// 1枚選ぶたびに全部を描き直すと、写真が多いアルバムで操作が固まる。変わったタイルだけ描き直す。
// 選択を始めたときも全部を描き直さないよう、選択中かどうかは props で渡さず、見た目は親の data 属性で切り替える
const PhotoTile = memo(function PhotoTile({
  photo,
  selected,
  selectable,
  mobile,
  natural,
  variant,
  shareToken,
  actions,
}: {
  photo: GridPhoto;
  selected: boolean;
  selectable: boolean;
  mobile: boolean;
  natural: boolean;
  variant: PhotoVariant;
  shareToken?: string;
  actions: TileActions;
}) {
  return (
    <div
      data-photo-id={photo.id}
      style={natural ? ({ "--photo-ratio": `${photo.width} / ${photo.height}` } as CSSProperties) : undefined}
      className={cn("group relative aspect-square", natural && "max-md:aspect-(--photo-ratio)")}
    >
      <button
        type="button"
        aria-label={photo.fileName}
        aria-pressed={selected || undefined}
        onClick={() => actions.tap(photo, !selected)}
        className={cn(
          // インラインのままだと行の下に文字の分の隙間ができ、縦の間隔だけ広がる
          "relative block size-full cursor-zoom-in overflow-hidden group-data-[selecting=true]/grid:cursor-pointer rounded-md bg-muted select-none max-md:rounded-none max-md:transition-[padding] max-md:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [-webkit-touch-callout:none]",
          // スマホでは枠を内側に太くし、その分だけ写真を中央に縮める
          selected && "max-md:bg-primary max-md:p-1.5",
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
            selected && "md:opacity-60 max-md:rounded-sm",
          )}
        />
        {/* 重ねる要素は指を受けない。長押し中に消えると、その後の指の動きが届かなくなる */}
        {photo.hidden && (
          <EyeOffIcon
            aria-label="非表示"
            className={cn(
              "pointer-events-none absolute top-2 right-2 size-[18px] text-white drop-shadow max-md:size-4",
              selected ? "max-md:top-2.5 max-md:right-2.5" : "max-md:top-1.5 max-md:right-1.5",
            )}
          />
        )}
        {photo.favorite && (
          <HeartIcon
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-2 bottom-2 size-[18px] fill-white text-white max-md:size-4",
              selected ? "max-md:right-2.5 max-md:bottom-2.5" : "max-md:right-1.5 max-md:bottom-1.5",
            )}
          />
        )}
        {selected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-md border-[3px] border-primary max-md:hidden"
          />
        )}
      </button>
      {/* PC では重ねたときに出す。スマホでは数が多いと重くなるので、選んだ写真にだけ置く */}
      {selectable && (!mobile || selected) && (
        <button
          type="button"
          aria-label={`${photo.fileName} を選択`}
          aria-pressed={selected}
          onClick={() => actions.select(photo, !selected)}
          className={cn(
            "absolute top-1.5 left-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white text-primary-foreground shadow-sm transition-opacity max-md:pointer-events-none max-md:top-2.5 max-md:left-2.5 max-md:size-5",
            selected ? "border-primary bg-primary" : "bg-black/25",
            "opacity-0 group-hover:opacity-100 group-data-[selecting=true]/grid:opacity-100 focus-visible:opacity-100",
          )}
        >
          {selected && <CheckIcon className="size-3.5 max-md:size-3" strokeWidth={3} />}
        </button>
      )}
    </div>
  );
});

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
  useDragSelect(grid.ref, photos, selectedIds, onSelect, selecting);
  // 1〜2列では大きく表示されるので、サムネイルでは粗く見える
  const variant = grid.columns <= 2 ? "display" : "thumb";

  const mobile = useIsMobile();

  // 呼び出し側の関数は描画のたびに変わるので、タイルには変わらない入口を渡す
  const handlers = useRef({ onOpen, onSelect, selecting });
  handlers.current = { onOpen, onSelect, selecting };
  const actions = useMemo<TileActions>(
    () => ({
      tap: (photo, selected) => {
        const { onOpen, onSelect, selecting } = handlers.current;
        if (selecting && onSelect) onSelect([photo as T], selected);
        else onOpen(photo as T);
      },
      select: (photo, selected) => handlers.current.onSelect?.([photo as T], selected),
    }),
    [],
  );

  const days = useMemo(() => {
    const result = new Map<string, T[]>();
    for (const photo of photos) {
      const day = photo.takenAt.slice(0, 10);
      const group = result.get(day);
      if (group) group.push(photo);
      else result.set(day, [photo]);
    }
    return [...result];
  }, [photos]);

  return (
    <div
      ref={grid.ref}
      style={grid.style}
      data-selecting={selecting}
      className="group/grid flex flex-col gap-7 max-md:touch-pan-y max-md:gap-0"
    >
      {days.map(([day, group]) => {
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
              {group.map((photo) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  selected={selectedIds?.has(photo.id) ?? false}
                  selectable={onSelect !== undefined}
                  mobile={mobile}
                  // 1列のときは切り抜かず、写真の縦横比のまま見せる
                  natural={grid.columns === 1 && !!photo.width && !!photo.height}
                  variant={variant}
                  shareToken={shareToken}
                  actions={actions}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
