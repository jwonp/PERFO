import type { AuthLayoutProps } from "./layout.types";

const AuthLayout = ({
    children,
}: AuthLayoutProps) => {
    return (
        <div className="ds-shell flex min-h-screen w-full justify-center">
            <div className="app-screen flex min-h-screen items-center px-4 py-10">
                <div className="w-full">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
