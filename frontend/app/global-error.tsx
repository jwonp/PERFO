"use client";

import { useEffect } from "react";
import RootStatusPageContent from "@/components/feedback/RootStatusPageContent";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

const GlobalError = ({
  error,
  unstable_retry,
}: GlobalErrorProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <RootStatusPageContent kind="server" onRetry={unstable_retry} />
      </body>
    </html>
  );
};

export default GlobalError;
