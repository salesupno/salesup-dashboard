import "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
  }
}
