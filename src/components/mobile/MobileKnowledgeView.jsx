import React, { useEffect, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

function MobileKnowledgeView({
  activeNote,
  activeNoteId,
  busy,
  filteredNotes = [],
  formatTime,
  handleCreateNote,
  handleDeleteNote,
  handleOpenNote,
  handleSaveNote,
  lang,
  noteDraft,
  noteSearch,
  setNoteDraft,
  setNoteSearch,
}) {
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!activeNote) {
      setEditorOpen(false);
    }
  }, [activeNote]);

  async function openNote(note) {
    const didOpen = note.id === activeNoteId || (await handleOpenNote(note.id));
    if (didOpen) {
      setEditorOpen(true);
    }
  }

  async function createNote() {
    await handleCreateNote();
    setEditorOpen(true);
  }

  return (
    <div className="mobile-page mobile-page--knowledge">
      <section className="mobile-section mobile-section--flush">
        <div className="mobile-search-row">
          <input
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder={mobileText(lang, "search")}
            aria-label={mobileText(lang, "search")}
          />
          <button type="button" className="mobile-primary-action" onClick={createNote} disabled={busy !== ""}>
            {mobileText(lang, "newNote")}
          </button>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h1>{mobileText(lang, "allNotes")}</h1>
          <span>{filteredNotes.length}</span>
        </div>
        <div className="mobile-list">
          {filteredNotes.length === 0 ? (
            <p className="mobile-empty">{mobileText(lang, "emptyNotes")}</p>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`mobile-row ${note.id === activeNoteId ? "is-active" : ""}`}
                onClick={() => void openNote(note)}
              >
                <span className="mobile-note-icon">{note.icon || "*"}</span>
                <span className="mobile-row__body">
                  <strong>{note.title}</strong>
                  <span>{note.summary || note.body}</span>
                  {note.tags?.length ? <small>{note.tags.join(" / ")}</small> : null}
                </span>
                <time>{note.updatedAt ? formatTime(note.updatedAt, lang) : ""}</time>
              </button>
            ))
          )}
        </div>
      </section>

      <MobileSheet
        id="mobile-note-editor"
        open={editorOpen && Boolean(activeNote)}
        onClose={() => setEditorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={activeNote?.title || mobileText(lang, "knowledge")}
        actions={
          <>
            <button
              type="button"
              className="mobile-danger-action"
              onClick={handleDeleteNote}
              disabled={busy !== "" || !activeNote}
            >
              Delete
            </button>
            <button
              type="button"
              className="mobile-primary-action"
              onClick={handleSaveNote}
              disabled={busy !== "" || !noteDraft?.id}
            >
              {mobileText(lang, "save")}
            </button>
          </>
        }
      >
        <div className="mobile-form">
          <label>
            <span>Title</span>
            <input
              value={noteDraft.title}
              onChange={(event) => setNoteDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label>
            <span>{mobileText(lang, "tags")}</span>
            <input
              value={noteDraft.tagsText}
              onChange={(event) => setNoteDraft((prev) => ({ ...prev, tagsText: event.target.value }))}
            />
          </label>
          <label>
            <span>{mobileText(lang, "body")}</span>
            <textarea
              value={noteDraft.body}
              onChange={(event) => setNoteDraft((prev) => ({ ...prev, body: event.target.value }))}
              rows={10}
            />
          </label>
        </div>
      </MobileSheet>
    </div>
  );
}

export default MobileKnowledgeView;
