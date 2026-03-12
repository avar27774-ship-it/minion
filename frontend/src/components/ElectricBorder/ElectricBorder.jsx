import { useEffect, useRef, useCallback, useMemo } from 'react';
import './ElectricBorder.css';

const clamp = (v, mn = 0, mx = 100) => Math.min(Math.max(v, mn), mx);
const round  = (v, p = 3) => parseFloat(v.toFixed(p));

function noise2D(x, y) {
  const random = x => (Math.sin(x * 12.9898) * 43758.5453) % 1;
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const a = random(i + j * 57), b = random(i + 1 + j * 57);
  const c = random(i + (j + 1) * 57), d = random(i + 1 + (j + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a*(1-ux)*(1-uy) + b*ux*(1-uy) + c*(1-ux)*uy + d*ux*uy;
}

function octavedNoise(x, time, seed, chaos) {
  let y = 0, amp = chaos, freq = 10;
  for (let i = 0; i < 10; i++) {
    y += amp * noise2D(freq * x + seed * 100, time * freq * 0.3);
    freq *= 1.6; amp *= 0.7;
  }
  return y;
}

function getRoundedRectPoint(t, left, top, w, h, r) {
  const sw = w - 2*r, sh = h - 2*r, ca = Math.PI*r/2;
  const total = 2*sw + 2*sh + 4*ca;
  const dist  = t * total;
  let acc = 0;
  const corner = (cx, cy, startA, len, p) => {
    const a = startA + p * len;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  if (dist <= (acc += sw)) return { x: left + r + (dist/sw)*sw, y: top };
  if (dist <= (acc += ca)) return corner(left+w-r, top+r,   -Math.PI/2, Math.PI/2, (dist-acc+ca)/ca);
  if (dist <= (acc += sh)) return { x: left+w, y: top+r + ((dist-acc+sh)/sh)*sh };
  if (dist <= (acc += ca)) return corner(left+w-r, top+h-r, 0,         Math.PI/2, (dist-acc+ca)/ca);
  if (dist <= (acc += sw)) return { x: left+w-r - ((dist-acc+sw)/sw)*sw, y: top+h };
  if (dist <= (acc += ca)) return corner(left+r,   top+h-r, Math.PI/2,  Math.PI/2, (dist-acc+ca)/ca);
  if (dist <= (acc += sh)) return { x: left, y: top+h-r - ((dist-acc+sh)/sh)*sh };
  return corner(left+r, top+r, Math.PI, Math.PI/2, (dist-acc+ca)/ca);
}

export default function ElectricBorder({
  children, color = '#5227FF', speed = 1, chaos = 0.12,
  borderRadius = 24, className, style, active = true
}) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const animRef      = useRef(null);
  const timeRef      = useRef(0);
  const lastTsRef    = useRef(0);
  const opacityRef   = useRef(0);   // текущая прозрачность (0→1 плавно)

  const draw = useCallback((ts) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Плавное появление/исчезновение
    const target = active ? 1 : 0;
    opacityRef.current += (target - opacityRef.current) * 0.08;

    // Если совсем прозрачно и не активно — стоп
    if (opacityRef.current < 0.01 && !active) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const dt = lastTsRef.current ? (ts - lastTsRef.current) / 1000 : 0;
    lastTsRef.current = ts;
    if (active) timeRef.current += dt * speed;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const borderOffset = 60, displacement = 60;
    const rect = container.getBoundingClientRect();
    const W = rect.width + borderOffset * 2;
    const H = rect.height + borderOffset * 2;

    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
    }

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.globalAlpha = opacityRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const left = borderOffset, top = borderOffset;
    const bw = W - 2*borderOffset, bh = H - 2*borderOffset;
    const radius = Math.min(borderRadius, Math.min(bw, bh) / 2);
    const perimeter = 2*(bw+bh) + 2*Math.PI*radius;
    const samples = Math.floor(perimeter / 2);

    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const p = i / samples;
      const pt = getRoundedRectPoint(p, left, top, bw, bh, radius);
      const xN = octavedNoise(p*8, timeRef.current, 0, chaos) * displacement;
      const yN = octavedNoise(p*8, timeRef.current, 1, chaos) * displacement;
      if (i === 0) ctx.moveTo(pt.x + xN, pt.y + yN);
      else         ctx.lineTo(pt.x + xN, pt.y + yN);
    }
    ctx.closePath();
    ctx.stroke();

    animRef.current = requestAnimationFrame(draw);
  }, [color, speed, chaos, borderRadius, active]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <div ref={containerRef} className={`electric-border ${className ?? ''}`.trim()}
      style={{ '--electric-border-color': color, borderRadius, ...style }}>
      <div className="eb-canvas-container">
        <canvas ref={canvasRef} className="eb-canvas" />
      </div>
      <div className="eb-layers">
        <div className="eb-glow-1" />
        <div className="eb-glow-2" />
        <div className="eb-background-glow" style={{ opacity: active ? 0.3 : 0, transition: 'opacity 0.4s ease' }} />
      </div>
      <div className="eb-content">{children}</div>
    </div>
  );
}
