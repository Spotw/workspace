import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Sun, Moon, Sunset, RotateCcw } from "lucide-react";
import SleepingCat from "./sleeping-cat.jsx";
import { clockAt, PERIODS } from "./coffee-time.js";
import "./clock-card.css";

const NOTES = [
  "Chậm một nhịp. Để hương cà phê mở lối cho ý tưởng.",
  "Ủ 30 giây — đánh thức vị ngọt trong từng hạt cà phê.",
  "Rót vòng tròn nhỏ, đều tay. Một chút kiên nhẫn, một tách cân bằng.",
  "Giữ dòng nước thật nhẹ. Dư vị đẹp đến từ những điều vừa đủ.",
];
const MODES = ["auto", "morning", "afternoon", "evening"];
const MODE_ICONS = { auto: RotateCcw, morning: Sun, afternoon: Sunset, evening: Moon };

// Only this component ticks: WebGL never receives per-second updates.
function ClockReadout({ onPeriod }) {
  const [clock, setClock] = useState(clockAt);
  useEffect(() => {
    const tick = () => setClock(clockAt());
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, []);
  useEffect(() => onPeriod(clock.period), [clock.period, onPeriod]);
  return <>
    <div className="kyoto-time" role="timer" aria-live="off" aria-label={`Giờ Việt Nam ${clock.time}`}>
      {clock.time.split(":").map((part, i) => <React.Fragment key={i}>{i > 0 && <span className="kyoto-colon" aria-hidden="true">:</span>}<span>{part}</span></React.Fragment>)}
    </div>
    <div className="kyoto-date">{clock.date}</div>
  </>;
}

const PourOver = memo(function PourOver({ controls, cardRef, onBloom }) {
  const hostRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const mobile = matchMedia("(max-width: 480px)");
    let disposed = false;
    let scene;
    let generation = 0;
    async function sync() {
      const current = ++generation;
      scene?.dispose();
      scene = undefined;
      if (mobile.matches || disposed) return;
      try {
        const { createPourOver } = await import("./pour-over-scene.js");
        if (!disposed && current === generation) {
          scene = createPourOver(hostRef.current, cardRef.current, controls.current, onBloom, () => setUnavailable(true));
          setUnavailable(false);
        }
      } catch (error) {
        console.warn("Không khởi tạo được cảnh pour-over:", error);
        if (!disposed) setUnavailable(true);
      }
    }
    sync();
    mobile.addEventListener("change", sync);
    return () => { disposed = true; generation++; mobile.removeEventListener("change", sync); scene?.dispose(); };
  }, [controls, cardRef, onBloom]);
  return <div className="kyoto-scene-wrap">
    <div className="kyoto-scene" ref={hostRef} />
    {unavailable ? <p className="kyoto-scene-fallback">Một tách chậm, một ngày an yên.<br />Cảnh 3D cần trình duyệt hỗ trợ WebGL.</p> : <span className="kyoto-scene-caption">V60 · HANDCRAFTED MOMENTS</span>}
  </div>;
});

export default function ClockPanel() {
  const cardRef = useRef(null);
  const controls = useRef({ period: clockAt().period, bloom: 0 });
  const [automaticPeriod, setAutomaticPeriod] = useState(() => clockAt().period);
  const [mode, setMode] = useState("auto");
  const [note, setNote] = useState(0);
  const period = mode === "auto" ? automaticPeriod : mode;
  const details = PERIODS[period];
  const Icon = MODE_ICONS[mode];
  useEffect(() => { controls.current.period = period; }, [period]);
  const bloom = useCallback(() => {
    controls.current.bloom = performance.now();
    setNote(value => (value + 1) % NOTES.length);
  }, []);
  return <section id="p-clock" className="panel clock-panel kyoto-card" ref={cardRef} aria-label="Đồng hồ Kyoto Specialty Pour-Over Bar">
    <header className="kyoto-topline">
      <div className="kyoto-brand"><span className="kyoto-mark"><Coffee size={20} strokeWidth={1.6} /></span><span>KYOTO<span className="kyoto-brand-sub">SPECIALTY POUR-OVER BAR</span></span></div>
      <button className="kyoto-mode" onClick={() => setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length])} title="Chuyển ánh sáng: Tự động / Sáng / Chiều / Tối" aria-label={`Ánh sáng: ${mode === "auto" ? "Tự động" : details.name}. Nhấn để đổi chế độ.`}><Icon size={13} /><span>{mode === "auto" ? "Tự động" : details.name}</span></button>
    </header>
    <PourOver controls={controls} cardRef={cardRef} onBloom={bloom} />
    <div className="kyoto-copy">
      <div className="kyoto-kicker"><span />{details.greeting} · một chút bình yên</div>
      <h1>Một ngụm cà phê,<br /><span>một ngày thảnh thơi.</span></h1>
      <p className="kyoto-quote" aria-live="polite">{NOTES[note]}</p>
      <div className="kyoto-clock-label">GIỜ VIỆT NAM <span>UTC +07:00</span></div>
      <ClockReadout onPeriod={setAutomaticPeriod} />
      <div className="kyoto-pills"><span>{details.label}</span><span>SINGLE ORIGIN</span></div>
    </div>
    <div className="hero-cat kyoto-cat"><SleepingCat /></div>
    <footer className="kyoto-footer"><span>丁寧に、一杯ずつ。<span className="kyoto-footer-translation">Tận tâm trong từng tách.</span></span><button className="kyoto-bloom" onClick={bloom}>Chạm một nhịp bloom <span aria-hidden="true">↗</span></button></footer>
  </section>;
}
