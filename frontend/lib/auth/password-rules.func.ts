export type PasswordRuleDescriptor = {
    key: "minLength" | "uppercase" | "lowercase" | "number" | "special";
    valid: boolean;
};

const PASSWORD_SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*(),.?":{}|<>]/;

export const createPasswordRuleDescriptors = (
    password: string,
): PasswordRuleDescriptor[] => [
    { key: "minLength", valid: password.length >= 8 },
    { key: "uppercase", valid: /[A-Z]/.test(password) },
    { key: "lowercase", valid: /[a-z]/.test(password) },
    { key: "number", valid: /\d/.test(password) },
    { key: "special", valid: PASSWORD_SPECIAL_CHARACTER_PATTERN.test(password) },
];

export const areAllPasswordRulesValid = (password: string) => (
    createPasswordRuleDescriptors(password).every((rule) => rule.valid)
);

export const doPasswordsMatch = (
    password: string,
    confirmPassword: string,
) => password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
