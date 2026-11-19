import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import ClockPanel from "./clock-card.jsx";
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

import {
  BookmarkPlus,
  CalendarDays,
  CalendarClock,
  Check,
  Clapperboard,
  Clock3,
  Coffee,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Trash2,
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

function formatWatchDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatWatchSyncTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

function WatchlistPanel() {
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function openNewMovieForm() {
    setSourceUrl("");
    setFormError("");
    setFormOpen(true);
  }

  async function loadMovies(refresh = false) {
    setStatus(refresh ? "refreshing" : "loading");
    setLoadError("");
    try {
      const data = refresh
        ? await api("/api/watchlist/refresh", { method: "POST" })
        : await api("/api/watchlist");
      if (!Array.isArray(data)) throw new Error("Danh sách phim nhận được không hợp lệ.");
      setMovies(data);
      setStatus("ready");
    } catch (error) {
      setLoadError(error.message);
      setStatus("error");
    }
  }

  useEffect(() => { loadMovies(); }, []);

  async function submitMovie(event) {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const movie = await api("/api/watchlist", {
        method: "POST",
        body: JSON.stringify({ url: sourceUrl.trim() }),
      });
      setMovies((current) => [movie, ...current]);
      setSourceUrl("");
      setFormOpen(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMovie(movie) {
    if (!window.confirm(`Xóa “${movie.title}” khỏi danh sách muốn xem?`)) return;
    try {
      await api(`/api/watchlist/${encodeURIComponent(movie.id)}`, { method: "DELETE" });
      setMovies((current) => current.filter((item) => item.id !== movie.id));
    } catch (error) {
      setLoadError(error.message);
    }
  }

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))
  );

  return (
    <MotionPanel id="p-watchlist" className="watchlist-panel">
      <PanelTitle
        eyebrow="GÓC GIẢI TRÍ"
        title="Phim muốn xem"
        icon={Clapperboard}
        action={(
          <div className="watchlist-heading-actions">
            <button className="icon-button" type="button" onClick={() => loadMovies(true)} disabled={status === "loading" || status === "refreshing"} aria-label="Cập nhật phim ngay">
              <RefreshCw size={15} className={status === "refreshing" ? "spin" : ""} />
            </button>
            <button className="watchlist-add-button" type="button" onClick={openNewMovieForm}>
              <Plus size={15} /> Thêm phim
            </button>
          </div>
        )}
      />
      {loadError && status !== "error" && <p className="watchlist-error" role="alert">{loadError}</p>}
      {formOpen && (
        <form className="watchlist-form" onSubmit={submitMovie}>
          <div className="watchlist-form-heading">
            <strong>Thêm phim vào danh sách</strong>
            <button className="icon-button" type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Đóng biểu mẫu">
              <X size={16} />
            </button>
          </div>
          <label className="watchlist-field">
            Dán đường dẫn trang phim HHKungfu
            <input
              autoFocus
              type="url"
              maxLength={500}
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://hhkungfu.ee/ten-phim"
              required
            />
          </label>
          <span className="watchlist-form-hint">Poster, tập mới nhất và lịch chiếu sẽ được đọc từ trang phim.</span>
          {formError && <p className="watchlist-error" role="alert">{formError}</p>}
          <div className="watchlist-form-actions">
            <button className="watchlist-cancel-button" type="button" onClick={() => setFormOpen(false)} disabled={saving}>Hủy</button>
            <button className="watchlist-save-button" type="submit" disabled={saving}>
              {saving ? <><LoaderCircle size={14} className="spin" /> Đang dò phim…</> : "Thêm phim"}
            </button>
          </div>
        </form>
      )}
      <div className="watchlist-toolbar">
        <span><strong>{movies.length.toString().padStart(2, "0")}</strong> phim trong danh sách</span>
        <label className="search-box">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm phim…" aria-label="Tìm phim trong danh sách" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={14} /></button>}
        </label>
      </div>
      <div className="watchlist-movies">
        {status === "loading" ? (
          <div className="state-message"><LoaderCircle className="spin" size={20} /> Đang tải danh sách phim…</div>
        ) : status === "error" ? (
          <div className="state-message state-error"><span>{loadError}</span><button className="text-button" type="button" onClick={() => loadMovies()}>Thử lại</button></div>
        ) : filteredMovies.length === 0 ? (
          <div className="empty-state watchlist-empty">
            <span className="empty-icon"><BookmarkPlus size={21} /></span>
            <strong>{query ? "Không tìm thấy phim" : "Danh sách của bạn đang trống"}</strong>
            <span>{query ? "Thử từ khóa khác nhé." : "Dán liên kết phim HHKungfu để tự lấy poster, tập mới và lịch chiếu."}</span>
          </div>
        ) : filteredMovies.map((movie, index) => (
          <motion.article
            className="watchlist-movie"
            key={movie.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="watchlist-poster">
              <span className="watchlist-poster-placeholder"><Clapperboard size={23} /></span>
              {movie.posterUrl && <img src={movie.posterUrl} alt={`Poster phim ${movie.title}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
            </div>
            <div className="watchlist-movie-content">
              <div className="watchlist-movie-heading">
                <h3><a href={movie.sourceUrl} target="_blank" rel="noreferrer">{movie.title}</a></h3>
                <div className="watchlist-movie-actions">
                  <a className="watchlist-action-button" href={movie.latestEpisodeUrl || movie.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Mở tập mới nhất ${movie.title} (${movie.latestEpisodeAudio || "Vietsub"})`} title={movie.latestEpisodeUrl ? `Mở tập mới nhất - ${movie.latestEpisodeAudio || "Vietsub"}` : "Mở trang phim"}><ExternalLink size={14} /></a>
                  <button className="watchlist-action-button watchlist-delete-button" type="button" onClick={() => deleteMovie(movie)} aria-label={`Xóa ${movie.title}`} title="Xóa phim"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="watchlist-episodes">
                <div className="watchlist-episode">
                  <span className="watchlist-episode-status">MỚI NHẤT</span>
                  <strong>
                    {movie.latestEpisodeUrl
                      ? <a href={movie.latestEpisodeUrl} target="_blank" rel="noreferrer" title={`Mở ${movie.latestEpisodeAudio || "Vietsub"}`}>
                          {movie.latestEpisode}
                        </a>
                      : movie.latestEpisode}
                  </strong>
                </div>
                <div className="watchlist-episode">
                  <span className="watchlist-episode-status">TRƯỚC ĐÓ</span>
                  <strong>{movie.previousEpisode || "Chưa có"}</strong>
                </div>
                <div className="watchlist-episode is-upcoming">
                  <span className="watchlist-episode-status"><CalendarClock size={12} /> SẮP CHIẾU</span>
                  <strong>{movie.upcomingEpisode}</strong>
                  <span className="watchlist-release-date">{movie.releaseDate ? `Dự kiến ${formatWatchDate(movie.releaseDate)}` : "Nguồn chưa công bố lịch chiếu."}</span>
                </div>
              </div>
              <div className="watchlist-sync-info">
                {movie.syncError
                  ? <span className="watchlist-sync-warning">{movie.syncError}</span>
                  : <span>Cập nhật {formatWatchSyncTime(movie.lastCheckedAt) || "vừa xong"}</span>}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
      <div className="panel-footnote"><span className="live-dot" /> TỰ ĐỒNG BỘ MỖI NGÀY <span className="footnote-right">HHKUNGFU</span></div>
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
  const [selectedPanel, setSelectedPanel] = useState("tasks");

  return (
    <main id="stage" className="stage">
      <header className="workspace-header">
        <span className="header-caption">GÓC LÀM VIỆC</span>
        <span className="header-status"><span className="live-dot" /> MỘT CHÚT BÌNH YÊN</span>
      </header>
      <div className="dashboard-grid">
        <div className="clock-section">
          <ClockPanel />
          <div className="panel-switcher" role="group" aria-label="Chọn thẻ cần hiển thị">
            <button
              className={`panel-switcher-button ${selectedPanel === "tasks" ? "is-active" : ""}`}
              type="button"
              aria-pressed={selectedPanel === "tasks"}
              onClick={() => setSelectedPanel("tasks")}
            >
              <CalendarDays size={16} /> Góc cá nhân
            </button>
            <button
              className={`panel-switcher-button ${selectedPanel === "watchlist" ? "is-active" : ""}`}
              type="button"
              aria-pressed={selectedPanel === "watchlist"}
              onClick={() => setSelectedPanel("watchlist")}
            >
              <Clapperboard size={16} /> Phim muốn xem
            </button>
          </div>
        </div>
        {selectedPanel === "tasks" ? <TasksPanel /> : <WatchlistPanel />}
      </div>
    </main>
  );
}

flushSync(() => createRoot(document.getElementById("root")).render(<App />));
