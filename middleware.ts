import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Rotas públicas
  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
  ];
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith("/api/auth")
  );

  // Rotas protegidas
  const protectedPaths = [
    "/dashboard",
    "/onboarding",
    "/accounts",
    "/transactions",
    "/cards",
    "/goals",
    "/settings",
  ];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Rotas admin
  const isAdminPath = pathname.startsWith("/admin");

  // Se não tem token e está tentando acessar rota protegida
  if (!token && isProtectedPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Se tem token, verificar validade
  if (token) {
    const payload = await verifyToken(token);

    // Token inválido
    if (!payload) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("auth-token");
      return response;
    }

    // Verificar acesso admin
    if (isAdminPath && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Se está logado e tentando acessar login/register, redirecionar para dashboard
    if (pathname === "/login" || pathname === "/register") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
