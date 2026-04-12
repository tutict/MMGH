const DEFAULT_TRUSTED_PROVIDER_HOSTS = ["api.openai.com"];

const readEnv = (name) => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return String(import.meta.env[name] || "");
  }
  return "";
};

const normalizeHost = (value) => String(value || "").trim().toLowerCase();

const parseHostList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => normalizeHost(item))
    .filter(Boolean);

const isTruthy = (value) => /^(1|true|yes|on)$/i.test(String(value || "").trim());

const isIpv4 = (host) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);

const isPrivateIpv4 = (host) => {
  if (!isIpv4(host)) {
    return false;
  }

  const octets = host.split(".").map((part) => Number(part));
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
};

const isLocalHostname = (host) =>
  host === "localhost" ||
  host === "::1" ||
  host === "[::1]" ||
  host.endsWith(".local");

const isLocalProviderHost = (host) => {
  const normalized = normalizeHost(host);
  return isLocalHostname(normalized) || isPrivateIpv4(normalized);
};

const hostMatchesAllowlist = (host, allowlist) => {
  const normalizedHost = normalizeHost(host);
  return allowlist.some((allowed) => {
    const normalizedAllowed = normalizeHost(allowed);
    return (
      normalizedHost === normalizedAllowed ||
      normalizedHost.endsWith(`.${normalizedAllowed}`)
    );
  });
};

export const readTrustedProviderHosts = () => {
  const configured = parseHostList(readEnv("VITE_TRUSTED_PROVIDER_HOSTS"));
  return configured.length > 0 ? configured : DEFAULT_TRUSTED_PROVIDER_HOSTS;
};

export const shouldEnforceTrustedProviderHosts = () =>
  isTruthy(readEnv("VITE_ENFORCE_TRUSTED_PROVIDER_HOSTS"));

export const assessProviderBaseUrl = (baseUrl, options = {}) => {
  const trimmed = String(baseUrl || "").trim();
  const trustedHosts = options.trustedHosts || readTrustedProviderHosts();
  const enforceTrustedHosts =
    options.enforceTrustedHosts ?? shouldEnforceTrustedProviderHosts();

  if (!trimmed) {
    return {
      status: "idle",
      reason: "empty",
      host: "",
      trustedHosts,
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      status: "blocked",
      reason: "invalidUrl",
      host: "",
      trustedHosts,
    };
  }

  const protocol = parsedUrl.protocol.toLowerCase();
  const host = normalizeHost(parsedUrl.hostname);
  const isLocalHost = isLocalProviderHost(host);
  const isTrustedHost = hostMatchesAllowlist(host, trustedHosts);

  if (!host) {
    return {
      status: "blocked",
      reason: "missingHost",
      host: "",
      trustedHosts,
    };
  }

  if (protocol !== "http:" && protocol !== "https:") {
    return {
      status: "blocked",
      reason: "unsupportedScheme",
      host,
      trustedHosts,
    };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return {
      status: "blocked",
      reason: "embeddedCredentials",
      host,
      trustedHosts,
    };
  }

  if (parsedUrl.search || parsedUrl.hash) {
    return {
      status: "blocked",
      reason: "queryOrFragment",
      host,
      trustedHosts,
    };
  }

  if (protocol === "http:" && !isLocalHost) {
    return {
      status: "blocked",
      reason: "remoteHttp",
      host,
      trustedHosts,
    };
  }

  if (isLocalHost) {
    return {
      status: "local",
      reason: "localHost",
      host,
      trustedHosts,
    };
  }

  if (isTrustedHost) {
    return {
      status: "trusted",
      reason: "trustedHost",
      host,
      trustedHosts,
    };
  }

  if (enforceTrustedHosts) {
    return {
      status: "blocked",
      reason: "untrustedHost",
      host,
      trustedHosts,
    };
  }

  return {
    status: "warning",
    reason: "untrustedHost",
    host,
    trustedHosts,
  };
};

export const providerBaseUrlErrorMessage = (assessment) => {
  switch (assessment?.reason) {
    case "invalidUrl":
      return "Provider base URL must be a valid absolute URL.";
    case "missingHost":
      return "Provider base URL must include a host.";
    case "unsupportedScheme":
      return "Provider base URL must use http or https.";
    case "embeddedCredentials":
      return "Provider base URL must not contain embedded credentials.";
    case "queryOrFragment":
      return "Provider base URL must not contain query params or fragments.";
    case "remoteHttp":
      return "Provider base URL must use https unless it points to localhost or a private network.";
    case "untrustedHost":
      return `Provider host '${assessment.host}' is not on the trusted host allowlist.`;
    default:
      return "";
  }
};

