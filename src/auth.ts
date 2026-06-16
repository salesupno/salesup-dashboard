import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import type { JWT } from "@auth/core/jwt"

async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshAccessTokenError" }
  }

  try {
    const body = new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: String(token.refreshToken),
    })

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    const refreshed = await res.json()
    if (!res.ok) throw refreshed

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    }
  } catch {
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist all OAuth fields we need for refresh.
      if (account?.access_token) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token ?? token.refreshToken
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000
        token.error = undefined
      }

      // If token is still valid, keep it.
      if (typeof token.accessTokenExpires === "number" && Date.now() < token.accessTokenExpires - 60_000) {
        return token
      }

      // Refresh when expired (or close to expiry).
      return refreshGoogleAccessToken(token)
    },
    session({ session, token }) {
      session.accessToken = token.accessToken
      session.error = token.error
      return session
    },
    signIn({ profile }) {
      return profile?.email?.endsWith("@salesup.no") ?? false
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})

