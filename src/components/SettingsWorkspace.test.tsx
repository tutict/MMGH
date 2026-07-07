import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsWorkspace from "./SettingsWorkspace";
import { I18nProvider } from "../i18n";

function SettingsWorkspaceHarness() {
  const [settingsForm, setSettingsForm] = useState({
    providerName: "OpenAI Compatible",
    baseUrl: "https://api.openai.com/v1",
    clearApiKey: false,
    hasApiKey: true,
    apiKey: "",
    model: "gpt-4.1-mini",
    systemPrompt: "test prompt",
  });

  const handleClearApiKey = () => {
    setSettingsForm((prev) => ({
      ...prev,
      clearApiKey: !prev.clearApiKey,
      hasApiKey: prev.clearApiKey ? true : false,
      apiKey: "",
    }));
  };

  return (
    <I18nProvider initialLang="en-US">
      <SettingsWorkspace
        busy=""
        cacheCards={[]}
        handleSaveSettings={(event) => event.preventDefault()}
        handleClearApiKey={handleClearApiKey}
        hasUnsavedSettings={settingsForm.clearApiKey || Boolean(settingsForm.apiKey)}
        providerConfigured={settingsForm.hasApiKey}
        providerSecurityMessage=""
        providerSecurityStatus="idle"
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
      />
    </I18nProvider>
  );
}

test("settings workspace toggles api key clear state and undo state", async () => {
  const user = userEvent.setup();
  render(<SettingsWorkspaceHarness />);

  expect(
    screen.getByPlaceholderText("Leave blank to keep the current API key")
  ).toBeTruthy();
  expect(
    screen.getByText(
      "A current API key is already available. Leave this blank to keep using it."
    )
  ).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Clear current API key" }));

  expect(
    screen.getByPlaceholderText("Save to remove the current API key")
  ).toBeTruthy();
  expect(
    screen.getByText(
      "The current API key will be removed on save. In the desktop runtime this also clears the system keyring entry."
    )
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keep current API key" })).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Keep current API key" }));

  expect(
    screen.getByPlaceholderText("Leave blank to keep the current API key")
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Clear current API key" })).toBeTruthy();
});

test("typing a new api key exits clear mode in settings workspace", async () => {
  const user = userEvent.setup();
  render(<SettingsWorkspaceHarness />);

  await user.click(screen.getByRole("button", { name: "Clear current API key" }));

  const apiKeyInput = screen.getByPlaceholderText("Save to remove the current API key");
  await user.type(apiKeyInput, "next-key");

  expect(screen.getByDisplayValue("next-key")).toBeTruthy();
  expect(screen.getByPlaceholderText("Enter a new API key")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Clear current API key" })).toBeNull();
  expect(
    screen.getByText(
      "No API key is available yet. Enter one and save to start using the provider."
    )
  ).toBeTruthy();
});

test("settings workspace shows provider trust guidance when supplied", async () => {
  render(
    <I18nProvider initialLang="en-US">
      <SettingsWorkspace
        busy=""
        cacheCards={[]}
        handleSaveSettings={(event) => event.preventDefault()}
        handleClearApiKey={() => {}}
        hasUnsavedSettings={false}
        providerConfigured={false}
        providerSecurityMessage="Provider host 'gateway.example.com' is not on the trusted allowlist."
        providerSecurityStatus="warning"
        settingsForm={{
          providerName: "OpenAI Compatible",
          baseUrl: "https://gateway.example.com/v1",
          clearApiKey: false,
          hasApiKey: false,
          apiKey: "",
          model: "gpt-4.1-mini",
          systemPrompt: "test prompt",
        }}
        setSettingsForm={() => {}}
      />
    </I18nProvider>
  );

  expect(
    screen.getByText("Provider host 'gateway.example.com' is not on the trusted allowlist.")
  ).toBeTruthy();
});
