import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const WIDTH = 320;
const HEIGHT = 213;

function dotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.95)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

export default function KnotFigure() {
  const viewRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef(true);
  const [spinning, setSpinning] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor(0x000000, 0);
    view.appendChild(renderer.domElement);
    renderer.domElement.classList.add("knot-canvas");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.1, 20);
    camera.position.set(0, 0.55, 3.1);

    const geometry = new THREE.TorusKnotGeometry(1, 0.27, 180, 40);

    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const colors = new Float32Array(position.count * 3);

    const ink = new THREE.Color("#101a33");
    const brand = new THREE.Color("#2f6bff");
    const color = new THREE.Color();

    for (let i = 0; i < position.count; i += 1) {
      const facing = Math.max(0, normal.getZ(i)) * 0.7 + Math.max(0, normal.getY(i)) * 0.3;
      color.copy(ink).lerp(brand, Math.pow(facing, 2.2));

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const sprite = dotTexture();

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      depthWrite: true,
      sizeAttenuation: true,
      map: sprite ?? undefined,
      alphaTest: 0.02,
    });

    const knot = new THREE.Points(geometry, material);
    knot.rotation.x = 0.32;
    scene.add(knot);

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (spinRef.current && !reduced) {
        knot.rotation.y += dt * 0.55;
        knot.rotation.x = 0.32 + Math.sin(now * 0.00045) * 0.18;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    renderer.render(scene, camera);

    if (!reduced) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      knot.geometry.dispose();
      material.dispose();
      sprite?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduced]);

  const activate = () => {
    if (reduced) {
      return;
    }

    setSpinning((current) => {
      spinRef.current = !current;
      return !current;
    });
  };

  const stateLabel = reduced ? "static" : spinning ? "live" : "paused";

  return (
    <div
      className="knot-stage"
      role="button"
      tabIndex={0}
      data-testid="knot-state"
      data-state={stateLabel}
      aria-pressed={spinning}
      aria-label="Torus knot drawn as a point cloud by three.js, click to pause or resume"
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <div className="knot-wrap" ref={viewRef} />
      <span className="knot-prompt">
        {spinning ? "click to pause" : "click to spin"} {spinning ? "▮▮" : "▶"}
      </span>
    </div>
  );
}
