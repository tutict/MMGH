type SnapshotId = number | string;
type SnapshotLinkId = SnapshotId | null;
type SnapshotTimestamp = number | string;
type SnapshotDueAt = SnapshotTimestamp | null;

interface WorkspaceSettings {
  providerName: string;
  baseUrl: string;
  hasApiKey: boolean;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

interface CapabilitySnapshot {
  id: SnapshotId;
  title: string;
  description: string;
  status: string;
}

interface SessionSummarySnapshot {
  id: SnapshotId;
  title: string;
  status: string;
  updatedAt: SnapshotTimestamp;
  messageCount: number;
  lastMessagePreview: string;
  mountedSkillCount: number;
}

interface MessageSnapshot {
  id: SnapshotId;
  role: string;
  content: string;
  createdAt: SnapshotTimestamp;
}

interface ActivitySnapshot {
  id: SnapshotId;
  kind: string;
  title: string;
  detail: string;
  status: string;
  createdAt: SnapshotTimestamp;
}

interface NoteSummarySnapshot {
  id: SnapshotId;
  icon: string;
  title: string;
  summary: string;
  tags: readonly string[];
  updatedAt: SnapshotTimestamp;
}

interface NoteDetailSnapshot extends NoteSummarySnapshot {
  body: string;
  createdAt: SnapshotTimestamp;
}

interface ReminderSummarySnapshot {
  id: SnapshotId;
  title: string;
  preview: string;
  dueAt: SnapshotDueAt;
  severity: string;
  status: string;
  linkedNoteId: SnapshotLinkId;
  updatedAt: SnapshotTimestamp;
}

interface ReminderDetailSnapshot extends ReminderSummarySnapshot {
  detail: string;
  createdAt: SnapshotTimestamp;
}

interface SkillSummarySnapshot {
  id: SnapshotId;
  name: string;
  summary: string;
  triggerHint: string;
  recommendationReason?: string | null;
  enabled: boolean;
}

interface SkillDetailSnapshot extends SkillSummarySnapshot {
  description: string;
  instructions: string;
  permissionLevel: string;
  createdAt: SnapshotTimestamp;
  updatedAt: SnapshotTimestamp;
}

interface SessionDetailSnapshot {
  session: SessionSummarySnapshot;
  messages: readonly MessageSnapshot[];
  activity: readonly ActivitySnapshot[];
  mountedSkillIds: readonly SnapshotId[];
  mountedSkills: readonly SkillSummarySnapshot[];
  recommendedSkills: readonly SkillSummarySnapshot[];
}

interface WorkspaceSnapshot {
  settings: WorkspaceSettings;
  capabilities: readonly CapabilitySnapshot[];
  sessions: readonly SessionSummarySnapshot[];
  activeSessionId: SnapshotId;
  activeSession: SessionDetailSnapshot | null;
  notes: readonly NoteSummarySnapshot[];
  activeNoteId: SnapshotId;
  activeNote: NoteDetailSnapshot | null;
  reminders: readonly ReminderSummarySnapshot[];
  activeReminderId: SnapshotId;
  activeReminder: ReminderDetailSnapshot | null;
  skills: readonly SkillSummarySnapshot[];
  activeSkillId: SnapshotId;
  activeSkill: SkillDetailSnapshot | null;
  readonly [key: string]: unknown;
}

function reuseEqualArray<T>(
  previousItems: readonly T[] | null | undefined,
  nextItems: readonly T[],
  isEqual: (previousItem: T, nextItem: T) => boolean
): readonly T[];
function reuseEqualArray<T>(
  previousItems: readonly T[] | null | undefined,
  nextItems: readonly T[] | null | undefined,
  isEqual: (previousItem: T, nextItem: T) => boolean
): readonly T[] | null | undefined;
function reuseEqualArray<T>(
  previousItems: readonly T[] | null | undefined,
  nextItems: readonly T[] | null | undefined,
  isEqual: (previousItem: T, nextItem: T) => boolean
) {
  if (!Array.isArray(nextItems)) {
    return nextItems;
  }
  if (!Array.isArray(previousItems) || previousItems.length !== nextItems.length) {
    return nextItems;
  }

  let changed = false;
  const mergedItems = nextItems.map((item, index) => {
    const previousItem = previousItems[index];
    if (isEqual(previousItem, item)) {
      return previousItem;
    }
    changed = true;
    return item;
  });

  return changed ? mergedItems : previousItems;
}

function reuseEqualItem<T>(
  previousItem: T | null | undefined,
  nextItem: T,
  isEqual: (previousItem: T, nextItem: T) => boolean
): T;
function reuseEqualItem<T>(
  previousItem: T | null | undefined,
  nextItem: T | null | undefined,
  isEqual: (previousItem: T, nextItem: T) => boolean
): T | null | undefined;
function reuseEqualItem<T>(
  previousItem: T | null | undefined,
  nextItem: T | null | undefined,
  isEqual: (previousItem: T, nextItem: T) => boolean
) {
  if (!previousItem || !nextItem) {
    return nextItem;
  }
  return isEqual(previousItem, nextItem) ? previousItem : nextItem;
}

function isSamePrimitiveArray(
  previousItems: readonly SnapshotId[] | null | undefined,
  nextItems: readonly SnapshotId[] | null | undefined
) {
  if (previousItems === nextItems) {
    return true;
  }
  if (!Array.isArray(previousItems) || !Array.isArray(nextItems)) {
    return false;
  }
  if (previousItems.length !== nextItems.length) {
    return false;
  }
  return previousItems.every((item, index) => item === nextItems[index]);
}

function isSameStringArray(
  previousItems: readonly string[] | null | undefined,
  nextItems: readonly string[] | null | undefined
) {
  return isSamePrimitiveArray(previousItems, nextItems);
}

function isSameCapability(previousItem: CapabilitySnapshot, nextItem: CapabilitySnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.description === nextItem?.description &&
    previousItem?.status === nextItem?.status
  );
}

function isSameWorkspaceSettings(previousItem: WorkspaceSettings, nextItem: WorkspaceSettings) {
  return (
    previousItem?.providerName === nextItem?.providerName &&
    previousItem?.baseUrl === nextItem?.baseUrl &&
    Boolean(previousItem?.hasApiKey) === Boolean(nextItem?.hasApiKey) &&
    previousItem?.apiKey === nextItem?.apiKey &&
    previousItem?.model === nextItem?.model &&
    previousItem?.systemPrompt === nextItem?.systemPrompt
  );
}

function isSameSessionSummary(
  previousItem: SessionSummarySnapshot,
  nextItem: SessionSummarySnapshot
) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.status === nextItem?.status &&
    previousItem?.updatedAt === nextItem?.updatedAt &&
    previousItem?.messageCount === nextItem?.messageCount &&
    previousItem?.lastMessagePreview === nextItem?.lastMessagePreview &&
    previousItem?.mountedSkillCount === nextItem?.mountedSkillCount
  );
}

function isSameMessage(previousItem: MessageSnapshot, nextItem: MessageSnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.role === nextItem?.role &&
    previousItem?.content === nextItem?.content &&
    previousItem?.createdAt === nextItem?.createdAt
  );
}

function isSameActivityItem(previousItem: ActivitySnapshot, nextItem: ActivitySnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.kind === nextItem?.kind &&
    previousItem?.title === nextItem?.title &&
    previousItem?.detail === nextItem?.detail &&
    previousItem?.status === nextItem?.status &&
    previousItem?.createdAt === nextItem?.createdAt
  );
}

function isSameNoteSummary(previousItem: NoteSummarySnapshot, nextItem: NoteSummarySnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.icon === nextItem?.icon &&
    previousItem?.title === nextItem?.title &&
    previousItem?.summary === nextItem?.summary &&
    isSameStringArray(previousItem?.tags, nextItem?.tags) &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameNoteDetail(previousItem: NoteDetailSnapshot, nextItem: NoteDetailSnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.icon === nextItem?.icon &&
    previousItem?.title === nextItem?.title &&
    previousItem?.summary === nextItem?.summary &&
    previousItem?.body === nextItem?.body &&
    isSameStringArray(previousItem?.tags, nextItem?.tags) &&
    previousItem?.createdAt === nextItem?.createdAt &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameReminderSummary(
  previousItem: ReminderSummarySnapshot,
  nextItem: ReminderSummarySnapshot
) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.preview === nextItem?.preview &&
    previousItem?.dueAt === nextItem?.dueAt &&
    previousItem?.severity === nextItem?.severity &&
    previousItem?.status === nextItem?.status &&
    previousItem?.linkedNoteId === nextItem?.linkedNoteId &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameReminderDetail(
  previousItem: ReminderDetailSnapshot,
  nextItem: ReminderDetailSnapshot
) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.detail === nextItem?.detail &&
    previousItem?.preview === nextItem?.preview &&
    previousItem?.dueAt === nextItem?.dueAt &&
    previousItem?.severity === nextItem?.severity &&
    previousItem?.status === nextItem?.status &&
    previousItem?.linkedNoteId === nextItem?.linkedNoteId &&
    previousItem?.createdAt === nextItem?.createdAt &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameSkillSummary(previousItem: SkillSummarySnapshot, nextItem: SkillSummarySnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.name === nextItem?.name &&
    previousItem?.summary === nextItem?.summary &&
    previousItem?.triggerHint === nextItem?.triggerHint &&
    previousItem?.recommendationReason === nextItem?.recommendationReason &&
    Boolean(previousItem?.enabled) === Boolean(nextItem?.enabled)
  );
}

function isSameSkillDetail(previousItem: SkillDetailSnapshot, nextItem: SkillDetailSnapshot) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.name === nextItem?.name &&
    previousItem?.summary === nextItem?.summary &&
    previousItem?.description === nextItem?.description &&
    previousItem?.instructions === nextItem?.instructions &&
    previousItem?.triggerHint === nextItem?.triggerHint &&
    Boolean(previousItem?.enabled) === Boolean(nextItem?.enabled) &&
    previousItem?.permissionLevel === nextItem?.permissionLevel &&
    previousItem?.createdAt === nextItem?.createdAt &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function mergeSessionDetail(
  previousItem: SessionDetailSnapshot | null,
  nextItem: SessionDetailSnapshot | null
) {
  if (!previousItem || !nextItem) {
    return nextItem;
  }

  const mergedSession = reuseEqualItem(previousItem.session, nextItem.session, isSameSessionSummary);
  const mergedMessages = reuseEqualArray(previousItem.messages, nextItem.messages, isSameMessage);
  const mergedActivity = reuseEqualArray(
    previousItem.activity,
    nextItem.activity,
    isSameActivityItem
  );
  const mergedMountedSkillIds = reuseEqualArray(
    previousItem.mountedSkillIds,
    nextItem.mountedSkillIds,
    (left, right) => left === right
  );
  const mergedMountedSkills = reuseEqualArray(
    previousItem.mountedSkills,
    nextItem.mountedSkills,
    isSameSkillSummary
  );
  const mergedRecommendedSkills = reuseEqualArray(
    previousItem.recommendedSkills,
    nextItem.recommendedSkills,
    isSameSkillSummary
  );

  if (
    previousItem.session === mergedSession &&
    previousItem.messages === mergedMessages &&
    previousItem.activity === mergedActivity &&
    previousItem.mountedSkillIds === mergedMountedSkillIds &&
    previousItem.mountedSkills === mergedMountedSkills &&
    previousItem.recommendedSkills === mergedRecommendedSkills
  ) {
    return previousItem;
  }

  return {
    ...nextItem,
    session: mergedSession,
    messages: mergedMessages,
    activity: mergedActivity,
    mountedSkillIds: mergedMountedSkillIds,
    mountedSkills: mergedMountedSkills,
    recommendedSkills: mergedRecommendedSkills,
  };
}

export function mergeWorkspaceSnapshot(
  previousSnapshot: WorkspaceSnapshot | null | undefined,
  nextSnapshot: WorkspaceSnapshot | null | undefined
) {
  if (!previousSnapshot) {
    return nextSnapshot;
  }
  if (!nextSnapshot) {
    return nextSnapshot;
  }

  const mergedSettings = reuseEqualItem(
    previousSnapshot.settings,
    nextSnapshot.settings,
    isSameWorkspaceSettings
  );
  const mergedCapabilities = reuseEqualArray(
    previousSnapshot.capabilities,
    nextSnapshot.capabilities,
    isSameCapability
  );
  const mergedSessions = reuseEqualArray(
    previousSnapshot.sessions,
    nextSnapshot.sessions,
    isSameSessionSummary
  );
  const mergedActiveSession = mergeSessionDetail(
    previousSnapshot.activeSession,
    nextSnapshot.activeSession
  );
  const mergedNotes = reuseEqualArray(previousSnapshot.notes, nextSnapshot.notes, isSameNoteSummary);
  const mergedActiveNote = reuseEqualItem(
    previousSnapshot.activeNote,
    nextSnapshot.activeNote,
    isSameNoteDetail
  );
  const mergedReminders = reuseEqualArray(
    previousSnapshot.reminders,
    nextSnapshot.reminders,
    isSameReminderSummary
  );
  const mergedActiveReminder = reuseEqualItem(
    previousSnapshot.activeReminder,
    nextSnapshot.activeReminder,
    isSameReminderDetail
  );
  const mergedSkills = reuseEqualArray(previousSnapshot.skills, nextSnapshot.skills, isSameSkillSummary);
  const mergedActiveSkill = reuseEqualItem(
    previousSnapshot.activeSkill,
    nextSnapshot.activeSkill,
    isSameSkillDetail
  );

  if (
    previousSnapshot.settings === mergedSettings &&
    previousSnapshot.capabilities === mergedCapabilities &&
    previousSnapshot.sessions === mergedSessions &&
    previousSnapshot.activeSessionId === nextSnapshot.activeSessionId &&
    previousSnapshot.activeSession === mergedActiveSession &&
    previousSnapshot.notes === mergedNotes &&
    previousSnapshot.activeNoteId === nextSnapshot.activeNoteId &&
    previousSnapshot.activeNote === mergedActiveNote &&
    previousSnapshot.reminders === mergedReminders &&
    previousSnapshot.activeReminderId === nextSnapshot.activeReminderId &&
    previousSnapshot.activeReminder === mergedActiveReminder &&
    previousSnapshot.skills === mergedSkills &&
    previousSnapshot.activeSkillId === nextSnapshot.activeSkillId &&
    previousSnapshot.activeSkill === mergedActiveSkill
  ) {
    return previousSnapshot;
  }

  return {
    ...nextSnapshot,
    settings: mergedSettings,
    capabilities: mergedCapabilities,
    sessions: mergedSessions,
    activeSession: mergedActiveSession,
    notes: mergedNotes,
    activeNote: mergedActiveNote,
    reminders: mergedReminders,
    activeReminder: mergedActiveReminder,
    skills: mergedSkills,
    activeSkill: mergedActiveSkill,
  };
}
