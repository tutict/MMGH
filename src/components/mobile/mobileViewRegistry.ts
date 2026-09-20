export const PRIMARY_MOBILE_VIEW_IDS = new Set(["today", "agent", "knowledge"]);

export const MOBILE_MORE_VIEW_IDS = ["reminders", "weather", "skills", "settings"];

export const DEDICATED_MOBILE_VIEW_IDS = new Set([
  "today",
  "agent",
  "knowledge",
  "weather",
  "settings",
  "reminders",
]);

export function isDedicatedMobileView(viewId) {
  return DEDICATED_MOBILE_VIEW_IDS.has(viewId);
}

export function isPrimaryMobileView(viewId) {
  return PRIMARY_MOBILE_VIEW_IDS.has(viewId);
}

export function getMobileMoreItems(items = []) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return MOBILE_MORE_VIEW_IDS.map((id) => byId.get(id)).filter(Boolean);
}
