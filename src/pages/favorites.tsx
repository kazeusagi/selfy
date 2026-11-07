import { useRouter } from "@void/react";
import { HeartIcon, HeartOffIcon } from "lucide-react";
import { type CSSProperties, memo, useMemo, useRef, useState } from "react";
import { UploadDialog } from "@/components/album-dialogs";
import { BottomNav } from "@/components/bottom-nav";
import { Lightbox } from "@/components/lightbox";
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { useDragSelect } from "@/hooks/use-drag-select";
import { MOBILE_COLUMNS_CLASS, useGridColumns } from "@/hooks/use-grid-columns";
import { formatCount } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";
import type { Props } from "./favorites.server";

type Photo = Props["photos"][number];

const SORTS = [
  { id: "new", label: "新しい順" },
  { id: "old", label: "古い順" },
  { id: "album", label: "アルバム別" },
] as const;

type Sort = (typeof SORTS)[number]["id"];

function setFavorite(id: string, favorite: boolean) {
  return window.fetch(`/api/photos/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ favorite }),
  });
}

function groupPhotos(photos: Photo[], sort: Sort) {
  if (sort !== "album") {
    const list = sort === "new" ? photos : [...photos].reverse();
    return [{ id: "all", title: null, photos: list }];
  }
  const groups = new Map<string, { id: string; title: string | null; photos: Photo[] }>();
  for (const photo of photos) {
    const group = groups.get(photo.albumId);
    if (group) group.photos.push(photo);
    else groups.set(photo.albumId, { id: photo.albumId, title: photo.albumTitle, photos: [photo] });
  }
  return [...groups.values()];
}

// 1枚選ぶたびに全部を描き直さないよう、変わったタイルだけ描き直す
const FavoriteTile = memo(function FavoriteTile({
  photo,
  selecting,
  selected,
  columns,
  onTap,
}: {
  photo: Photo;
  selecting: boolean;
  selected: boolean;
  columns: number;
  onTap: (photo: Photo) => void;
}) {
  // 1列のときは切り抜かず、写真の縦横比のまま見せる
  const natural = columns === 1;
  return (
    <button
      type="button"
      aria-label={selecting ? `${photo.fileName} を選択` : `${photo.fileName} を拡大`}
      aria-pressed={selecting ? selected : undefined}
      onClick={() => onTap(photo)}
      data-photo-id={photo.id}
      style={natural ? ({ "--photo-ratio": `${photo.width} / ${photo.height}` } as CSSProperties) : undefined}
      className={cn(
        natural && "max-md:aspect-(--photo-ratio)",
        "relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-border select-none [-webkit-touch-callout:none] max-md:rounded-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selecting && "cursor-pointer",
        // スマホでは枠を内側に太くし、その分だけ写真を中央に縮める
        "max-md:transition-[padding] max-md:duration-150",
        selected && "max-md:bg-primary max-md:p-1.5",
      )}
    >
      <img
        src={photoUrl(photo.id, columns <= 2 ? "display" : "thumb")}
        alt=""
        loading="lazy"
        draggable={false}
        className={cn("size-full object-cover", selected && "md:opacity-60 max-md:rounded-sm")}
      />
      <HeartIcon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute size-4 fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
          selected ? "right-1.5 bottom-1.5 max-md:right-2.5 max-md:bottom-2.5" : "right-1.5 bottom-1.5",
        )}
      />
      {selected && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 border-[3px] border-primary max-md:hidden" />
      )}
    </button>
  );
});

export default function FavoritesPage({ user, photos, albumOptions, settings }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("new");
  const [uploading, setUploading] = useState(false);
  // 拡大中に外しても一覧からは消さず、戻って押し直せるようにする
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState<{ list: Photo[]; id: string } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const grid = useGridColumns<HTMLDivElement>();

  const visible = useMemo(() => photos.filter((photo) => overrides[photo.id] ?? true), [photos, overrides]);
  const groups = useMemo(() => groupPhotos(visible, sort), [visible, sort]);
  const ordered = groups.flatMap((group) => group.photos);
  const albumCount = new Set(visible.map((photo) => photo.albumId)).size;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 長押しで選択を始め、そのまま指を動かすと範囲で選べる
  function select(list: Photo[], on: boolean) {
    setSelecting(true);
    const ids = new Set(list.map((photo) => photo.id));
    setSelectedIds((current) =>
      on ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.has(id)),
    );
  }
  useDragSelect(grid.ref, ordered, selectedSet, select, selecting);

  const lightboxPhotos = viewing?.list.map((photo) => ({
    ...photo,
    favorite: overrides[photo.id] ?? true,
  }));

  function stopSelecting() {
    setSelecting(false);
    setSelectedIds([]);
  }

  async function toggleFavorite(photo: Photo) {
    const favorite = !photo.favorite;
    setOverrides((current) => ({ ...current, [photo.id]: favorite }));
    const response = await setFavorite(photo.id, favorite);
    if (!response.ok) setOverrides((current) => ({ ...current, [photo.id]: !favorite }));
  }

  async function removeSelected() {
    setPending(true);
    await Promise.all(selectedIds.map((id) => setFavorite(id, false)));
    await router.refresh({ preserveScroll: true });
    setPending(false);
    stopSelecting();
  }

  const tapRef = useRef(tap);
  tapRef.current = tap;
  const onTap = useMemo(() => (photo: Photo) => tapRef.current(photo), []);

  function tap(photo: Photo) {
    if (!selecting) {
      setViewing({ list: ordered, id: photo.id });
      return;
    }
    setSelectedIds((ids) =>
      ids.includes(photo.id) ? ids.filter((id) => id !== photo.id) : [...ids, photo.id],
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainHeader user={user} current="favorites" onUpload={() => setUploading(true)} />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-8 pt-10 pb-16 max-md:gap-3.5 max-md:px-0 max-md:pt-5 max-md:pb-[120px]">
        <div className="flex items-end justify-between max-md:px-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-bold tracking-[-0.02em] max-md:text-[30px]">お気に入り</h1>
            <span className="text-[13px] text-muted-foreground">
              {formatCount(visible.length)} 枚 · {albumCount} アルバムから
            </span>
          </div>
          {visible.length > 0 && (
            <Button
              variant="outline"
              aria-pressed={selecting}
              className="h-9 rounded-full border-input bg-transparent px-3.5 font-semibold dark:bg-transparent"
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            >
              {selecting ? "キャンセル" : "選択"}
            </Button>
          )}
        </div>
        <div role="tablist" aria-label="並び替え" className="flex gap-2 max-md:px-4">
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={sort === item.id}
              onClick={() => setSort(item.id)}
              className={cn(
                "h-9 cursor-pointer rounded-full border px-4 text-sm font-semibold",
                sort === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-input text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div ref={grid.ref} style={grid.style} className="flex flex-col gap-5 max-md:touch-pan-y max-md:gap-3.5">
          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              お気に入りの写真はまだありません
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="flex flex-col gap-3 max-md:gap-2">
                {group.title && (
                  <h2 className="text-[15px] font-semibold max-md:px-4 max-md:text-sm">{group.title}</h2>
                )}
                <div className={`grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-1.5 max-md:gap-0.5 ${MOBILE_COLUMNS_CLASS}`}>
                  {group.photos.map((photo) => (
                    <FavoriteTile
                      key={photo.id}
                      photo={photo}
                      selecting={selecting}
                      selected={selectedSet.has(photo.id)}
                      columns={grid.columns}
                      onTap={onTap}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {selecting && selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 max-md:bottom-24">
          <Button size="pill" className="font-semibold shadow-lg" disabled={pending} onClick={removeSelected}>
            <HeartOffIcon />
            {selectedIds.length} 枚をお気に入りから外す
          </Button>
        </div>
      )}

      {viewing && lightboxPhotos && (
        <Lightbox
          photos={lightboxPhotos}
          index={lightboxPhotos.findIndex((photo) => photo.id === viewing.id)}
          canDownload
          onIndexChange={(index) => setViewing({ ...viewing, id: lightboxPhotos[index].id })}
          onClose={() => setViewing(null)}
          onToggleFavorite={toggleFavorite}
        />
      )}
      <BottomNav current="favorites" />
      <UploadDialog open={uploading} onOpenChange={setUploading} albums={albumOptions} settings={settings} />
    </div>
  );
}
