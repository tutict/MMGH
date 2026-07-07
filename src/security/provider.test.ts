import { expect, test } from "vitest";

import { assessProviderBaseUrl, providerBaseUrlErrorMessage } from "./provider";

test("blocks remote http provider endpoints", () => {
  const assessment = assessProviderBaseUrl("http://example.com/v1", {
    trustedHosts: ["api.openai.com"],
  });

  expect(assessment.status).toBe("blocked");
  expect(assessment.reason).toBe("remoteHttp");
  expect(providerBaseUrlErrorMessage(assessment)).toContain("https");
});

test("allows localhost http provider endpoints as local gateways", () => {
  const assessment = assessProviderBaseUrl("http://127.0.0.1:11434/v1", {
    trustedHosts: ["api.openai.com"],
  });

  expect(assessment.status).toBe("local");
  expect(assessment.reason).toBe("localHost");
});

test("marks allowlisted https hosts as trusted", () => {
  const assessment = assessProviderBaseUrl("https://gateway.example.com/v1", {
    trustedHosts: ["example.com"],
  });

  expect(assessment.status).toBe("trusted");
  expect(assessment.reason).toBe("trustedHost");
});

test("warns on untrusted https hosts by default", () => {
  const assessment = assessProviderBaseUrl("https://gateway.example.com/v1", {
    trustedHosts: ["api.openai.com"],
  });

  expect(assessment.status).toBe("warning");
  expect(assessment.reason).toBe("untrustedHost");
});

test("blocks untrusted https hosts when strict mode is enabled", () => {
  const assessment = assessProviderBaseUrl("https://gateway.example.com/v1", {
    trustedHosts: ["api.openai.com"],
    enforceTrustedHosts: true,
  });

  expect(assessment.status).toBe("blocked");
  expect(assessment.reason).toBe("untrustedHost");
});

test("blocks provider urls with embedded credentials", () => {
  const assessment = assessProviderBaseUrl("https://user:pass@example.com/v1");

  expect(assessment.status).toBe("blocked");
  expect(assessment.reason).toBe("embeddedCredentials");
});
