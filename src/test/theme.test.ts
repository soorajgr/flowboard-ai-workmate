import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/hooks/use-theme";

describe("theme choice", () => {
  it("Light always shows the light theme", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("Dark always shows the dark theme", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("Auto follows the device setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
