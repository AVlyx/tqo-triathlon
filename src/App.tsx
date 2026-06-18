import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
// Id is only used as a type; convex/values provides GenericId at runtime
type Id<T extends string> = string & { __tableName: T };
import "./index.css";

// ─── Photon / laser field canvas ─────────────────────────────────────────
function PhotonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // Photon wave-packets: travel in straight lines, phase-oscillate
    const photons = Array.from({ length: 40 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      angle: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.8,
      wavelength: 8 + Math.random() * 16,   // pixels per cycle
      phase: Math.random() * Math.PI * 2,
      amplitude: 6 + Math.random() * 10,
      hue: [0, 30, 180, 270, 300][Math.floor(Math.random() * 5)], // laser colors
      alpha: 0.3 + Math.random() * 0.5,
      tail: 60 + Math.random() * 80,
    }));

    // Interference rings (cavity modes)
    const cavities = Array.from({ length: 3 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0,
      maxR: 120 + Math.random() * 200,
      speed: 0.3 + Math.random() * 0.4,
      hue: [180, 270, 300][Math.floor(Math.random() * 3)],
    }));

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw interference cavity rings
      cavities.forEach((c) => {
        c.r += c.speed;
        if (c.r > c.maxR) {
          c.r = 0;
          c.x = Math.random() * canvas.width;
          c.y = Math.random() * canvas.height;
        }
        const alpha = (1 - c.r / c.maxR) * 0.15;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${c.hue},100%,70%,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw photon wave-packets
      photons.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.phase += p.speed / p.wavelength * Math.PI * 2;

        // Wrap
        if (p.x < -p.tail) p.x = canvas.width + p.tail;
        if (p.x > canvas.width + p.tail) p.x = -p.tail;
        if (p.y < -p.tail) p.y = canvas.height + p.tail;
        if (p.y > canvas.height + p.tail) p.y = -p.tail;

        // Draw sinusoidal wave along travel direction
        const perp = p.angle + Math.PI / 2;
        const steps = Math.floor(p.tail / 2);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const d = i / steps;
          const dist = -p.tail * d;
          const envelope = Math.sin(d * Math.PI); // gaussian-like envelope
          const transverse = Math.sin(p.phase - i * (Math.PI * 2 / p.wavelength) * 2) * p.amplitude * envelope;
          const sx = p.x + Math.cos(p.angle) * dist + Math.cos(perp) * transverse;
          const sy = p.y + Math.sin(p.angle) * dist + Math.sin(perp) * transverse;
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `hsla(${p.hue},100%,70%,${p.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bright head
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4);
        grad.addColorStop(0, `hsla(${p.hue},100%,90%,${p.alpha})`);
        grad.addColorStop(1, `hsla(${p.hue},100%,70%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Subtle standing wave pattern (interference field)
      const slices = 8;
      for (let i = 0; i < slices; i++) {
        const x = (i / slices) * canvas.width;
        const amplitude = Math.sin(t * 0.5 + i * 0.8) * 0.04;
        ctx.fillStyle = `rgba(0,245,255,${Math.abs(amplitude)})`;
        ctx.fillRect(x, 0, canvas.width / slices, canvas.height);
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} id="quantum-canvas" />;
}

// ─── Bloch sphere SVG ─────────────────────────────────────────────────────
function BlochSphere({ theta, phi }: { theta: number; phi: number }) {
  const r = 28;
  const cx = 34, cy = 34;
  // State vector tip on sphere
  const x = cx + r * Math.sin(theta) * Math.cos(phi);
  const y = cy - r * Math.cos(theta);
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      {/* Sphere outline */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,245,255,0.2)" strokeWidth="1" />
      {/* Equator ellipse */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3} fill="none" stroke="rgba(0,245,255,0.15)" strokeWidth="0.8" strokeDasharray="3,3" />
      {/* Vertical axis */}
      <line x1={cx} y1={cy - r - 4} x2={cx} y2={cy + r + 4} stroke="rgba(0,245,255,0.3)" strokeWidth="0.8" />
      {/* |0⟩ and |1⟩ labels */}
      <text x={cx} y={cy - r - 7} textAnchor="middle" fill="rgba(0,245,255,0.7)" fontSize="7">|0⟩</text>
      <text x={cx} y={cy + r + 13} textAnchor="middle" fill="rgba(0,245,255,0.7)" fontSize="7">|1⟩</text>
      {/* State vector */}
      <line x1={cx} y1={cy} x2={x} y2={y} stroke="#00f5ff" strokeWidth="1.5" />
      <circle cx={x} cy={y} r="3" fill="#00f5ff" style={{ filter: "drop-shadow(0 0 4px #00f5ff)" }} />
    </svg>
  );
}

// ─── Priority selector ────────────────────────────────────────────────────
function PrioritySelector({ value, onChange }: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {[1, 2, 3].map((n) => (
        <button key={n} type="button" onClick={() => onChange(value === n ? undefined : n)}
          style={{
            width: 32, height: 32, borderRadius: 6, fontSize: 12, fontWeight: "bold",
            border: "1px solid", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
            background: value === n ? (n === 1 ? "#00f5ff" : n === 2 ? "#8b5cf6" : "#ec4899") : "#1f2937",
            color: value === n ? (n === 1 ? "#030712" : "#fff") : "#6b7280",
            borderColor: value === n ? (n === 1 ? "#00f5ff" : n === 2 ? "#8b5cf6" : "#ec4899") : "#374151",
            boxShadow: value === n ? (n === 1 ? "0 0 10px rgba(0,245,255,0.9)" : n === 2 ? "0 0 10px rgba(139,92,246,0.9)" : "0 0 10px rgba(236,72,153,0.9)") : "none",
          }}>
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Discipline badge ─────────────────────────────────────────────────────
function DisciplineBadge({ priority, discipline }: { priority?: number; discipline: string }) {
  if (!priority) return <span style={{ color: "#374151", fontSize: 11 }}>—</span>;
  const icons: Record<string, string> = { swimming: "🌊", cycling: "🚴", running: "🏃" };
  const colors = ["", "#00f5ff", "#8b5cf6", "#ec4899"];
  return <span style={{ color: colors[priority], fontSize: 11, fontWeight: "bold" }}>{icons[discipline]} P{priority}</span>;
}

// ─── Quantum overlay ──────────────────────────────────────────────────────
function QuantumOverlay({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="fade-in" onClick={(e) => e.stopPropagation()}
        style={{ background: "#030712", border: "1px solid #00f5ff", borderRadius: 20, padding: "36px 44px", maxWidth: 500, margin: "0 16px", boxShadow: "0 0 80px rgba(0,245,255,0.5), 0 0 160px rgba(139,92,246,0.3)", textAlign: "center" }}>
        <div style={{ color: "#00f5ff", fontSize: 9, letterSpacing: 5, marginBottom: 14, fontWeight: "bold" }}>
          // QUANTUM OPTICS BROADCAST //
        </div>
        <div style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-line", fontFamily: "inherit" }}>
          {message}
        </div>
        <button onClick={onClose} style={{ marginTop: 22, background: "transparent", border: "none", color: "#4b5563", fontSize: 10, cursor: "pointer", letterSpacing: 2, fontFamily: "inherit" }}>
          [ COLLAPSE WAVE FUNCTION ]
        </button>
      </div>
    </div>
  );
}

// ─── Scrolling equations ticker ───────────────────────────────────────────
const QO_EQUATIONS = [
  "Ĥ = ℏω(â†â + ½)",
  "|ψ⟩ = α|H⟩ + β|V⟩",
  "g⁽²⁾(0) < 1  →  non-classical",
  "ΔnΔφ ≥ ½",
  "[â, â†] = 1",
  "W(α) = (2/π)Tr[ρ D̂(α) eiπâ†â D̂†(α)]",
  "ρ̇ = −(i/ℏ)[Ĥ,ρ] + κ(2âρâ† − â†âρ − ρâ†â)",
  "E⃗(r,t) = E₀ ε̂ cos(k·r − ωt + φ)",
  "|NOON⟩ = (|N,0⟩ + |0,N⟩)/√2",
  "⟨â⟩ = Tr[ρ â]",
  "Jaynes-Cummings: Ĥ = ℏω_c â†â + ℏω_a σ_z/2 + ℏg(â†σ− + âσ+)",
  "Mandel Q = (⟨n²⟩ − ⟨n⟩²)/⟨n⟩ − 1",
  "n̂ = â†â  →  photon number operator",
  "Squeezed state: ΔX₁ < ½,  ΔX₂ > ½",
  "|α⟩ = e^{−|α|²/2} Σ (αⁿ/√n!) |n⟩",
];

function EquationTicker() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx((i) => (i + 1) % QO_EQUATIONS.length); setFade(true); }, 400);
    }, 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", fontSize: 11, color: "#0e4f5a", padding: "6px 0", fontFamily: "monospace", transition: "opacity 0.4s", opacity: fade ? 1 : 0, letterSpacing: 1 }}>
      {QO_EQUATIONS[idx]}
    </div>
  );
}

// ─── Konami hook ──────────────────────────────────────────────────────────
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
function useKonami(cb: () => void) {
  const seq = useRef<string[]>([]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      seq.current = [...seq.current, e.key].slice(-KONAMI.length);
      if (seq.current.join(",") === KONAMI.join(",")) { seq.current = []; cb(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cb]);
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const registrations = useQuery(api.registrations.list);
  const registerMutation = useMutation(api.registrations.register);
  const removeMutation = useMutation(api.registrations.remove);

  const [name, setName] = useState("");
  const [swimming, setSwimming] = useState<number | undefined>();
  const [cycling, setCycling] = useState<number | undefined>();
  const [running, setRunning] = useState<number | undefined>();
  const [extraInfo, setExtraInfo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [collapseAnim, setCollapseAnim] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [schrodingerHover, setSchrodingerHover] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [heisenbergMode, setHeisenbergMode] = useState(false);
  const [laserMode, setLaserMode] = useState(false);
  const [blochTheta, setBlochTheta] = useState(Math.PI / 4);
  const [blochPhi, setBlochPhi] = useState(Math.PI / 3);

  // Animate Bloch sphere
  useEffect(() => {
    const t = setInterval(() => {
      setBlochTheta((v) => v + 0.018);
      setBlochPhi((v) => v + 0.011);
    }, 50);
    return () => clearInterval(t);
  }, []);

  // Konami → Schrödinger's cat
  useKonami(useCallback(() => {
    setOverlay(
      "🐱 SCHRÖDINGER'S RELAY TEAM 🐱\n\n" +
      "Your team is now in a superposition of\n|won⟩ and |lost⟩ until observed by the referee.\n\n" +
      "The wave function:\n|ψ⟩ = (1/√2)(|🥇Maik⟩|🥇Fynn⟩|🥇Anton⟩ + |DNF⟩)\n\n" +
      "Decoherence time at Bad Arolsen: ~4 hours\n" +
      "Fidelity of victory: F = |⟨ψ_win|ψ⟩|² ≈ 0.42\n\n" +
      "Best of luck. May your coherence hold."
    );
  }, []));

  // Logo clicks → optics easter eggs
  const handleLogoClick = () => {
    const n = logoClicks + 1;
    setLogoClicks(n);
    if (n === 2) {
      setOverlay(
        "💡 SINGLE-PHOTON DETECTED 💡\n\n" +
        "g⁽²⁾(0) = 0  →  perfect antibunching\n\n" +
        "Congratulations. You have successfully\ngenerated a non-classical state of light\nby clicking a logo.\n\n" +
        "Mandel Q = −1  (maximally sub-Poissonian)\n\n" +
        "Nobel Committee has been notified."
      );
    } else if (n === 4) {
      setLaserMode((l) => !l);
      setOverlay(
        laserMode
          ? "🔦 LASER MODE DEACTIVATED\nStimulated emission suppressed."
          : "🔴 LASER MODE ACTIVATED 🔴\n\nStimulated emission: ON\nPhoton bunching: MAXIMUM\ng⁽²⁾(0) = 1  (coherent state)\n\nAll participants now exhibit\nlong-range phase coherence."
      );
      setLogoClicks(0);
    } else if (n >= 6) {
      setOverlay(
        "🔬 TQO CLASSIFIED: PROJECT MARATHON 🔬\n\n" +
        "Objective: Apply optical tweezers to\nlevitate athletes across the finish line.\n\n" +
        "Trapping potential: U = −(1/2)ε₀|E⃗|²α\n" +
        "Estimated trap depth: 1 µK\nEstimated athlete temperature: 310 K\n\n" +
        "Status: THERMODYNAMICALLY DISCOURAGED\n\n" +
        "Grant proposal: rejected (again)."
      );
      setLogoClicks(0);
    }
  };

  // Triple-click table header → Heisenberg mode
  const headerClicks = useRef(0);
  const headerTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleHeaderClick = () => {
    headerClicks.current++;
    clearTimeout(headerTimer.current);
    headerTimer.current = setTimeout(() => { headerClicks.current = 0; }, 600);
    if (headerClicks.current >= 3) {
      headerClicks.current = 0;
      setHeisenbergMode((h) => !h);
      setOverlay(
        heisenbergMode
          ? "📡 Position operators restored.\nΔx·Δp ≥ ℏ/2 once again applies."
          : "🌀 HEISENBERG UNCERTAINTY MODE\n\nYou now know participants exist.\nYou cannot know where.\n\nΔx·Δp ≥ ℏ/2\n\nThis is not a bug. It is a fundamental\nconsequence of non-commuting observables.\n\n[x̂, p̂] = iℏ"
      );
    }
  };

  // Secret: type "photon" to trigger
  const typedSeq = useRef("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      typedSeq.current = (typedSeq.current + e.key).slice(-6);
      if (typedSeq.current === "photon") {
        typedSeq.current = "";
        setOverlay(
          "📸 PHOTOELECTRIC EFFECT DETECTED 📸\n\n" +
          "Einstein (1905): E_photon = hν\n\n" +
          "You have successfully typed 'photon',\nthereby absorbing one quantum of attention.\n\n" +
          "Work function of this easter egg: 3.2 eV\n" +
          "Your kinetic energy: E_k = hν − φ\n\n" +
          "Well done. This is worth 0.001 Nobel prizes."
        );
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Console art
  useEffect(() => {
    console.log("%c", "font-size:0");
    console.log(
      "%c ⚛  THEORETICAL QUANTUM OPTICS — TQO TRIATHLON  ⚛ ",
      "color:#030712;background:linear-gradient(90deg,#00f5ff,#8b5cf6);font-size:16px;font-weight:bold;padding:6px 12px;border-radius:4px"
    );
    console.log("%cQuantum field state of this application:", "color:#8b5cf6;font-size:12px");
    console.log("%c|app⟩ = α|loading⟩ + β|ready⟩ + γ|crashed⟩", "color:#00f5ff;font-family:monospace;font-size:13px");
    console.log("%c\nHidden triggers:\n  • Konami code (↑↑↓↓←→←→BA)\n  • Click ⚛ logo multiple times\n  • Type 'photon' on keyboard\n  • Triple-click the table header", "color:#6b7280;font-size:11px");
    console.log("%cĤ = ℏω(â†â + ½)   [Quantum Harmonic Oscillator]", "color:#00ff88;font-family:monospace;font-size:14px;margin-top:8px");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Particle identity cannot remain in superposition. Provide a name."); return; }
    if (!swimming && !cycling && !running) { setError("The vacuum state |0⟩ is not a valid registration. Select at least one discipline."); return; }
    setError("");
    setSubmitting(true);
    setCollapseAnim(true);
    try {
      await registerMutation({ name: name.trim(), swimming, cycling, running, extraInfo: extraInfo.trim() || undefined });
      setName(""); setSwimming(undefined); setCycling(undefined); setRunning(undefined); setExtraInfo("");
      setTimeout(() => setCollapseAnim(false), 1600);
    } catch (err: unknown) {
      setCollapseAnim(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("QUANTUM_COLLISION") ? "⚠️ Quantum collision! This particle already exists. No-cloning theorem prevents duplicates." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const teamSize = registrations?.length ?? 0;
  const p1swim = registrations?.filter((r: { swimming?: number }) => r.swimming === 1).length ?? 0;
  const p1cycle = registrations?.filter((r: { cycling?: number }) => r.cycling === 1).length ?? 0;
  const p1run = registrations?.filter((r: { running?: number }) => r.running === 1).length ?? 0;

  const panelStyle = (borderColor: string, glowColor: string): React.CSSProperties => ({
    border: `1px solid ${borderColor}`,
    background: "rgba(3,7,18,0.92)",
    borderRadius: 16,
    boxShadow: `0 0 20px ${glowColor}`,
  });

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden", background: laserMode ? "#020005" : "#030712", transition: "background 1s" }}>
      <PhotonCanvas />
      {overlay && <QuantumOverlay message={overlay} onClose={() => setOverlay(null)} />}

      {/* Laser mode scanline */}
      {laserMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,100,0.03) 2px, rgba(255,0,100,0.03) 4px)" }} />
      )}

      <div style={{ position: "relative", zIndex: 10, maxWidth: 880, margin: "0 auto", padding: "28px 16px" }}>

        {/* ── HEADER ── */}
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
            <BlochSphere theta={blochTheta} phi={blochPhi} />
            <div
              className="quantum-spin wave-float"
              style={{ fontSize: 52, cursor: "pointer", userSelect: "none", display: "inline-block", filter: laserMode ? "hue-rotate(200deg) brightness(1.4)" : "none" }}
              onClick={handleLogoClick}
              title="⚛ click me"
            >⚛️</div>
            <BlochSphere theta={blochTheta + Math.PI} phi={blochPhi + Math.PI / 2} />
          </div>
          <h1 className="glitch glow-cyan" style={{ fontSize: "clamp(26px,6vw,54px)", fontWeight: 900, letterSpacing: -1, margin: "8px 0 4px", color: laserMode ? "#ff3377" : "#e2e8f0" }}>
            TQO TRIATHLON
          </h1>
          <div style={{ color: "#00f5ff", fontSize: 11, letterSpacing: 5, fontWeight: "bold" }}>
            THEORETICAL QUANTUM OPTICS
          </div>
          <div style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}>
            Bad Arolsen · Sunday, 13 September · |ψ⟩ = α|🥇⟩ + β|💀⟩
          </div>
          <EquationTicker />
        </header>

        {/* ── DISCIPLINES ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { icon: "🌊", label: "Swimming", sub: "500m · open water lake", color: "#00f5ff", note: "|H⟩ polarization" },
            { icon: "🚴", label: "Cycling", sub: "18.5km · hilly course", color: "#8b5cf6", note: "stimulated emission" },
            { icon: "🏃", label: "Running", sub: "5km · mostly flat", color: "#00ff88", note: "|V⟩ polarization" },
          ].map(({ icon, label, sub, color, note }) => (
            <div key={label} style={{ border: `1px solid ${color}22`, background: "rgba(3,7,18,0.85)", borderRadius: 14, padding: 18, textAlign: "center", transition: "all 0.3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color + "88"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${color}22`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color + "22"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{icon}</div>
              <div style={{ color, fontWeight: "bold", fontSize: 14 }}>{label}</div>
              <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{sub}</div>
              <div style={{ color: color + "55", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>{note}</div>
            </div>
          ))}
        </div>

        {/* ── QUANTUM STATE MONITOR ── */}
        <div className="shimmer" style={{ ...panelStyle("#1e293b", "rgba(0,245,255,0.05)"), padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div className="blink" style={{ width: 7, height: 7, background: laserMode ? "#ff3377" : "#00f5ff", borderRadius: "50%" }} />
            <span style={{ color: laserMode ? "#ff3377" : "#00f5ff", fontSize: 10, fontWeight: "bold", letterSpacing: 4 }}>
              {laserMode ? "LASER FIELD ACTIVE — CAVITY QED MODE" : "QUANTUM STATE MONITOR"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, textAlign: "center" }}>
            {[
              { label: "🌊 |swim,P1⟩", count: p1swim, eq: "â†|0⟩" },
              { label: "🚴 |cycle,P1⟩", count: p1cycle, eq: "â†â†|0⟩" },
              { label: "🏃 |run,P1⟩", count: p1run, eq: "â†ⁿ|0⟩" },
            ].map(({ label, count, eq }) => (
              <div key={label}>
                <div style={{ color: "#6b7280", fontSize: 10 }}>{label}</div>
                <div className={count > 0 ? "glow-cyan" : ""} style={{ fontSize: 16, fontWeight: "bold", color: count > 0 ? "#00f5ff" : "#1e293b", marginTop: 4 }}>
                  {count > 0 ? `${count} collapsed` : eq}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#374151", marginTop: 12, cursor: "default", transition: "color 0.3s" }}
            onMouseEnter={() => setSchrodingerHover(true)}
            onMouseLeave={() => setSchrodingerHover(false)}>
            {schrodingerHover
              ? `n̂|ψ⟩ = ${teamSize}|ψ⟩  ·  60€/team · 20€/person`
              : "⟨n̂⟩ = ? · hover to measure photon number →"}
          </div>
        </div>

        {/* ── REGISTRATION FORM ── */}
        <div className={collapseAnim ? "wave-collapse" : ""} style={{ ...panelStyle("#4c1d95", "rgba(139,92,246,0.12)"), padding: "26px 26px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <h2 className="glow-purple" style={{ color: "#a78bfa", fontSize: 15, fontWeight: "bold", letterSpacing: 3, margin: 0 }}>
                REGISTER YOUR QUANTUM STATE
              </h2>
              <p style={{ color: "#6b7280", fontSize: 11, margin: "4px 0 0" }}>
                Priority: 1 = highest preference · 3 = lowest · blank = |vac⟩
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: 9, color: "#4c1d95", lineHeight: 1.6, fontFamily: "monospace" }}>
              Ĥ_int = ℏg(â†σ− + âσ+)<br />
              [â, â†] = 1
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: 10, letterSpacing: 3, marginBottom: 6 }}>PARTICLE IDENTITY OPERATOR</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name..."
                style={{ width: "100%", background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                onFocus={e => { e.target.style.borderColor = "#8b5cf6"; e.target.style.boxShadow = "0 0 10px rgba(139,92,246,0.4)"; }}
                onBlur={e => { e.target.style.borderColor = "#374151"; e.target.style.boxShadow = "none"; }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
              {[
                { key: "swimming", icon: "🌊", label: "Swimming", state: "|H⟩", val: swimming, set: setSwimming },
                { key: "cycling", icon: "🚴", label: "Cycling", state: "|+⟩", val: cycling, set: setCycling },
                { key: "running", icon: "🏃", label: "Running", state: "|V⟩", val: running, set: setRunning },
              ].map(({ key, icon, label, state, val, set }) => (
                <div key={key} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 2 }}>{icon}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 9, color: "#374151", fontFamily: "monospace", marginBottom: 8 }}>{state}</div>
                  <PrioritySelector value={val} onChange={set} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: 10, letterSpacing: 3, marginBottom: 6 }}>
                DECOHERENCE NOTES <span style={{ color: "#4b5563" }}>(optional)</span>
              </label>
              <textarea value={extraInfo} onChange={e => setExtraInfo(e.target.value)} placeholder="Quantum fluctuations, measurement errors, prior entanglements..." rows={2}
                style={{ width: "100%", background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>

            {error && (
              <div className="fade-in" style={{ background: "rgba(127,29,29,0.3)", border: "1px solid #7f1d1d", borderRadius: 8, padding: "12px 14px", color: "#f87171", fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", fontWeight: "bold", fontSize: 12, letterSpacing: 3, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, background: laserMode ? "linear-gradient(90deg,#ff3377,#ff6600)" : "linear-gradient(90deg,#00f5ff,#8b5cf6)", color: "#030712", boxShadow: laserMode ? "0 0 20px rgba(255,51,119,0.5)" : "0 0 20px rgba(0,245,255,0.3)", transition: "all 0.3s", fontFamily: "inherit" }}
              onMouseEnter={e => { if (!submitting) (e.target as HTMLButtonElement).style.boxShadow = laserMode ? "0 0 40px rgba(255,51,119,0.7)" : "0 0 40px rgba(0,245,255,0.6)"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.boxShadow = laserMode ? "0 0 20px rgba(255,51,119,0.5)" : "0 0 20px rgba(0,245,255,0.3)"; }}>
              {submitting ? "PROJECTING ONTO EIGENSTATE..." : laserMode ? "🔴 STIMULATE & EMIT ⚡" : "⚛ COLLAPSE WAVE FUNCTION ⚛"}
            </button>
          </form>
        </div>

        {/* ── PARTICIPANTS TABLE ── */}
        <div style={{ ...panelStyle("#164e63", "rgba(0,245,255,0.06)"), overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #164e63", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }} onClick={handleHeaderClick}>
            <div>
              <h2 className="glow-cyan" style={{ color: "#00f5ff", fontSize: 15, fontWeight: "bold", letterSpacing: 3, margin: 0 }}>
                COLLAPSED EIGENSTATES
              </h2>
              <div style={{ color: "#6b7280", fontSize: 10, marginTop: 2 }}>
                {teamSize} particles · triple-click for surprises · no-cloning theorem enforced
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 9, color: "#374151", fontFamily: "monospace", lineHeight: 1.6 }}>
              60€/relay<br />20€/person
            </div>
          </div>

          {registrations === undefined ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
              <div className="quantum-spin" style={{ display: "inline-block", fontSize: 28, marginBottom: 8 }}>⚛️</div>
              <div>Measuring quantum state...</div>
              <div style={{ fontSize: 10, marginTop: 4, fontFamily: "monospace", color: "#374151" }}>⟨Ψ|Ô|Ψ⟩ = ?</div>
            </div>
          ) : registrations.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌌</div>
              <div>Vacuum state |0⟩ — no particles yet.</div>
              <div style={{ fontSize: 11, marginTop: 4, fontFamily: "monospace", color: "#374151" }}>⟨0|â†â|0⟩ = 0</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e293b" }}>
                    {["EIGENSTATE", "🌊 |SWIM⟩", "🚴 |CYCLE⟩", "🏃 |RUN⟩", "NOTES", ""].map((h, i) => (
                      <th key={i} style={{ padding: "10px 16px", color: "#6b7280", fontWeight: "normal", fontSize: 9, letterSpacing: 3, textAlign: i === 0 || i === 4 ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r._id} style={{ borderBottom: "1px solid #0a0f1a", transition: "background 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,245,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 500 }}>
                        <span style={{ filter: heisenbergMode ? "blur(5px)" : "none", transition: "filter 0.4s", userSelect: heisenbergMode ? "none" : "auto" }}>
                          {r.name}
                        </span>
                        {heisenbergMode && <span style={{ marginLeft: 8, fontSize: 9, color: "#ca8a04", fontFamily: "monospace" }}>Δx·Δp≥ℏ/2</span>}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}><DisciplineBadge priority={r.swimming} discipline="swimming" /></td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}><DisciplineBadge priority={r.cycling} discipline="cycling" /></td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}><DisciplineBadge priority={r.running} discipline="running" /></td>
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 11, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.extraInfo || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {deleteConfirm === r._id ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button onClick={() => { removeMutation({ id: r._id as Id<"registrations"> }); setDeleteConfirm(null); }}
                              style={{ background: "none", border: "none", color: "#f87171", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>annihilate</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(r._id)} title="Remove"
                            style={{ background: "none", border: "none", color: "#374151", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
                            onMouseEnter={e => ((e.target as HTMLButtonElement).style.color = "#f87171")}
                            onMouseLeave={e => ((e.target as HTMLButtonElement).style.color = "#374151")}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: "center", marginTop: 28, color: "#374151", fontSize: 11, lineHeight: 2 }}>
          <div>
            <a href="http://www.twistesee-triathlon.com/" target="_blank" rel="noopener noreferrer"
              style={{ color: "#374151", textDecoration: "none" }}
              onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = "#00f5ff")}
              onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = "#374151")}>
              twistesee-triathlon.com
            </a>
            {" · "}Relays: 2–3 people · Participants changeable on race day
          </div>
          <div>TQO · Theoretical Quantum Optics · <span className="blink">_</span></div>
          {/* Invisible quantum optics compendium — highlight to reveal */}
          <div style={{ color: "#0a0a0a", fontSize: 9, letterSpacing: 1, marginTop: 4, fontFamily: "monospace", userSelect: "all" }} title="type 'photon' for a surprise">
            ρ̇=−(i/ℏ)[Ĥ,ρ]+κ𝒟[â]ρ · W(α)=(2/π)Tr[ρD̂(α)(-1)^n̂D̂†(α)] · g⁽²⁾(0)=⟨â†²â²⟩/⟨â†â⟩²
          </div>
        </footer>

      </div>
    </div>
  );
}
