import { Link, useRouter } from "@void/react";
import { ChevronRightIcon, KeyRoundIcon, MonitorSmartphoneIcon, Trash2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AlbumTitleDialog, UploadDialog } from "@/components/album-dialogs";
import { UserAvatar } from "@/components/account-link";
import { BottomNav } from "@/components/bottom-nav";
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, mobileSheetClassName, SheetHandle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { formatBytes } from "@/lib/format";
import { LOGIN_PHOTO_COUNT } from "@/lib/login-photos";
import { IMAGE_ACCEPT } from "@/components/upload-status";
import { uploadAvatar } from "@/lib/upload";
import { describeUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";
import { version } from "../../package.json";
import type { Props } from "./settings.server";

type Settings = Props["settings"];

const THEMES = [
  { id: "system", label: "自動" },
  { id: "light", label: "ライト" },
  { id: "dark", label: "ダーク" },
];

const TOGGLES = [
  { key: "keepOriginal", label: "元の画質で保存", description: "オフにすると長辺4000pxに縮小します" },
  { key: "stripGps", label: "共有時に位置情報を削除", description: "共有リンクの写真から撮影場所を消します" },
  { key: "wifiOnly", label: "Wi-Fi接続時のみアップロード", description: "モバイル通信量を節約します" },
] as const;

const EXPIRY_LABELS: Record<Settings["defaultExpiry"], string> = {
  "7d": "7日間",
  "30d": "30日間",
  never: "無期限",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="mx-1 text-[13px] font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>{children}</div>;
}

const ROW_CLASS =
  "flex min-h-[52px] w-full items-center gap-3 border-t border-border px-4 text-left text-foreground first:border-t-0";

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(ROW_CLASS, "cursor-pointer")}>
      <span className="flex-1 text-[15px]">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
      <ChevronRightIcon aria-hidden="true" className="size-[18px] text-subtle-foreground" />
    </button>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Card className="flex flex-col gap-3 px-4 py-3.5">
      <span id="theme-label" className="text-[15px] font-medium">
        テーマ
      </span>
      <div
        role="radiogroup"
        aria-labelledby="theme-label"
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
      >
        {THEMES.map((item) => {
          // テーマはブラウザにだけ保存されるので、サーバーの描画では選択状態を出さない
          const selected = mounted && theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(item.id)}
              className={cn(
                "h-10 cursor-pointer rounded-[9px] text-sm font-semibold",
                selected
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function StorageCard({ originals, previews }: Props["storage"]) {
  const total = originals + previews;
  const share = (bytes: number) => `${total ? (bytes / total) * 100 : 0}%`;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[22px] font-bold">{formatBytes(total)}</span>
        <span className="text-[13px] text-muted-foreground">Cloudflare R2</span>
      </div>
      <div
        role="img"
        aria-label={`写真 ${formatBytes(originals)}、サムネイル ${formatBytes(previews)}`}
        className="flex h-2 overflow-hidden rounded-full bg-muted"
      >
        <span className="bg-primary" style={{ width: share(originals) }} />
        <span className="bg-[#9db0ff]" style={{ width: share(previews) }} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          写真 {formatBytes(originals)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#9db0ff]" />
          サムネイル {formatBytes(previews)}
        </span>
      </div>
    </Card>
  );
}

function ListDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "flex flex-col gap-3 overflow-auto rounded-[20px] p-6 md:max-w-md max-md:bg-card max-md:px-5 max-md:pt-2.5 max-md:pb-8",
          mobileSheetClassName,
        )}
      >
        <SheetHandle />
        <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

type Passkey = { id: string; name?: string | null; createdAt: Date | string };

function PasskeysDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await authClient.passkey.listUserPasskeys();
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function changed() {
    await load();
    await router.refresh({ preserveScroll: true });
  }

  async function add() {
    setError(null);
    const { error } = await authClient.passkey.addPasskey({ name: "Selfy" });
    if (error) setError("パスキーを登録できませんでした");
    else await changed();
  }

  async function remove(id: string) {
    setError(null);
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) setError("パスキーを削除できませんでした");
    else await changed();
  }

  return (
    <ListDialog open={open} onOpenChange={onOpenChange} title="パスキー">
      {passkeys?.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">登録されたパスキーはありません</p>
      )}
      <ul className="flex flex-col">
        {passkeys?.map((passkey) => (
          <li key={passkey.id} className="flex min-h-[52px] items-center gap-3">
            <KeyRoundIcon aria-hidden="true" className="size-[18px] flex-none text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{passkey.name || "パスキー"}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(passkey.createdAt).toLocaleDateString("ja-JP")} に登録
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-pill"
              aria-label={`${passkey.name || "パスキー"} を削除`}
              onClick={() => void remove(passkey.id)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button size="pill" className="font-semibold" onClick={() => void add()}>
        パスキーを登録
      </Button>
    </ListDialog>
  );
}

type DeviceSession = {
  id: string;
  token: string;
  userAgent?: string | null;
  updatedAt: Date | string;
};

function SessionsDialog({
  open,
  onOpenChange,
  currentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);

  const load = useCallback(async () => {
    const { data } = await authClient.listSessions();
    setSessions(data ?? []);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function revoke(token: string) {
    await authClient.revokeSession({ token });
    await load();
    await router.refresh({ preserveScroll: true });
  }

  return (
    <ListDialog open={open} onOpenChange={onOpenChange} title="ログイン中の端末">
      <ul className="flex flex-col">
        {sessions.map((session) => (
          <li key={session.id} className="flex min-h-[52px] items-center gap-3">
            <MonitorSmartphoneIcon aria-hidden="true" className="size-[18px] flex-none text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{describeUserAgent(session.userAgent)}</span>
              <span className="text-xs text-muted-foreground">
                {session.id === currentId
                  ? "この端末"
                  : `${new Date(session.updatedAt).toLocaleDateString("ja-JP")} に使用`}
              </span>
            </div>
            {session.id !== currentId && (
              <Button
                variant="outline"
                className="h-9 rounded-full px-3.5 font-semibold"
                onClick={() => void revoke(session.token)}
              >
                ログアウト
              </Button>
            )}
          </li>
        ))}
      </ul>
    </ListDialog>
  );
}

function AllowedEmailsDialog({
  open,
  onOpenChange,
  emails,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emails: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(input: string, init: RequestInit, failure: string) {
    setPending(true);
    setError(null);
    const response = await window.fetch(input, init);
    if (response.ok) await router.refresh({ preserveScroll: true });
    else setError(failure);
    setPending(false);
    return response.ok;
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const added = await send(
      "/api/admin/allowed-emails",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      },
      "メールアドレスを追加できませんでした",
    );
    if (added) setEmail("");
  }

  const remove = (target: string) =>
    send(
      `/api/admin/allowed-emails/${encodeURIComponent(target)}`,
      { method: "DELETE" },
      "メールアドレスを削除できませんでした",
    );

  return (
    <ListDialog open={open} onOpenChange={onOpenChange} title="登録を許可するメールアドレス">
      <p className="text-[13px] leading-[1.7] text-muted-foreground">
        ここにあるアドレスと管理者だけが、登録とログインができます。登録した人はアルバムの招待先に表示されます。削除すると、その人はログアウトされます。
      </p>
      <form className="flex gap-2" onSubmit={(event) => void add(event)}>
        <Input
          type="email"
          required
          aria-label="許可するメールアドレス"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl"
        />
        <Button type="submit" size="pill" disabled={pending} className="font-semibold">
          追加
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {emails.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">許可しているメールアドレスはありません</p>
      ) : (
        <ul className="flex flex-col">
          {emails.map((target) => (
            <li key={target} className="flex min-h-[52px] items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{target}</span>
              <Button
                variant="ghost"
                size="icon-pill"
                aria-label={`${target} を削除`}
                disabled={pending}
                onClick={() => void remove(target)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ListDialog>
  );
}

function HiddenPasswordDialog({
  open,
  onOpenChange,
  hasPassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await window.fetch("/api/hidden/password", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current, password }),
    });
    setPending(false);
    if (!response.ok) {
      // HTTPException の message は本文にそのまま入って返る
      const message = await response.text().catch(() => "");
      setError(message && message.length < 200 ? message : "保存できませんでした");
      return;
    }
    setCurrent("");
    setPassword("");
    onOpenChange(false);
    await router.refresh({ preserveScroll: true });
  }

  return (
    <ListDialog open={open} onOpenChange={onOpenChange} title="非表示の写真のパスワード">
      <form onSubmit={submit} className="flex flex-col gap-3">
        {hasPassword && (
          <Input
            type="password"
            aria-label="今のパスワード"
            placeholder="今のパスワード"
            autoComplete="current-password"
            required
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className="h-11 rounded-xl"
          />
        )}
        <Input
          type="password"
          aria-label="新しいパスワード"
          placeholder="新しいパスワード（4文字以上）"
          autoComplete="new-password"
          required
          minLength={4}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-xl"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="pill" className="font-semibold" disabled={pending}>
          保存
        </Button>
      </form>
    </ListDialog>
  );
}

type OpenDialog = "name" | "passkeys" | "sessions" | "shared" | "allowedEmails" | "hiddenPassword" | null;

export default function SettingsPage({
  user,
  sessionId,
  settings,
  storage,
  passkeyCount,
  sessionCount,
  sharedAlbums,
  albumOptions,
  allowedEmails,
  hasHiddenPassword,
}: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [values, setValues] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function changeAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    try {
      const image = await uploadAvatar(file);
      // セッションに入っている名前やアイコンも新しくするため、Better Auth 経由で書き換える
      const { error } = await authClient.updateUser({ image });
      if (error) throw new Error("アイコンを保存できませんでした");
      await router.refresh({ preserveScroll: true });
    } catch (cause) {
      setAvatarError(cause instanceof Error ? cause.message : "アイコンを保存できませんでした");
    }
  }

  async function removeAvatar() {
    setAvatarError(null);
    await window.fetch("/api/me/avatar", { method: "DELETE" });
    const { error } = await authClient.updateUser({ image: null });
    if (error) setAvatarError("アイコンを削除できませんでした");
    await router.refresh({ preserveScroll: true });
  }

  const dialogProps = (name: OpenDialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  });

  async function update(patch: Partial<Settings>) {
    const previous = values;
    setValues({ ...values, ...patch });
    setError(null);
    const response = await window.fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      setValues(previous);
      setError("設定を保存できませんでした");
    }
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainHeader user={user} onUpload={() => setUploading(true)} />
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-8 pt-10 pb-16 max-md:gap-[22px] max-md:px-4 max-md:pt-5 max-md:pb-[110px]">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] max-md:text-[30px]">設定</h1>

        <Card className="flex items-center gap-3.5 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="アイコンを変更" className="cursor-pointer rounded-full">
              <UserAvatar user={user} className="size-[52px] text-xl" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onSelect={() => avatarInput.current?.click()}>画像を選ぶ</DropdownMenuItem>
              {user.image && (
                <DropdownMenuItem variant="destructive" onSelect={() => void removeAvatar()}>
                  画像を削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={avatarInput}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            onChange={(event) => {
              void changeAvatar(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[17px] font-semibold">{user.name || "あなた"}</span>
            <span className="truncate text-[13px] text-muted-foreground">{user.email}</span>
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-full border-input bg-transparent px-3.5 text-[13px] font-semibold dark:bg-transparent"
            onClick={() => setDialog("name")}
          >
            編集
          </Button>
        </Card>

        {avatarError && (
          <p role="alert" className="-mt-3 mx-1 text-sm text-destructive">
            {avatarError}
          </p>
        )}

        <Section title="表示">
          <ThemePicker />
          <Card>
            <div className={ROW_CLASS}>
              <span className="flex-1 text-[15px]">ログイン画面の写真</span>
              <span className="text-sm text-muted-foreground">{LOGIN_PHOTO_COUNT} 枚</span>
            </div>
          </Card>
        </Section>

        <Section title="アップロード">
          <Card>
            {TOGGLES.map((toggle) => (
              <div
                key={toggle.key}
                className="flex min-h-[60px] items-center gap-3 border-t border-border px-4 py-2.5 first:border-t-0"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span id={`sw-${toggle.key}`} className="text-[15px]">
                    {toggle.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{toggle.description}</span>
                </div>
                <Switch
                  size="lg"
                  aria-labelledby={`sw-${toggle.key}`}
                  checked={values[toggle.key]}
                  onCheckedChange={(checked) => void update({ [toggle.key]: checked })}
                />
              </div>
            ))}
          </Card>
          {error && (
            <p role="alert" className="mx-1 text-sm text-destructive">
              {error}
            </p>
          )}
        </Section>

        <Section title="ストレージ">
          <StorageCard {...storage} />
        </Section>

        <Section title="アカウントと共有">
          <Card>
            <Row label="パスキー" value={`${passkeyCount} 件`} onClick={() => setDialog("passkeys")} />
            <Row label="ログイン中の端末" value={`${sessionCount} 台`} onClick={() => setDialog("sessions")} />
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(ROW_CLASS, "cursor-pointer")}>
                <span className="flex-1 text-[15px]">共有リンクの既定の期限</span>
                <span className="text-sm text-muted-foreground">{EXPIRY_LABELS[values.defaultExpiry]}</span>
                <ChevronRightIcon aria-hidden="true" className="size-[18px] text-subtle-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup
                  value={values.defaultExpiry}
                  onValueChange={(value) => void update({ defaultExpiry: value as Settings["defaultExpiry"] })}
                >
                  {Object.entries(EXPIRY_LABELS).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Row label="共有中のアルバム" value={`${sharedAlbums.length} 件`} onClick={() => setDialog("shared")} />
            <Row
              label="非表示の写真のパスワード"
              value={hasHiddenPassword ? "設定済み" : "未設定"}
              onClick={() => setDialog("hiddenPassword")}
            />
          </Card>
        </Section>

        {allowedEmails && (
          <Section title="管理">
            <Card>
              <Row
                label="登録を許可するメールアドレス"
                value={`${allowedEmails.length} 件`}
                onClick={() => setDialog("allowedEmails")}
              />
            </Card>
          </Section>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="surface"
            className="h-[52px] rounded-2xl border-border text-[15px] font-semibold text-destructive hover:text-destructive"
            onClick={() => void signOut()}
          >
            ログアウト
          </Button>
          <p className="text-center text-xs text-muted-foreground">Selfy v{version} · オープンソース（MIT）</p>
        </div>
      </main>

      <BottomNav current="settings" />
      <UploadDialog
        open={uploading}
        onOpenChange={setUploading}
        albums={albumOptions}
        settings={values}
      />
      <AlbumTitleDialog
        {...dialogProps("name")}
        initialTitle={user.name}
        heading="名前を変更"
        label="名前"
        submitLabel="保存"
        onSubmit={async (name) => {
          const { error } = await authClient.updateUser({ name });
          if (error) throw new Error("保存できませんでした");
          await router.refresh({ preserveScroll: true });
        }}
      />
      <PasskeysDialog {...dialogProps("passkeys")} />
      <HiddenPasswordDialog {...dialogProps("hiddenPassword")} hasPassword={hasHiddenPassword} />
      <SessionsDialog {...dialogProps("sessions")} currentId={sessionId} />
      {allowedEmails && <AllowedEmailsDialog {...dialogProps("allowedEmails")} emails={allowedEmails} />}
      <ListDialog {...dialogProps("shared")} title="共有中のアルバム">
        {sharedAlbums.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">共有中のアルバムはありません</p>
        ) : (
          <ul className="flex flex-col">
            {sharedAlbums.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/albums/${album.id}`}
                  className="flex min-h-[52px] items-center text-[15px] font-medium text-foreground hover:text-link-hover"
                >
                  <span className="truncate">{album.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ListDialog>
    </div>
  );
}
