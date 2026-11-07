import { Link, useRouter } from "@void/react";
import { ChevronRightIcon, KeyRoundIcon, MonitorSmartphoneIcon, Trash2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AlbumTitleDialog, UploadDialog } from "@/components/album-dialogs";
import { userInitial } from "@/components/account-link";
import { BottomNav } from "@/components/bottom-nav";
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, mobileSheetClassName, SheetHandle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { formatBytes } from "@/lib/format";
import { LOGIN_PHOTO_COUNT } from "@/lib/login-photos";
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

type OpenDialog = "name" | "passkeys" | "sessions" | "shared" | null;

export default function SettingsPage({
  user,
  sessionId,
  settings,
  storage,
  passkeyCount,
  sessionCount,
  sharedAlbums,
  albumOptions,
}: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [values, setValues] = useState(settings);
  const [error, setError] = useState<string | null>(null);

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
          <span className="flex size-[52px] flex-none items-center justify-center rounded-full bg-avatar text-xl font-semibold">
            {userInitial(user)}
          </span>
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
          </Card>
        </Section>

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
      <SessionsDialog {...dialogProps("sessions")} currentId={sessionId} />
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
