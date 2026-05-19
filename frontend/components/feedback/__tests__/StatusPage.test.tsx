import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import StatusPage from "@/components/feedback/StatusPage";

describe("StatusPage", () => {
  it("renders code, description, and action buttons", () => {
    render(
      <StatusPage
        code="404"
        title="Page not found"
        description="The page you opened is no longer available."
        primaryAction={<Button type="button">Go home</Button>}
        secondaryAction={
          <Button type="button" variant="outline">
            Browse tickets
          </Button>
        }
      />
    );

    expect(screen.getByText("HTTP 404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("The page you opened is no longer available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse tickets" })).toBeInTheDocument();
  });
});
