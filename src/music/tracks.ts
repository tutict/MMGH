export type MusicTrack = {
  artist?: string;
  artistKey?: string;
  cover?: string;
  id: string;
  src: string;
  theme?: string;
  title?: string;
  titleKey?: string;
};

export type LocalizedMusicTrack = MusicTrack & {
  artist: string;
  title: string;
};

type Translate = (key: string) => string;

export const BUILT_IN_TRACKS: MusicTrack[] = [
  {
    id: "builtin-reply-pulse",
    titleKey: "app.music.builtin.replyPulse.title",
    artistKey: "app.music.builtin.artist",
    src: "/reply-pulse.mp3",
    cover: "/reply-pulse-cover.jpg",
    theme: "ember",
  },
  {
    id: "builtin-neon-orbit",
    titleKey: "app.music.builtin.neonOrbit.title",
    artistKey: "app.music.builtin.artist",
    src: "/reply-pulse.mp3",
    cover: "/neon-orbit-cover.jpg",
    theme: "ice",
  },
];

export function localizeTracks(tracks: readonly MusicTrack[], translate: Translate): LocalizedMusicTrack[] {
  return tracks.map((track) => ({
    ...track,
    title: track.titleKey ? translate(track.titleKey) : track.title || "",
    artist: track.artistKey ? translate(track.artistKey) : track.artist || "",
  }));
}
