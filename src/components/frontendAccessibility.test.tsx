import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import DesktopShell from "../shell/DesktopShell";
import { I18nProvider } from "../i18n";
import MusicWorkspace from "./MusicWorkspace";
import ReminderCompletionDialog from "./ReminderCompletionDialog";
import ReminderWorkspace from "./ReminderWorkspace";

const selectedTrack = {
  id: "builtin-reply-pulse",
  title: "Reply Pulse",
  artist: "MMGH Deck",
  cover: "/reply-pulse-cover.jpg",
  theme: "ember",
};

function renderReminderWorkspace() {
  return render(
    <I18nProvider initialLang="zh-CN">
      <ReminderWorkspace
        busy=""
        clockNow={1_710_000_000_000}
        handleCreateReminder={vi.fn()}
        handleDeleteReminder={vi.fn()}
        handleOpenLinkedNote={vi.fn()}
        handleSaveReminder={vi.fn()}
        hasUnsavedReminder={false}
        loading={false}
        noteList={[]}
        reminderDraft={{
          id: 1,
          title: "准备周报",
          dueAt: "",
          severity: "high",
          status: "scheduled",
          linkedNoteId: "",
          detail: "",
        }}
        reminderSearch=""
        reminders={[]}
        selectedReminderId={1}
        setReminderDraft={vi.fn()}
        setReminderSearch={vi.fn()}
        setSelectedReminderId={vi.fn()}
      />
    </I18nProvider>
  );
}

function renderCompletionDialog() {
  return render(
    <I18nProvider initialLang="zh-CN">
      <ReminderCompletionDialog
        busy=""
        draft={{
          createFollowUp: false,
          linkedNoteId: "",
          reminderTitle: "准备周报",
          result: "",
          saveToNote: true,
        }}
        noteList={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        panelRef={React.createRef()}
        setDraft={vi.fn()}
      />
    </I18nProvider>
  );
}

function createMusicWorkspace() {
  return (
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
      lyricsUploadInputRef={React.createRef()}
      localizedTracks={[selectedTrack]}
      onRefreshLyrics={vi.fn()}
      onUploadLyricsFile={vi.fn()}
      onUploadTracks={vi.fn()}
      playMode="loop"
      selectedTrack={selectedTrack}
      selectedTrackId={selectedTrack.id}
      setAutoPlayOnReply={vi.fn()}
      setVolume={vi.fn()}
      uploadInputRef={React.createRef()}
      volume={72}
    />
  );
}

function renderMusicPage() {
  return render(
    <I18nProvider initialLang="zh-CN">
      <DesktopShell
        model={{
          allNavigationItems: [],
          currentView: "music",
          lang: "zh-CN",
          openView: vi.fn(),
          providerConfigured: true,
          setLang: vi.fn(),
          setTheme: vi.fn(),
          t: (key: string) => key,
          theme: "light",
          viewMeta: { music: { title: "音乐播放器" } },
        }}
      >
        {createMusicWorkspace()}
      </DesktopShell>
    </I18nProvider>
  );
}

test("reminder select controls are named by their visible labels", () => {
  renderReminderWorkspace();

  expect(screen.getByRole("combobox", { name: "严重级别" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "状态" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "关联笔记" })).toBeInTheDocument();
});

test("the completion dialog exposes one Close button to assistive technology", () => {
  renderCompletionDialog();

  expect(screen.getAllByRole("button", { name: "关闭" })).toHaveLength(1);
  expect(screen.getByRole("button", { name: "关闭完成对话框" })).toBeInTheDocument();
});

test("the music page heading identifies the page and nests the selected track", () => {
  renderMusicPage();

  expect(screen.getByRole("heading", { level: 1, name: "音乐播放器" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Reply Pulse" })).toBeInTheDocument();
});
