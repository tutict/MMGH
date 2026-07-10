import { describe, expect, it } from "vitest";

import { BUILT_IN_TRACKS, localizeTracks } from "./tracks";

describe("music tracks", () => {
  it("localizes catalog keys and preserves uploaded labels", () => {
    const builtInTrack = BUILT_IN_TRACKS[0]!;
    const tracks = [
      builtInTrack,
      {
        id: "upload-one",
        title: "Local title",
        artist: "Local artist",
        src: "blob:one",
      },
    ];

    expect(localizeTracks(tracks, (key) => "translated:" + key)).toEqual([
      {
        ...builtInTrack,
        title: "translated:app.music.builtin.replyPulse.title",
        artist: "translated:app.music.builtin.artist",
      },
      {
        ...tracks[1],
        title: "Local title",
        artist: "Local artist",
      },
    ]);
  });
});

