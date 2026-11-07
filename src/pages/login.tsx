import { MailIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import type { Props } from "./login.server";

const COLLAGE = [
  "row-span-2 bg-[#c9b8a3]",
  "bg-[#8fa3b0]",
  "bg-[#d6cfc2] max-sm:order-1",
  "col-span-2 bg-[#6e7f6a] max-sm:col-span-1",
  "bg-[#b9c4ce] max-sm:hidden",
  "bg-[#a48b78] max-sm:order-1",
  "bg-[#5f6b73] max-sm:hidden",
];

function PasskeyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="9" r="4" />
      <path d="M2 20c0-3.3 2.7-6 6-6 1.4 0 2.6.4 3.6 1.2" />
      <path d="M17 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
      <path d="M17 18v4" />
    </svg>
  );
}

export default function LoginPage({ linkError }: Props) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    linkError ? "ログインリンクが無効か、期限が切れています。もう一度お試しください。" : null,
  );

  async function signInWithPasskey() {
    setError(null);
    const { error } = await authClient.signIn.passkey();
    if (!error) {
      window.location.href = "/";
    } else {
      setError(
        "パスキーでログインできませんでした。初めての場合はメールでログインし、アカウントメニューからパスキーを登録してください。",
      );
    }
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/",
      errorCallbackURL: "/login?error=link",
    });
    setPending(false);
    if (error) setError("ログインリンクを送信できませんでした。");
    else setSentTo(email);
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-background text-foreground max-sm:flex-col max-sm:flex-nowrap">
      <div
        aria-hidden="true"
        className="grid min-h-[360px] flex-[1_1_520px] grid-cols-3 grid-rows-3 gap-1.5 p-1.5 max-sm:h-[300px] max-sm:min-h-0 max-sm:flex-none max-sm:grid-rows-2 max-sm:gap-1 max-sm:p-1"
      >
        {COLLAGE.map((tile) => (
          <div key={tile} className={`rounded-[14px] max-sm:rounded-xl ${tile}`} />
        ))}
      </div>
      <main className="flex flex-[1_1_480px] items-center justify-center px-6 py-12 max-sm:flex-1 max-sm:items-start max-sm:py-8">
        <div className="flex w-full max-w-[380px] flex-col gap-7 max-sm:max-w-none max-sm:gap-[22px]">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-9 rounded-[10px] max-sm:size-8 max-sm:rounded-[9px]" iconSize={20} />
            <span className="text-[22px] font-bold tracking-[-0.02em] max-sm:text-xl">Selfy</span>
          </div>
          <div className="flex flex-col gap-2 max-sm:gap-1.5">
            <h1 className="text-[28px] font-bold tracking-[-0.01em] max-sm:text-[26px] max-sm:tracking-normal">おかえりなさい</h1>
            <p className="text-[15px] leading-[1.7] text-muted-foreground max-sm:text-sm">
              あなたの写真は、あなたのCloudflareアカウントにだけ保存されます。
            </p>
          </div>
          <Button className="h-[52px] gap-2.5 rounded-xl text-[15px] font-semibold max-sm:h-[54px] max-sm:rounded-[14px] max-sm:text-base" onClick={signInWithPasskey}>
            <PasskeyIcon />
            パスキーでログイン
          </Button>
          <div className="flex items-center gap-3 text-[13px] text-subtle-foreground">
            <div className="h-px flex-1 bg-border" />
            または
            <div className="h-px flex-1 bg-border" />
          </div>
          <form className="flex flex-col gap-2.5" onSubmit={sendLink}>
            <label htmlFor="email" className="text-[13px] font-medium">
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl px-3.5 text-[15px] max-sm:h-[50px] max-sm:rounded-[14px] max-sm:text-base md:text-[15px]"
            />
            <Button
              type="submit"
              variant="surface"
              disabled={pending}
              className="h-12 gap-2 rounded-xl text-[15px] font-semibold max-sm:h-[50px] max-sm:rounded-[14px]"
            >
              <MailIcon className="size-[18px] max-sm:hidden" />
              ログインリンクを送る
            </Button>
          </form>
          {sentTo && (
            <p role="status" className="text-sm leading-[1.7]">
              {sentTo} にログインリンクを送りました。メールを確認してください。
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm leading-[1.7] text-destructive">
              {error}
            </p>
          )}
          <p className="text-[13px] leading-[1.7] text-muted-foreground max-sm:hidden">
            共有リンクを受け取った方は、届いたリンクから直接開けます。
          </p>
        </div>
      </main>
    </div>
  );
}
