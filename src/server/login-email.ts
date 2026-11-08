import { sendEmail } from "void/email";
import { env } from "void/env";

function from() {
  return `Selfy <${env.EMAIL_FROM}>`;
}

async function sendWithResend(to: string, subject: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: from(), to, subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Resend への送信に失敗しました", response.status, await response.text());
    throw new Error("メールを送信できませんでした");
  }
}

// 開発中は実際には送らず、Void のローカル受信箱に届ける
async function sendToLocalInbox(to: string, subject: string, text: string) {
  const result = await sendEmail({ from: from(), to, subject, text });
  if (!result.ok) {
    console.error("メールの送信に失敗しました", result);
    throw new Error("メールを送信できませんでした");
  }
}

async function send(to: string, subject: string, text: string) {
  await (import.meta.env.DEV ? sendToLocalInbox : sendWithResend)(to, subject, text);
}

export async function sendLoginEmail(to: string, url: string) {
  const text = `次のリンクからログインしてください。リンクの有効期限は15分です。\n\n${url}\n\n心当たりがない場合は、このメールを無視してください。`;
  await send(to, "Selfy へのログインリンク", text);
}

export async function sendLoginCodeEmail(to: string, code: string) {
  const text = `Selfy のログイン画面で次の確認コードを入力してください。コードの有効期限は10分です。\n\n${code}\n\n心当たりがない場合は、このメールを無視してください。`;
  await send(to, `Selfy の確認コード: ${code}`, text);
}

export async function sendInviteEmail(to: string, inviter: string, albumTitle: string, url: string) {
  const text = `${inviter} さんが Selfy のアルバム「${albumTitle}」にあなたを招待しました。\n\n次のリンクを開き、このメールアドレスでログインしてください。\n\n${url}\n\n心当たりがない場合は、このメールを無視してください。`;
  await send(to, `${inviter} さんからアルバムの招待が届いています`, text);
}
