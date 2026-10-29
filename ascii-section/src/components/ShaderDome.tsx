import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAG_SOURCE = `
precision highp float;

uniform vec2 uRes;
uniform vec2 uCell;
uniform float uTime;
uniform vec2 uMouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  vec2 uv = (cell + 0.5) * uCell / uRes;

  // trace: fit the half arc with even margins
  float aspect = uRes.x / uRes.y;
  float pad = 0.05;
  float rad = min(1.0 - 2.0 * pad, (0.5 - pad) * aspect);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5 * (1.0 - rad));
  vec2 d = p / rad;
  float r = length(d);

  float ang = atan(d.x, max(d.y, 0.0001));
  float wobble =
    sin(ang * 3.0 + uTime * 0.9) * 0.018 +
    sin(ang * 7.0 - uTime * 0.6) * 0.011;

  // border: a loose band of cells around the rim
  float rr = r - 1.0 + wobble + (hash(cell + 1.0) - 0.5) * 0.05;

  if (abs(rr) > 0.16) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float thick =
    0.082 +
    sin(ang * 2.0 + 1.1) * 0.028 +
    sin(ang * 5.0 - 0.7) * 0.016;

  float mask = smoothstep(thick, thick * 0.1, abs(rr));

  float speck = hash(cell * 1.7 + 4.0);
  float edgeHole = smoothstep(0.3, 0.95, abs(rr) / max(thick, 0.001));

  if (speck < edgeHole * 0.9 + 0.07) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // lights: cursor glow runs along the band
  vec2 cp =
    vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5 * (1.0 - rad)) / rad;
  float glow = exp(-dot(d - cp, d - cp) * 3.2);

  vec2 local = fract(gl_FragCoord.xy / uCell) - 0.5;
  local.x *= uCell.x / uCell.y;

  float strength = mask * (0.6 + 0.4 * glow);
  float radius =
    mix(0.09, 0.36, strength) * (0.75 + 0.5 * hash(cell + 9.0));
  float dotShape = smoothstep(radius, radius - 0.16, length(local));

  vec3 ink = mix(
    vec3(0.145, 0.388, 0.921),
    vec3(0.05, 0.08, 0.15),
    smoothstep(0.05, 0.95, clamp(d.y, 0.0, 1.0))
  );
  ink = mix(ink, vec3(0.09, 0.25, 0.75), glow * 0.55);

  float alpha = dotShape * strength * (0.8 + 0.2 * hash(cell + 13.0));
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(ink * alpha, alpha);
}
`;

const COLUMNS = 96;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

type Props = {
  playing: boolean;
  onFps?: (fps: number) => void;
};

export default function ShaderDome({ playing, onFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playingRef = useRef(playing);
  const fpsRef = useRef(onFps);

  playingRef.current = playing;
  fpsRef.current = onFps;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });

    if (!gl) {
      return;
    }

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG_SOURCE);

    if (!vert || !frag) {
      return;
    }

    const program = gl.createProgram();

    if (!program) {
      return;
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uCell = gl.getUniformLocation(program, "uCell");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let time = 0.9;
    let last = performance.now();
    let fps = 60;
    let lastSample = 0;
    let hidden = false;

    const mouse = { x: 0.5, y: 0.44 };
    const target = { x: 0.5, y: 0.44 };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (playingRef.current && !reduced.matches) {
        time += dt * 0.85;
      }

      mouse.x += (target.x - mouse.x) * 0.07;
      mouse.y += (target.y - mouse.y) * 0.07;

      resize();

      if (hidden) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const cellWidth = canvas.width / COLUMNS;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uCell, cellWidth, cellWidth * 1.55);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (dt > 0) {
        fps = fps * 0.9 + (1 / dt) * 0.1;

        if (now - lastSample > 500) {
          lastSample = now;
          fpsRef.current?.(Math.round(fps));
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      hidden = document.hidden;
      last = performance.now();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
    };

    const onPointerLeave = () => {
      target.x = 0.5;
      target.y = 0.44;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="dome-canvas"
      data-testid="ascii-field"
      role="img"
      aria-label="a half arc border printed as a field of dots"
    />
  );
}
