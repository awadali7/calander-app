import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await db.user.upsert({
        where: { email: user.email },
        update: { name: user.name, image: user.image },
        create: { email: user.email, name: user.name, image: user.image },
      });
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
