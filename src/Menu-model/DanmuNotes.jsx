import React, { useEffect, useMemo, useState } from "react";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonSearchbar,
  IonText,
  IonTextarea,
} from "@ionic/react";
import { createOutline, trashOutline } from "ionicons/icons";
import "../CSS/menu.css";
import Menu from "./Menu";
import { useI18n } from "../i18n";
import { addNote, deleteNote, listNotes, updateNote } from "../storage/notes";

const DanmuNotes = () => {
  const { t, lang } = useI18n();
  const [titleInput, setTitleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [moodInput, setMoodInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotes = (query = "") => {
    setIsLoading(true);
    return listNotes({ query })
      .then((items) => {
        setNotes(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        console.error("Failed to load notes", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotes(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const parseTags = (raw) =>
    raw
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const handleChange = (event) => {
    setNoteInput(event.detail.value ?? "");
    if (error) {
      setError("");
    }
  };

  const resetEditor = () => {
    setTitleInput("");
    setNoteInput("");
    setMoodInput("");
    setTagsInput("");
    setEditingId(null);
  };

  const handleSave = async () => {
    const content = noteInput.trim();
    if (!content) {
      setError(t("danmu.error.empty"));
      return;
    }

    try {
      const payload = {
        title: titleInput.trim() || undefined,
        content,
        mood: moodInput.trim() || undefined,
        tags: parseTags(tagsInput),
      };
      if (editingId) {
        await updateNote({ id: editingId, ...payload });
      } else {
        await addNote(payload);
      }
      resetEditor();
      await loadNotes(searchQuery);
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setTitleInput(note.title || "");
    setNoteInput(note.content || "");
    setMoodInput(note.mood || "");
    setTagsInput((note.tags || []).join(", "));
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm(t("danmu.notes.deleteConfirm"))) {
      return;
    }
    try {
      await deleteNote(noteId);
      await loadNotes(searchQuery);
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const formattedNotes = useMemo(
    () =>
      notes.map((note) => ({
        ...note,
        time: new Date(note.createdAt).toLocaleString(lang, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    [notes, lang]
  );

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <div className="page-shell notion-shell">
          <Menu />

          <section className="notion-card notion-hero">
            <span className="notion-eyebrow">{t("danmu.page.eyebrow")}</span>
            <h1>{t("danmu.page.title")}</h1>
            <p>{t("danmu.page.desc")}</p>
          </section>

          <section className="notion-card notion-editor">
            <div className="notion-editor__head">
              <span className="notion-chip">{t("danmu.notes.label")}</span>
            </div>
            <div className="notion-editor__meta">
              <IonInput
                value={titleInput}
                onIonChange={(event) => setTitleInput(event.detail.value ?? "")}
                placeholder={t("danmu.notes.title")}
                className="notion-input notion-input--title"
              />
              <div className="notion-editor__row">
                <IonInput
                  value={moodInput}
                  onIonChange={(event) => setMoodInput(event.detail.value ?? "")}
                  placeholder={t("danmu.notes.mood")}
                  className="notion-input notion-input--small"
                />
                <IonInput
                  value={tagsInput}
                  onIonChange={(event) => setTagsInput(event.detail.value ?? "")}
                  placeholder={t("danmu.notes.tags")}
                  className="notion-input notion-input--small"
                />
              </div>
            </div>
            <IonTextarea
              autoGrow
              value={noteInput}
              onIonChange={handleChange}
              placeholder={t("danmu.notes.placeholder")}
              className="notion-input"
              rows={4}
            />
            {error && (
              <IonText className="notion-error" role="alert">
                {error}
              </IonText>
            )}
            <div className="notion-editor__actions">
              {editingId ? (
                <IonButton fill="clear" onClick={resetEditor}>
                  {t("danmu.notes.cancel")}
                </IonButton>
              ) : null}
              <IonButton onClick={handleSave} disabled={!noteInput.trim()}>
                {editingId ? t("danmu.notes.update") : t("danmu.notes.add")}
              </IonButton>
            </div>
          </section>

          <section className="notion-card notion-list">
            <div className="notion-list__head">
              <span className="notion-list__title">
                {t("danmu.notes.section")}
              </span>
              <IonSearchbar
                value={searchQuery}
                onIonChange={(event) => setSearchQuery(event.detail.value ?? "")}
                placeholder={t("danmu.notes.search")}
                className="notion-search"
              />
            </div>
            {formattedNotes.length > 0 ? (
              <div className="notion-notes">
                {formattedNotes.map((note) => (
                  <article className="notion-note" key={note.id}>
                    <div className="notion-note__head">
                      <span className="notion-note__time">{note.time}</span>
                      <div className="notion-note__actions">
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => handleEdit(note)}
                          aria-label={t("danmu.notes.edit")}
                        >
                          <IonIcon icon={createOutline} />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => handleDelete(note.id)}
                          aria-label={t("danmu.notes.delete")}
                        >
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      </div>
                    </div>
                    {note.title ? (
                      <h3 className="notion-note__title">{note.title}</h3>
                    ) : null}
                    <p className="notion-note__content">{note.content}</p>
                    {(note.mood || (note.tags && note.tags.length > 0)) && (
                      <div className="notion-note__meta">
                        {note.mood ? (
                          <span className="notion-pill">{note.mood}</span>
                        ) : null}
                        {(note.tags || []).map((tag) => (
                          <span className="notion-pill" key={`${note.id}-${tag}`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="notion-empty">
                {isLoading ? t("danmu.notes.loading") : t("danmu.notes.empty")}
              </p>
            )}
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DanmuNotes;
