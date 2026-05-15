import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            provider: string
            role?: string
            profileImageType?: string
            profileImageValue?: string | null
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        provider?: string
        role?: string
        profileImageType?: string
        profileImageValue?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        provider?: string
        backendId?: string
        role?: string
        profileImage?: string
        profileImageType?: string
        profileImageValue?: string | null
    }
}
