import { APIError } from "@better-auth/core/error";
import { passkey } from "@better-auth/passkey";
import { magicLink } from "better-auth/plugins/magic-link";
import { defineAuth } from "void/auth";
import { EMAIL_NOT_ALLOWED } from "@/lib/auth-errors";
import { isEmailAllowed } from "@/server/allowed-emails";
import { sendLoginEmail } from "@/server/login-email";
import { findUsersByIds } from "@/server/users";

function notAllowedError() {
  return new APIError("FORBIDDEN", { code: EMAIL_NOT_ALLOWED, message: "このメールアドレスは登録が許可されていません" });
}

export default defineAuth(({ defaults, request }) => {
  const { hostname, origin } = new URL(request.url);

  return {
    ...defaults,
    // ログインはパスキーとメールリンクのみ。パスワードの登録口を残さない
    emailAndPassword: { enabled: false },
    // どのログイン方法でも通る場所で許可を確かめる。送信時の確認はリンク発行後の取り消しを防げない
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!(await isEmailAllowed(user.email))) throw notAllowedError();
          },
        },
      },
      session: {
        create: {
          before: async (session, context) => {
            const [user] = await findUsersByIds([session.userId]);
            if (user && (await isEmailAllowed(user.email))) return;
            // メールのリンクはブラウザで直接開かれるので、JSON ではなくログイン画面に戻す
            if (context?.path === "/magic-link/verify") {
              throw context.redirect(`/login?error=${EMAIL_NOT_ALLOWED}`);
            }
            throw notAllowedError();
          },
        },
      },
    },
    plugins: [
      ...(defaults.plugins ?? []),
      magicLink({
        expiresIn: 60 * 15,
        sendMagicLink: async ({ email, url }) => {
          if (!(await isEmailAllowed(email))) throw notAllowedError();
          await sendLoginEmail(email, url);
        },
      }),
      passkey({ rpName: "Selfy", rpID: hostname, origin }),
    ],
  };
});
