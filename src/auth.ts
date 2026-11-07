import { passkey } from "@better-auth/passkey";
import { magicLink } from "better-auth/plugins/magic-link";
import { defineAuth } from "void/auth";
import { sendLoginEmail } from "@/server/login-email";

export default defineAuth(({ defaults, request }) => {
  const { hostname, origin } = new URL(request.url);

  return {
    ...defaults,
    // ログインはパスキーとメールリンクのみ。パスワードの登録口を残さない
    emailAndPassword: { enabled: false },
    plugins: [
      ...(defaults.plugins ?? []),
      magicLink({
        expiresIn: 60 * 15,
        sendMagicLink: ({ email, url }) => sendLoginEmail(email, url),
      }),
      passkey({ rpName: "Selfy", rpID: hostname, origin }),
    ],
  };
});
