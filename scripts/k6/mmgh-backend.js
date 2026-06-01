import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:4781";
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || "45s";

export const backendDuration = new Trend("backend_duration_ms", true);
const backendByOperation = {
  bootstrap: new Trend("backend_bootstrap_ms", true),
  "agent-runs": new Trend("backend_agent_runs_ms", true),
  sessions: new Trend("backend_sessions_ms", true),
  notes: new Trend("backend_notes_ms", true),
  reminders: new Trend("backend_reminders_ms", true),
  "skills/mount": new Trend("backend_skills_mount_ms", true),
};

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<900", "p(99)<1800"],
    backend_duration_ms: ["p(95)<650", "p(99)<1400"],
  },
};

const jsonHeaders = {
  headers: {
    "Content-Type": "application/json",
  },
};
let printedFailures = 0;

export function setup() {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    "harness is healthy": (response) => response.status === 200,
  });

  const bootstrap = http.post(`${BASE_URL}/bootstrap`, "{}", jsonHeaders);
  check(bootstrap, {
    "bootstrap works": (response) => response.status === 200 && response.json("ok") === true,
  });
}

export default function () {
  const key = `${__VU}-${__ITER}`;

  group("read snapshot", () => {
    record(http.post(`${BASE_URL}/bootstrap`, "{}", jsonHeaders), "bootstrap");
  });

  const roll = Math.random();
  if (roll < 0.22) {
    group("persist local agent run", () => {
      record(
        http.post(
          `${BASE_URL}/agent-runs`,
          JSON.stringify({
            prompt: `k6 agent run ${key}`,
          }),
          jsonHeaders,
        ),
        "agent-runs",
      );
    });
  } else if (roll < 0.42) {
    group("create session", () => {
      record(
        http.post(
          `${BASE_URL}/sessions`,
          JSON.stringify({
            title: `k6 session ${key}`,
          }),
          jsonHeaders,
        ),
        "sessions",
      );
    });
  } else if (roll < 0.62) {
    group("create and save note", () => {
      record(
        http.post(
          `${BASE_URL}/notes`,
          JSON.stringify({
            title: `k6 note ${key}`,
            body: `Load-test note body ${key}. `.repeat(24),
            tags: ["k6", "note", `vu-${__VU}`],
          }),
          jsonHeaders,
        ),
        "notes",
      );
    });
  } else if (roll < 0.82) {
    group("create and save reminder", () => {
      record(
        http.post(
          `${BASE_URL}/reminders`,
          JSON.stringify({
            title: `k6 reminder ${key}`,
            detail: `Load-test reminder detail ${key}. `.repeat(16),
            severity: "normal",
            status: "open",
            dueAt: Date.now() + 3600000,
          }),
          jsonHeaders,
        ),
        "reminders",
      );
    });
  } else {
    group("save session skills", () => {
      record(http.post(`${BASE_URL}/skills/mount`, "{}", jsonHeaders), "skills/mount");
    });
  }

  sleep(0.1);
}

function record(response, label) {
  const backendMs = Number(response.headers["X-Backend-Duration-Ms"] || 0);
  if (backendMs > 0) {
    backendDuration.add(backendMs);
    backendByOperation[label]?.add(backendMs);
  }

  if (response.status !== 200 && printedFailures < 3) {
    printedFailures += 1;
    const body = response.body ? response.body.slice(0, 700) : "<no body>";
    console.error(`request_failed label=${label} status=${response.status} body=${body}`);
  }

  check(response, {
    "status is 200": (result) => result.status === 200,
    "body is ok": (result) => result.status === 200 && result.json("ok") === true,
  });
}
