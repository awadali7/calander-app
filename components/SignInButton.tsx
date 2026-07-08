"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => signIn("google", { callbackUrl: "/connect" })}
        className="flex items-center justify-center gap-3 w-full rounded-pill bg-primary text-white font-medium py-3 px-6 transition hover:bg-blue-700"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.7 35 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C40.9 36.5 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"
          />
        </svg>
        Get started with Google
      </button>

      <button
        onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/connect" })}
        className="flex items-center justify-center gap-3 w-full rounded-pill border border-border bg-card text-foreground font-medium py-3 px-6 transition hover:bg-background"
      >
        <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
          <rect x="1" y="1" width="10" height="10" fill="#F25022" />
          <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
          <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
          <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
        </svg>
        Get started with Microsoft
      </button>
    </div>
  );
}
