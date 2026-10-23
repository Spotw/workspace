import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Image,
  Layers3,
  LoaderCircle,
  Maximize2,
  Orbit,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
const TZ = "Asia/Ho_Chi_Minh";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DAYS = [
  ["mon", "Thứ 2", "T2"],
  ["tue", "Thứ 3", "T3"],
  ["wed", "Thứ 4", "T4"],
  ["thu", "Thứ 5", "T5"],
  ["fri", "Thứ 6", "T6"],
  ["sat", "Thứ 7", "T7"],
  ["sun", "Chủ nhật", "CN"],
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
  }
  if (!response.ok) throw new Error(data?.error || "Có lỗi xảy ra. Vui lòng thử lại.");
  return data;
}

function getTodayKey() {
  return new Date().toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" }).toLowerCase().slice(0, 3);
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("vi-VN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTime() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatEntryTime(value) {
  const date = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { timeZone: TZ, hour12: false });
}

function MotionPanel({ children, className, ...props }) {
  return (
    <motion.section
      className={`panel ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.section>
  );
}

function PanelTitle({ eyebrow, title, icon: Icon, action }) {
  return (
    <div className="panel-heading">
      <div className="heading-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      <div className="heading-tools">
        {Icon && <span className="heading-icon"><Icon size={18} strokeWidth={1.8} /></span>}
        {action}
      </div>
    </div>
  );
}

function ClockPanel() {
  const [time, setTime] = useState(getTime);
  const [date, setDate] = useState(formatDate);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(getTime());
      setDate(formatDate());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const hour = Number(time.slice(0, 2));
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <MotionPanel id="p-clock" className="clock-panel">
      <div className="hero-orb hero-orb-one" />
      <div className="hero-orb hero-orb-two" />
      <div className="hero-topline">
        <div className="brand-lockup">
          <span className="brand-mark"><Orbit size={21} /></span>
          <span>SPACE<span className="brand-light">/</span>WORK</span>
        </div>
        <span className="live-pill"><span className="live-dot" /> KHÔNG GIAN CỦA BẠN</span>
      </div>
      <div className="hero-content">
        <motion.span
          className="hero-kicker"
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Sparkles size={15} /> {greeting}
        </motion.span>
        <h1>Một ngày mới,<br /><span>một không gian mới.</span></h1>
        <p className="hero-description">Giữ mọi ý tưởng và khoảnh khắc của bạn trong tầm mắt.</p>
        <div className="clock-display" aria-label={`Giờ hiện tại ${time}`}>{time}</div>
        <div className="hero-date"><CalendarDays size={16} /> {date}</div>
      </div>
      <div className="hero-footer">
        <span><span className="footer-spark">✳</span> TẬP TRUNG VÀO ĐIỀU QUAN TRỌNG</span>
        <span className="hero-scroll">KHÁM PHÁ KHÔNG GIAN <ArrowRight size={14} /></span>
      </div>
    </MotionPanel>
  );
}

function PortalPanel() {
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const data = await api("/api/entries");
      if (!Array.isArray(data)) throw new Error("Danh sách thông tin không hợp lệ.");
      setEntries(data);
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  useEffect(() => { load(); }, []);

  const filteredEntries = entries.filter((entry) =>
    [entry.mo_ta, entry.loai_thong_tin, entry.noi_dung]
      .some((value) => String(value || "").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")))
  );

  return (
    <MotionPanel id="p-portal" className="portal-panel">
      <PanelTitle
        eyebrow="TỔNG HỢP"
        title="Cổng thông tin"
        icon={Layers3}
        action={
          <button className="icon-button" type="button" onClick={load} disabled={status === "loading"} aria-label="Tải lại thông tin">
            <RefreshCw size={16} className={status === "loading" ? "spin" : ""} />
          </button>
        }
      />
      <div className="portal-toolbar">
        <div className="portal-intro">
          <span className="data-count">{entries.length.toString().padStart(2, "0")}</span>
          <span>mục được chia sẻ với bạn</span>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong thông tin…" aria-label="Tìm thông tin" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={14} /></button>}
        </label>
      </div>
      <div className="table-wrap">
        {status === "loading" ? (
          <div className="state-message"><LoaderCircle className="spin" size={20} /> Đang tải thông tin…</div>
        ) : status === "error" ? (
          <div className="state-message state-error"><span>{error}</span><button className="text-button" type="button" onClick={load}>Thử lại</button></div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Search size={21} /></span>
            <strong>{query ? "Không tìm thấy kết quả" : "Chưa có thông tin nào"}</strong>
            <span>{query ? "Thử từ khóa khác nhé." : "Thông tin được chia sẻ sẽ xuất hiện ở đây."}</span>
          </div>
        ) : (
          <table>
            <thead><tr><th>MÔ TẢ</th><th>LOẠI THÔNG TIN</th><th>NỘI DUNG</th><th>THỜI GIAN</th></tr></thead>
            <tbody>
              {filteredEntries.map((entry, index) => (
                <motion.tr key={entry.id || `${entry.created_at}-${index}`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.035 }}>
                  <td className="entry-description">{entry.mo_ta}</td>
                  <td><span className="type-pill">{entry.loai_thong_tin}</span></td>
                  <td className="entry-content">{entry.noi_dung || <span className="muted">—</span>}</td>
                  <td className="entry-time">{formatEntryTime(entry.created_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="panel-footnote"><span className="live-dot" /> DỮ LIỆU CẬP NHẬT TRỰC TIẾP <span className="footnote-right">CHỈ XEM</span></div>
    </MotionPanel>
  );
}

function NotesPanel() {
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [loadError, setLoadError] = useState("");
  const today = getTodayKey();

  useEffect(() => {
    let active = true;
    api("/api/notes")
      .then((data) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Danh sách ghi chú không hợp lệ.");
        if (active) setNotes(data);
      })
      .catch((err) => { if (active) setLoadError(err.message); });
    return () => { active = false; };
  }, []);

  function updateNote(key, text) {
    setNotes((current) => ({ ...current, [key]: text }));
    setSaved((current) => ({ ...current, [key]: false }));
  }

  async function saveNote(key) {
    setSaving((current) => ({ ...current, [key]: true }));
    try {
      await api(`/api/notes/${key}`, { method: "PUT", body: JSON.stringify({ text: notes[key] || "" }) });
      setSaved((current) => ({ ...current, [key]: true }));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setSaving((current) => ({ ...current, [key]: false }));
    }
  }

  return (
    <MotionPanel id="p-notes" className="notes-panel">
      <PanelTitle eyebrow="GÓC CÁ NHÂN" title="Ghi chú trong tuần" icon={CalendarDays} />
      <div className="week-overview">
        <div><span className="week-title">Tuần của bạn</span><span className="week-subtitle">Một chút mỗi ngày, thật nhiều cảm hứng.</span></div>
        <span className="week-badge"><Sun size={14} /> {DAYS.find((day) => day[0] === today)?.[1] || "Hôm nay"}</span>
      </div>
      <div className="notes-list">
        {DAYS.map(([key, label, shortLabel]) => (
          <div className={`note-row ${key === today ? "today" : ""}`} key={key}>
            <div className="day-label"><span className="day-short">{shortLabel}</span><span className="day-full">{label}</span></div>
            <input
              value={notes[key] || ""}
              onChange={(event) => updateNote(key, event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") saveNote(key); }}
              maxLength={5000}
              placeholder={key === today ? "Thêm điều bạn muốn nhớ…" : "Ghi lại một ý tưởng…"}
              aria-label={`Ghi chú ${label}`}
            />
            <button className={`save-note ${saved[key] ? "saved" : ""}`} type="button" onClick={() => saveNote(key)} disabled={Boolean(saving[key])} aria-label={saved[key] ? `Đã lưu ghi chú ${label}` : `Lưu ghi chú ${label}`}>
              {saving[key] ? <LoaderCircle size={15} className="spin" /> : saved[key] ? <Check size={15} /> : <ArrowUpRight size={15} />}
            </button>
          </div>
        ))}
      </div>
      <div className={`notes-status ${loadError ? "status-error" : ""}`}>
        {loadError ? <><span>{loadError}</span><button type="button" onClick={() => setLoadError("")} aria-label="Ẩn lỗi"><X size={14} /></button></> : <><Sparkles size={14} /> {Object.values(saved).some(Boolean) ? "Ghi chú đã được lưu." : "Nhấn Enter hoặc mũi tên để lưu ghi chú."}</>}
      </div>
    </MotionPanel>
  );
}

function FrameCard({ frame, index }) {
  const [url, setUrl] = useState(frame.url || "");
  const [caption, setCaption] = useState(frame.caption || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedImage, setFailedImage] = useState(false);

  async function saveFrame() {
    setSaving(true);
    setMessage("");
    setError(false);
    try {
      const saved = await api(`/api/frames/${index}`, {
        method: "PUT",
        body: JSON.stringify({ url, caption }),
      });
      setUrl(saved.url || "");
      setCaption(saved.caption || "");
      setFailedImage(false);
      setMessage("Đã lưu thay đổi.");
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.article className="frame-card" whileHover={reduceMotion ? undefined : { y: -4 }} transition={{ duration: 0.2 }}>
      <div className="frame-image-wrap">
        {url && !failedImage ? (
          <img src={url} alt={caption || `Khung ảnh ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImage(true)} />
        ) : (
          <div className="frame-empty"><Image size={27} strokeWidth={1.4} /><span>{failedImage ? "Không tải được ảnh" : "Khung ảnh đang chờ"}</span><small>{failedImage ? "Kiểm tra lại địa chỉ ảnh" : "Thêm khoảnh khắc của bạn"}</small></div>
        )}
        <span className="frame-number">0{index + 1}</span>
        {url && <a className="frame-open" href={url} target="_blank" rel="noreferrer" aria-label="Mở ảnh trong tab mới"><Maximize2 size={15} /></a>}
      </div>
      {caption && <p className="frame-caption">{caption}</p>}
      <details className="frame-edit">
        <summary><span>Chỉnh sửa khung ảnh</span><ChevronDown size={15} /></summary>
        <div className="frame-form">
          <label>Đường dẫn ảnh<input type="url" placeholder="https://…" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
          <label>Chú thích<input type="text" placeholder="Một khoảnh khắc đáng nhớ…" maxLength={120} value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
          <div className="frame-actions"><button className="button-primary" type="button" onClick={saveFrame} disabled={saving}>{saving ? <LoaderCircle size={15} className="spin" /> : <ArrowDownToLine size={15} />} Lưu ảnh</button><span className={error ? "status-error" : "save-message"}>{message}</span></div>
        </div>
      </details>
    </motion.article>
  );
}

function FramesPanel() {
  const [frames, setFrames] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/frames")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Bộ sưu tập ảnh không hợp lệ.");
        setFrames(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <MotionPanel id="p-frames" className="frames-panel">
      <PanelTitle eyebrow="BỘ SƯU TẬP" title="Khung tranh ảnh" icon={Image} />
      <div className="frames-intro"><span>Lưu giữ những khung hình bạn yêu thích.</span><span className="frames-count">03 KHUNG ẢNH</span></div>
      {error ? <div className="state-message state-error">{error}</div> : frames.length === 0 ? <div className="state-message"><LoaderCircle className="spin" size={18} /> Đang mở bộ sưu tập…</div> : (
        <div className="frames-list">{frames.map((frame, index) => <FrameCard frame={frame} index={index} key={index} />)}</div>
      )}
    </MotionPanel>
  );
}

function App() {
  return (
    <main id="stage" className="stage">
      <header className="workspace-header">
        <span className="header-caption">TỔNG QUAN</span>
        <span className="header-status"><span className="live-dot" /> KHÔNG GIAN RIÊNG TƯ</span>
      </header>
      <div className="dashboard-grid">
        <ClockPanel />
        <PortalPanel />
        <NotesPanel />
        <FramesPanel />
      </div>
    </main>
  );
}

flushSync(() => createRoot(document.getElementById("root")).render(<App />));
