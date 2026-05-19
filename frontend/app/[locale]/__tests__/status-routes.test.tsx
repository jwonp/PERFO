import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFoundPage from "../not-found";
import UnauthorizedPage from "../unauthorized";
import ForbiddenPage from "../forbidden";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const messages: Record<string, string> = {
      "errors.notFound.title": "찾으시는 화면이 없습니다",
      "errors.notFound.description": "주소가 변경되었거나 더 이상 제공되지 않는 화면입니다.",
      "errors.unauthorized.title": "로그인이 필요한 화면입니다",
      "errors.unauthorized.description": "이 화면은 로그인한 계정으로만 접근할 수 있습니다.",
      "errors.forbidden.title": "현재 계정으로는 접근할 수 없습니다",
      "errors.forbidden.description": "이 기능은 권한이 확인된 계정만 사용할 수 있습니다.",
      "errors.actions.goHome": "홈으로 이동",
      "errors.actions.goToLogin": "로그인으로 이동",
      "errors.actions.browseTickets": "티켓 둘러보기",
    };

    return messages[namespace ? `${namespace}.${key}` : key] ?? key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe("status route pages", () => {
  it("renders the localized not-found page", () => {
    render(<NotFoundPage />);

    expect(screen.getByText("HTTP 404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "찾으시는 화면이 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로 이동" })).toHaveAttribute("href", "/");
  });

  it("renders the unauthorized page", () => {
    render(<UnauthorizedPage />);

    expect(screen.getByText("HTTP 401")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "로그인이 필요한 화면입니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인으로 이동" })).toHaveAttribute("href", "/login");
  });

  it("renders the forbidden page", () => {
    render(<ForbiddenPage />);

    expect(screen.getByText("HTTP 403")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "현재 계정으로는 접근할 수 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "티켓 둘러보기" })).toHaveAttribute("href", "/events");
  });
});
