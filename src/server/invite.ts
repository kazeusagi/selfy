import { albumMembers } from "@schema";
import { and, db, eq } from "void/db";
import { HTTPException } from "hono/http-exception";
import { isEmailAllowed } from "@/server/allowed-emails";
import { sendInviteEmail } from "@/server/login-email";
import { displayName, findUsersByIds } from "@/server/users";

export type InviteRole = "viewer" | "contributor";

// 共有ダイアログからの招待とアルバム作成時の招待で、確認の条件をそろえる
export async function inviteMember(
  album: { id: string; title: string },
  inviter: { id: string; name: string; email: string },
  userId: string,
  role: InviteRole,
  origin: string,
) {
  const [target] = await findUsersByIds([userId]);
  if (!target || target.id === inviter.id || !(await isEmailAllowed(target.email))) {
    throw new HTTPException(400, { message: "このユーザーは招待できません" });
  }
  const email = target.email.toLowerCase();

  const [existing] = await db
    .select({ id: albumMembers.id })
    .from(albumMembers)
    .where(and(eq(albumMembers.albumId, album.id), eq(albumMembers.email, email)));
  if (existing) throw new HTTPException(409, { message: "すでに招待しています" });

  const id = crypto.randomUUID();
  await db.insert(albumMembers).values({ id, albumId: album.id, email, role });
  try {
    await sendInviteEmail(email, displayName(inviter), album.title, `${origin}/albums/${album.id}`);
  } catch (error) {
    // メールが届かないまま招待済みにすると、相手は招待に気づけない
    await db.delete(albumMembers).where(eq(albumMembers.id, id));
    throw error;
  }
  return id;
}
