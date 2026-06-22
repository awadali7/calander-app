import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { ACCOUNT_PALETTE, PROVIDER_COLORS, type Provider } from "@/lib/normalise";

// Google and Microsoft Entra ID sign-in both also request calendar read
// scopes, so the tokens from a user's initial sign-in double as their first
// connected calendar account for that provider.
const AUTO_LINK_PROVIDERS: Record<string, Provider> = {
  google: "gmail",
  "microsoft-entra-id": "outlook",
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const dbUser = await db.user.upsert({
        where: { email: user.email },
        update: { name: user.name, image: user.image },
        create: { email: user.email, name: user.name, image: user.image },
      });

      const provider = account?.provider ? AUTO_LINK_PROVIDERS[account.provider] : undefined;
      if (provider && account?.access_token) {
        const existing = await db.account.findMany({ where: { userId: dbUser.id } });
        const already = existing.find(
          (a) => a.provider === provider && a.providerAccountId === account.providerAccountId
        );

        if (already) {
          await db.account.update({
            where: { id: already.id },
            data: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token ?? already.refreshToken,
              expiresAt: account.expires_at ?? already.expiresAt,
            },
          });
        } else {
          await db.account.create({
            data: {
              userId: dbUser.id,
              provider,
              providerAccountId: account.providerAccountId,
              email: user.email,
              accessToken: account.access_token,
              refreshToken: account.refresh_token ?? null,
              expiresAt: account.expires_at ?? null,
              color: ACCOUNT_PALETTE[existing.length % ACCOUNT_PALETTE.length] ?? PROVIDER_COLORS[provider],
            },
          });
        }
      }

      return true;
    },
    // `user` is only populated on initial sign-in (handled by the Node.js
    // route handler). Middleware re-validates the token on every request in
    // the edge runtime, where Prisma can't run — so the DB lookup must stay
    // gated behind `user` and never run in `session`.
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        const dbUser = await db.user.findUnique({ where: { email: user.email } });
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email;
        if (token.id) session.user.id = token.id as string;
      }
      return session;
    },
  },
});
