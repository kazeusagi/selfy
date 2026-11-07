import { KeyRoundIcon, MailIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { EMAIL_NOT_ALLOWED } from "@/lib/auth-errors";
import type { Props } from "./login.server";

// [ファイル名, 幅, 高さ]
type LoginPhoto = [string, number, number];

const PHOTO_COLUMNS: { photos: LoginPhoto[]; animation: string }[] = [
  {
    animation: "flow-up 70s linear infinite normal",
    photos: [
      ["photo08", 1800, 1200],
      ["photo06", 1800, 1200],
      ["photo01", 1200, 1800],
      ["photo11", 1351, 1800],
      ["photo03", 1200, 1800],
    ],
  },
  {
    animation: "flow-up 85s linear infinite reverse",
    photos: [
      ["photo13", 1286, 1800],
      ["photo02", 1440, 1800],
      ["photo12", 1800, 1200],
      ["photo04", 1350, 1800],
      ["photo05", 1200, 1800],
    ],
  },
  {
    animation: "flow-up 64s linear infinite normal",
    photos: [
      ["photo10", 1351, 1800],
      ["photo07", 1200, 1800],
      ["photo09", 1800, 1200],
      ["photo14", 1199, 1800],
    ],
  },
];

const PHOTO_ROWS: { photos: LoginPhoto[]; animation: string }[] = [
  {
    animation: "flow-left 80s linear infinite normal",
    photos: [
      ["photo08", 1800, 1200],
      ["photo06", 1800, 1200],
      ["photo13", 1286, 1800],
      ["photo10", 1351, 1800],
      ["photo12", 1800, 1200],
      ["photo02", 1440, 1800],
      ["photo07", 1200, 1800],
    ],
  },
  {
    animation: "flow-left 95s linear infinite reverse",
    photos: [
      ["photo01", 1200, 1800],
      ["photo04", 1350, 1800],
      ["photo11", 1351, 1800],
      ["photo03", 1200, 1800],
      ["photo14", 1199, 1800],
      ["photo05", 1200, 1800],
      ["photo09", 1800, 1200],
    ],
  },
];

// 同じ並びを2回繰り返し、ちょうど1周分ずらすことで継ぎ目なくループさせる
function PhotoStrip({
  photos,
  animation,
  className,
  imageClassName,
}: {
  photos: LoginPhoto[];
  animation: string;
  className: string;
  imageClassName: string;
}) {
  return (
    <div className="login-flow" style={{ animation }}>
      <div className={className}>
        {[...photos, ...photos].map(([name, width, height], index) => (
          <img
            key={`${name}-${index}`}
            src={`/login/${name}.jpg`}
            alt=""
            width={width}
            height={height}
            decoding="async"
            className={imageClassName}
          />
        ))}
      </div>
    </div>
  );
}

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

const NOT_ALLOWED_MESSAGE = (
  <>
    このメールアドレスは登録が許可されていません。利用するには管理者に問い合わせるか、
    <a
      href="https://github.com/kazeusagi/selfy"
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      https://github.com/kazeusagi/selfy
    </a>
    にアクセスしてセルフホストしてください。
  </>
);

function initialError(linkError: string | null) {
  if (!linkError) return null;
  return linkError === EMAIL_NOT_ALLOWED
    ? NOT_ALLOWED_MESSAGE
    : "ログインリンクが無効か、期限が切れています。もう一度お試しください。";
}

const CODE_ERRORS: Record<string, string> = {
  INVALID_OTP: "コードが正しくありません。",
  OTP_EXPIRED: "コードの期限が切れています。もう一度送信してください。",
  TOO_MANY_ATTEMPTS: "入力の回数が上限に達しました。もう一度コードを送信してください。",
};

export default function LoginPage({ linkError }: Props) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  // コードを送ったアドレス。入力欄を出し、ログインにもこのアドレスを使う
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ReactNode>(initialError(linkError));

  async function signInWithPasskey() {
    setError(null);
    const { error } = await authClient.signIn.passkey();
    if (!error) {
      window.location.href = "/";
    } else {
      setError(
        "code" in error && error.code === EMAIL_NOT_ALLOWED
          ? NOT_ALLOWED_MESSAGE
          : "パスキーでログインできませんでした。初めての場合はメールでログインし、設定からパスキーを登録してください。",
      );
    }
  }

  // Enter はリンクの送信に割り当て、コードは専用のボタンから送る
  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCodeSentTo(null);
    setPending(true);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/",
      errorCallbackURL: "/login?error=link",
    });
    setPending(false);
    if (error) {
      setError(error.code === EMAIL_NOT_ALLOWED ? NOT_ALLOWED_MESSAGE : "ログインリンクを送信できませんでした。");
    }
    else setSentTo(email);
  }

  async function sendCode(target: string) {
    setError(null);
    setSentTo(null);
    setPending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: target, type: "sign-in" });
    setPending(false);
    if (error) {
      setError(error.code === EMAIL_NOT_ALLOWED ? NOT_ALLOWED_MESSAGE : "確認コードを送信できませんでした。");
      return;
    }
    setCode("");
    setCodeSentTo(target);
  }

  async function signInWithCode(event: FormEvent) {
    event.preventDefault();
    if (!codeSentTo) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.emailOtp({ email: codeSentTo, otp: code.trim() });
    if (!error) {
      window.location.href = "/";
      return;
    }
    setPending(false);
    setError(
      error.code === EMAIL_NOT_ALLOWED
        ? NOT_ALLOWED_MESSAGE
        : (CODE_ERRORS[error.code ?? ""] ?? "ログインできませんでした。もう一度お試しください。"),
    );
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-background text-foreground max-md:flex-col max-md:flex-nowrap">
      <div className="flex flex-[1_1_520px] p-3 max-md:flex-none max-md:p-0">
        <div
          aria-hidden="true"
          className="grid h-[calc(100vh-24px)] min-h-[336px] flex-1 grid-cols-3 gap-3 overflow-hidden rounded-[20px] max-md:hidden"
        >
          {PHOTO_COLUMNS.map((column) => (
            <div key={column.animation} className="min-w-0 overflow-hidden">
              <PhotoStrip
                {...column}
                className="flex flex-col gap-3"
                imageClassName="block h-auto w-full rounded-[14px]"
              />
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="grid h-[380px] w-full grid-rows-2 gap-2 overflow-hidden py-2 md:hidden"
        >
          {PHOTO_ROWS.map((row) => (
            <div key={row.animation} className="min-h-0 overflow-hidden [&>.login-flow]:h-full">
              <PhotoStrip
                {...row}
                className="flex h-full w-max gap-2"
                imageClassName="block h-full w-auto flex-none rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>
      <main className="flex flex-[1_1_480px] items-center justify-center px-6 py-12 max-md:flex-1 max-md:items-start max-md:py-8">
        <div className="flex w-full max-w-[380px] flex-col gap-7 max-md:max-w-none max-md:gap-[22px]">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-9 rounded-[10px] max-md:size-8 max-md:rounded-[9px]" iconSize={20} />
            <span className="text-[22px] font-bold tracking-[-0.02em] max-md:text-xl">Selfy</span>
          </div>
          <div className="flex flex-col gap-2 max-md:gap-1.5">
            <h1 className="text-[28px] font-bold tracking-[-0.01em] max-md:text-[26px] max-md:tracking-normal">おかえりなさい</h1>
            <p className="text-[15px] leading-[1.7] text-muted-foreground max-md:text-sm">
              あなたの写真は、あなただけのストレージに保存されます。
            </p>
          </div>
          <Button className="h-[52px] gap-2.5 rounded-xl text-[15px] font-semibold max-md:h-[54px] max-md:rounded-[14px] max-md:text-base" onClick={signInWithPasskey}>
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
              className="h-12 rounded-xl px-3.5 text-[15px] max-md:h-[50px] max-md:rounded-[14px] max-md:text-base md:text-[15px]"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="submit"
                variant="surface"
                disabled={pending}
                className="h-12 gap-2 rounded-xl text-[15px] font-semibold max-md:h-[50px] max-md:rounded-[14px]"
              >
                <MailIcon className="size-[18px] max-md:hidden" />
                リンクを送る
              </Button>
              <Button
                type="button"
                variant="surface"
                disabled={pending}
                onClick={(event) => {
                  // 送信ボタンと同じく、未入力や形式の誤りはブラウザの検証で知らせる
                  const form = event.currentTarget.form;
                  if (form?.reportValidity()) void sendCode(email);
                }}
                className="h-12 gap-2 rounded-xl text-[15px] font-semibold max-md:h-[50px] max-md:rounded-[14px]"
              >
                <KeyRoundIcon className="size-[18px] max-md:hidden" />
                コードを送る
              </Button>
            </div>
          </form>
          {codeSentTo && (
            <form className="flex flex-col gap-2.5" onSubmit={signInWithCode}>
              <label htmlFor="code" className="text-[13px] font-medium">
                確認コード
              </label>
              <p className="text-sm leading-[1.7] text-muted-foreground">
                {codeSentTo} に6桁のコードを送りました。有効期限は10分です。
              </p>
              <Input
                id="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                className="h-12 rounded-xl px-3.5 text-center font-mono text-xl tracking-[0.4em] max-md:h-[50px] max-md:rounded-[14px] md:text-xl"
              />
              <Button
                type="submit"
                disabled={pending || code.length !== 6}
                className="h-12 rounded-xl text-[15px] font-semibold max-md:h-[50px] max-md:rounded-[14px]"
              >
                ログイン
              </Button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void sendCode(codeSentTo)}
                className="self-center text-[13px] text-muted-foreground underline-offset-2 enabled:cursor-pointer enabled:hover:underline"
              >
                コードを再送する
              </button>
            </form>
          )}
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
          <p className="text-[13px] leading-[1.7] text-muted-foreground max-md:hidden">
            共有リンクを受け取った方は、届いたリンクから直接開けます。
          </p>
        </div>
      </main>
    </div>
  );
}
