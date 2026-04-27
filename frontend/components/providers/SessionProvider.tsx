"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { SessionProviderProps } from "@/components/providers/session-provider.types"

const SessionProvider = ({
    children,
}: SessionProviderProps) => {
    return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}

export default SessionProvider
