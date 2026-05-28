import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import AdminDashboardScreen from "./AdminDashboardScreen"
import { loadAdminDashboardSummary } from "./admin-dashboard.func"
import { isAdminRole } from "@/lib/auth/auth-flow.func"
import { authOptions } from "@/lib/auth/auth.config"
import { localizePath, type AppLocale } from "@/lib/site"

type AdminPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export const metadata: Metadata = {
  title: "Admin Dashboard",
}

const AdminPage = async ({ params }: AdminPageProps) => {
  const { locale } = await params
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || !isAdminRole(user.role)) {
    redirect(localizePath(locale, "/unauthorized"))
  }

  const summary = await loadAdminDashboardSummary(user)

  return <AdminDashboardScreen locale={locale} summary={summary} />
}

export default AdminPage
