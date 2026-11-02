import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import lottie from "lottie-web";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import coffeeAnimation from "./coffee-steam.json";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Coffee,
  Layers3,
  LoaderCircle,
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

function getWeekDates() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
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

function CoffeeAnimation() {
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: !reduceMotion,
      autoplay: !reduceMotion,
      animationData: coffeeAnimation,
    });
    return () => animation.destroy();
  }, []);

  return <div ref={containerRef} className="coffee-animation" />;
}

function SleepingCat() {
  return (
    <svg className="sleeping-cat" viewBox="0 0 220 140" aria-hidden="true">
      <defs>
        <linearGradient id="cat-fur" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f2d6aa" />
          <stop offset="1" stopColor="#c58b58" />
        </linearGradient>
        <linearGradient id="cat-patch" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff0d4" />
          <stop offset="1" stopColor="#e9c99d" />
        </linearGradient>
      </defs>
      <ellipse cx="119" cy="124" rx="76" ry="8" fill="#21160f" opacity=".2" />
      <g className="cat-tail">
        <path d="M164 103c31 14 53-4 42-27-7-15-28-15-32-2-3 9 5 16 13 12" fill="none" stroke="#b87b4d" strokeLinecap="round" strokeWidth="17" />
        <path d="M164 99c28 11 44-5 34-20-5-8-16-9-21-3" fill="none" stroke="#e6bb85" strokeLinecap="round" strokeWidth="8" />
      </g>
      <g className="cat-body">
        <path d="M48 103c-4-25 16-49 48-55 38-7 75 9 85 34 10 24-4 43-30 45l-82-2c-12 0-19-8-21-22Z" fill="url(#cat-fur)" />
        <path d="M104 60c8 13 9 28 2 38m29-38c8 12 9 23 5 34" fill="none" stroke="#ae7449" strokeLinecap="round" strokeWidth="5" opacity=".42" />
        <path d="M99 117c12-12 34-13 48-1-8 9-35 11-48 1Z" fill="url(#cat-patch)" opacity=".9" />
        <ellipse cx="81" cy="115" rx="15" ry="8" fill="#e9c99d" />
        <ellipse cx="143" cy="117" rx="16" ry="8" fill="#e9c99d" />
      </g>
      <g className="cat-head">
        <path d="m47 70-2-22 20 12m6 0 20-12-3 25" fill="#c58b58" stroke="#c58b58" strokeLinejoin="round" strokeWidth="5" />
        <path d="m51 64-1-9 10 7m16 0 10-7-1 12" fill="#e9b9a1" />
        <ellipse cx="67" cy="81" rx="28" ry="24" fill="url(#cat-fur)" />
        <path d="M54 82q5 6 10 0m8 0q5 6 10 0" fill="none" stroke="#704b35" strokeLinecap="round" strokeWidth="2.5" />
        <path d="m65 88 4 3 4-3" fill="#a96867" stroke="#a96867" strokeLinejoin="round" strokeWidth="1.5" />
        <path d="m56 91-13 2m13 2-12 5m37-7 13 2m-13 3 12 5" fill="none" stroke="#966b4e" strokeLinecap="round" strokeWidth="1.5" opacity=".8" />
      </g>
      <g className="cat-zzz" fill="#f3d9ac" fontFamily="Georgia, serif" fontWeight="bold">
        <text x="27" y="46" fontSize="18">z</text>
        <text x="14" y="31" fontSize="13">z</text>
      </g>
    </svg>
  );
}

function DayLabel({ label, shortLabel, date, isToday }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);
  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <>
      <button
        ref={refs.setReference}
        className="day-label"
        type="button"
        {...getReferenceProps({ "aria-label": `${label}, ${formattedDate}${isToday ? ", hôm nay" : ""}` })}
      >
        <span className="day-short">{shortLabel}</span>
        <span className="day-full">{label}</span>
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="day-tooltip"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <span>{formattedDate}</span>
            {isToday && <span className="tooltip-today">Hôm nay</span>}
          </div>
        </FloatingPortal>
      )}
    </>
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
      <div className="hero-illustration" aria-hidden="true"><CoffeeAnimation /></div>
      <div className="hero-cat" aria-hidden="true"><SleepingCat /></div>
      <div className="hero-topline">
        <div className="brand-lockup">
          <span className="brand-mark"><Coffee size={21} /></span>
          <span>BREW<span className="brand-light">/</span>WORK</span>
        </div>
        <span className="live-pill"><span className="live-dot" /> GÓC CÀ PHÊ CỦA BẠN</span>
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
        <h1>Một ngụm cà phê,<br /><span>một ngày đầy cảm hứng.</span></h1>
        <p className="hero-description">Chậm lại một nhịp, sắp xếp ý tưởng và làm điều quan trọng.</p>
        <div className="clock-display" aria-label={`Giờ hiện tại ${time}`}>{time}</div>
        <div className="hero-date"><CalendarDays size={16} /> {date}</div>
      </div>
      <div className="hero-footer">
        <span><span className="footer-spark">✳</span> PHA MỘT CHÚT TẬP TRUNG</span>
        <span className="hero-scroll">GÓC NHỎ CỦA BẠN <ArrowRight size={14} /></span>
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

function TasksPanel() {
  const [tasksByDate, setTasksByDate] = useState({});
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const today = getTodayKey();
  const weekDates = getWeekDates();

  async function loadTasks() {
    setStatus("loading");
    setLoadError("");
    try {
      const data = await api(`/api/tasks?week=${weekDates[0]}`);
      if (!data?.tasks || typeof data.tasks !== "object" || Array.isArray(data.tasks)) {
        throw new Error("Danh sách công việc không hợp lệ.");
      }
      setTasksByDate(data.tasks);
      setStatus("ready");
    } catch (err) {
      setLoadError(err.message);
      setStatus("error");
    }
  }

  useEffect(() => { loadTasks(); }, []);
  const weekTasks = Object.values(tasksByDate).flat();
  const completedCount = weekTasks.filter((task) => task.done).length;
  const progressPercent = weekTasks.length ? Math.round((completedCount / weekTasks.length) * 100) : 0;

  return (
    <MotionPanel id="p-tasks" className="tasks-panel">
      <PanelTitle
        eyebrow="GÓC CÁ NHÂN"
        title="Công việc trong tuần"
        icon={CalendarDays}
        action={
          <button className="icon-button" type="button" onClick={loadTasks} disabled={status === "loading"} aria-label="Tải lại công việc">
            <RefreshCw size={16} className={status === "loading" ? "spin" : ""} />
          </button>
        }
      />
      <div className="week-overview">
        <div><span className="week-title">Tuần của bạn</span><span className="week-subtitle">Theo dõi tiến độ công việc từng ngày.</span></div>
        <span className="week-badge"><Sun size={14} /> {DAYS.find((day) => day[0] === today)?.[1] || "Hôm nay"}</span>
      </div>
      <div className="week-progress">
        <div className="week-progress-copy"><span>TIẾN ĐỘ TUẦN</span><strong>{progressPercent}%</strong></div>
        <div
          className="week-progress-track"
          role="progressbar"
          aria-label="Tiến độ công việc trong tuần"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="tasks-list">
        {status === "loading" ? (
          <div className="state-message"><LoaderCircle className="spin" size={18} /> Đang đọc công việc từ D1…</div>
        ) : status === "error" ? (
          <div className="state-message state-error"><span>{loadError}</span><button className="text-button" type="button" onClick={loadTasks}>Thử lại</button></div>
        ) : DAYS.map(([key, label, shortLabel], index) => {
          const dayTasks = tasksByDate[weekDates[index]] || [];
          return (
            <div className={`task-day-row ${key === today ? "today" : ""}`} key={key}>
              <DayLabel label={label} shortLabel={shortLabel} date={weekDates[index]} isToday={key === today} />
              <div className="task-items">
                {dayTasks.length > 0 ? dayTasks.map((task) => (
                  <div className={`weekly-task ${task.done ? "is-done" : ""}`} key={task.id}>
                    <span className="task-check">{task.done && <Check size={11} />}</span>
                    <span className="weekly-task-title">{task.title}</span>
                  </div>
                )) : <span className="empty-day">Chưa có công việc</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="tasks-status">
        {status === "ready" ? <><Sparkles size={14} /> {completedCount}/{weekTasks.length} CÔNG VIỆC HOÀN THÀNH · D1</> : status === "loading" ? "ĐANG KẾT NỐI D1…" : "Không đọc được công việc từ D1."}
      </div>
    </MotionPanel>
  );
}

function App() {
  return (
    <main id="stage" className="stage">
      <header className="workspace-header">
        <span className="header-caption">GÓC LÀM VIỆC</span>
        <span className="header-status"><span className="live-dot" /> MỘT CHÚT BÌNH YÊN</span>
      </header>
      <div className="dashboard-grid">
        <ClockPanel />
        <TasksPanel />
        <PortalPanel />
      </div>
    </main>
  );
}

flushSync(() => createRoot(document.getElementById("root")).render(<App />));
