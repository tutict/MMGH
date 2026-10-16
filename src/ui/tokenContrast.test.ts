import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

type Oklch = [number, number, number];

function parseBlock(block: string) {
  const colors = new Map<string, Oklch>();
  const pattern = /--(q-[\w-]+):\s*oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/g;
  for (const match of block.matchAll(pattern)) {
    colors.set(match[1], [Number(match[2]), Number(match[3]), Number(match[4])]);
  }
  return colors;
}

function oklchToSrgb([L, C, H]: Oklch): [number, number, number] {
  const hue = (H * Math.PI) / 180;
  const a = C * Math.cos(hue);
  const b = C * Math.sin(hue);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  }) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]) {
  const transform = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function contrast(foreground: Oklch, background: Oklch) {
  const lighter = Math.max(relativeLuminance(oklchToSrgb(foreground)), relativeLuminance(oklchToSrgb(background)));
  const darker = Math.min(relativeLuminance(oklchToSrgb(foreground)), relativeLuminance(oklchToSrgb(background)));
  return (lighter + 0.05) / (darker + 0.05);
}

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "tokens.css"), "utf8");
const [lightBlock, darkBlock] = css.split('[data-theme="dark"]');
const themes = {
  light: parseBlock(lightBlock),
  dark: parseBlock(darkBlock),
};

function expectContrast(theme: "light" | "dark", foreground: string, background: string, minimum: number) {
  const colors = themes[theme];
  const ratio = contrast(colors.get(foreground)!, colors.get(background)!);
  expect(ratio, `${theme} ${foreground} on ${background} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(minimum);
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} text and status colors clear the ergonomic contrast floors`, () => {
    expectContrast(theme, "q-text", "q-bg", 7);
    expectContrast(theme, "q-text-muted", "q-bg", 4.5);
    expectContrast(theme, "q-text-faint", "q-bg", 3);
    expectContrast(theme, "q-accent-ink", "q-accent", 4.5);
    expectContrast(theme, "q-control", "q-surface", 3);
    expectContrast(theme, "q-success", "q-bg", 4.5);
    expectContrast(theme, "q-warning", "q-bg", 4.5);
    expectContrast(theme, "q-danger", "q-bg", 4.5);
  });
}
