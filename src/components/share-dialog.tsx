import { Link, useRouter } from "@void/react";
import { Link2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { type AccountUser, userInitial } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  mobileSheetClassName,
  SheetHandle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatExpiry } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ShareLink = {
  token: string;
  expiry: "7d" | "30d" | "never";
  expiresAt: number | null;
  allowDownload: boolean;
  active: boolean;
};

export function ShareAlbumPicker({
  open,
  onClose,
  albums,
}: {
  open: boolean;
  onClose: () => void;
  albums: { id: string; title: string }[];
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col gap-3 overflow-auto rounded-[20px] p-6 sm:max-w-md max-sm:bg-card max-sm:px-5 max-sm:pt-2.5 max-sm:pb-8",
          mobileSheetClassName,
        )}
      >
        <SheetHandle />
        <DialogTitle className="text-lg font-bold">共有するアルバムを選択</DialogTitle>
        <DialogDescription className="sr-only">選んだアルバムの共有設定を開きます。</DialogDescription>
        {albums.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">アルバムがありません</p>
        ) : (
          <ul className="flex flex-col">
            {albums.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/albums/${album.id}?share`}
                  replace
                  className="flex min-h-[52px] items-center text-[15px] font-medium text-foreground hover:text-link-hover"
                >
                  <span className="truncate">{album.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  albumId,
  albumTitle,
  user,
  link,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumId: string;
  albumTitle: string;
  user: AccountUser;
  link: ShareLink | null;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(link ? `${window.location.origin}/s/${link.token}` : "");
    setCopied(false);
  }, [link]);

  async function request(init: RequestInit) {
    setPending(true);
    setError(null);
    const response = await window.fetch(`/api/albums/${albumId}/share`, init);
    if (response.ok) await router.refresh({ preserveScroll: true });
    else setError("共有設定を変更できませんでした");
    setPending(false);
  }

  const save = (settings: Pick<ShareLink, "expiry" | "allowDownload">) =>
    request({
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100%-3rem)] w-full flex-col gap-0 overflow-auto rounded-[20px] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.18)] ring-0 sm:max-w-[540px] dark:border dark:border-border dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)] max-sm:bg-card max-sm:pt-2.5 max-sm:pb-8 max-sm:[&>[data-slot=dialog-close]]:hidden",
          mobileSheetClassName,
        )}
      >
        <SheetHandle />
        <div className="flex flex-col gap-1 px-6 pt-6 max-sm:flex-row max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:px-5 max-sm:pt-[18px]">
          <DialogTitle className="text-xl font-bold max-sm:min-w-0 max-sm:truncate max-sm:text-lg max-sm:leading-normal">
            「{albumTitle}」を共有
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground max-sm:sr-only">
            閲覧用のリンクを発行できます。
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-none cursor-pointer px-1 text-[15px] font-semibold text-link-hover sm:hidden"
          >
            完了
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-6 pt-5 max-sm:px-5 max-sm:pt-[18px]">
          <label htmlFor="invite-email" className="w-full text-[13px] font-medium sm:hidden">
            メールアドレスで招待
          </label>
          <Input
            id="invite-email"
            type="email"
            disabled
            aria-label="招待するメールアドレス"
            placeholder="メールアドレスで招待（準備中）"
            className="h-11 min-w-0 flex-[1_1_200px] rounded-xl px-3.5 max-sm:h-[46px] max-sm:basis-0 max-sm:px-3"
          />
          <Select disabled value="view">
            <SelectTrigger aria-label="権限" className="rounded-xl data-[size=default]:h-11 max-sm:order-last max-sm:w-full max-sm:text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="view">閲覧のみ</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled className="h-11 rounded-xl px-[18px] font-semibold max-sm:h-[46px] max-sm:px-4 max-sm:text-[15px]">
            招待
          </Button>
        </div>

        <div className="flex flex-col gap-1 px-6 pt-5 pb-2 max-sm:px-5 max-sm:pt-[18px] max-sm:pb-0">
          <h3 className="mb-1.5 text-[13px] font-semibold text-muted-foreground">メンバー</h3>
          <div className="flex min-h-[52px] items-center gap-3">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-avatar text-[13px] font-semibold">
              {userInitial(user)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium max-sm:text-[15px]">あなた</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <span className="text-[13px] text-muted-foreground max-sm:text-xs">オーナー</span>
          </div>
        </div>

        <div className="mx-6 mt-2 border-t border-border max-sm:mx-5 max-sm:mt-[18px]" />

        <div className="flex flex-col gap-3.5 px-6 py-4 max-sm:gap-[18px] max-sm:px-5 max-sm:pt-[18px] max-sm:pb-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-muted max-sm:hidden">
              <Link2Icon className="size-[18px]" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <span id="link-label" className="text-sm font-medium max-sm:text-[15px]">
                リンクで共有
              </span>
              <span className="text-xs text-muted-foreground">
                {!link
                  ? "オフ — リンクからは閲覧できません"
                  : link.active
                    ? "リンクを知っている人は誰でも閲覧できます"
                    : "有効期限が切れています。期限を変更すると再び開けます"}
              </span>
            </div>
            <Switch
              size="lg"
              aria-labelledby="link-label"
              checked={link !== null}
              disabled={pending}
              onCheckedChange={(checked) =>
                checked ? save({ expiry: "7d", allowDownload: false }) : request({ method: "DELETE" })
              }
            />
          </div>
          {link && (
            <div className="flex flex-col gap-3 max-sm:gap-2.5">
              <Button
                variant="surface"
                className="h-[50px] gap-2 rounded-[14px] bg-background text-[15px] font-semibold sm:hidden"
                onClick={copy}
              >
                <Link2Icon className="size-[18px]" />
                {copied ? "コピーしました" : "リンクをコピー"}
              </Button>
              <div className="flex gap-2 max-sm:hidden">
                <Input
                  readOnly
                  aria-label="共有リンク"
                  value={url}
                  className="h-11 min-w-0 flex-1 rounded-xl border-border bg-background px-3.5 text-[13px] md:text-[13px]"
                />
                <Button
                  variant="surface"
                  className="h-11 rounded-xl px-4 font-semibold"
                  onClick={copy}
                >
                  {copied ? "コピーしました" : "コピー"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 max-sm:flex-nowrap max-sm:gap-2.5">
                <div className="flex flex-[1_1_180px] flex-col gap-1.5 max-sm:min-w-0 max-sm:basis-0">
                  <label htmlFor="expiry" className="text-xs font-medium text-muted-foreground">
                    有効期限
                    {link.expiresAt !== null && (
                      <span className="max-sm:hidden">（{formatExpiry(link.expiresAt)}まで）</span>
                    )}
                  </label>
                  <Select
                    value={link.expiry}
                    disabled={pending}
                    onValueChange={(expiry) =>
                      save({ expiry: expiry as ShareLink["expiry"], allowDownload: link.allowDownload })
                    }
                  >
                    <SelectTrigger id="expiry" className="w-full rounded-[10px] data-[size=default]:h-10 max-sm:rounded-xl max-sm:text-[15px] max-sm:data-[size=default]:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7日間</SelectItem>
                      <SelectItem value="30d">30日間</SelectItem>
                      <SelectItem value="never">無期限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-[1_1_180px] flex-col gap-1.5 max-sm:min-w-0 max-sm:basis-0">
                  <label htmlFor="dl" className="text-xs font-medium text-muted-foreground">
                    ダウンロード
                  </label>
                  <Select
                    value={link.allowDownload ? "original" : "view"}
                    disabled={pending}
                    onValueChange={(value) =>
                      save({ expiry: link.expiry, allowDownload: value === "original" })
                    }
                  >
                    <SelectTrigger id="dl" className="w-full rounded-[10px] data-[size=default]:h-10 max-sm:rounded-xl max-sm:text-[15px] max-sm:data-[size=default]:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <span className="max-sm:hidden">閲覧のみ（保存不可）</span>
                        <span className="sm:hidden">保存不可</span>
                      </SelectItem>
                      <SelectItem value="original">
                        <span className="max-sm:hidden">元の画像を保存できる</span>
                        <span className="sm:hidden">元画像を保存可</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end px-6 pb-6 max-sm:hidden">
          <Button
            className="h-11 rounded-full bg-foreground px-6 font-semibold text-background hover:bg-foreground/80"
            onClick={() => onOpenChange(false)}
          >
            完了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
