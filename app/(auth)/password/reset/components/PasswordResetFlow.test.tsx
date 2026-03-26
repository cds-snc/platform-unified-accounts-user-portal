import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasswordResetFlow } from "./PasswordResetFlow";

vi.mock("./UserNameForm", () => ({
  UserNameForm: ({ organization, requestId }: { organization?: string; requestId?: string }) => (
    <span>{`username-form:${organization}:${requestId}`}</span>
  ),
}));

describe("PasswordResetFlow", () => {
  it("renders username form first", () => {
    const { getByText } = render(
      <PasswordResetFlow
        passwordComplexitySettings={{} as never}
        organization="org-1"
        requestId="req-123"
      />
    );

    expect(getByText("username-form:org-1:req-123")).toBeInTheDocument();
  });
});
