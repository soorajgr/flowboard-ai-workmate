import { describe, expect, it } from "vitest";
import { initials, positionBetween, taskProgress } from "@/lib/board";

describe("card ordering", () => {
  it("places a card between two neighbours", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });
  it("places a card at the end of a column", () => {
    expect(positionBetween(3000, undefined)).toBe(4000);
  });
  it("places a card at the top of a column", () => {
    expect(positionBetween(undefined, 1000)).toBe(0);
  });
  it("places the first card in an empty column", () => {
    expect(positionBetween(undefined, undefined)).toBe(1000);
  });
});

describe("card progress", () => {
  it("is the share of checklist items done", () => {
    expect(taskProgress([{ done: true }, { done: true }, { done: false }])).toBe(67);
  });
  it("is 0 with no checklist", () => {
    expect(taskProgress([])).toBe(0);
  });
});

describe("avatar initials", () => {
  it("uses first and last name", () => {
    expect(initials("Test Tester")).toBe("TT");
  });
});
