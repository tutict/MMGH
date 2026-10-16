import { useState } from "react";
import { MobileButton, MobilePage } from "../ui";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

export default function MobileMusicView({
  handleCyclePlayMode,
  handlePlayNextTrack,
  handlePlayPreviousTrack,
  handleSeek,
  handleSelectTrack,
  handleTogglePlayback,
  isPlaying,
  lang,
  localizedTracks = [],
  lyricsLines = [],
  playMode,
  selectedTrack,
  setVolume,
  t,
  volume = 72,
}: Record<string, any>) {
  const [queueOpen, setQueueOpen] = useState(false);
  return (
    <MobilePage view="music">
      <section className="mobile-editor">
        <h1 className="mobile-weather-temp">{selectedTrack?.title || t?.("app.music.panelTitle")}</h1>
        <p>{selectedTrack?.artist}</p>
        <div className="mobile-segmented">
          <MobileButton variant="text" onClick={handlePlayPreviousTrack}>{t?.("app.music.previous") || "Previous"}</MobileButton>
          <MobileButton variant="contained" onClick={handleTogglePlayback}>{isPlaying ? "Pause" : "Play"}</MobileButton>
          <MobileButton variant="text" onClick={handlePlayNextTrack}>{t?.("app.music.next") || "Next"}</MobileButton>
        </div>
        <input aria-label={t?.("app.music.seek") || "Seek"} type="range" min="0" max="100" onChange={handleSeek} />
        <label>
          {t?.("app.music.volume") || "Volume"}
          <input aria-label={t?.("app.music.volume") || "Volume"} type="range" min="0" max="100" value={volume} onChange={(event) => setVolume?.(Number(event.target.value))} />
        </label>
        <MobileButton variant="text" onClick={handleCyclePlayMode}>{playMode}</MobileButton>
        <MobileButton variant="text" onClick={() => setQueueOpen(true)}>{t?.("app.music.queueTitle") || "Queue"}</MobileButton>
        <div>
          {lyricsLines.map((line, index) => <p key={`${line.time}-${index}`}>{line.text}</p>)}
        </div>
      </section>
      <MobileSheet open={queueOpen} onClose={() => setQueueOpen(false)} title={t?.("app.music.queueTitle") || "Queue"} closeLabel={mobileText(lang, "close")}>
        {localizedTracks.map((track) => (
          <MobileButton key={track.id} variant="text" onClick={() => { handleSelectTrack?.(track.id); setQueueOpen(false); }}>
            {track.title}
          </MobileButton>
        ))}
      </MobileSheet>
    </MobilePage>
  );
}
