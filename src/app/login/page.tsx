"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const params = useSearchParams()
  const error = params.get("error")

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font)",
    }}>
      <div style={{
        background: "var(--surface)",
        borderRadius: "var(--r)",
        boxShadow: "var(--shadow-lg)",
        padding: "52px 56px",
        maxWidth: 440,
        width: "100%",
        textAlign: "center",
      }}>
        {/* Logo / brand */}
        <div style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.03em",
          color: "var(--ink)",
          marginBottom: 8,
        }}>
          SalesUp
        </div>
        <div style={{
          fontSize: 13.5,
          color: "var(--ink-3)",
          fontWeight: 600,
          letterSpacing: ".03em",
          textTransform: "uppercase",
          marginBottom: 40,
        }}>
          CEO Dashboard
        </div>

        <div style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-.02em",
          color: "var(--ink)",
          marginBottom: 8,
        }}>
          Logg inn
        </div>
        <div style={{
          fontSize: 14.5,
          color: "var(--ink-3)",
          marginBottom: 32,
          lineHeight: 1.5,
        }}>
          Kun for <strong style={{ color: "var(--ink-2)" }}>@salesup.no</strong>-brukere.
        </div>

        {error === "AccessDenied" && (
          <div style={{
            background: "var(--red-soft)",
            border: "1.5px solid var(--red-dot)",
            borderRadius: 14,
            padding: "13px 18px",
            marginBottom: 24,
            fontSize: 13.5,
            color: "var(--red)",
            fontWeight: 600,
          }}>
            Kun @salesup.no-kontoer har tilgang.
          </div>
        )}

        {error && error !== "AccessDenied" && (
          <div style={{
            background: "var(--yellow-soft)",
            border: "1.5px solid var(--yellow-dot)",
            borderRadius: 14,
            padding: "13px 18px",
            marginBottom: 24,
            fontSize: 13.5,
            color: "var(--yellow)",
            fontWeight: 600,
          }}>
            Noe gikk galt. Prøv igjen.
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "var(--ink)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "15px 24px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "var(--font)",
            cursor: "pointer",
            transition: "opacity .15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <GoogleIcon />
          Fortsett med Google
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="rgba(255,255,255,.75)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="rgba(255,255,255,.55)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="rgba(255,255,255,.9)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
