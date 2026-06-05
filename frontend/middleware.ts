import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_REDIRECT_PARAM, getSafeRedirectPath } from "@/lib/auth-cookie";

const protectedPrefixes = [
  "/admin",
  "/analytics",
  "/audit-logs",
  "/chat",
  "/dashboard",
  "/documents",
  "/graph",
  "/settings",
];

const authRoutes = ["/login", "/register"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (matchesPrefix(pathname, protectedPrefixes) && !token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(AUTH_REDIRECT_PARAM, `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.includes(pathname) && token) {
    const nextPath = getSafeRedirectPath(request.nextUrl.searchParams.get(AUTH_REDIRECT_PARAM));
    const redirectUrl = request.nextUrl.clone();
    const parsedNextPath = new URL(nextPath, request.nextUrl.origin);
    redirectUrl.pathname = parsedNextPath.pathname;
    redirectUrl.search = parsedNextPath.search;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
