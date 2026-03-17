import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// 로그인 후 접근 불가 경로 (로그인 상태면 /reserved 로 리다이렉트)
const guestOnlyPaths = ["/", "/login", "/signup", "/reset-password", "/verify"];

function isGuestOnlyPath(pathname: string): boolean {
    // locale prefix 제거 (e.g., /ko/login -> /login)
    const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja)/, "") || "/";
    return guestOnlyPaths.some((path) =>
        path === "/" ? pathWithoutLocale === "/" : pathWithoutLocale.startsWith(path)
    );
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // API와 정적 파일은 통과
    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
        return NextResponse.next();
    }

    // NextAuth JWT 토큰 확인
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const locale = pathname.match(/^\/(ko|en|ja)/)?.[1] || routing.defaultLocale;

    // 로그인한 사용자가 guest-only 경로 접근 시 → /reserved 로 리다이렉트
    if (token && isGuestOnlyPath(pathname)) {
        return NextResponse.redirect(new URL(`/${locale}/reserved`, request.url));
    }

    // 비로그인 사용자가 보호된 경로 접근 시 → 로그인으로 리다이렉트
    if (!token && !isGuestOnlyPath(pathname)) {
        const loginUrl = new URL(`/${locale}/login`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // i18n 미들웨어 실행
    return intlMiddleware(request);
}

export const config = {
    matcher: [
        // Match all pathnames except for
        // - … if they start with `/api`, `/_next` or `/_vercel`
        // - … the ones containing a dot (e.g. `favicon.ico`)
        "/((?!api|_next|_vercel|.*\\..*).*)",
    ],
};
