import React, { useEffect, useState } from "react";
import { Button, TextField } from "@mui/material";
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
}: Record<string, any>) {
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
          <TextField
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder={mobileText(lang, "search")}
            aria-label={mobileText(lang, "search")}
            fullWidth
            size="small"
            className="mobile-field"
          />
          <Button
            type="button"
            variant="contained"
            className="mobile-primary-action"
            onClick={createNote}
            disabled={busy !== ""}
          >
            {mobileText(lang, "newNote")}
          </Button>
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
              <Button
                key={note.id}
                type="button"
                variant="text"
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
              </Button>
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
            <Button
              type="button"
              color="error"
              variant="text"
              className="mobile-danger-action"
              onClick={handleDeleteNote}
              disabled={busy !== "" || !activeNote}
            >
              Delete
            </Button>
            <Button
              type="button"
              variant="contained"
              className="mobile-primary-action"
              onClick={handleSaveNote}
              disabled={busy !== "" || !noteDraft?.id}
            >
              {mobileText(lang, "save")}
            </Button>
          </>
        }
      >
        <div className="mobile-form">
          <TextField
            label="Title"
            value={noteDraft.title}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, title: event.target.value }))}
            fullWidth
            size="small"
            className="mobile-field"
          />
          <TextField
            label={mobileText(lang, "tags")}
            value={noteDraft.tagsText}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, tagsText: event.target.value }))}
            fullWidth
            size="small"
            className="mobile-field"
          />
          <TextField
            label={mobileText(lang, "body")}
            value={noteDraft.body}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, body: event.target.value }))}
            fullWidth
            multiline
            minRows={10}
            size="small"
            className="mobile-field"
          />
        </div>
      </MobileSheet>
    </div>
  );
}

export default MobileKnowledgeView;



