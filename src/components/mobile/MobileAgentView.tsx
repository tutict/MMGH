import React, { useMemo, useState } from "react";
import { Chip } from "@mui/material";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import {
  MobileButton,
  MobileEmpty,
  MobileList,
  MobilePage,
  MobileRow,
  MobileRowBody,
  MobileRowButton,
  MobileStatusDot,
  MobileTextField,
  joinClassNames,
} from "../ui";

const MESSAGE_ROLES = ["user", "assistant", "system"];

function roleLabel(role, lang) {
  if (role === "user") {
    return mobileText(lang, "you");
  }
  if (role === "system") {
    return mobileText(lang, "system");
  }
  if (role === "activity") {
    return mobileText(lang, "activity");
  }
  return mobileText(lang, "agent");
}

function normalizeTimelineItem(item, index, type, lang, formatTime) {
  const time = item.createdAt || item.updatedAt || item.timestamp || item.time || 0;
  const rawRole = String(item.role || item.kind || "assistant").toLowerCase();
  const role =
    type === "activity"
      ? "activity"
      : MESSAGE_ROLES.includes(rawRole)
        ? rawRole
        : "assistant";
  const body = item.content || item.message || item.summary || item.detail || item.description || "";

  return {
    body,
    id: `${type}-${item.id || index}`,
    meta: time ? formatTime(time, lang) : "",
    role,
    time,
    title: item.title || item.label || roleLabel(role, lang),
    type,
  };
}

function MobileAgentView({
  activeSession,
  activeSessionRecommendedSkills = [],
  activeSessionSkillIds = [],
  activeSessionSkills = [],
  busy,
  draft,
  formatTime,
  handleOpenSession,
  handleRunAgent,
  handleToggleSkillMounted,
  lang,
  loading,
  providerConfigured,
  sessionList = [],
  setDraft,
}: Record<string, any>) {
  const [sheet, setSheet] = useState("");
  const isRunning = busy === "run";
  const timeline = useMemo(() => {
    const messages = (activeSession?.messages || []).map((item, index) =>
      normalizeTimelineItem(item, index, "message", lang, formatTime)
    );
    const activity = (activeSession?.activity || []).map((item, index) =>
      normalizeTimelineItem(item, index, "activity", lang, formatTime)
    );

    return [...messages, ...activity].sort((a, b) => (a.time || 0) - (b.time || 0));
  }, [activeSession, formatTime, lang]);
  const recommendedSkills = activeSessionRecommendedSkills.filter(
    (skill) => !activeSessionSkillIds.includes(skill.id)
  );
  const providerLabel = providerConfigured
    ? mobileText(lang, "providerReady")
    : mobileText(lang, "providerPending");

  return (
    <MobilePage view="agent">
      <div className="mobile-agent-bar">
        <div className="mobile-agent-bar__actions">
          <MobileButton variant="text" onClick={() => setSheet("sessions")}>
            {mobileText(lang, "sessionLibrary")}
          </MobileButton>
          <MobileButton variant="text" onClick={() => setSheet("skills")}>
            {mobileText(lang, "skills")}
          </MobileButton>
        </div>
        <span className="mobile-agent-bar__status">
          <MobileStatusDot tone={providerConfigured ? "ready" : "pending"} />
          <span className="sr-only">{providerLabel}</span>
        </span>
      </div>

      <section className="mobile-agent-timeline" aria-label={mobileText(lang, "activity")}>
        {timeline.length === 0 ? (
          <MobileEmpty>{mobileText(lang, "emptyAgent")}</MobileEmpty>
        ) : (
          timeline.map((item) =>
            item.role === "activity" ? (
              <p key={item.id} className="mobile-message mobile-message--activity">
                <span>{item.title}</span>
                {item.body ? <span>{item.body}</span> : null}
                {item.meta ? <time>{item.meta}</time> : null}
              </p>
            ) : (
              <article
                key={item.id}
                className={joinClassNames("mobile-message", `mobile-message--${item.role}`)}
              >
                <header className="mobile-message__head">
                  <strong>{item.title}</strong>
                  {item.meta ? <time>{item.meta}</time> : null}
                </header>
                {item.body ? <p className="mobile-message__body">{item.body}</p> : null}
              </article>
            )
          )
        )}
      </section>

      <form className="mobile-agent-composer" onSubmit={handleRunAgent}>
        <MobileTextField
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={mobileText(lang, "sendPlaceholder")}
          fullWidth
          multiline
          maxRows={4}
          size="small"
          className="mobile-agent-composer__field"
          slotProps={{ htmlInput: { "aria-label": mobileText(lang, "send") } }}
        />
        <MobileButton
          type="submit"
          variant="contained"
          mobileAction="primary"
          disabled={loading || isRunning || !draft.trim()}
        >
          {mobileText(lang, "send")}
        </MobileButton>
      </form>

      <MobileSheet
        id="mobile-agent-sessions"
        open={sheet === "sessions"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "sessionLibrary")}
      >
        <MobileList>
          {sessionList.map((session) => (
            <MobileRowButton
              key={session.id}
              active={session.id === activeSession?.session?.id}
              onClick={() => {
                void handleOpenSession?.(session.id);
                setSheet("");
              }}
            >
              <MobileRowBody>
                <strong>{session.title}</strong>
                {session.lastMessagePreview ? <span>{session.lastMessagePreview}</span> : null}
              </MobileRowBody>
              <time>{session.updatedAt ? formatTime(session.updatedAt, lang) : ""}</time>
            </MobileRowButton>
          ))}
          {sessionList.length === 0 ? <MobileEmpty>{mobileText(lang, "emptyList")}</MobileEmpty> : null}
        </MobileList>
      </MobileSheet>

      <MobileSheet
        id="mobile-agent-skills"
        open={sheet === "skills"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "skills")}
      >
        <MobileList>
          {[...activeSessionSkills, ...recommendedSkills].map((skill) => {
            const isMounted = activeSessionSkillIds.includes(skill.id);
            return (
              <MobileRow key={skill.id}>
                <MobileRowBody>
                  <strong>{skill.name}</strong>
                  <span>{skill.summary || skill.description || skill.triggerHint}</span>
                </MobileRowBody>
                <Chip
                  clickable
                  color={isMounted ? "primary" : "default"}
                  variant={isMounted ? "filled" : "outlined"}
                  label={isMounted ? mobileText(lang, "skillMounted") : mobileText(lang, "skillAdd")}
                  aria-label={`${isMounted ? mobileText(lang, "skillMounted") : mobileText(lang, "skillAdd")} ${skill.name}`}
                  onClick={() => handleToggleSkillMounted(skill.id)}
                  disabled={busy !== ""}
                />
              </MobileRow>
            );
          })}
          {activeSessionSkills.length === 0 && recommendedSkills.length === 0 ? (
            <MobileEmpty>{mobileText(lang, "emptyList")}</MobileEmpty>
          ) : null}
        </MobileList>
      </MobileSheet>
    </MobilePage>
  );
}

export default MobileAgentView;
