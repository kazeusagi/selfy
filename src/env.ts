import { defineEnv, email, string } from "void/env";

export default defineEnv({
  RESEND_API_KEY: string(),
  ADMIN_EMAIL: email(),
});
