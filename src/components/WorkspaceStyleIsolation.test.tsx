import React from "react";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { I18nProvider } from "../i18n";
import KnowledgeVault from "./KnowledgeVault";
import MusicWorkspace from "./MusicWorkspace";

const sharedCollisionSelector = [
  ".panel-surface",
  ".section-head",
  ".ghost-button",
  ".solid-button",
  ".settings-form__row",
  ".toggle-pill",
  ".gallery-empty",
].join(",");

test("music workspace owns an isolated console namespace", () => {
  const uploadInputRef = React.createRef<HTMLInputElement>();
  const lyricsUploadInputRef = React.createRef<HTMLInputElement>();
  const selectedTrack = {
    id: "builtin-reply-pulse",
    title: "Reply Pulse",
    artist: "MMGH Deck",
    cover: "/reply-pulse-cover.jpg",
    theme: "ember",
  };

  const { container } = render(
    <I18nProvider initialLang="zh-CN">
      <MusicWorkspace
        autoPlayOnReply={false}
        handleCyclePlayMode={vi.fn()}
        handlePlayNextTrack={vi.fn()}
        handlePlayPreviousTrack={vi.fn()}
        handleRestartTrack={vi.fn()}
        handleSeek={vi.fn()}
        handleSelectTrack={vi.fn()}
        handleTogglePlayback={vi.fn()}
        isPlaying={false}
        lyricsError=""
        lyricsLines={[]}
        lyricsSource="fallback"
        lyricsStatus="ready"
        lyricsUploadInputRef={lyricsUploadInputRef}
        localizedTracks={[selectedTrack]}
        onRefreshLyrics={vi.fn()}
        onUploadLyricsFile={vi.fn()}
        playMode="loop"
        selectedTrack={selectedTrack}
        selectedTrackId={selectedTrack.id}
        setAutoPlayOnReply={vi.fn()}
        setVolume={vi.fn()}
        uploadInputRef={uploadInputRef}
        volume={72}
      />
    </I18nProvider>
  );

  expect(container.querySelector(".audio-console")).toBeTruthy();
  expect(container.querySelector('[class*="music-"]')).toBeNull();
  expect(container.querySelector(sharedCollisionSelector)).toBeNull();
  expect(container.querySelectorAll(".audio-switch")).toHaveLength(1);
});

test("music workspace closes the desktop library when its own container becomes compact", () => {
  let resizeCallback: ResizeObserverCallback | undefined;
  class ResizeObserverStub {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
    }

    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  try {
    const uploadInputRef = React.createRef<HTMLInputElement>();
    const lyricsUploadInputRef = React.createRef<HTMLInputElement>();
    const selectedTrack = {
      id: "builtin-reply-pulse",
      title: "Reply Pulse",
      artist: "MMGH Deck",
      cover: "/reply-pulse-cover.jpg",
      theme: "ember",
    };
    const { container } = render(
      <I18nProvider initialLang="zh-CN">
        <MusicWorkspace
          autoPlayOnReply={false}
          handleCyclePlayMode={vi.fn()}
          handlePlayNextTrack={vi.fn()}
          handlePlayPreviousTrack={vi.fn()}
          handleRestartTrack={vi.fn()}
          handleSeek={vi.fn()}
          handleSelectTrack={vi.fn()}
          handleTogglePlayback={vi.fn()}
          isPlaying={false}
          lyricsError=""
          lyricsLines={[]}
          lyricsSource="fallback"
          lyricsStatus="ready"
          lyricsUploadInputRef={lyricsUploadInputRef}
          localizedTracks={[selectedTrack]}
          onRefreshLyrics={vi.fn()}
          onUploadLyricsFile={vi.fn()}
          playMode="loop"
          selectedTrack={selectedTrack}
          selectedTrackId={selectedTrack.id}
          setAutoPlayOnReply={vi.fn()}
          setVolume={vi.fn()}
          uploadInputRef={uploadInputRef}
          volume={72}
        />
      </I18nProvider>
    );
    const surface = container.querySelector(".audio-console__surface");
    const toggle = container.querySelector(".audio-console__library-toggle");

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 1280 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });
    expect(surface).toHaveClass("audio-library-open");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 900 } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });
    expect(surface).toHaveClass("audio-library-collapsed");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  } finally {
    vi.unstubAllGlobals();
  }
});

test("knowledge workspace owns an isolated notes namespace", () => {
  const note = {
    id: 1,
    icon: "N",
    title: "Project notes",
    summary: "Stable project context.",
    tags: ["project"],
    updatedAt: 1760000000000,
  };
  const noteDraft = {
    icon: note.icon,
    title: note.title,
    tagsText: "project",
    body: "Stable project context.",
  };

  const { container } = render(
    <I18nProvider initialLang="zh-CN">
      <KnowledgeVault
        activeNote={note}
        activeNoteId={note.id}
        busy=""
        filteredNotes={[note]}
        formatTime={() => "2026-07-13"}
        handleCreateNote={vi.fn()}
        handleDeleteNote={vi.fn()}
        handleOpenNote={vi.fn()}
        handleSaveNote={vi.fn()}
        hasUnsavedNote={false}
        loading={false}
        noteDraft={noteDraft}
        noteSearch=""
        setNoteDraft={vi.fn()}
        setNoteSearch={vi.fn()}
      />
    </I18nProvider>
  );

  expect(container.querySelector(".notes-workbench")).toBeTruthy();
  expect(container.querySelector('[class*="knowledge-"]')).toBeNull();
  expect(container.querySelector(sharedCollisionSelector)).toBeNull();
});
