import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const uiRoot = join(projectRoot, "src/ui");

const STATE_CLASS = /^(is|has)-/;
const LITERALS_THAT_ARE_NOT_CLASSES = new Set([
  "agent",
  "all",
  "blocked",
  "dark",
  "en-US",
  "favorites",
  "light",
  "zh-CN",
]);

const REQUIRED_SELECTORS = [
  "mobile-app",
  "mobile-topbar",
  "mobile-main",
  "mobile-dock",
  "mobile-sheet-host",
  "mobile-sheet",
  "mobile-transport",
  "desk",
  "desk-nav",
  "desk-header",
  "desk-stage",
  "desk-sessions",
  "desk-transport",
];

const REQUIRED_TOKENS = [
  "q-bg",
  "q-surface",
  "q-sunken",
  "q-text",
  "q-text-muted",
  "q-text-faint",
  "q-border",
  "q-control",
  "q-accent",
  "q-accent-strong",
  "q-accent-ink",
  "q-accent-soft",
  "q-selected",
  "q-success",
  "q-warning",
  "q-danger",
  "q-focus",
  "q-scrim",
];

const FORBIDDEN_CSS_PATTERNS = [
  { pattern: /backdrop-filter/, label: "backdrop-filter" },
  { pattern: /-gradient\(/, label: "gradient" },
  { pattern: /#[0-9a-f]{3,8}\b/i, label: "bare hex colour" },
  { pattern: /\brgba?\(/, label: "raw rgb colour" },
  { pattern: /\bhsla?\(/, label: "raw hsl colour" },
  { pattern: /text-transform:\s*uppercase/, label: "uppercase text" },
];

const DECORATIVE_CLASSES = [
  "weather-hero-card__orb",
  "weather-hero-card__ring",
  "weather-hero-card__glass",
  "weather-hero-card__spark",
  "weather-scene",
  "weather-tilt",
  "audio-console__turntable",
  "audio-console__plinth",
  "audio-console__vinyl",
  "audio-console__backdrop",
  "audio-console__scrim",
  "audio-console__particle-ring",
];

// Deliberately generous: two shells, nine desktop workspaces and nine mobile
// views. DESIGN.md records the budget next to the token contract.
const CSS_LINE_BUDGET = 5200;

function walk(directory: string, extension: string, found: string[] = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path, extension, found);
    } else if (path.endsWith(extension)) {
      found.push(path);
    }
  }
  return found;
}

const cssFiles = [...walk(uiRoot, ".css"), join(projectRoot, "src/CSS/App.css")];
const cssSources = cssFiles.map((file) => ({
  file: relative(projectRoot, file).replaceAll("\\", "/"),
  text: readFileSync(file, "utf8"),
}));

// The MUI theme writes most of its styles inline, so the stylesheets alone
// cannot prove the flatness contract on their own.
const themeSources = [
  {
    file: "src/theme/AppThemeProvider.tsx",
    text: readFileSync(join(projectRoot, "src/theme/AppThemeProvider.tsx"), "utf8"),
  },
];

function stripCssNoise(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function stripComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// Stylesheets hide their string literals, but inline theme styles carry their
// colours inside strings, so only comments are removed there.
const styleSources = [
  ...cssSources.map((source) => ({ ...source, code: stripCssNoise(source.text) })),
  ...themeSources.map((source) => ({ ...source, code: stripComments(source.text) })),
];

const classDefinitions = new Map<string, string>();
for (const { file, text } of cssSources) {
  for (const match of stripCssNoise(text).matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
    if (!classDefinitions.has(match[1])) {
      classDefinitions.set(match[1], file);
    }
  }
}

const tsxFiles = walk(join(projectRoot, "src"), ".tsx").filter(
  (file) => !file.endsWith(".test.tsx")
);

function balanced(source: string, start: number, open: string, close: string) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === open) {
      depth += 1;
    } else if (source[index] === close) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start + 1, index);
      }
    }
  }
  return "";
}

type ClassUse = { file: string; value: string; dynamic: boolean };

function splitTemplate(template: string) {
  const pieces: Array<{ text: string; dynamic: boolean }> = [];
  let index = 0;
  while (index < template.length) {
    const start = template.indexOf("${", index);
    if (start === -1) {
      pieces.push({ text: template.slice(index), dynamic: false });
      break;
    }
    pieces.push({ text: template.slice(index, start), dynamic: false });
    let depth = 0;
    let end = start;
    for (; end < template.length; end += 1) {
      if (template[end] === "{") {
        depth += 1;
      } else if (template[end] === "}") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    pieces.push({ text: template.slice(start + 1, end), dynamic: true });
    index = end + 1;
  }
  return pieces;
}

function addQuotedLiterals(expression: string, uses: ClassUse[], file: string) {
  for (const match of expression.matchAll(/"([^"]*)"/g)) {
    uses.push({ file, value: match[1], dynamic: false });
  }
  for (const match of expression.matchAll(/'([^']*)'/g)) {
    uses.push({ file, value: match[1], dynamic: false });
  }
}

function collectExpression(expression: string, uses: ClassUse[], file: string) {
  for (const raw of expression.match(/`[^`]*`/g) ?? []) {
    const template = raw.slice(1, -1);
    const pieces = splitTemplate(template);
    if (!pieces.some((piece) => piece.dynamic)) {
      uses.push({ file, value: template, dynamic: false });
      continue;
    }
    const pattern = pieces
      .map((piece) => {
        if (piece.dynamic) {
          addQuotedLiterals(piece.text, uses, file);
          return "\u0000";
        }
        return piece.text;
      })
      .join("");
    uses.push({ file, value: pattern, dynamic: true });
  }
  addQuotedLiterals(expression.replace(/`[^`]*`/g, '""'), uses, file);
}

function collectTsxClassUses() {
  const uses: ClassUse[] = [];
  for (const absolute of tsxFiles) {
    const file = relative(projectRoot, absolute).replaceAll("\\", "/");
    const source = readFileSync(absolute, "utf8");
    for (const match of source.matchAll(/className\s*[:=]\s*/g)) {
      const start = match.index + match[0].length;
      const first = source[start];
      if (first === '"' || first === "'") {
        const end = source.indexOf(first, start + 1);
        uses.push({ file, value: source.slice(start + 1, end), dynamic: false });
      } else if (first === "{") {
        collectExpression(balanced(source, start, "{", "}"), uses, file);
      } else if (first === "`") {
        const end = source.indexOf("`", start + 1);
        collectExpression(source.slice(start, end + 1), uses, file);
      }
    }
    for (const match of source.matchAll(/joinClassNames\(/g)) {
      const start = match.index + match[0].length - 1;
      collectExpression(balanced(source, start, "(", ")"), uses, file);
    }
  }
  return uses;
}

function isDefined(className: string) {
  if (classDefinitions.has(className)) {
    return true;
  }
  for (const defined of classDefinitions.keys()) {
    if (defined.startsWith(`${className}__`)) {
      return true;
    }
  }
  return false;
}

function isIgnoredLiteral(className: string) {
  return (
    LITERALS_THAT_ARE_NOT_CLASSES.has(className) ||
    STATE_CLASS.test(className) ||
    className.includes("${") ||
    className === "\u0000"
  );
}

function patternSource(token: string) {
  return token
    .split("\u0000")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\w-]+");
}

test("every structural class used by TSX is defined in the stylesheet", () => {
  const violations: string[] = [];
  for (const use of collectTsxClassUses()) {
    for (const token of use.value.split(/\s+/).filter(Boolean)) {
      if (token.includes("\u0000")) {
        const pattern = new RegExp(`^${patternSource(token)}$`);
        if (![...classDefinitions.keys()].some((name) => pattern.test(name))) {
          violations.push(`${use.file}: ${token.replaceAll("\u0000", "*")} has no match`);
        }
        continue;
      }
      const className = token;
      if (!className || !/^[a-zA-Z_][\w-]*$/.test(className) || isIgnoredLiteral(className)) {
        continue;
      }
      if (!isDefined(className)) {
        violations.push(`${use.file}: .${className} is not defined`);
      }
    }
  }
  expect([...new Set(violations)].sort()).toEqual([]);
});

test("the shells keep their required selectors and tokens", () => {
  for (const selector of REQUIRED_SELECTORS) {
    expect(classDefinitions.has(selector), `.${selector} is missing`).toBe(true);
  }
  const tokensCss = readFileSync(join(uiRoot, "tokens.css"), "utf8");
  for (const token of REQUIRED_TOKENS) {
    expect(tokensCss.includes(`--${token}:`), `--${token} is missing`).toBe(true);
  }
});

test("the mobile shell locks the scroller while a sheet is open", () => {
  const shellCss = readFileSync(join(uiRoot, "mobile/shell.css"), "utf8");
  const rule = shellCss.match(
    /\.mobile-app:has\(\.mobile-sheet-host\)\s+\.mobile-main\s*{[^}]*}/
  );
  expect(rule, "the shell must lock .mobile-main while a sheet is open").not.toBeNull();
  expect(rule![0]).toMatch(/overflow:\s*hidden/);
});

test("styles stay flat: no backdrop filters, gradients or raw colours", () => {
  for (const { file, code } of styleSources) {
    for (const { pattern, label } of FORBIDDEN_CSS_PATTERNS) {
      expect(pattern.test(code), `${file} uses ${label}`).toBe(false);
    }
  }
});

test("every --q-* variable used by CSS is defined", () => {
  const tokensCss = readFileSync(join(uiRoot, "tokens.css"), "utf8");
  const defined = new Set(
    [...tokensCss.matchAll(/--(q-[\w-]+)\s*:/g)].map((match) => match[1])
  );
  const missing = new Map<string, Set<string>>();
  for (const { file, text } of [...cssSources, ...themeSources]) {
    for (const match of text.matchAll(/var\(--(q-[\w-]+)/g)) {
      if (defined.has(match[1])) {
        continue;
      }
      if (!missing.has(match[1])) {
        missing.set(match[1], new Set());
      }
      missing.get(match[1])!.add(file);
    }
  }
  expect(
    [...missing.entries()].map(([token, files]) => `--${token} (${[...files].join(", ")})`)
  ).toEqual([]);
});

test("decorative layers stay deleted", () => {
  const sources = [
    ...cssSources,
    ...tsxFiles.map((absolute) => ({
      file: relative(projectRoot, absolute).replaceAll("\\", "/"),
      text: readFileSync(absolute, "utf8"),
    })),
  ];
  for (const className of DECORATIVE_CLASSES) {
    for (const { file, text } of sources) {
      expect(text.includes(className), `${file} reintroduced ${className}`).toBe(false);
    }
  }
});

test("the stylesheet stays within the documented budget", () => {
  const total = cssSources.reduce(
    (sum, { text }) => sum + text.split(/\r?\n/).filter((line) => line.trim()).length,
    0
  );
  expect(total).toBeLessThanOrEqual(CSS_LINE_BUDGET);
});
