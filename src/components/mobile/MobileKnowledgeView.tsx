import AddRoundedIcon from "@mui/icons-material/AddRounded";
import React, { useEffect, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import {
  AppIconButton,
  MobileTextField,
  MobileButton,
  MobileList,
  MobilePage,
  MobileRowBody,
  MobileRowButton,
  MobileForm,
  MobileSearchRow,
  MobileSection,
} from "../ui";

function notePreview(note) {
  const raw = String(note?.summary || note?.body || "").replace(/^#+\s*/, "").trim();
  if (!raw || raw === note?.title) {
    return "";
  }
  return raw.replace(/\s+/g, " ");
}

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
  noteDraft = { title: "", body: "", tagsText: "" },
  noteSearch,
  setNoteDraft,
  setNoteSearch,
}: Record<string, any>) {
  const [editorOpen, setEditorOpen] = useState(false);
  const hasQuery = Boolean(String(noteSearch || "").trim());
  const hasNotes = filteredNotes.length > 0 || hasQuery;

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
    <MobilePage view="knowledge">
      {!hasNotes ? (
        <section className="mobile-empty-hero">
          <strong>{mobileText(lang, "emptyNotesHero")}</strong>
          <p>{mobileText(lang, "emptyNotesHint")}</p>
          <MobileButton
            variant="contained"
            mobileAction="primary"
            onClick={() => void createNote()}
            disabled={busy !== ""}
          >
            {mobileText(lang, "newNote")}
          </MobileButton>
        </section>
      ) : (
        <>
          <MobileSection flush>
            <MobileSearchRow className="mobile-note-toolbar">
              <MobileTextField
                value={noteSearch}
                onChange={(event) => setNoteSearch(event.target.value)}
                placeholder={mobileText(lang, "search")}
                aria-label={mobileText(lang, "search")}
                fullWidth
                size="small"
              />
              <AppIconButton
                className="mobile-note-add"
                onClick={() => void createNote()}
                disabled={busy !== ""}
                aria-label={mobileText(lang, "newNote")}
              >
                <AddRoundedIcon fontSize="small" aria-hidden="true" />
              </AppIconButton>
            </MobileSearchRow>
          </MobileSection>

          {filteredNotes.length > 0 ? (
            <MobileSection>
              <MobileList>
                {filteredNotes.map((note) => {
                  const preview = notePreview(note);
                  return (
                    <MobileRowButton
                      key={note.id}
                      onClick={() => void openNote(note)}
                      active={note.id === activeNoteId}
                    >
                      <MobileRowBody>
                        <strong>{note.title}</strong>
                        {preview ? <span className="mobile-note-card__preview">{preview}</span> : null}
                        {note.updatedAt ? (
                          <span className="mobile-row__meta">{formatTime(note.updatedAt, lang)}</span>
                        ) : null}
                      </MobileRowBody>
                    </MobileRowButton>
                  );
                })}
              </MobileList>
            </MobileSection>
          ) : (
            <section className="mobile-empty-hero">
              <strong>{mobileText(lang, "emptyNotes")}</strong>
            </section>
          )}
        </>
      )}

      <MobileSheet
        id="mobile-note-editor"
        open={editorOpen && Boolean(activeNote)}
        onClose={() => setEditorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={activeNote?.title || mobileText(lang, "knowledge")}
        variant="full"
        actions={
          <>
            <MobileButton
              color="error"
              variant="text"
              mobileAction="danger"
              onClick={handleDeleteNote}
              disabled={busy !== "" || !activeNote}
            >
              {mobileText(lang, "remove")}
            </MobileButton>
            <MobileButton
              variant="contained"
              mobileAction="primary"
              onClick={handleSaveNote}
              disabled={busy !== "" || !noteDraft?.id}
            >
              {mobileText(lang, "save")}
            </MobileButton>
          </>
        }
      >
        <MobileForm>
          <MobileTextField
            label={mobileText(lang, "title")}
            value={noteDraft.title}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, title: event.target.value }))}
            fullWidth
            size="small"
          />
          <MobileTextField
            label={mobileText(lang, "tags")}
            value={noteDraft.tagsText}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, tagsText: event.target.value }))}
            fullWidth
            size="small"
          />
          <MobileTextField
            label={mobileText(lang, "body")}
            value={noteDraft.body}
            onChange={(event) => setNoteDraft((prev) => ({ ...prev, body: event.target.value }))}
            fullWidth
            multiline
            minRows={10}
            size="small"
          />
        </MobileForm>
      </MobileSheet>
    </MobilePage>
  );
}

export default MobileKnowledgeView;
