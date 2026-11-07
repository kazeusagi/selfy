import { MoonIcon, SunIcon } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Lightbox } from "@/components/lightbox";
import { PhotoGrid } from "@/components/photo-grid";
import { ThemeItems } from "@/components/theme-items";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCount, formatDateRange } from "@/lib/format";
import type { Props } from "./[token].server";

function ThemeMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="surface" size="icon-pill" aria-label="テーマ" className="ml-auto">
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <ThemeItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function SharedAlbumPage({ shared }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!shared) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader>
          <ThemeMenu />
        </AppHeader>
        <main className="mx-auto flex max-w-[480px] flex-col gap-2 px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">このリンクは開けません</h1>
          <p className="text-sm leading-[1.7] text-muted-foreground">
            リンクが無効になったか、有効期限が切れています。共有した人に確認してください。
          </p>
        </main>
      </div>
    );
  }

  const { photos, token, title, allowDownload } = shared;
  const summary = [`${formatCount(photos.length)} 枚`];
  if (photos.length) summary.push(formatDateRange(photos[0].takenAt, photos[photos.length - 1].takenAt));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader>
        <ThemeMenu />
      </AppHeader>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-7 pb-16 max-md:gap-0 max-md:px-0 max-md:pt-0">
        <div className="flex flex-col gap-2 max-md:px-4 max-md:pt-4 max-md:pb-2">
          <h1 className="text-[32px] font-bold tracking-[-0.02em] max-md:text-[26px] max-md:tracking-[-0.01em]">{title}</h1>
          <p className="text-sm text-muted-foreground">{summary.join(" · ")}</p>
        </div>
        <PhotoGrid
          photos={photos}
          shareToken={token}
          onOpen={(photo) => setOpenIndex(photos.indexOf(photo))}
        />
      </main>
      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          shareToken={token}
          canDownload={allowDownload}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
