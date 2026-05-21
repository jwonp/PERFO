import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// 로그인 후 접근 불가 경로 (로그인 상태면 /reserved 로 리다이렉트)
const guestOnlyPaths = ["/", "/login", "/signup", "/reset-password", "/verify"];
const publicPaths = ["/events", "/unauthorized"];

const isGuestOnlyPath = (pathname: string): boolean => {
    // locale prefix 제거 (e.g., /ko/login -> /login)
    const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja)/, "") || "/";
    return guestOnlyPaths.some((path) =>
        path === "/" ? pathWithoutLocale === "/" : pathWithoutLocale.startsWith(path)
    );
};

const isPublicPath = (pathname: string): boolean => {
    const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja)/, "") || "/";
    return publicPaths.some((path) =>
        pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
    );
};

const proxy = async (request: NextRequest) => {
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
    const visualQaTokenEnabled = process.env.PLAYWRIGHT_VISUAL_AUTH === "1" || process.env.NODE_ENV !== "production";
    const visualQaToken = visualQaTokenEnabled && request.headers.get("x-playwright-visual-auth") === "1";
    const isAuthenticated = Boolean(token || visualQaToken);

    const locale = pathname.match(/^\/(ko|en|ja)/)?.[1] || routing.defaultLocale;

    // 로그인한 사용자가 guest-only 경로 접근 시 → /reserved 로 리다이렉트
    if (isAuthenticated && isGuestOnlyPath(pathname)) {
        return NextResponse.redirect(new URL(`/${locale}/reserved`, request.url));
    }

    if (isPublicPath(pathname)) {
        return intlMiddleware(request);
    }

    // 비로그인 사용자가 보호된 경로 접근 시 → 로그인으로 리다이렉트
    if (!isAuthenticated && !isGuestOnlyPath(pathname)) {
        const loginUrl = new URL(`/${locale}/login`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // i18n 미들웨어 실행
    return intlMiddleware(request);
};

export default proxy;

export const config = {
    matcher: [
        // Match all pathnames except for
        // - … if they start with `/api`, `/_next` or `/_vercel`
        // - … the ones containing a dot (e.g. `favicon.ico`)
        "/((?!api|_next|_vercel|.*\\..*).*)",
    ],
};
