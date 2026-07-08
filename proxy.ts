import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isProtected =
    req.nextUrl.pathname.startsWith("/calendar") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isProtected && !req.auth) {
    const signInUrl = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/calendar/:path*", "/settings/:path*"],
};
