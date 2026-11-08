import { SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PhotoFilter = { orientation: "all" | "portrait" | "landscape"; from: string; to: string };

const EMPTY: PhotoFilter = { orientation: "all", from: "", to: "" };

const ORIENTATIONS = [
  { id: "all", label: "すべて" },
  { id: "portrait", label: "縦" },
  { id: "landscape", label: "横" },
] as const;

export function isFiltering(filter: PhotoFilter) {
  return filter.orientation !== "all" || filter.from !== "" || filter.to !== "";
}

export function usePhotoFilter() {
  const [filter, setFilter] = useState(EMPTY);

  function apply<T extends { width: number; height: number; takenAt: string }>(photos: T[]) {
    if (!isFiltering(filter)) return photos;
    return photos.filter((photo) => {
      // 正方形はどちらにも入れない
      if (filter.orientation === "portrait" && photo.height <= photo.width) return false;
      if (filter.orientation === "landscape" && photo.width <= photo.height) return false;
      // takenAt は現地時刻の文字列なので、日付の部分を文字列のまま比べる
      const day = photo.takenAt.slice(0, 10);
      if (filter.from && day < filter.from) return false;
      if (filter.to && day > filter.to) return false;
      return true;
    });
  }

  return { filter, setFilter, apply, reset: () => setFilter(EMPTY) };
}

export function PhotoFilterButton({
  filter,
  onChange,
  className,
}: {
  filter: PhotoFilter;
  onChange: (filter: PhotoFilter) => void;
  className?: string;
}) {
  const active = isFiltering(filter);
  return (
    <Popover>
      <PopoverTrigger
        aria-label="写真を絞り込む"
        className={cn(
          "relative flex size-11 flex-none cursor-pointer items-center justify-center rounded-full",
          active && "text-link-hover",
          className,
        )}
      >
        <SlidersHorizontalIcon className="size-5" />
        {active && <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-primary" />}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">向き</legend>
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {ORIENTATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter.orientation === item.id}
                onClick={() => onChange({ ...filter, orientation: item.id })}
                className={cn(
                  "h-8 flex-1 cursor-pointer rounded-[9px] text-[13px] font-semibold",
                  filter.orientation === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">撮影日</legend>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
            <label htmlFor="filter-from">から</label>
            <Input
              id="filter-from"
              type="date"
              value={filter.from}
              max={filter.to || undefined}
              onChange={(event) => onChange({ ...filter, from: event.target.value })}
              className="h-9"
            />
            <label htmlFor="filter-to">まで</label>
            <Input
              id="filter-to"
              type="date"
              value={filter.to}
              min={filter.from || undefined}
              onChange={(event) => onChange({ ...filter, to: event.target.value })}
              className="h-9"
            />
          </div>
        </fieldset>
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange(EMPTY)}
          className="h-9 cursor-pointer self-end rounded-full px-3 text-sm font-medium text-link-hover enabled:hover:bg-muted disabled:cursor-default disabled:opacity-40"
        >
          条件をクリア
        </button>
      </PopoverContent>
    </Popover>
  );
}
