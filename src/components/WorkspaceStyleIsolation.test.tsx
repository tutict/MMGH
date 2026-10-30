import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { I18nProvider } from "../i18n";
import KnowledgeVault from "./KnowledgeVault";
import MusicWorkspace from "./MusicWorkspace";
import WeatherWorkspace from "./WeatherWorkspace";

const selectedTrack = {
  id: "builtin-reply-pulse",
  title: "Reply Pulse",
  artist: "MMGH Deck",
  cover: "/reply-pulse-cover.jpg",
  theme: "ember",
};

function renderMusic() {
  const uploadInputRef = React.createRef<HTMLInputElement>();
  const lyricsUploadInputRef = React.createRef<HTMLInputElement>();
  return render(
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
}

test("music workspace uses the desktop music root and has no particle canvas", () => {
  const { container } = renderMusic();
  expect(container.querySelector(".desk-music")).toBeTruthy();
  expect(container.querySelector(".desk-music__queue")).toBeTruthy();
  expect(container.querySelector(".audio-console__lyrics-viewport")).toBeTruthy();
  expect(container.querySelector("canvas")).toBeNull();
  for (const forbidden of [
    ".audio-console__particle-ring",
    ".audio-console__turntable",
    ".audio-console__vinyl",
    ".audio-console__plinth",
    ".audio-console__backdrop",
    ".audio-console__scrim",
  ]) {
    expect(container.querySelector(forbidden)).toBeNull();
  }
});

test("music queue can collapse", async () => {
  const user = userEvent.setup();
  const { container } = renderMusic();
  const toggle = container.querySelector(".audio-console__library-toggle");
  expect(toggle).toBeTruthy();
  await user.click(toggle as HTMLElement);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  await user.click(toggle as HTMLElement);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("knowledge workspace uses the desktop knowledge root", () => {
  const note = {
    id: 1,
    icon: "N",
    title: "Project notes",
    summary: "Stable project context.",
    tags: ["project"],
    updatedAt: 1760000000000,
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
        noteDraft={{ icon: note.icon, title: note.title, tagsText: "project", body: "Stable project context." }}
        noteSearch=""
        setNoteDraft={vi.fn()}
        setNoteSearch={vi.fn()}
      />
    </I18nProvider>
  );
  expect(container.querySelector(".desk-knowledge")).toBeTruthy();
});

test("weather workspace has no tilt scene", () => {
  const { container } = render(
    <I18nProvider initialLang="zh-CN">
      <WeatherWorkspace
        auxiliaryCacheVersion={0}
        clockNow={1_710_000_000_000}
        onAddCity={vi.fn()}
        onLocalCacheError={vi.fn()}
        onRefresh={vi.fn()}
        onRemoveCity={vi.fn()}
        selectedCityId="shanghai"
        setSelectedCityId={vi.fn()}
        weatherCities={[{
          id: "shanghai",
          name: "Shanghai",
          conditionKey: "app.weather.condition.bright",
          temperature: 20,
          hourly: [],
          daily: [],
          timeZone: "Asia/Shanghai",
        }]}
        weatherError=""
        weatherStatus="ready"
        weatherUpdatedAt={1_710_000_000_000}
      />
    </I18nProvider>
  );
  expect(container.querySelector(".desk-weather")).toBeTruthy();
  expect(container.querySelector(".weather-current")).toBeTruthy();
  expect(container.querySelector(".weather-cities")).toBeTruthy();
  for (const forbidden of [
    ".weather-scene",
    ".weather-tilt",
    ".weather-hero-card",
    ".weather-hero-card__orb",
    ".weather-hero-card__ring",
    ".weather-hero-card__glass",
    ".weather-hero-card__spark",
  ]) {
    expect(container.querySelector(forbidden)).toBeNull();
  }
});
