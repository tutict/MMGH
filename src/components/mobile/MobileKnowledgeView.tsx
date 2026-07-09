import React, { useEffect, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import { MobileTextField, MobileButton, MobileList, MobilePage, MobileRowBody, MobileRowButton, MobileEmpty, MobileForm, MobileSearchRow, MobileSection, MobileSectionHead } from "../ui";

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
    <MobilePage view="knowledge">
      <MobileSection flush>
        <MobileSearchRow>
          <MobileTextField
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder={mobileText(lang, "search")}
            aria-label={mobileText(lang, "search")}
            fullWidth
            size="small"
          />
          <MobileButton
            variant="contained"
            mobileAction="primary"
            onClick={createNote}
            disabled={busy !== ""}
          >
            {mobileText(lang, "newNote")}
          </MobileButton>
        </MobileSearchRow>
      </MobileSection>

      <MobileSection>
        <MobileSectionHead line>
          <h1>{mobileText(lang, "allNotes")}</h1>
          <span>{filteredNotes.length}</span>
        </MobileSectionHead>
        <MobileList>
          {filteredNotes.length === 0 ? (
            <MobileEmpty>{mobileText(lang, "emptyNotes")}</MobileEmpty>
          ) : (
            filteredNotes.map((note) => (
              <MobileRowButton
              key={note.id}
              onClick={() => void openNote(note)}
              active={note.id === activeNoteId}
            >
                <span className="mobile-note-icon">{note.icon || "*"}</span>
                <MobileRowBody>
                  <strong>{note.title}</strong>
                  <span>{note.summary || note.body}</span>
                  {note.tags?.length ? <small>{note.tags.join(" / ")}</small> : null}
                </MobileRowBody>
                <time>{note.updatedAt ? formatTime(note.updatedAt, lang) : ""}</time>
              </MobileRowButton>
            ))
          )}
        </MobileList>
      </MobileSection>

      <MobileSheet
        id="mobile-note-editor"
        open={editorOpen && Boolean(activeNote)}
        onClose={() => setEditorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={activeNote?.title || mobileText(lang, "knowledge")}
        actions={
          <>
            <MobileButton
              color="error"
              variant="text"
              mobileAction="danger"
              onClick={handleDeleteNote}
              disabled={busy !== "" || !activeNote}
            >
              Delete
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
            label="Title"
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



