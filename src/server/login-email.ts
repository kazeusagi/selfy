import { sendEmail } from "void/email";
import { env } from "void/env";

const FROM = "Selfy <noreply@kazeusagi.dev>";
const SUBJECT = "Selfy へのログインリンク";

async function sendWithResend(to: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject: SUBJECT, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Resend への送信に失敗しました", response.status, await response.text());
    throw new Error("ログインリンクを送信できませんでした");
  }
}

// 開発中は実際には送らず、Void のローカル受信箱に届ける
async function sendToLocalInbox(to: string, text: string) {
  const result = await sendEmail({ from: FROM, to, subject: SUBJECT, text });
  if (!result.ok) {
    console.error("ログインリンクの送信に失敗しました", result);
    throw new Error("ログインリンクを送信できませんでした");
  }
}

export async function sendLoginEmail(to: string, url: string) {
  const text = `次のリンクからログインしてください。リンクの有効期限は15分です。\n\n${url}\n\n心当たりがない場合は、このメールを無視してください。`;
  await (import.meta.env.DEV ? sendToLocalInbox(to, text) : sendWithResend(to, text));
}
