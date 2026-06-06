import { updateStoredValue } from "./localStorageCache";

export const SKILL_HISTORY_STORAGE_KEY = "mmgh-skill-history-v1";
export const MAX_SKILL_HISTORY_ENTRIES = 24;

export function readSkillHistory() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return parseSkillHistoryRaw(window.localStorage.getItem(SKILL_HISTORY_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read skill history", error);
    return {};
  }
}

export function parseSkillHistoryRaw(raw) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed).reduce((accumulator, [skillId, versions]) => {
      const normalizedId = Number(skillId);
      if (!normalizedId || !Array.isArray(versions)) {
        return accumulator;
      }

      const normalizedVersions = versions
        .map((version) => normalizeSkillHistoryEntry(version))
        .filter(Boolean)
        .slice(0, MAX_SKILL_HISTORY_ENTRIES);

      if (normalizedVersions.length > 0) {
        accumulator[String(normalizedId)] = normalizedVersions;
      }

      return accumulator;
    }, {});
  } catch (error) {
    console.error("Failed to parse skill history", error);
    return {};
  }
}

export function updateStoredSkillHistory(updater) {
  return updateStoredValue({
    key: SKILL_HISTORY_STORAGE_KEY,
    parseRaw: parseSkillHistoryRaw,
    serialize: (historyMap) => JSON.stringify(historyMap || {}),
    updater,
    cacheLabel: "skill history cache",
  });
}

export function getSkillHistoryEntries(historyMap, skillId) {
  if (!skillId) {
    return [];
  }
  return Array.isArray(historyMap?.[String(skillId)]) ? historyMap[String(skillId)] : [];
}

export function normalizeSkillHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const skillId = Number(entry.skillId);
  const savedAt = Number(entry.savedAt);
  if (!skillId || !Number.isFinite(savedAt)) {
    return null;
  }

  return {
    versionId: String(entry.versionId || `skill-${skillId}-${savedAt}`),
    skillId,
    name: String(entry.name || ""),
    description: String(entry.description || ""),
    instructions: String(entry.instructions || ""),
    triggerHint: String(entry.triggerHint || ""),
    enabled: Boolean(entry.enabled),
    savedAt,
    reason: normalizeSkillHistoryReason(entry.reason),
  };
}

export function normalizeSkillHistoryReason(reason) {
  return ["manual-save", "ai-rewrite", "restore"].includes(reason)
    ? reason
    : "manual-save";
}

export function appendSkillHistoryEntry(historyMap, skill, reason) {
  const entry = createSkillHistoryEntry(skill, reason);
  if (!entry) {
    return historyMap;
  }

  const skillKey = String(entry.skillId);
  const currentEntries = Array.isArray(historyMap?.[skillKey]) ? historyMap[skillKey] : [];
  return {
    ...historyMap,
    [skillKey]: [entry, ...currentEntries].slice(0, MAX_SKILL_HISTORY_ENTRIES),
  };
}

export function removeSkillHistoryEntries(historyMap, skillId) {
  if (!skillId || !historyMap?.[String(skillId)]) {
    return historyMap;
  }

  const nextHistory = { ...historyMap };
  delete nextHistory[String(skillId)];
  return nextHistory;
}

export function createSkillHistoryEntry(skill, reason) {
  if (!skill?.id) {
    return null;
  }

  const savedAt = Date.now();
  return {
    versionId: `skill-${skill.id}-${savedAt}`,
    skillId: skill.id,
    name: String(skill.name || ""),
    description: String(skill.description || ""),
    instructions: String(skill.instructions || ""),
    triggerHint: String(skill.triggerHint || ""),
    enabled: Boolean(skill.enabled),
    savedAt,
    reason: normalizeSkillHistoryReason(reason),
  };
}

export function buildSkillDraftFromVersion(version, skillId) {
  return {
    id: skillId || Number(version?.skillId) || 0,
    name: String(version?.name || ""),
    description: String(version?.description || ""),
    instructions: String(version?.instructions || ""),
    triggerHint: String(version?.triggerHint || ""),
    enabled: Boolean(version?.enabled),
  };
}

export function shouldTrackSkillVersion(currentSkill, nextSkill) {
  if (!currentSkill?.id || !nextSkill?.id || currentSkill.id !== nextSkill.id) {
    return false;
  }

  return !areSkillPayloadsEqual(currentSkill, nextSkill);
}

export function areSkillPayloadsEqual(left, right) {
  return JSON.stringify(toComparableSkill(left)) === JSON.stringify(toComparableSkill(right));
}

export function toComparableSkill(skill) {
  return {
    name: String(skill?.name || "").trim(),
    description: String(skill?.description || "").trim(),
    instructions: String(skill?.instructions || "").trim(),
    triggerHint: String(skill?.triggerHint || "").trim(),
    enabled: Boolean(skill?.enabled),
  };
}

export function parseImportedSkills(raw, t) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(t("app.skills.import.invalidJson"));
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed?.type === "mmgh-skill"
      ? [parsed.skill]
      : parsed?.type === "mmgh-skill-bundle"
        ? parsed.skills
        : [parsed.skill || parsed];

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error(t("app.skills.import.emptyPayload"));
  }

  const skills = candidates.map((candidate) => sanitizeImportedSkill(candidate, t)).filter(Boolean);
  if (skills.length === 0) {
    throw new Error(t("app.skills.import.emptyPayload"));
  }

  return skills;
}

export function sanitizeImportedSkill(skill, t) {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  return {
    name: String(skill.name || t("app.skills.defaultTitle")).trim().slice(0, 64),
    description: String(skill.description || "").trim(),
    instructions: String(skill.instructions || "").trim(),
    triggerHint: String(skill.triggerHint || "").trim(),
    enabled: Boolean(
      Object.prototype.hasOwnProperty.call(skill, "enabled") ? skill.enabled : true
    ),
  };
}
