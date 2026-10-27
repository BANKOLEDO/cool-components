import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { type Command } from "./commands";
import CommandPalette from "./palette/CommandPalette";

interface LogEntry {
  id: number;
  kind: string;
  title: string;
  at: string;
  command: Command;
}

export default function App() {
  const [open, setOpen] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback((command: Command) => {
    setLog((current) => [
      {
        id: Date.now(),
        kind: command.kind,
        title: command.title,
        at: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        command,
      },
      ...current.slice(0, 4),
    ]);
  }, []);

  const last = log[0];

  return (
    <div className="app" id="app-root">
      <AnimatePresence>
        {open ? (
          <CommandPalette
            key="palette"
            log={log}
            onRun={run}
            onClose={() => setOpen(false)}
          />
        ) : (
          <motion.div
            key="dock"
            className="dock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            data-testid="dock"
          >
            <span className="dock-ghost" aria-hidden="true">⌘K</span>
            <div className="dock-card">
              <div className="dock-head">
                <span className="dock-mark" aria-hidden="true">◆</span>
                <span className="dock-name">fuzzy ghost</span>
                <kbd className="dock-k">⌘K</kbd>
              </div>
              <div className="dock-body">
                <span className="dock-title">Nothing open yet</span>
                <span className="dock-sub s">
                  The palette is one keystroke away, whenever you need it.
                </span>
                {last ? (
                  <button
                    type="button"
                    className="dock-last"
                    title="Open the palette on this"
                    onClick={() => setOpen(true)}
                  >
                    <span className="faint s">last opened</span>
                    <span className="dock-last-row">
                      <span className="dock-last-title">{last.title}</span>
                      <span className="faint s">{last.at}</span>
                    </span>
                  </button>
                ) : null}
              </div>
              <div className="dock-foot">
                <button
                  type="button"
                  className="open-btn"
                  data-testid="open-palette"
                  onClick={() => setOpen(true)}
                >
                  <kbd>⌘</kbd>
                  <kbd>K</kbd>
                  <span>Open the palette</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
