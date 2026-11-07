import { HeartIcon } from "lucide-react";
import { formatDayHeading } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";

export type GridPhoto = {
  id: string;
  fileName: string;
  takenAt: string;
  favorite: boolean;
};

export function PhotoGrid<T extends GridPhoto>({
  photos,
  shareToken,
  onOpen,
}: {
  photos: T[];
  shareToken?: string;
  onOpen: (photo: T) => void;
}) {
  const days = new Map<string, T[]>();
  for (const photo of photos) {
    const day = photo.takenAt.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), photo]);
  }

  return [...days].map(([day, group]) => (
    <section key={day} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">{formatDayHeading(day)}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 max-sm:grid-cols-3">
        {group.map((photo) => (
          <button
            key={photo.id}
            type="button"
            aria-label={`${photo.fileName} を拡大`}
            onClick={() => onOpen(photo)}
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-md bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <img
              src={photoUrl(photo.id, "thumb", shareToken)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
            {photo.favorite && (
              <HeartIcon
                aria-hidden="true"
                className="absolute right-2 bottom-2 size-[18px] fill-white text-white"
              />
            )}
          </button>
        ))}
      </div>
    </section>
  ));
}
