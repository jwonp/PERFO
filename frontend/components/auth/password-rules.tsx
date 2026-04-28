"use client";

import { Check, X } from "lucide-react";
import type { PasswordRuleProps } from "@/components/auth/password-rules.types";

const PasswordRule = ({ label, valid }: PasswordRuleProps) => {
  return (
    <div aria-label={`${label}: ${valid ? "충족" : "미충족"}`} className="flex items-center gap-2">
      {valid ? (
        <Check className="h-4 w-4 shrink-0 text-[var(--success)]" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
      )}
      <span className={valid ? "text-sm text-[var(--success)]" : "text-sm text-[var(--text-subtle)]"}>
        {label}
      </span>
    </div>
  );
};

export default PasswordRule;
export { PasswordRule };
