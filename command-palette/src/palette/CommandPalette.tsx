import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Fragment } from "react";
import { COMMANDS, type Command } from "../commands";
import { editDistance, fuzzyScore } from "./fuzzy";

interface ScoredCommand {
  command: Command;
  score: number;
  indices: number[];
}

interface GhostCandidate {
  command: Command;
  distance: number;
}

interface PaletteProps {
  log: Array<{ id: number; kind: string; title: string; at: string; command: Command }>;
  onRun: (command: Command) => void;
  onClose: () => void;
}

const ROW_DELAY = 0.012;
const CHAR_DELAY = 0.02;

const KINDS = ["All", "Nav", "Action", "File", "Snippet"] as const;
type Kind = (typeof KINDS)[number];

function KindIcon({ kind, size = 14 }: { kind: string; size?: number }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "Nav" ? (
        <>
          <path d="M8 14.2s-4.6-3.9-4.6-7.4a4.6 4.6 0 1 1 9.2 0C12.6 10.3 8 14.2 8 14.2Z" {...stroke} />
          <circle cx="8" cy="6.7" r="1.7" {...stroke} />
        </>
      ) : null}
      {kind === "Action" ? (
        <path d="M8.9 1.8 3.4 9.3h3.4l-.7 4.9 5.5-7.5H8.2l.7-4.9Z" {...stroke} />
      ) : null}
      {kind === "File" ? (
        <>
          <path d="M4.4 1.9h4.9l3.3 3.3v8.9H4.4V1.9Z" {...stroke} />
          <path d="M9.2 2v3.3h3.3" {...stroke} />
        </>
      ) : null}
      {kind === "Snippet" ? (
        <>
          <path d="m5.7 5-2.9 3 2.9 3" {...stroke} />
          <path d="m10.3 5 2.9 3-2.9 3" {...stroke} />
        </>
      ) : null}
    </svg>
  );
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  const set = useMemo(() => new Set(indices), [indices]);
  const order = new Map<number, number>();
  let ordinal = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (set.has(i)) {
      order.set(i, ordinal);
      ordinal += 1;
    }
  }

  return (
    <>
      {[...text].map((ch, i) =>
        set.has(i) ? (
          <span
            key={i}
            className="hl"
            style={{ animationDelay: `${(order.get(i) ?? 0) * CHAR_DELAY}s` }}
          >
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </>
  );
}

function Preview({ command }: { command: Command }) {
  const file = command.preview.type === "file" ? command.preview : null;
  const nav = command.preview.type === "nav" ? command.preview : null;
  const action = command.preview.type === "action" ? command.preview : null;
  const snippet = command.preview.type === "snippet" ? command.preview : null;

  return (
    <motion.div
      className="pane-body"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
    >
      {file ? (
        <div className="block">
          <span className="block-label">In this file</span>
          <div className="code" role="figure" aria-label={`${file.path} preview`}>
            <div className="code-path mono s">{file.path}</div>
            {file.lines.map((line, i) => (
              <div className="code-line" key={i}>
                <span className="code-no">{i + 1}</span>
                <span className="code-text">{line}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {nav ? (
        <div className="block">
          <span className="block-label">The path it takes</span>
          <div className="route">
            {nav.path.map((seg, i) => (
              <Fragment key={seg}>
                {i > 0 ? (
                  <span className="route-arrow" aria-hidden="true">
                    →
                  </span>
                ) : null}
                <span
                  className={i === nav.path.length - 1 ? "route-node route-node-end" : "route-node"}
                >
                  {i === nav.path.length - 1 ? (
                    <i className="route-dot" aria-hidden="true" />
                  ) : null}
                  {seg}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}

      {action ? (
        <div className="block">
          <span className="block-label">What happens, in order</span>
          <ol className="steps">
            {action.steps.map((step, i) => (
              <li key={step}>
                <span className="step-no">{i + 1}</span>
                <span className="step-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {snippet ? (
        <div className="block">
          <span className="block-label">What gets pasted</span>
          <pre className="snippet">
            {snippet.body.map((line, i) => (
              <span key={i}>{line + "\n"}</span>
            ))}
          </pre>
        </div>
      ) : null}

      <p className="block-note">{command.preview.note}</p>
    </motion.div>
  );
}

export default function CommandPalette({ log, onRun, onClose }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Kind>("All");
  const [active, setActive] = useState(0);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pillRef = useRef<HTMLDivElement>(null);

  const scored = useMemo<ScoredCommand[]>(() => {
    const q = query.trim();
    const hits: ScoredCommand[] = [];

    if (!q) {
      for (const command of COMMANDS) {
        hits.push({ command, score: 0, indices: [] });
      }
    } else {
      for (const command of COMMANDS) {
        const titleHit = fuzzyScore(command.title, q);

        if (titleHit) {
          hits.push({ command, score: titleHit.score + 6, indices: titleHit.indices });
          continue;
        }

        const keywordHit = command.keywords ? fuzzyScore(command.keywords, q) : null;

        if (keywordHit) {
          hits.push({ command, score: keywordHit.score, indices: [] });
        }
      }
      hits.sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title));
    }

    return hits;
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const filtered = useMemo(() => {
    if (filter === "All") {
      return scored;
    }

    return scored.filter((hit) => hit.command.kind === filter);
  }, [filter, scored]);

  useEffect(() => {
    setActive(0);
  }, [filter]);

  const ghosts = useMemo<GhostCandidate[]>(() => {
    const q = query.trim();

    if (!q || scored.length > 0) {
      return [];
    }

    return COMMANDS.map((command) => ({
      command,
      distance: editDistance(q, command.title),
    }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [query, scored.length]);

  const empty = query.trim().length > 0 && scored.length === 0;
  const candidate = empty ? ghosts[active] : filtered[active];
  const previewed = candidate ? candidate.command : null;

  const pick = useCallback(
    (delta: number) => {
      if (empty) {
        setActive((current) => Math.min(Math.max(current + delta, 0), ghosts.length - 1));
        return;
      }

      setActive((current) => {
        const next = current + delta;

        if (next < 0) {
          return filtered.length - 1;
        }

        if (next >= filtered.length) {
          return 0;
        }

        return next;
      });
    },
    [empty, ghosts.length, filtered.length],
  );

  const run = useCallback(
    (command: Command) => {
      onRun(command);
      onClose();
    },
    [onClose, onRun],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        pick(1);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        pick(-1);
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (previewed) {
          run(previewed);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pick, previewed, run]);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const row = rowRefs.current[active];

    if (!pill || !row) {
      return;
    }

    pill.animate(
      { top: `${row.offsetTop}px`, height: `${row.offsetHeight}px`, opacity: 1 },
      {
        duration: 150,
        easing: "cubic-bezier(.32,.72,0,1)",
        fill: "forwards",
      },
    );

    row.scrollIntoView({ block: "nearest" });
  }, [active, filtered, ghosts]);

  return (
    <motion.div
      className="palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      initial={{ opacity: 0, y: 14, scale: 0.988 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.988 }}
      transition={{ type: "spring", stiffness: 460, damping: 34 }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div className="palette-inner">
      <div className="palette-card">
      <div className="stage">
        <div className="head">
          <span className="glyph" aria-hidden="true">⌘</span>
          <div className="head-word">
            <span className="head-title">Command palette</span>
            <span className="head-sub s faint">
              search every action, file, and place in this workspace
            </span>
          </div>
          <div className="search">
            <svg
              className="search-glyph"
              width="15"
              height="15"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m10.4 10.4 3.4 3.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              className="field"
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you need?"
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
              data-testid="palette-input"
              name="palette-input"
            />
            {query ? (
              <button
                type="button"
                className="clear-btn"
                aria-label="Clear search"
                data-testid="clear-search"
                onClick={() => setQuery("")}
              >
                ✕
              </button>
            ) : null}
          </div>
          <span className="chip s" data-testid="palette-count" title="matching commands">
            {empty ? "no matches" : `${filtered.length} of ${scored.length} commands`}
          </span>
        </div>

      <nav className="kinds" role="toolbar" aria-label="Filter by kind">
        {KINDS.map((kind) => {
            const count =
              kind === "All" ? scored.length : scored.filter((hit) => hit.command.kind === kind).length;

            return (
          <button
            key={kind}
            type="button"
            className="kind-btn"
            data-testid="kind-rail-btn"
            data-kind={kind}
            data-active={filter === kind ? "true" : "false"}
            onClick={() => setFilter(kind)}
          >
            <span className="kind-label">
              {kind === "All"
                ? "Everything"
                : kind === "Nav"
                  ? "Places"
                  : kind === "Action"
                    ? "Actions"
                    : kind === "File"
                      ? "Files"
                      : "Snippets"}
            </span>
            <span className="kind-count">{count}</span>
          </button>
        );
      })}
      </nav>

        <div className="main">
          <div
            className="list"
            role="listbox"
            aria-label="Commands"
            data-testid="palette-list"
          >
            <div className="pill" ref={pillRef} style={{ opacity: 0 }} aria-hidden="true" />

            {filtered.map((hit, i) => (
              <motion.button
                key={`${filter}-${query}-${hit.command.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                ref={(node) => {
                  rowRefs.current[i] = node;
                }}
                data-testid="palette-row"
                data-idx={i}
                data-active={i === active ? "true" : "false"}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(hit.command)}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * ROW_DELAY, duration: 0.16, ease: "easeOut" }}
              >
                <span className="ico" aria-hidden="true">
                  <KindIcon kind={hit.command.kind} />
                </span>
                <span className="title">
                  <Highlight text={hit.command.title} indices={hit.indices} />
                </span>
                <span className="kind">{hit.command.kind}</span>
                {hit.command.hint ? <kbd>{hit.command.hint}</kbd> : null}
              </motion.button>
            ))}

            {filtered.length === 0 && !empty ? (
              <div className="list-empty s" data-testid="list-empty">
                No {filter === "All" ? "commands" : filter === "Nav" ? "places" : filter === "Action" ? "actions" : filter === "File" ? "files" : "snippets"} match this search.
                Try the Everything tab.
              </div>
            ) : null}

            {empty ? (
              <>
                <div className="ghost-label" data-testid="ghost-label">
                  No match. The closest finds:
                </div>
                {ghosts.map((ghost, i) => (
                  <motion.button
                    key={`${query}-ghost-${ghost.command.id}`}
                    type="button"
                    role="option"
                    className="ghost-row"
                    data-testid="ghost-row"
                    data-idx={i}
                    data-active={i === active ? "true" : "false"}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(ghost.command)}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * ROW_DELAY, duration: 0.16, ease: "easeOut" }}
                  >
                    <span className="ico ico-ghost" aria-hidden="true">?</span>
                    <span className="title">{ghost.command.title}</span>
                    <span className="delta" data-testid="ghost-distance" title="edit distance">
                      off by {ghost.distance}
                    </span>
                  </motion.button>
                ))}
              </>
            ) : null}
          </div>

          <aside className="pane">
            <div className="pane-inner">
              <div className="pane-head">
                <span className="pane-flag s">What opens on Enter</span>
                {previewed ? (
                  <>
                    <span className="pane-title">{previewed.title}</span>
                    <span
                      className="pane-pos s"
                      data-testid="pane-pos"
                      title="position in the list"
                    >
                      selected {(active ?? 0) + 1} of {(empty ? ghosts : filtered).length}
                    </span>
                  </>
                ) : (
                  <span className="pane-title faint">nothing selected yet</span>
                )}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {previewed ? (
                  <Preview key={previewed.id} command={previewed} />
                ) : null}
              </AnimatePresence>

            </div>
          </aside>
        </div>

        <div className="feed" data-testid="runs-feed">
          <span className="feed-flag s">
            Recent
            {log.length > 0 ? <span className="feed-count">{log.length}</span> : null}
          </span>
          {log.length === 0 ? (
            <span className="feed-empty s">No runs yet</span>
          ) : (
            log.map((entry) => (
              <button
                type="button"
                className="feed-row"
                key={entry.id}
                data-testid="activity-row"
                title="Run this again"
                onClick={() => run(entry.command)}
              >
                <span className="feed-kind">
                  <KindIcon kind={entry.kind} size={10} />
                </span>
                <span className="feed-title">{entry.title}</span>
                <span className="feed-at s faint">{entry.at}</span>
              </button>
            ))
          )}
        </div>
      </div>
      </div>
      </div>
    </motion.div>
  );
}
