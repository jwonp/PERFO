import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";

export const getRequiredSessionUser = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    return session.user;
};
