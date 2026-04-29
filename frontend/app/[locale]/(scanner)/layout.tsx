import type { ReactNode } from "react";

const ScannerLayout = ({ children }: { children: ReactNode }) => {
    return <main className="min-h-dvh bg-background text-foreground">{children}</main>;
};

export default ScannerLayout;
