import NextAuth from "next-auth";
import { Prisma } from "@prisma/client";
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
        // Look up by the actual DB uniqueness constraint (provider +
        // providerAccountId is global, not scoped to this user) so a stale
        // per-user query can't miss an existing row and crash on create().
        const existing = await db.account.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId: account.providerAccountId } },
        });

        if (existing && existing.userId !== dbUser.id) {
          // Already linked to a different UniCal user — leave it alone.
        } else if (existing) {
          await db.account.update({
            where: { id: existing.id },
            data: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token ?? existing.refreshToken,
              expiresAt: account.expires_at ?? existing.expiresAt,
            },
          });
        } else {
          const accountCount = await db.account.count({ where: { userId: dbUser.id } });
          try {
            await db.account.create({
              data: {
                userId: dbUser.id,
                provider,
                providerAccountId: account.providerAccountId,
                email: user.email,
                accessToken: account.access_token,
                refreshToken: account.refresh_token ?? null,
                expiresAt: account.expires_at ?? null,
                color: ACCOUNT_PALETTE[accountCount % ACCOUNT_PALETTE.length] ?? PROVIDER_COLORS[provider],
              },
            });
          } catch (err) {
            // Another concurrent sign-in created this exact row first — the
            // account ends up linked either way, so this is safe to ignore.
            if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
          }
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
