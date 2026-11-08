import { Link, useRouter } from "@void/react";
import { ChevronDownIcon, Link2Icon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { type AccountUser, UserAvatar } from "@/components/account-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  mobileSheetClassName,
  SheetHandle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export type MemberRole = "viewer" | "contributor";

export type AlbumMember = { id: string; email: string; name: string; image: string | null; role: MemberRole };

export type InviteCandidate = { id: string; email: string; name: string };

const ROLE_LABELS: Record<MemberRole, string> = {
  viewer: "閲覧のみ",
  contributor: "写真の追加も可",
};

const AVATAR_COLORS = ["bg-avatar-2", "bg-avatar-3", "bg-avatar"];

function MemberRow({
  member,
  index,
  disabled,
  onRoleChange,
  onRemove,
}: {
  member: AlbumMember;
  index: number;
  disabled: boolean;
  onRoleChange: (role: MemberRole) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-3">
      <UserAvatar user={member} className={cn("size-9 text-[13px]", AVATAR_COLORS[index % AVATAR_COLORS.length])} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium max-md:text-[15px]">{member.name || member.email}</span>
        {member.name && <span className="truncate text-xs text-muted-foreground">{member.email}</span>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-label={`${member.email} の権限`}
          className="flex h-11 flex-none cursor-pointer items-center gap-1 text-[13px] text-muted-foreground max-md:text-xs"
        >
          {ROLE_LABELS[member.role]}
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuRadioGroup
            value={member.role}
            onValueChange={(role) => onRoleChange(role as MemberRole)}
          >
            <DropdownMenuRadioItem value="viewer">{ROLE_LABELS.viewer}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="contributor">{ROLE_LABELS.contributor}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            メンバーから外す
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
          "flex flex-col gap-3 overflow-auto rounded-[20px] p-6 md:max-w-md max-md:bg-card max-md:px-5 max-md:pt-2.5 max-md:pb-8",
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
  members,
  candidates,
  link,
  defaultExpiry,
  stripGps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumId: string;
  albumTitle: string;
  user: AccountUser;
  members: AlbumMember[];
  candidates: InviteCandidate[];
  link: ShareLink | null;
  defaultExpiry: ShareLink["expiry"];
  stripGps: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");

  useEffect(() => {
    setUrl(link ? `${window.location.origin}/s/${link.token}` : "");
    setCopied(false);
  }, [link]);

  async function request(init: RequestInit, path = "share") {
    setPending(true);
    setError(null);
    const response = await window.fetch(`/api/albums/${albumId}/${path}`, init);
    if (response.ok) await router.refresh({ preserveScroll: true });
    else {
      const message = response.status === 409 ? "すでに招待しています" : "共有設定を変更できませんでした";
      setError(response.status === 400 ? "このユーザーは招待できません" : message);
    }
    setPending(false);
    return response.ok;
  }

  const save = (settings: Pick<ShareLink, "expiry" | "allowDownload">) =>
    request({
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });

  const sendJson = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  async function invite(event: FormEvent) {
    event.preventDefault();
    const sent = await request(sendJson("POST", { userId: inviteeId, role: inviteRole }), "members");
    if (sent) setInviteeId("");
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100%-3rem)] w-full flex-col gap-0 overflow-auto rounded-[20px] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.18)] ring-0 md:max-w-[540px] dark:border dark:border-border dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)] max-md:bg-card max-md:pt-2.5 max-md:pb-8 max-md:[&>[data-slot=dialog-close]]:hidden",
          mobileSheetClassName,
        )}
      >
        <SheetHandle />
        <div className="flex flex-col gap-1 px-6 pt-6 max-md:flex-row max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-5 max-md:pt-[18px]">
          <DialogTitle className="text-xl font-bold max-md:min-w-0 max-md:truncate max-md:text-lg max-md:leading-normal">
            「{albumTitle}」を共有
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground max-md:sr-only">
            メンバーを招待するか、閲覧用のリンクを発行できます。
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-none cursor-pointer px-1 text-[15px] font-semibold text-link-hover md:hidden"
          >
            完了
          </button>
        </div>

        <form
          className="flex flex-wrap gap-2 px-6 pt-5 max-md:px-5 max-md:pt-[18px]"
          onSubmit={invite}
        >
          <label htmlFor="invitee" className="w-full text-[13px] font-medium md:hidden">
            招待する人
          </label>
          <Select value={inviteeId} onValueChange={setInviteeId} disabled={candidates.length === 0}>
            <SelectTrigger
              id="invitee"
              aria-label="招待する人"
              className="min-w-0 flex-[1_1_200px] rounded-xl px-3.5 data-[size=default]:h-11 max-md:basis-0 max-md:px-3 max-md:text-[15px] max-md:data-[size=default]:h-[46px]"
            >
              <SelectValue placeholder={candidates.length ? "招待する人を選択" : "招待できる人はいません"} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.name ? `${candidate.name}（${candidate.email}）` : candidate.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={inviteRole} onValueChange={(role) => setInviteRole(role as MemberRole)}>
            <SelectTrigger aria-label="権限" className="rounded-xl data-[size=default]:h-11 max-md:order-last max-md:w-full max-md:text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
              <SelectItem value="contributor">{ROLE_LABELS.contributor}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            disabled={pending || !inviteeId}
            className="h-11 rounded-xl px-[18px] font-semibold max-md:h-[46px] max-md:px-4 max-md:text-[15px]"
          >
            招待
          </Button>
        </form>

        <div className="flex flex-col gap-1 px-6 pt-5 pb-2 max-md:px-5 max-md:pt-[18px] max-md:pb-0">
          <h3 className="mb-1.5 text-[13px] font-semibold text-muted-foreground">メンバー</h3>
          <div className="flex min-h-[52px] items-center gap-3">
            <UserAvatar user={user} className="size-9 text-[13px]" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium max-md:text-[15px]">あなた</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <span className="text-[13px] text-muted-foreground max-md:text-xs">オーナー</span>
          </div>
          {members.map((member, index) => (
            <MemberRow
              key={member.id}
              member={member}
              index={index}
              disabled={pending}
              onRoleChange={(role) => void request(sendJson("PATCH", { role }), `members/${member.id}`)}
              onRemove={() => void request({ method: "DELETE" }, `members/${member.id}`)}
            />
          ))}
        </div>

        <div className="mx-6 mt-2 border-t border-border max-md:mx-5 max-md:mt-[18px]" />

        <div className="flex flex-col gap-3.5 px-6 py-4 max-md:gap-[18px] max-md:px-5 max-md:pt-[18px] max-md:pb-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-muted max-md:hidden">
              <Link2Icon className="size-[18px]" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <span id="link-label" className="text-sm font-medium max-md:text-[15px]">
                リンクで共有
              </span>
              <span className="text-xs text-muted-foreground">
                {!link
                  ? "オフ — 招待したメンバーだけが閲覧できます"
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
                checked ? save({ expiry: defaultExpiry, allowDownload: false }) : request({ method: "DELETE" })
              }
            />
          </div>
          {link && (
            <div className="flex flex-col gap-3 max-md:gap-2.5">
              <Button
                variant="surface"
                className="h-[50px] gap-2 rounded-[14px] bg-background text-[15px] font-semibold md:hidden"
                onClick={copy}
              >
                <Link2Icon className="size-[18px]" />
                {copied ? "コピーしました" : "リンクをコピー"}
              </Button>
              <div className="flex gap-2 max-md:hidden">
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
              <div className="flex flex-wrap gap-3 max-md:flex-nowrap max-md:gap-2.5">
                <div className="flex flex-[1_1_180px] flex-col gap-1.5 max-md:min-w-0 max-md:basis-0">
                  <label htmlFor="expiry" className="text-xs font-medium text-muted-foreground">
                    有効期限
                    {link.expiresAt !== null && (
                      <span className="max-md:hidden">（{formatExpiry(link.expiresAt)}まで）</span>
                    )}
                  </label>
                  <Select
                    value={link.expiry}
                    disabled={pending}
                    onValueChange={(expiry) =>
                      save({ expiry: expiry as ShareLink["expiry"], allowDownload: link.allowDownload })
                    }
                  >
                    <SelectTrigger id="expiry" className="w-full rounded-[10px] data-[size=default]:h-10 max-md:rounded-xl max-md:text-[15px] max-md:data-[size=default]:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7日間</SelectItem>
                      <SelectItem value="30d">30日間</SelectItem>
                      <SelectItem value="never">無期限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-[1_1_180px] flex-col gap-1.5 max-md:min-w-0 max-md:basis-0">
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
                    <SelectTrigger id="dl" className="w-full rounded-[10px] data-[size=default]:h-10 max-md:rounded-xl max-md:text-[15px] max-md:data-[size=default]:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <span className="max-md:hidden">閲覧のみ（保存不可）</span>
                        <span className="md:hidden">保存不可</span>
                      </SelectItem>
                      <SelectItem value="original">
                        <span className="max-md:hidden">元の画像を保存できる</span>
                        <span className="md:hidden">元画像を保存可</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {link.allowDownload && stripGps && (
                <p className="text-xs leading-[1.7] text-muted-foreground">
                  位置情報のある写真は、位置情報を除いた表示用の画像（長辺2048px）で保存されます。
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end px-6 pb-6 max-md:hidden">
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
