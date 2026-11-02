import assert from "node:assert/strict";
import test from "node:test";
import {
  extractScheduledSlugs,
  getNextReleaseDate,
  normalizeMovieUrl,
  parseMoviePage,
  parseRobotsRules,
  robotsAllows,
} from "../src/movie-watchlist.js";

test("accepts only HTTPS HHKungfu movie pages", () => {
  assert.equal(normalizeMovieUrl("https://hhkungfu.ee/tien-nghich/"), "https://hhkungfu.ee/tien-nghich");
  assert.throws(() => normalizeMovieUrl("https://example.com/tien-nghich"));
  assert.throws(() => normalizeMovieUrl("https://hhkungfu.ee/watch-tien-nghich/tap-165-sv1.html"));
  assert.throws(() => normalizeMovieUrl("http://hhkungfu.ee/tien-nghich"));
});

test("extracts a poster and the two latest episodes from a movie page", () => {
  const html = `
    <title>Tiên Nghịch - Hoạt Hình 3D | HHKUNGFU</title>
    <meta property="og:title" content="Tiên Nghịch - Hoạt Hình 3D | HHKUNGFU">
    <meta property="og:image" content="/wp-content/uploads/tien-nghich.jpg">
    <a href="https://hhkungfu.ee/watch-tien-nghich/tap-165-sv1.html">Tập 165</a>
    <a href="https://hhkungfu.ee/watch-tien-nghich/tap-164-sv1.html">Tập 164</a>
    <a href="https://hhkungfu.ee/watch-tien-nghich/tap-163-sv1.html">Tập 163</a>
  `;

  assert.deepEqual(parseMoviePage(html, "https://hhkungfu.ee/tien-nghich"), {
    title: "Tiên Nghịch",
    posterUrl: "https://hhkungfu.ee/wp-content/uploads/tien-nghich.jpg",
    latestEpisode: "Tập 165",
    previousEpisode: "Tập 164",
    upcomingEpisode: "Tập 166",
  });
});

test("finds titles in weekly schedule pages and computes the next airing date", () => {
  const slugs = extractScheduledSlugs(`
    <aside><a href="https://hhkungfu.ee/tien-nghich">Popular title</a></aside>
    <main id="main-contents">
      <a href="https://hhkungfu.ee/tien-nghich" title="Tiên Nghịch">Tiên Nghịch</a>
      <a href="/watch-tien-nghich/tap-165-sv1.html">Tập 165</a>
    </main>
  `);

  assert.equal(slugs.has("tien-nghich"), true);
  assert.equal(slugs.has("watch-tien-nghich"), false);
  assert.equal(getNextReleaseDate(1, "2026-11-02"), "2026-11-02");
  assert.equal(getNextReleaseDate(0, "2026-11-02"), "2026-11-08");
  assert.equal(getNextReleaseDate(1, "2026-11-03"), "2026-11-09");
});

test("respects wildcard robots.txt rules and the most specific exception", () => {
  const rules = parseRobotsRules(`
    User-agent: *
    Disallow: /wp-admin/
    Disallow: /wp-content/cache/
    Allow: /wp-content/cache/public/
    Sitemap: https://hhkungfu.ee/sitemap.xml
  `);

  assert.equal(robotsAllows(rules, "/tien-nghich"), true);
  assert.equal(robotsAllows(rules, "/wp-admin/options.php"), false);
  assert.equal(robotsAllows(rules, "/wp-content/cache/private/page"), false);
  assert.equal(robotsAllows(rules, "/wp-content/cache/public/poster"), true);
});
