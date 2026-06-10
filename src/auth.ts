import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      // Only allow @salesup.no email addresses
      return profile?.email?.endsWith("@salesup.no") ?? false
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
