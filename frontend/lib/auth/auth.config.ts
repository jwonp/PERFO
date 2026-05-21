import GoogleProvider from "next-auth/providers/google"
import NaverProvider from "next-auth/providers/naver"
import LineProvider from "next-auth/providers/line"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"
import axios from "axios"
import { BACKEND_URL } from "@/lib/auth/auth.constants"
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth"

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
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const email = credentials?.email?.trim()
                const password = credentials?.password

                if (!email || !password) {
                    throw new Error("Email and password are required")
                }

                try {
                    const { data } = await axios.post(`${BACKEND_URL}/api/auth/login`, {
                        email,
                        password,
                    })

                    return {
                        id: String(data.id),
                        email: data.email,
                        name: data.name,
                        provider: data.provider,
                        role: data.role,
                        image: data.profileImageUrl ?? (data.profileImageType === "PRESET" ? null : data.profileImage),
                        profileImageType: data.profileImageType ?? (data.profileImage ? "PROVIDER" : "NONE"),
                        profileImageValue: data.profileImageValue ?? data.profileImage ?? null,
                    }
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        throw new Error(error.response?.data?.message ?? "Credentials login failed")
                    }
                    throw new Error("Credentials login failed")
                }
            },
        }),
    ],
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    callbacks: {
        signIn: async ({ user, account }) => {
            if (!account) return false
            if (account.provider === "credentials") return true

            try {
                const oauthPayload = {
                    provider: account.provider,
                    providerId: account.providerAccountId,
                    email: user.email,
                    name: user.name,
                    profileImage: user.image,
                }

                const { data: backendUser } = await axios.post(
                    `${BACKEND_URL}/api/auth/oauth`,
                    oauthPayload,
                    {
                        headers: createInternalProxyAuthHeaders(
                            {
                                id: "0",
                                email: user.email,
                                role: "SYSTEM",
                            },
                            ["auth:oauth"],
                        ),
                    },
                )
                // 백엔드에서 반환한 사용자 정보를 user 객체에 저장
                user.id = String(backendUser.id)
                user.name = backendUser.name
                user.role = backendUser.role
                user.image = backendUser.profileImageUrl ?? (backendUser.profileImageType === "PRESET" ? null : backendUser.profileImage)
                user.profileImageType = backendUser.profileImageType ?? (backendUser.profileImage ? "PROVIDER" : "NONE")
                user.profileImageValue = backendUser.profileImageValue ?? backendUser.profileImage ?? null

                return true
            } catch (error) {
                console.error(
                    "OAuth backend sync failed:",
                    error instanceof Error ? error.message : "Unknown error",
                )
                return "/unauthorized"
            }
        },

        jwt: async ({ token, user, account, trigger, session }) => {
            // 최초 로그인 시 user 정보를 token에 저장
            if (user && account) {
                token.provider = account.provider
                token.backendId = user.id
                token.name = user.name
                token.email = user.email
                token.role = user.role
                token.picture = user.image ?? undefined
                token.profileImage = user.image ?? undefined
                token.profileImageType = user.profileImageType ?? (user.image ? "PROVIDER" : "NONE")
                token.profileImageValue = user.profileImageValue ?? user.image ?? null
            }

            if (trigger === "update" && session) {
                token.name = session.name ?? token.name
                token.picture = session.image ?? undefined
                token.profileImage = session.image ?? undefined
                token.profileImageType = session.profileImageType ?? token.profileImageType
                token.profileImageValue = session.profileImageValue ?? token.profileImageValue ?? null
            }
            return token
        },

        session: async ({ session, token }) => {
            if (session.user) {
                session.user.id = token.backendId as string
                session.user.provider = token.provider as string
                session.user.role = token.role as string | undefined
                session.user.name = token.name
                session.user.email = token.email
                session.user.image = (token.profileImage as string | undefined) ?? null
                session.user.profileImageType = token.profileImageType as string | undefined
                session.user.profileImageValue = (token.profileImageValue as string | null | undefined) ?? null
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
}
