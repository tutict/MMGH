import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { I18nProvider, useI18n } from "./index";

function I18nHarness() {
  const { lang, setLang, t } = useI18n();

  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span>{t("app.language.label")}</span>
      <button type="button" onClick={() => setLang(lang === "zh-CN" ? "en-US" : "zh-CN")}>
        toggle
      </button>
    </div>
  );
}

test("i18n provider survives local storage read failures during initialization", () => {
  const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("SecurityError");
  });
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() =>
    render(
      <I18nProvider>
        <I18nHarness />
      </I18nProvider>
    )
  ).not.toThrow();
  expect(screen.getByTestId("lang").textContent).toMatch(/zh-CN|en-US/);

  getItemSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("i18n provider keeps updating language when local storage writes fail", async () => {
  const user = userEvent.setup();
  const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  render(
    <I18nProvider initialLang="zh-CN">
      <I18nHarness />
    </I18nProvider>
  );

  expect(screen.getByTestId("lang").textContent).toBe("zh-CN");
  expect(screen.getByText("语言")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "toggle" }));

  expect(screen.getByTestId("lang").textContent).toBe("en-US");
  expect(screen.getByText("Language")).toBeTruthy();

  setItemSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});
