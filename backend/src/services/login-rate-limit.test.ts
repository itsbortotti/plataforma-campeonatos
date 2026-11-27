import { describe, expect, it } from "vitest";
import { loginRateLimitKey } from "./login-rate-limit.js";

describe("limite de login", () => {
  it("separa tentativas pelo par IP e usuário", () => {
    const a = loginRateLimitKey("10.0.0.8", "Master");
    const b = loginRateLimitKey("10.0.0.8", "master");
    const c = loginRateLimitKey("10.0.0.9", "master");
    const d = loginRateLimitKey("10.0.0.8", "outro@example.com");

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(loginRateLimitKey("10.0.0.8", 12)).toBe("10.0.0.8\n");
  });

  it("trata o apelido @sfl.local como o mesmo usuário", () => {
    const bare = loginRateLimitKey("10.0.0.8", "master");
    const alias = loginRateLimitKey("10.0.0.8", "master@sfl.local");
    const mixed = loginRateLimitKey("10.0.0.8", " Master@SFL.LOCAL ");
    const external = loginRateLimitKey("10.0.0.8", "outro@example.com");

    expect(alias).toBe(bare);
    expect(mixed).toBe(bare);
    expect(loginRateLimitKey("10.0.0.8", "master@sfl.local@sfl.local")).toBe(
      bare,
    );
    expect(external).toBe("10.0.0.8\noutro@example.com");
    expect(external).not.toBe(bare);
  });
});
