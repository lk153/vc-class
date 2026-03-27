import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const authPages = ["/login", "/register"];
const publicPaths = ["/login", "/register", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow API auth routes always
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const user = req.auth?.user;

  // Redirect authenticated users away from login/register pages
  if (user && authPages.some((path) => pathname.startsWith(path))) {
    const destination = user.role === "TEACHER" ? "/teacher" : "/topics";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  // Allow public paths for unauthenticated users
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block inactive students from all protected routes
  if (user.role === "STUDENT" && user.status === "INACTIVE") {
    const inactiveUrl = new URL("/login", req.url);
    inactiveUrl.searchParams.set("error", "inactive");
    return NextResponse.redirect(inactiveUrl);
  }

  // Teachers can only access /teacher and /api routes
  if (user.role === "TEACHER" && !pathname.startsWith("/teacher") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/teacher", req.url));
  }

  // Students cannot access /teacher routes
  if (user.role === "STUDENT" && pathname.startsWith("/teacher")) {
    return NextResponse.redirect(new URL("/topics", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
