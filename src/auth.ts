import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
  ],
  callbacks: {
    jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    session({ session, token }) {
      session.accessToken = token.accessToken
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

