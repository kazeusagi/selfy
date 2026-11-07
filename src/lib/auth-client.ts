import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "void/client/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [magicLinkClient(), emailOTPClient(), passkeyClient()],
});
