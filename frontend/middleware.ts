import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// 인증 없이 접근 가능한 경로
const publicPaths = [
    "/login",
    "/signup",
    "/reset-password",
    "/verify",
];

function isPublicPath(pathname: string): boolean {
    // locale prefix 제거 (e.g., /ko/login -> /login)
    const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja)/, "") || "/";
    return publicPaths.some((path) => pathWithoutLocale.startsWith(path));
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

    // 공개 경로가 아닌데 토큰이 없으면 → 로그인으로 리다이렉트
    if (!token && !isPublicPath(pathname)) {
        const locale = pathname.match(/^\/(ko|en|ja)/)?.[1] || routing.defaultLocale;
        const loginUrl = new URL(`/${locale}/login`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 이미 로그인한 사용자가 로그인/회원가입 페이지 접근 시 → 홈으로 리다이렉트
    if (token && isPublicPath(pathname)) {
        const locale = pathname.match(/^\/(ko|en|ja)/)?.[1] || routing.defaultLocale;
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
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
