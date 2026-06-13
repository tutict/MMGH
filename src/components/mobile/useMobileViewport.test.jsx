import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import useMobileViewport from "./useMobileViewport";

function installMatchMedia(initialMatches) {
  const previousMatchMedia = window.matchMedia;
  const listeners = new Set();
  const mediaQuery = {
    matches: initialMatches,
    media: "(max-width: 760px)",
    onchange: null,
    addEventListener: vi.fn((event, listener) => {
      if (event === "change") {
        listeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((event, listener) => {
      if (event === "change") {
        listeners.delete(listener);
      }
    }),
    addListener: vi.fn((listener) => listeners.add(listener)),
    removeListener: vi.fn((listener) => listeners.delete(listener)),
    dispatchEvent: vi.fn(() => false),
  };

  window.matchMedia = vi.fn(() => mediaQuery);

  return {
    setMatches(nextMatches) {
      mediaQuery.matches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches, media: mediaQuery.media }));
    },
    restore() {
      window.matchMedia = previousMatchMedia;
    },
  };
}

function Probe() {
  const isMobile = useMobileViewport("(max-width: 760px)");
  return <div>{isMobile ? "mobile" : "desktop"}</div>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("useMobileViewport follows the <=760px media query and change events", () => {
  const media = installMatchMedia(true);

  try {
    render(<Probe />);

    expect(screen.getByText("mobile")).toBeInTheDocument();

    act(() => {
      media.setMatches(false);
    });
    expect(screen.getByText("desktop")).toBeInTheDocument();

    act(() => {
      media.setMatches(true);
    });
    expect(screen.getByText("mobile")).toBeInTheDocument();
  } finally {
    media.restore();
  }
});
