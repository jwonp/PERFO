"use client"

import { signOut } from "next-auth/react"
import { useTranslations } from "next-intl"

interface LogoutButtonProps {
    className?: string
}

export default function LogoutButton({ className }: LogoutButtonProps) {
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
