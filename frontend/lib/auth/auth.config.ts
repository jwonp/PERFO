import GoogleProvider from "next-auth/providers/google"
import NaverProvider from "next-auth/providers/naver"
import LineProvider from "next-auth/providers/line"
import { NextAuthOptions } from "next-auth"
import axios from "axios"
import { BACKEND_URL } from "@/lib/auth/auth.constants"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        NaverProvider({
            clientId: process.env.NAVER_CLIENT_ID!,
            clientSecret: process.env.NAVER_CLIENT_SECRET!,
        }),
        LineProvider({
            clientId: process.env.LINE_CLIENT_ID!,
            clientSecret: process.env.LINE_CLIENT_SECRET!,
        }),
    ],
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    callbacks: {
        signIn: async ({ user, account, profile }) => {
            console.log("signIn", user, account, profile);

            if (!account) return false

            try {
                const oauthPayload = {
                    provider: account.provider,
                    providerId: account.providerAccountId,
                    email: user.email,
                    name: user.name,
                    profileImage: user.image,
                }

                console.log({ oauthPayload, BACKEND_URL })

                const { data: backendUser } = await axios.post(
                    `${BACKEND_URL}/api/auth/oauth`,
                    oauthPayload
                )
                // 백엔드에서 반환한 사용자 정보를 user 객체에 저장
                user.id = String(backendUser.id)
                user.name = backendUser.name
                user.image = backendUser.profileImage

                return true
            } catch (error) {
                console.error("OAuth backend sync failed:", error)
                return false
            }
        },

        jwt: async ({ token, user, account }) => {
            // 최초 로그인 시 user 정보를 token에 저장
            if (user && account) {
                token.provider = account.provider
                token.backendId = user.id
                token.profileImage = user.image ?? undefined
            }
            return token
        },

        session: async ({ session, token }) => {
            if (session.user) {
                session.user.id = token.backendId as string
                session.user.provider = token.provider as string
                session.user.image = token.profileImage as string
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
}
