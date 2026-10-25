const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const FRAME_COUNT = 3;
const MAX_TASKS_PER_DAY = 20;
const MAX_TASK_TITLE_LENGTH = 100;

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

async function handleFrames(request, env, parts) {
  const empty = () => Array.from({ length: FRAME_COUNT }, () => ({ url: "", caption: "" }));

  if (request.method === "GET" && parts.length === 0) {
    const saved = await env.NOTES.get("frames", "json");
    const frames = empty().map((f, i) => ({ ...f, ...(saved?.[i] ?? {}) }));
    return json(frames);
  }

  const index = Number(parts[0]);
  if (request.method === "PUT" && parts.length === 1 && Number.isInteger(index) && index >= 0 && index < FRAME_COUNT) {
    const body = await readBody(request);
    const url = String(body?.url ?? "").trim();
    const caption = String(body?.caption ?? "").trim().slice(0, 120);
    if (url && !/^https:\/\//i.test(url)) return json({ error: "Địa chỉ ảnh phải bắt đầu bằng https://" }, 400);
    if (url.length > 2000) return json({ error: "Địa chỉ ảnh quá dài." }, 400);

    const saved = (await env.NOTES.get("frames", "json")) ?? [];
    const frames = empty().map((f, i) => ({ ...f, ...(saved[i] ?? {}) }));
    frames[index] = { url, caption };
    await env.NOTES.put("frames", JSON.stringify(frames));
    return json(frames[index]);
  }

  return json({ error: "Not found" }, 404);
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
        if (resource === "frames") return await handleFrames(request, env, parts);
        return json({ error: "Not found" }, 404);
      } catch (err) {
        console.error(err);
        return json({ error: "Lỗi máy chủ. Vui lòng thử lại." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
