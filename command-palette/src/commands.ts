export type CommandKind = "Nav" | "Action" | "File" | "Snippet";

export type CommandPreview =
  | { type: "file"; path: string; lines: string[]; note: string }
  | { type: "nav"; path: string[]; note: string }
  | { type: "action"; steps: string[]; note: string }
  | { type: "snippet"; body: string[]; note: string };

export interface Command {
  id: string;
  kind: CommandKind;
  title: string;
  hint?: string;
  meta?: string;
  keywords?: string;
  preview: CommandPreview;
}

export const COMMANDS: Command[] = [
  {
    id: "nav-billing",
    kind: "Nav",
    title: "Billing & invoices",
    hint: "G B",
    meta: "workspace/account",
    keywords: "settings payments plans stripe",
    preview: {
      type: "nav",
      path: ["Workspace", "Account", "Billing"],
      note: "Opens the billing tab with plans pinned",
    },
  },
  {
    id: "nav-inbox",
    kind: "Nav",
    title: "Inbox · Unread",
    hint: "G I",
    meta: "3 unread",
    keywords: "messages notifications feed mail",
    preview: {
      type: "nav",
      path: ["Inbox", "Unread"],
      note: "Filter preset stays after visiting",
    },
  },
  {
    id: "nav-project",
    kind: "Nav",
    title: "Switch project → ghost-cmd",
    hint: "⌘ P",
    meta: "last opened 2 h ago",
    keywords: "project workspace switcher recent",
    preview: {
      type: "nav",
      path: ["Projects", "ghost-cmd"],
      note: "Sidebar selection follows",
    },
  },
  {
    id: "nav-members",
    kind: "Nav",
    title: "Team members",
    hint: "G M",
    meta: "8 seats",
    keywords: "team people invite roles rights",
    preview: {
      type: "nav",
      path: ["Team", "Members"],
      note: "Opens sorted by last active",
    },
  },
  {
    id: "nav-history",
    kind: "Nav",
    title: "History · Yesterday",
    hint: "⌘ ⇧ H",
    meta: "47 edits",
    keywords: "versions undo timeline changelog diff",
    preview: {
      type: "nav",
      path: ["History", "Yesterday"],
      note: "Groups edits per file",
    },
  },
  {
    id: "act-deploy",
    kind: "Action",
    title: "Deploy preview",
    hint: "⌘ ⇧ U",
    meta: "branch ghost/fuzzy-ghost",
    keywords: "ship release publish netlify vercel upload",
    preview: {
      type: "action",
      steps: [
        "typecheck: 4.1 s (last run)",
        "vite build: 6.8 s",
        "upload 9 assets",
        "flip pointer ghost-cmd → preview",
      ],
      note: "≈ 18 s · rolls back with one ↓",
    },
  },
  {
    id: "act-typecheck",
    kind: "Action",
    title: "Run typecheck",
    hint: "⌘ T",
    meta: "strict, noUnusedLocals",
    keywords: "tsc typescript lint check test",
    preview: {
      type: "action",
      steps: [
        "tsc --noEmit",
        "watch mode? hold ⇧ while running",
        "opens Problems on failure",
      ],
      note: "≈ 4 s · results inline",
    },
  },
  {
    id: "act-branch",
    kind: "Action",
    title: "Copy branch name",
    hint: "⌘ ⇧ C",
    meta: "ghost/fuzzy-ghost",
    keywords: "clipboard git branch pr",
    preview: {
      type: "action",
      steps: [
        "read current branch",
        "write to clipboard",
        "toast 'copied ghost/fuzzy-ghost'",
      ],
      note: "No confirmation needed",
    },
  },
  {
    id: "act-lock",
    kind: "Action",
    title: "Lock session",
    hint: "⌘ L",
    meta: "requires re-auth",
    keywords: "secure privacy password protect",
    preview: {
      type: "action",
      steps: [
        "freeze input",
        "wipe preview pane cache",
        "screen → lock overlay",
      ],
      note: "⇧ unloads tabs silently",
    },
  },
  {
    id: "act-softmode",
    kind: "Action",
    title: "Toggle focus mode",
    hint: "⌘ .",
    meta: "dims sidebar",
    keywords: "concentrate dim zen quiet focus",
    preview: {
      type: "action",
      steps: [
        "sidebar opacity → 0.3",
        "margins widen",
        "toast 'focus on'",
      ],
      note: "State persists per device",
    },
  },
  {
    id: "act-clearcache",
    kind: "Action",
    title: "Clear preview cache",
    hint: "⌥ ⌘ K",
    meta: "12 entries · 4.2 MB",
    keywords: "reset purge evict storage",
    preview: {
      type: "action",
      steps: [
        "list cached previews",
        "evict all 12",
        "rebuild on next open",
      ],
      note: "Slow next open by ~300 ms",
    },
  },
  {
    id: "file-fuzzy",
    kind: "File",
    title: "fuzzy.ts",
    hint: "↵ open",
    meta: "112 lines · edited 4 min ago",
    keywords: "score match lev distance algorithm search ghost",
    preview: {
      type: "file",
      path: "src/palette/fuzzy.ts",
      lines: [
        "export function fuzzyScore(text, query) {",
        "  const t = text.toLowerCase();",
        "  let score = 0, prev = -2;",
        "  for (const [i, ch] of [...query].entries()) {",
        "    const pos = t.indexOf(ch, searchFrom);",
        "    if (pos === -1) return null;",
        "    score += bonus(pos, prev, t, text);",
        "  }",
        "  return { score, indices };",
        "}",
      ],
      note: "Finds longest cheap subsequence",
    },
  },
  {
    id: "file-palette",
    kind: "File",
    title: "CommandPalette.tsx",
    meta: "926 lines · edited now",
    keywords: "component list preview keyboard pill",
    preview: {
      type: "file",
      path: "src/palette/CommandPalette.tsx",
      lines: [
        "const pill = usePillPosition(rowsRef, [activeId]);",
        "<motion.div animate={pill} className='pill' />",
        "preview.style.clean();",
        "{results.map((cmd, i) => (",
        "  <Row key={cmd.id + query} delay={i * 0.012} />",
        "))}",
      ],
      note: "Pill springs, rows stagger 12 ms",
    },
  },
  {
    id: "file-css",
    kind: "File",
    title: "palette.css",
    meta: "640 lines · edited 1 h ago",
    keywords: "styles flat sheet tokens paper ink",
    preview: {
      type: "file",
      path: "src/styles/palette.css",
      lines: [
        ":root {",
        "  --paper: #fdfbf5;",
        "  --ink: #171a17;",
        "  --accent: #f04e23;",
        "}",
        "",
        ".row-highlight { color: var(--accent); }",
      ],
      note: "One flat token set, zero gradients",
    },
  },
  {
    id: "file-app",
    kind: "File",
    title: "App.tsx",
    meta: "204 lines · edited 26 min ago",
    keywords: "entry shell backdrop kbd shortcut",
    preview: {
      type: "file",
      path: "src/App.tsx",
      lines: [
        "useHotkey('mod+k', () => setOpen(v => !v));",
        "<Backdrop log={log} />",
        "<CommandPalette open onRun={push} />",
        "…",
      ],
      note: "Bootstraps hotkey + activity feed",
    },
  },
  {
    id: "snippet-license",
    kind: "Snippet",
    title: "Insert MIT header",
    hint: "S 1",
    meta: "8 lines · 2026",
    keywords: "license copyright legal comment header",
    preview: {
      type: "snippet",
      body: [
        "// MIT License",
        "// Copyright (c) 2026 ghost-cmd",
        "",
        "// Permission is hereby granted, free of charge…",
      ],
      note: "Pastes at caret, keeps cursor",
    },
  },
  {
    id: "snippet-hook",
    kind: "Snippet",
    title: "useState hook template",
    hint: "S 2",
    meta: "12 lines",
    keywords: "react hooks state template boilerplate",
    preview: {
      type: "snippet",
      body: [
        "const [value, setValue] = useState(() => load());",
        "useEffect(() => save(value), [value]);",
        "return { value, set: setValue };",
      ],
      note: "Typed generics preserved",
    },
  },
  {
    id: "snippet-tsconfig",
    kind: "Snippet",
    title: "Strict tsconfig block",
    hint: "S 3",
    meta: "14 lines",
    keywords: "typescript config strict compiler options",
    preview: {
      type: "snippet",
      body: [
        '"strict": true,',
        '"noUnusedLocals": true,',
        '"noUncheckedIndexedAccess": true,',
      ],
      note: "Appends to nearest tsconfig",
    },
  },
  {
    id: "act-theme",
    kind: "Action",
    title: "Switch surface → Graphite",
    hint: "⌘ ⇧ D",
    meta: "2 themes",
    keywords: "theme dark light appearance graphite bone",
    preview: {
      type: "action",
      steps: [
        "tokens: paper → graphite,",
        "re-render preview only",
        "write UI preference",
      ],
      note: "Accent stays ember",
    },
  },
  {
    id: "nav-trash",
    kind: "Nav",
    title: "Trash",
    hint: "G T",
    meta: "keeps 30 days",
    keywords: "deleted bin restore waste",
    preview: {
      type: "nav",
      path: ["Library", "Trash"],
      note: "Shift-click restores",
    },
  },
  {
    id: "file-cmds",
    kind: "File",
    title: "commands.ts",
    meta: "310 lines · edited 3 h ago",
    keywords: "registry dataset items preview steps",
    preview: {
      type: "file",
      path: "src/commands.ts",
      lines: [
        "export const COMMANDS: Command[] = [",
        "  { id: 'act-deploy', kind: 'Action', … },",
        "  …22 registered",
        "];",
      ],
      note: "Single registry for demo",
    },
  },
  {
    id: "act-findref",
    kind: "Action",
    title: "Find references",
    hint: "⇧ ⏎",
    meta: "on selection",
    keywords: "refs usages rename symbol search",
    preview: {
      type: "action",
      steps: [
        "capture current word",
        "query symbol index",
        "list 6 hits → preview pane",
      ],
      note: "Preview fills before commit",
    },
  },
];
