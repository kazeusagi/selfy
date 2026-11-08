import { defineEnv, email, string } from "void/env";

export default defineEnv({
  RESEND_API_KEY: string(),
  ADMIN_EMAIL: email(),
  // メールの送信元アドレス。本番では Resend で認証したドメインのものにする
  EMAIL_FROM: email(),
});
