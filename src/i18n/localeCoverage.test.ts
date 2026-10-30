import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { mobileCopy } from "../components/mobile/mobileText";
import enUS from "./locales/en-US";
import zhCN from "./locales/zh-CN";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = join(projectRoot, "src");

function walk(directory: string, found: string[] = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path, found);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

// The dictionaries are the source of truth, not consumers of it.
const sourceFiles = walk(srcRoot).filter(
  (file) => !file.replaceAll("\\", "/").includes("/src/i18n/locales/")
);

const zhKeys = Object.keys(zhCN);
const enKeys = Object.keys(enUS);
const mobileZhKeys = Object.keys(mobileCopy["zh-CN"]);
const mobileEnKeys = Object.keys(mobileCopy["en-US"]);

type Reference = { file: string; key: string };

function collect(pattern: RegExp, group = 1): Reference[] {
  const references: Reference[] = [];
  for (const absolute of sourceFiles) {
    const file = relative(projectRoot, absolute).replaceAll("\\", "/");
    const source = readFileSync(absolute, "utf8");
    for (const match of source.matchAll(pattern)) {
      references.push({ file, key: match[group] });
    }
  }
  return references;
}

const literalKeys = collect(/\bt\??\.?\(\s*"([^"]+)"/g);
const templateKeys = collect(/\bt\??\.?\(\s*`([^`]*)`/g)
  .map((reference) => ({ ...reference, key: reference.key.split("${")[0] }))
  .filter((reference) => reference.key.length > 0);
const mobileKeys = collect(/\bmobileText\(\s*[^,)]+,\s*"([^"]+)"/g);

test("both locales carry the same translation keys", () => {
  expect(enKeys.filter((key) => !zhKeys.includes(key)).sort()).toEqual([]);
  expect(zhKeys.filter((key) => !enKeys.includes(key)).sort()).toEqual([]);
});

test("both mobile copy layers carry the same keys", () => {
  expect(mobileEnKeys.filter((key) => !mobileZhKeys.includes(key)).sort()).toEqual([]);
  expect(mobileZhKeys.filter((key) => !mobileEnKeys.includes(key)).sort()).toEqual([]);
});

test("every referenced translation key exists in both locales", () => {
  const violations = literalKeys
    .filter(({ key }) => !zhKeys.includes(key) || !enKeys.includes(key))
    .map(({ file, key }) => `${file}: ${key}`);
  expect([...new Set(violations)].sort()).toEqual([]);
});

test("every dynamic translation key family exists in both locales", () => {
  const violations = templateKeys
    .filter(
      ({ key }) =>
        !zhKeys.some((name) => name.startsWith(key)) ||
        !enKeys.some((name) => name.startsWith(key))
    )
    .map(({ file, key }) => `${file}: ${key}*`);
  expect([...new Set(violations)].sort()).toEqual([]);
});

test("every referenced mobile copy key exists in both mobile locales", () => {
  const violations = mobileKeys
    .filter(({ key }) => !mobileZhKeys.includes(key) || !mobileEnKeys.includes(key))
    .map(({ file, key }) => `${file}: ${key}`);
  expect([...new Set(violations)].sort()).toEqual([]);
});
