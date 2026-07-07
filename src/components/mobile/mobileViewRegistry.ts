export const PRIMARY_MOBILE_VIEW_IDS = new Set(["today", "agent", "knowledge", "weather"]);

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

export function getMobileMoreItems(items = []) {
  return items.filter((item) => !PRIMARY_MOBILE_VIEW_IDS.has(item.id));
}
