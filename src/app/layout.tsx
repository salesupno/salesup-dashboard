import type { Metadata } from "next"
import { Schibsted_Grotesk } from "next/font/google"
import AuthProvider from "@/components/providers/AuthProvider"
import "./globals.css"

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "SalesUp Dashboard",
  description: "SalesUp Norway AS — CEO Dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="no" className={schibsted.variable}>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
