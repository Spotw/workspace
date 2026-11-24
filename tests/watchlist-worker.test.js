import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

class MemoryD1 {
  constructor() {
    this.rows = [];
  }

  prepare(query) {
    return new MemoryStatement(this, query);
  }
}

class MemoryStatement {
  constructor(database, query) {
    this.database = database;
    this.query = query;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async all() {
    if (this.query.includes("COUNT(*)")) return { results: [{ count: this.database.rows.length }] };
    if (this.query.includes("WHERE source_url =")) {
      return { results: this.database.rows.filter((row) => row.source_url === this.values[0]) };
    }
    if (this.query.includes("WHERE id =")) {
      return { results: this.database.rows.filter((row) => row.id === this.values[0]) };
    }
    assert.match(this.query, /ORDER BY COALESCE\(episode_updated_at, created_at\) DESC, created_at DESC, id ASC/);
    return { results: [...this.database.rows].sort((a, b) =>
      (b.episode_updated_at ?? b.created_at).localeCompare(a.episode_updated_at ?? a.created_at)
      || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)
    ) };
  }

  async run() {
    if (this.query.startsWith("INSERT INTO movie_watchlist")) {
      const [
        id, source_url, title, poster_url, latest_episode, latest_episode_url, latest_episode_audio, previous_episode, upcoming_episode,
        release_date, schedule_weekday, last_checked_at, sync_error, created_at, updated_at,
      ] = this.values;
      this.database.rows.push({
        id, source_url, title, poster_url, latest_episode, latest_episode_url, latest_episode_audio, previous_episode, upcoming_episode,
        release_date, schedule_weekday, last_checked_at, sync_error, created_at, updated_at, episode_updated_at: null,
      });
      return { meta: { changes: 1 } };
    }

    if (this.query.startsWith("DELETE FROM movie_watchlist")) {
      const initialLength = this.database.rows.length;
      this.database.rows = this.database.rows.filter((row) => row.id !== this.values[0]);
      return { meta: { changes: initialLength - this.database.rows.length } };
    }

    if (this.query.startsWith("UPDATE movie_watchlist SET last_checked_at")) {
      const [last_checked_at, sync_error, updated_at, id] = this.values;
      const row = this.database.rows.find((movie) => movie.id === id);
      if (row) Object.assign(row, { last_checked_at, sync_error, updated_at });
      return { meta: { changes: row ? 1 : 0 } };
    }

    if (this.query.startsWith("UPDATE movie_watchlist")) {
      const [
        title, poster_url, latest_episode, latest_episode_url, latest_episode_audio, previous_episode, upcoming_episode,
        release_date, schedule_weekday, last_checked_at, sync_error, updated_at, episode_updated_at, id,
      ] = this.values;
      const row = this.database.rows.find((movie) => movie.id === id);
      if (row) Object.assign(row, {
        title, poster_url, latest_episode, latest_episode_url, latest_episode_audio, previous_episode, upcoming_episode,
        release_date, schedule_weekday, last_checked_at, sync_error, updated_at, episode_updated_at,
      });
      return { meta: { changes: row ? 1 : 0 } };
    }

    return { meta: { changes: 0 } };
  }
}

function sourceHtml() {
  return `
    <title>Tiên Nghịch - Hoạt Hình 3D | HHKUNGFU</title>
    <meta property="og:title" content="Tiên Nghịch - Hoạt Hình 3D | HHKUNGFU">
    <meta property="og:image" content="https://hhkungfu.ee/poster.jpg">
    <div class="halim-server">
      <span class="halim-server-name">#Vietsub</span>
      <a data-ep="tap-165" href="/watch-tien-nghich/tap-165-sv1.html">Tập 165</a>
      <a data-ep="tap-164" href="/watch-tien-nghich/tap-164-sv1.html">Tập 164</a>
    </div>
    <div class="halim-server">
      <span class="halim-server-name">#Thuyết Minh:</span>
      <a data-ep="tap-165" href="/watch-tien-nghich/tap-165-sv2.html">Tập 165</a>
      <a data-ep="tap-164" href="/watch-tien-nghich/tap-164-sv2.html">Tập 164</a>
    </div>
  `;
}

test("watchlist API adds scraped metadata, rejects unsupported URLs, and deletes entries", async () => {
  const database = new MemoryD1();
  const originalFetch = globalThis.fetch;
  let latestEpisodeNumber = 165;
  globalThis.fetch = async (input, options) => {
    assert.equal(options.redirect, "manual");
    const url = new URL(input);
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /wp-admin/");
    }
    if (url.pathname === "/tien-nghich") {
      return new Response(sourceHtml()
        .replaceAll("165", String(latestEpisodeNumber))
        .replaceAll("164", String(latestEpisodeNumber - 1)));
    }
    if (url.pathname.startsWith("/showtimes/")) {
      const content = url.pathname.endsWith("/thu-4")
        ? '<main id="main-contents"><a href="/tien-nghich">Tiên Nghịch</a></main>'
        : '<main id="main-contents"><a href="/other-title">Phim khác</a></main>';
      return new Response(content);
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    const addResponse = await worker.fetch(new Request("https://workspace.test/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://workspace.test" },
      body: JSON.stringify({ url: "https://hhkungfu.ee/tien-nghich" }),
    }), { DB: database });
    const added = await addResponse.json();

    assert.equal(addResponse.status, 201);
    assert.equal(added.title, "Tiên Nghịch");
    assert.equal(added.posterUrl, "https://hhkungfu.ee/poster.jpg");
    assert.equal(added.latestEpisode, "Tập 165");
    assert.equal(added.latestEpisodeUrl, "https://hhkungfu.ee/watch-tien-nghich/tap-165-sv2.html");
    assert.equal(added.latestEpisodeAudio, "Thuyết minh");
    assert.equal(added.previousEpisode, "Tập 164");
    assert.equal(added.upcomingEpisode, "Tập 166");
    assert.match(added.releaseDate, /^\d{4}-\d{2}-\d{2}$/);

    latestEpisodeNumber = 166;
    let scheduledRefresh;
    await worker.scheduled({}, { DB: database }, { waitUntil(promise) { scheduledRefresh = promise; } });
    await scheduledRefresh;
    assert.equal(database.rows[0].latest_episode, "Tập 166");
    assert.equal(database.rows[0].latest_episode_url, "https://hhkungfu.ee/watch-tien-nghich/tap-166-sv2.html");
    assert.equal(database.rows[0].latest_episode_audio, "Thuyết minh");
    assert.equal(database.rows[0].previous_episode, "Tập 165");
    assert.equal(database.rows[0].upcoming_episode, "Tập 167");

    const duplicateResponse = await worker.fetch(new Request("https://workspace.test/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://workspace.test" },
      body: JSON.stringify({ url: "https://hhkungfu.ee/tien-nghich" }),
    }), { DB: database });
    assert.equal(duplicateResponse.status, 409);

    const invalidResponse = await worker.fetch(new Request("https://workspace.test/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://workspace.test" },
      body: JSON.stringify({ url: "https://example.com/movie" }),
    }), { DB: database });
    assert.equal(invalidResponse.status, 400);

    const deleteResponse = await worker.fetch(new Request(`https://workspace.test/api/watchlist/${added.id}`, {
      method: "DELETE",
      headers: { Origin: "https://workspace.test" },
    }), { DB: database });
    assert.equal(deleteResponse.status, 200);
    assert.equal(database.rows.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("new episodes move older movies first and ordinary or failed refreshes preserve that order", async () => {
  const database = new MemoryD1();
  database.rows = ["older", "newer"].map((id, index) => ({
    id,
    source_url: `https://hhkungfu.ee/${id}`,
    latest_episode: "Tập 165",
    schedule_weekday: null,
    episode_updated_at: null,
    created_at: `2020-01-0${index + 1}T00:00:00.000Z`,
  }));
  const originalFetch = globalThis.fetch;
  let episode = 165;
  let unavailable = false;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /", { status: unavailable ? 503 : 200 });
    }
    if (url.pathname.startsWith("/showtimes/")) {
      return new Response('<main id="main-contents"></main>');
    }
    const slug = url.pathname.slice(1);
    return new Response(sourceHtml().replaceAll("tien-nghich", slug)
      .replaceAll("165", String(slug === "older" ? episode : 165)));
  };
  const getOrder = async () => {
    const response = await worker.fetch(new Request("https://workspace.test/api/watchlist"), { DB: database });
    assert.equal(response.status, 200);
    return (await response.json()).map((movie) => movie.id);
  };
  const refresh = async () => {
    const response = await worker.fetch(new Request("https://workspace.test/api/watchlist/refresh", {
      method: "POST", headers: { Origin: "https://workspace.test" },
    }), { DB: database });
    assert.equal(response.status, 200);
    return (await response.json()).map((movie) => movie.id);
  };
  try {
    assert.deepEqual(await getOrder(), ["newer", "older"]);
    assert.deepEqual(await refresh(), ["newer", "older"]);
    episode = 166;
    assert.deepEqual(await refresh(), ["older", "newer"]);
    const updatedAt = database.rows[0].episode_updated_at;
    assert.ok(updatedAt);
    assert.equal(database.rows[1].episode_updated_at, null);
    assert.deepEqual(await getOrder(), ["older", "newer"]);
    assert.deepEqual(await refresh(), ["older", "newer"]);
    assert.equal(database.rows[0].episode_updated_at, updatedAt);
    episode = 165;
    assert.deepEqual(await refresh(), ["older", "newer"]);
    assert.equal(database.rows[0].episode_updated_at, updatedAt);
    unavailable = true;
    assert.deepEqual(await refresh(), ["older", "newer"]);
    assert.equal(database.rows[0].episode_updated_at, updatedAt);
    assert.ok(database.rows.every((row) => row.sync_error));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handles source redirects manually without using unsupported fetch options", async () => {
  const originalFetch = globalThis.fetch;
  const database = new MemoryD1();
  globalThis.fetch = async (_input, options) => {
    assert.equal(options.redirect, "manual");
    return new Response(null, {
      status: 301,
      headers: { Location: "https://hhkungfu.ee/robots.txt/" },
    });
  };

  try {
    const response = await worker.fetch(new Request("https://workspace.test/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://workspace.test" },
      body: JSON.stringify({ url: "https://hhkungfu.ee/tien-nghich" }),
    }), { DB: database });

    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /chuyển hướng/i);
    assert.equal(database.rows.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
