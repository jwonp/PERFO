"use client"

import { signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import type { LogoutButtonProps } from "@/components/auth/logout-button.types"

const LogoutButton = ({ className }: LogoutButtonProps) => {
    const t = useTranslations("common")

    return (
        <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={className}
        >
            {t("logout")}
        </button>
    )
}

export default LogoutButton
