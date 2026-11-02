import {
  HHKUNGFU_ORIGIN,
  SHOWTIME_PAGES,
  extractScheduledSlugs,
  getNextReleaseDate,
  normalizeMovieUrl,
  parseMoviePage,
  parseRobotsRules,
  robotsAllows,
} from "./movie-watchlist.js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MAX_TASKS_PER_DAY = 20;
const MAX_TASK_TITLE_LENGTH = 100;
const MAX_WATCHLIST_ITEMS = 30;
const MAX_SOURCE_PAGE_LENGTH = 2_000_000;

let tableReady = false;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

async function ensureTable(env) {
  if (tableReady) return;
  //await env.DB.prepare(
    //`CREATE TABLE IF NOT EXISTS workspace_entries (
    //  id INTEGER PRIMARY KEY AUTOINCREMENT,
    //  loai TEXT NOT NULL,
    //  mo_ta TEXT NOT NULL,
    //  noi_dung TEXT NOT NULL DEFAULT '',
    //  created_at TEXT NOT NULL DEFAULT (datetime('now'))
   // )`
  //).run();
  tableReady = true;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleEntries(request, env) {
  await ensureTable(env);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, loai_thong_tin, mo_ta, noi_dung, created_at FROM entries ORDER BY id DESC LIMIT 100"
    ).all();
    return json(results);
  }

  return json({ error: "Method not allowed" }, 405);
}

async function handleNotes(request, env, parts) {
  if (request.method === "GET" && parts.length === 0) {
    const values = await Promise.all(DAYS.map((_, index) => env.NOTES.get(`day:${index}`)));
    return json(Object.fromEntries(DAYS.map((d, i) => [d, values[i] ?? ""])));
  }

  if (request.method === "PUT" && parts.length === 1 && DAYS.includes(parts[0])) {
    const body = await readBody(request);
    const text = String(body?.text ?? "");
    if (text.length > 5000) return json({ error: "Ghi chú quá dài." }, 400);
    await env.NOTES.put(`day:${DAYS.indexOf(parts[0])}`, text);
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

function getWeekDates(week) {
  if (typeof week !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(week) || Number(week.slice(0, 4)) < 1) {
    return null;
  }

  const monday = new Date(`${week}T00:00:00.000Z`);
  if (
    Number.isNaN(monday.getTime()) ||
    monday.toISOString().slice(0, 10) !== week ||
    monday.getUTCDay() !== 1
  ) {
    return null;
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function isValidTaskList(tasks) {
  if (!Array.isArray(tasks) || tasks.length > MAX_TASKS_PER_DAY) return false;

  const ids = new Set();
  return tasks.every((task) => {
    if (
      !task ||
      typeof task.id !== "string" ||
      task.id.length === 0 ||
      task.id.length > 80 ||
      typeof task.title !== "string" ||
      task.title.trim().length === 0 ||
      task.title.length > MAX_TASK_TITLE_LENGTH ||
      typeof task.done !== "boolean" ||
      ids.has(task.id)
    ) {
      return false;
    }
    ids.add(task.id);
    return true;
  });
}

async function handleTasks(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const weekDates = getWeekDates(new URL(request.url).searchParams.get("week"));
  if (!weekDates) return json({ error: "Tuần không hợp lệ" }, 400);

  const { results } = await env.DB.prepare(
    'SELECT date, tasks FROM "schedule_79fca2b43a5edc834a8f3b15770a19042455751b5a789575e13b65001b237197" WHERE date >= ? AND date <= ?'
  ).bind(weekDates[0], weekDates[6]).all();
  const tasksByDate = Object.fromEntries(weekDates.map((date) => [date, []]));

  for (const { date, tasks: value } of results) {
    if (!weekDates.includes(date)) continue;
    const tasks = JSON.parse(value);
    if (!isValidTaskList(tasks)) throw new Error(`Dữ liệu công việc không hợp lệ: ${date}`);
    tasksByDate[date] = tasks;
  }

  return json({ tasks: tasksByDate });
}

function getVietNamToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getWatchlistRecord(row) {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    title: row.title,
    posterUrl: row.poster_url,
    latestEpisode: row.latest_episode,
    previousEpisode: row.previous_episode,
    upcomingEpisode: row.upcoming_episode,
    releaseDate: row.release_date || "",
    lastCheckedAt: row.last_checked_at || "",
    syncError: row.sync_error || "",
  };
}

async function getRobotsRules() {
  const response = await fetch(`${HHKUNGFU_ORIGIN}/robots.txt`, {
    headers: { Accept: "text/plain" },
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("HHKungfu chuyển hướng khi đọc robots.txt; đã dừng để bảo vệ nguồn dữ liệu.");
  }
  if (!response.ok) throw new Error(`Không đọc được robots.txt của HHKungfu (${response.status}).`);
  const content = await response.text();
  if (content.length > 100_000) throw new Error("Tệp robots.txt của HHKungfu quá lớn.");
  return parseRobotsRules(content);
}

async function fetchHhkungfuPage(path, rules) {
  const url = new URL(path, HHKUNGFU_ORIGIN);
  if (url.origin !== HHKUNGFU_ORIGIN || !robotsAllows(rules, `${url.pathname}${url.search}`)) {
    throw new Error("robots.txt không cho phép đọc trang nguồn này.");
  }

  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": "WorkspaceMovieWatchlist/1.0" },
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("Trang phim HHKungfu yêu cầu chuyển hướng; không thể đọc an toàn.");
  }
  if (!response.ok) throw new Error(`HHKungfu trả về lỗi ${response.status} khi đọc trang phim.`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_SOURCE_PAGE_LENGTH) throw new Error("Trang nguồn phim vượt quá giới hạn kích thước.");
  const html = await response.text();
  if (html.length > MAX_SOURCE_PAGE_LENGTH) throw new Error("Trang nguồn phim vượt quá giới hạn kích thước.");
  return html;
}

async function readShowtimePages(rules) {
  const pages = [];
  const errors = [];
  for (const [slug, weekday] of SHOWTIME_PAGES) {
    try {
      const html = await fetchHhkungfuPage(`/showtimes/${slug}`, rules);
      pages.push({ weekday, slugs: extractScheduledSlugs(html) });
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { pages, complete: errors.length === 0, error: errors[0] || "" };
}

function getMovieSchedule(showtimes, sourceUrl, previousWeekday) {
  const slug = new URL(sourceUrl).pathname.slice(1).toLowerCase();
  const scheduled = showtimes.pages.find((page) => page.slugs.has(slug));
  const weekday = scheduled?.weekday ?? (!showtimes.complete ? previousWeekday : null);
  return {
    weekday,
    releaseDate: weekday === null ? "" : getNextReleaseDate(weekday, getVietNamToday()),
    warning: showtimes.complete ? "" : showtimes.error,
  };
}

async function getWatchlistRows(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, source_url, title, poster_url, latest_episode, previous_episode, upcoming_episode, release_date, schedule_weekday, last_checked_at, sync_error FROM movie_watchlist ORDER BY created_at DESC"
  ).all();
  return results;
}

async function saveMovieDetails(env, id, details, schedule, syncError = "") {
  const checkedAt = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE movie_watchlist
     SET title = ?, poster_url = ?, latest_episode = ?, previous_episode = ?, upcoming_episode = ?,
         release_date = ?, schedule_weekday = ?, last_checked_at = ?, sync_error = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    details.title,
    details.posterUrl,
    details.latestEpisode,
    details.previousEpisode,
    details.upcomingEpisode,
    schedule.releaseDate,
    schedule.weekday,
    checkedAt,
    syncError || schedule.warning,
    checkedAt,
    id
  ).run();
}

async function markMovieSyncError(env, id, error) {
  const checkedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE movie_watchlist SET last_checked_at = ?, sync_error = ?, updated_at = ? WHERE id = ?"
  ).bind(checkedAt, error.message || "Không thể cập nhật thông tin phim.", checkedAt, id).run();
}

function hasSameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

async function refreshWatchlist(env) {
  const rows = await getWatchlistRows(env);
  if (rows.length === 0) return;

  let rules;
  try {
    rules = await getRobotsRules();
  } catch (error) {
    await Promise.all(rows.map((row) => markMovieSyncError(env, row.id, error)));
    return;
  }
  const showtimes = await readShowtimePages(rules);

  for (const row of rows) {
    try {
      const sourceUrl = normalizeMovieUrl(row.source_url);
      const html = await fetchHhkungfuPage(sourceUrl, rules);
      const details = parseMoviePage(html, sourceUrl);
      const schedule = getMovieSchedule(showtimes, sourceUrl, row.schedule_weekday);
      await saveMovieDetails(env, row.id, details, schedule);
    } catch (error) {
      console.error(`Movie watchlist refresh failed for ${row.id}:`, error);
      await markMovieSyncError(env, row.id, error);
    }
  }
}

async function handleWatchlist(request, env, parts) {
  if (request.method === "GET" && parts.length === 0) {
    return json((await getWatchlistRows(env)).map(getWatchlistRecord));
  }

  if (request.method === "POST" && parts.length === 1 && parts[0] === "refresh") {
    if (!hasSameOrigin(request)) return json({ error: "Yêu cầu không hợp lệ." }, 403);
    await refreshWatchlist(env);
    return json((await getWatchlistRows(env)).map(getWatchlistRecord));
  }

  if (request.method === "POST" && parts.length === 0) {
    if (!hasSameOrigin(request)) return json({ error: "Yêu cầu không hợp lệ." }, 403);

    const body = await readBody(request);
    let sourceUrl;
    try {
      sourceUrl = normalizeMovieUrl(body?.url);
    } catch (error) {
      return json({ error: error.message }, 400);
    }

    const { results: existing } = await env.DB.prepare(
      "SELECT id FROM movie_watchlist WHERE source_url = ? LIMIT 1"
    ).bind(sourceUrl).all();
    if (existing.length > 0) return json({ error: "Phim này đã có trong danh sách." }, 409);

    const { results: countRows } = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM movie_watchlist"
    ).all();
    if (countRows[0].count >= MAX_WATCHLIST_ITEMS) {
      return json({ error: `Danh sách tối đa ${MAX_WATCHLIST_ITEMS} phim.` }, 400);
    }

    try {
      const rules = await getRobotsRules();
      const html = await fetchHhkungfuPage(sourceUrl, rules);
      const details = parseMoviePage(html, sourceUrl);
      const showtimes = await readShowtimePages(rules);
      const schedule = getMovieSchedule(showtimes, sourceUrl, null);
      const id = crypto.randomUUID();
      const checkedAt = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO movie_watchlist
          (id, source_url, title, poster_url, latest_episode, previous_episode, upcoming_episode,
           release_date, schedule_weekday, last_checked_at, sync_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        sourceUrl,
        details.title,
        details.posterUrl,
        details.latestEpisode,
        details.previousEpisode,
        details.upcomingEpisode,
        schedule.releaseDate,
        schedule.weekday,
        checkedAt,
        schedule.warning,
        checkedAt,
        checkedAt
      ).run();
      const { results } = await env.DB.prepare(
        "SELECT id, source_url, title, poster_url, latest_episode, previous_episode, upcoming_episode, release_date, schedule_weekday, last_checked_at, sync_error FROM movie_watchlist WHERE id = ?"
      ).bind(id).all();
      return json(getWatchlistRecord(results[0]), 201);
    } catch (error) {
      console.error("Movie watchlist add failed:", error);
      return json({ error: error.message || "Không thể đọc thông tin phim từ HHKungfu." }, 502);
    }
  }

  if (request.method === "DELETE" && parts.length === 1) {
    if (!hasSameOrigin(request)) return json({ error: "Yêu cầu không hợp lệ." }, 403);
    const { meta } = await env.DB.prepare("DELETE FROM movie_watchlist WHERE id = ?").bind(parts[0]).run();
    return meta.changes ? json({ ok: true }) : json({ error: "Không tìm thấy phim." }, 404);
  }

  return json({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const [resource, ...parts] = url.pathname.slice(5).split("/").filter(Boolean);
      try {
        if (resource === "entries") return await handleEntries(request, env);
        if (resource === "notes") return await handleNotes(request, env, parts);
        if (resource === "tasks" && parts.length === 0) return await handleTasks(request, env);
        if (resource === "watchlist") return await handleWatchlist(request, env, parts);
        return json({ error: "Not found" }, 404);
      } catch (err) {
        console.error(err);
        return json({ error: "Lỗi máy chủ. Vui lòng thử lại." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env, context) {
    context.waitUntil(refreshWatchlist(env).catch((error) => console.error("Scheduled watchlist refresh failed:", error)));
  },
};
