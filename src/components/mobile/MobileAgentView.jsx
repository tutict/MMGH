import React, { useMemo, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

function normalizeTimelineItem(item, index, type, lang, formatTime) {
  const time = item.createdAt || item.updatedAt || item.timestamp || item.time || 0;
  const role = item.role || item.kind || type;
  const title = item.title || item.label || (role === "assistant" ? "Agent" : role === "user" ? "You" : role);
  const body = item.content || item.message || item.summary || item.detail || item.description || "";

  return {
    body,
    id: `${type}-${item.id || index}`,
    meta: time ? formatTime(time, lang) : "",
    role,
    time,
    title,
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
}) {
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

  return (
    <div className="mobile-page mobile-page--agent">
      <section className="mobile-section mobile-section--flush">
        <div className="mobile-section__head">
          <div>
            <span className="mobile-eyebrow">{mobileText(lang, "currentSession")}</span>
            <h1>{activeSession?.session?.title || mobileText(lang, "agent")}</h1>
          </div>
          <span className={`mobile-status-dot ${providerConfigured ? "is-ready" : "is-pending"}`} />
        </div>
        <div className="mobile-action-row mobile-action-row--three">
          <button type="button" className="mobile-secondary-action" onClick={() => setSheet("sessions")}>
            {mobileText(lang, "sessionLibrary")}
          </button>
          <button type="button" className="mobile-secondary-action" onClick={() => setSheet("skills")}>
            {mobileText(lang, "skills")}
          </button>
          <button type="button" className="mobile-secondary-action" onClick={() => setSheet("details")}>
            {mobileText(lang, "details")}
          </button>
        </div>
      </section>

      <section className="mobile-agent-timeline" aria-label={mobileText(lang, "activity")}>
        {timeline.length === 0 ? (
          <p className="mobile-empty">{mobileText(lang, "emptyAgent")}</p>
        ) : (
          timeline.map((item) => (
            <article
              key={item.id}
              className={`mobile-agent-event mobile-agent-event--${item.role || item.type}`}
            >
              <div className="mobile-agent-event__head">
                <strong>{item.title}</strong>
                <time>{item.meta}</time>
              </div>
              {item.body ? <p>{item.body}</p> : null}
            </article>
          ))
        )}
      </section>

      <form className="mobile-agent-composer" onSubmit={handleRunAgent}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={mobileText(lang, "send")}
          rows={1}
          aria-label={mobileText(lang, "send")}
        />
        <button
          type="submit"
          className="mobile-primary-action"
          disabled={loading || isRunning || !draft.trim()}
        >
          {mobileText(lang, "send")}
        </button>
      </form>

      <MobileSheet
        id="mobile-agent-sessions"
        open={sheet === "sessions"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "sessionLibrary")}
      >
        <div className="mobile-list">
          {sessionList.map((session) => (
            <button
              key={session.id}
              type="button"
              className="mobile-row"
              onClick={() => {
                void handleOpenSession?.(session.id);
                setSheet("");
              }}
            >
              <span className="mobile-row__body">
                <strong>{session.title}</strong>
                <span>{session.lastMessagePreview}</span>
              </span>
              <time>{session.updatedAt ? formatTime(session.updatedAt, lang) : ""}</time>
            </button>
          ))}
        </div>
      </MobileSheet>

      <MobileSheet
        id="mobile-agent-skills"
        open={sheet === "skills"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "skills")}
      >
        <div className="mobile-list">
          {[...activeSessionSkills, ...recommendedSkills].map((skill) => {
            const isMounted = activeSessionSkillIds.includes(skill.id);
            return (
              <div key={skill.id} className="mobile-row">
                <span className="mobile-row__body">
                  <strong>{skill.name}</strong>
                  <span>{skill.summary || skill.description || skill.triggerHint}</span>
                </span>
                <button
                  type="button"
                  className={`mobile-pill-button ${isMounted ? "is-active" : ""}`}
                  onClick={() => handleToggleSkillMounted(skill.id)}
                  disabled={busy !== ""}
                >
                  {isMounted ? "On" : "Add"}
                </button>
              </div>
            );
          })}
          {activeSessionSkills.length === 0 && recommendedSkills.length === 0 ? (
            <p className="mobile-empty">{mobileText(lang, "emptyList")}</p>
          ) : null}
        </div>
      </MobileSheet>

      <MobileSheet
        id="mobile-agent-details"
        open={sheet === "details"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "details")}
      >
        <div className="mobile-list">
          <div className="mobile-row">
            <span className="mobile-row__body">
              <strong>{mobileText(lang, "provider")}</strong>
              <span>{providerConfigured ? "Configured" : "Pending"}</span>
            </span>
          </div>
          <div className="mobile-row">
            <span className="mobile-row__body">
              <strong>{mobileText(lang, "activity")}</strong>
              <span>{timeline.length}</span>
            </span>
          </div>
        </div>
      </MobileSheet>
    </div>
  );
}

export default MobileAgentView;
