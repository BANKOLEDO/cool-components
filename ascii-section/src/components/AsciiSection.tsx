import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import BrandMark from "./BrandMark";
import Feature from "./Feature";
import KnotFigure from "./KnotFigure";
import ShaderDome from "./ShaderDome";

const STACK = ["GLSL", "WebGL", "three.js", "React", "Vite"];

export default function AsciiSection() {
  const [playing, setPlaying] = useState(true);
  const [fastLabel, setFastLabel] = useState(60);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  const toggle = () => {
    if (reduced) {
      return;
    }

    setPlaying((current) => !current);
  };

  const onDomeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  const stateLabel = reduced ? "static" : playing ? "live" : "paused";
  const playLabel = playing ? "Pause the field" : "Resume the field";

  return (
    <div className="panel" id="top">
      <nav className="nav">
        <BrandMark />
        <div className="nav-links">
          <a href="#field">field</a>
          <a href="#stack">stack</a>
          <a href="#method">method</a>
          <a href="#figures">figures</a>
        </div>
        <div className="nav-actions">
          <a className="nav-link" href="#method">
            how it works
          </a>
          <a className="nav-action" href="#field">
            open the field
          </a>
        </div>
      </nav>

      <header className="hero">
        <span className="hero-badge">
          <i aria-hidden="true" />
          live field · one shader
        </span>

        <h1 className="display">
          An arc drawn <span className="display-accent">entirely by light.</span>
        </h1>

        <p className="hero-sub">
          A fragment shader draws the rim of a half sphere as a field of dots.
          One draw call, no mesh, no sprites. Point at it to move a third light.
        </p>

        <div className="cta-row">
          <a className="cta-primary" href="#field">
            Move the light
          </a>
          <a className="cta-secondary" href="#method">
            How it works
          </a>
        </div>
      </header>

      <div className="stage" id="field">
        <i className="tick" aria-hidden="true" data-pos="tl" />
        <i className="tick" aria-hidden="true" data-pos="tr" />
        <i className="tick" aria-hidden="true" data-pos="bl" />
        <i className="tick" aria-hidden="true" data-pos="br" />

        <div className="stage-bar">
          <span className="stage-label">field.dome</span>
          <span className="chip" data-testid="field-state" data-state={stateLabel}>
            {stateLabel}
          </span>
        </div>

        <div
          className="dome-wrap"
          onClick={toggle}
          onKeyDown={onDomeKey}
          role="button"
          tabIndex={0}
          aria-label={playLabel}
          title={playLabel}
        >
          <ShaderDome playing={playing} onFps={setFastLabel} />

          <div className="glass">
            <div className="glass-top">
              <span className="glass-label">field.dome</span>
              <span className="glass-live">{stateLabel}</span>
            </div>
            <p className="glass-line">
              The rim of a half sphere, three lights, one dot per cell.
            </p>
            <div className="glass-bottom">
              <div className="glass-tags">
                <span>96 columns</span>
                <span>3 lights</span>
                <span>1 draw call</span>
              </div>
              <button
                className="glass-play"
                data-testid="toggle-spin"
                aria-label={playLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
              >
                {playing ? "❚❚" : "▶"}
              </button>
            </div>
          </div>
        </div>

        <div className="stage-foot">
          <span>96 columns · one draw call</span>
          <span>{fastLabel} fps measured</span>
        </div>
      </div>

      <div className="stack" id="stack">
        <span className="stack-label">built with</span>
        {STACK.map((tool) => (
          <span className="stack-item" key={tool}>
            {tool}
          </span>
        ))}
      </div>

      <ul className="features">
        <Feature title="Runs on the GPU">
          the arc is a fragment shader. Every cell measures its distance to the
          same rim, so there is no mesh to load.
        </Feature>
        <Feature title="Cursor as a light">
          point anywhere and a third light follows. Click the stage or press
          Enter to freeze the frame.
        </Feature>
        <Feature title="Measured, not claimed">
          the frame rate above is timed in the browser every half second.
          Nothing is hardcoded.
        </Feature>
      </ul>

      <div className="flow" id="method">
        <div className="flow-item">
          <strong>Trace the rim</strong>
          <p>
            Each cell checks its distance to one half circle. Only the cells
            near the rim draw a dot.
          </p>
        </div>
        <div className="flow-item">
          <strong>Light the rim</strong>
          <p>
            A frontal key, a fill lifting the base, the cursor adds a third.
            The band bends and thins where it likes.
          </p>
        </div>
        <div className="flow-item">
          <strong>Plot the dot</strong>
          <p>
            Luminance sets dot size and ink. The GPU draws the whole arc in one
            call.
          </p>
        </div>
      </div>

      <section className="figures" id="figures">
        <div className="section-head">
          <span className="section-eyebrow">[ comparison ]</span>
          <h2 className="section-title">Two point fields.</h2>
          <p className="section-copy">
            An analytic arc and a sampled mesh, drawn the same way: one dot per
            sample.
          </p>
        </div>

        <div className="figure-grid">
          <article className="figure-card">
            <div className="figure-head">
              <strong className="figure-title">field.arc</strong>
              <span className="figure-kind">shader · still</span>
            </div>
            <div className="figure-view">
              <div className="figure-dome" data-testid="figure-arc">
                <ShaderDome playing={false} />
              </div>
            </div>
            <div className="figure-caption">
              <span className="figure-claim">Analytic rim</span>
              <p className="figure-body">
                The hero shader, frozen mid-frame. Every dot sits on the band.
              </p>
            </div>
          </article>

          <article className="figure-card">
            <div className="figure-head">
              <strong className="figure-title">structure.knot</strong>
              <span className="figure-kind">three.js · points</span>
            </div>
            <div className="figure-view">
              <KnotFigure />
            </div>
            <div className="figure-caption">
              <span className="figure-claim">Sampled mesh</span>
              <p className="figure-body">
                A torus knot's vertices plotted as points with baked shading.
                Click to pause it.
              </p>
            </div>
          </article>
        </div>
      </section>

      <footer className="footer">
        <BrandMark />
        <div className="footer-links">
          <a href="#field">field</a>
          <a href="#method">method</a>
          <a href="#figures">figures</a>
          <span>© 2026 imaginery</span>
        </div>
      </footer>
    </div>
  );
}
