import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { paletteTokens, type ThemePalette } from "./palette";

type Oklch = [number, number, number];

const tokenNames: Record<keyof ThemePalette, string> = {
  bg: "q-bg",
  surface: "q-surface",
  sunken: "q-sunken",
  text: "q-text",
  textMuted: "q-text-muted",
  textFaint: "q-text-faint",
  border: "q-border",
  control: "q-control",
  accent: "q-accent",
  accentStrong: "q-accent-strong",
  accentInk: "q-accent-ink",
  accentSoft: "q-accent-soft",
  selected: "q-selected",
  success: "q-success",
  successSoft: "q-success-soft",
  warning: "q-warning",
  warningSoft: "q-warning-soft",
  danger: "q-danger",
  dangerSoft: "q-danger-soft",
};

function parseBlock(block: string) {
  const colors = new Map<string, Oklch>();
  const pattern = /--(q-[\w-]+):\s*oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/g;
  for (const match of block.matchAll(pattern)) {
    colors.set(match[1], [Number(match[2]), Number(match[3]), Number(match[4])]);
  }
  return colors;
}

function parseOklch(value: string): Oklch {
  const match = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/);
  expect(match, `Unreadable palette value: ${value}`).toBeTruthy();
  return [Number(match![1]), Number(match![2]), Number(match![3])];
}

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../ui/tokens.css"), "utf8");
const [lightBlock, darkBlock] = css.split('[data-theme="dark"]');
const tokenThemes = {
  light: parseBlock(lightBlock),
  dark: parseBlock(darkBlock),
};

for (const mode of ["light", "dark"] as const) {
  test(`${mode} MUI palette matches the --q-* token values`, () => {
    for (const key of Object.keys(tokenNames) as Array<keyof ThemePalette>) {
      const token = tokenThemes[mode].get(tokenNames[key]);
      expect(token, `${mode} is missing --${tokenNames[key]}`).toBeTruthy();
      expect(parseOklch(paletteTokens[mode][key]), `${mode} palette.${key}`).toEqual(token);
    }
  });
}
