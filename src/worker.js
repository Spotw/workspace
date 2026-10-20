const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const FRAME_COUNT = 3;

let tableReady = false;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

async function ensureTable(env) {
  if (tableReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS workspace_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loai TEXT NOT NULL,
      mo_ta TEXT NOT NULL,
      noi_dung TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
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
      "SELECT id, loai, mo_ta, noi_dung, created_at FROM workspace_entries ORDER BY id DESC LIMIT 100"
    ).all();
    return json(results);
  }

  if (request.method === "POST") {
    const body = await readBody(request);
    const loai = String(body?.loai ?? "").trim();
    const moTa = String(body?.mo_ta ?? "").trim();
    const noiDung = String(body?.noi_dung ?? "").trim();

    if (!loai || !moTa) return json({ error: "Cần nhập Loại thông tin và Mô tả." }, 400);
    if (loai.length > 100 || moTa.length > 300 || noiDung.length > 5000)
      return json({ error: "Nội dung quá dài." }, 400);

    const row = await env.DB.prepare(
      "INSERT INTO workspace_entries (loai, mo_ta, noi_dung) VALUES (?, ?, ?) RETURNING id, loai, mo_ta, noi_dung, created_at"
    )
      .bind(loai, moTa, noiDung)
      .first();
    return json(row, 201);
  }

  return json({ error: "Method not allowed" }, 405);
}

async function handleNotes(request, env, parts) {
  if (request.method === "GET" && parts.length === 0) {
    const values = await Promise.all(DAYS.map((d) => env.NOTES.get(`note:${d}`)));
    return json(Object.fromEntries(DAYS.map((d, i) => [d, values[i] ?? ""])));
  }

  if (request.method === "PUT" && parts.length === 1 && DAYS.includes(parts[0])) {
    const body = await readBody(request);
    const text = String(body?.text ?? "");
    if (text.length > 5000) return json({ error: "Ghi chú quá dài." }, 400);
    await env.NOTES.put(`note:${parts[0]}`, text);
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
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
