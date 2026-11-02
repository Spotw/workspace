export const HHKUNGFU_ORIGIN = "https://hhkungfu.ee";

export const SHOWTIME_PAGES = [
  ["thu-2", 1],
  ["thu-3", 2],
  ["thu-4", 3],
  ["thu-5", 4],
  ["thu-6", 5],
  ["thu-7", 6],
  ["chu-nhat", 0],
];

export function normalizeMovieUrl(value) {
  if (typeof value !== "string" || value.length > 500) {
    throw new Error("Hãy nhập đường dẫn phim HHKungfu hợp lệ.");
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Hãy nhập đường dẫn phim HHKungfu hợp lệ.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "hhkungfu.ee" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/i.test(url.pathname)
  ) {
    throw new Error("Chỉ hỗ trợ đường dẫn trang phim công khai trên hhkungfu.ee.");
  }

  return `${HHKUNGFU_ORIGIN}${url.pathname.replace(/\/+$/, "")}`;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(?:0*38);/gi, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function readAttribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? decodeHtml(match[2]) : "";
}

function readMeta(html, property) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = metaTags.find((candidate) => readAttribute(candidate, "property") === property);
  return tag ? readAttribute(tag, "content") : "";
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function parseMoviePage(html, sourceUrl) {
  const url = new URL(normalizeMovieUrl(sourceUrl));
  const slug = url.pathname.slice(1);
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = readMeta(html, "og:title") || (titleTag ? textContent(titleTag[1]) : "");
  const title = rawTitle
    .replace(/\s*[-|]\s*(?:Hoạt Hình|Hoat Hinh).*$/i, "")
    .trim();
  const posterUrl = readMeta(html, "og:image");
  if (!title || !posterUrl) {
    throw new Error("Không tìm thấy tên phim hoặc poster trên trang nguồn.");
  }

  const serverNames = [...html.matchAll(
    /<span\b[^>]*class=["'][^"']*\bhalim-server-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
  )].map((match) => ({
    index: match.index,
    name: textContent(match[1]).toLocaleLowerCase("vi"),
  }));
  const episodes = new Map();
  const anchorTags = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  let anchorSearchIndex = 0;
  for (const tag of anchorTags) {
    const anchorIndex = html.indexOf(tag, anchorSearchIndex);
    anchorSearchIndex = anchorIndex + tag.length;
    const href = readAttribute(tag, "href");
    let episodeUrl;
    try {
      episodeUrl = new URL(href, HHKUNGFU_ORIGIN);
    } catch {
      continue;
    }

    if (episodeUrl.origin !== HHKUNGFU_ORIGIN) continue;
    const match = episodeUrl.pathname.match(new RegExp(`^/watch-${slug}/tap-(\\d+)(?:-[^/]+)?\\.html$`, "i"));
    if (!match) continue;

    const number = Number(match[1]);
    const serverName = serverNames
      .filter((server) => server.index < anchorIndex)
      .at(-1)?.name || "";
    const episodeVersions = episodes.get(number) || [];
    episodeVersions.push({
      url: episodeUrl.href,
      isDubbed: /thuyết minh|thuyet minh/.test(serverName),
      isVietsub: /vietsub|viet sub/.test(serverName),
    });
    episodes.set(number, episodeVersions);
  }

  const recentEpisodeNumbers = [...episodes.keys()]
    .sort((left, right) => right - left)
    .slice(0, 2);
  if (recentEpisodeNumbers.length === 0) {
    throw new Error("Không tìm thấy danh sách tập trên trang nguồn.");
  }

  const latestEpisodeNumber = recentEpisodeNumbers[0];
  const latestEpisodeVersions = episodes.get(latestEpisodeNumber);
  const preferredVersion = latestEpisodeVersions.find((episode) => episode.isDubbed)
    || latestEpisodeVersions.find((episode) => episode.isVietsub);
  if (!preferredVersion) {
    throw new Error("Không xác định được bản thuyết minh hoặc Vietsub cho tập mới nhất.");
  }
  const episodeNumbers = [latestEpisodeNumber];
  const upcomingEpisode = `Tập ${Math.max(...episodeNumbers) + 1}`;
  let image;
  try {
    image = new URL(posterUrl, HHKUNGFU_ORIGIN);
  } catch {
    throw new Error("Đường dẫn poster trên trang nguồn không hợp lệ.");
  }
  if (image.protocol !== "https:") throw new Error("Đường dẫn poster trên trang nguồn không an toàn.");

  return {
    title,
    posterUrl: image.href,
    latestEpisode: `Tập ${latestEpisodeNumber}`,
    latestEpisodeUrl: preferredVersion.url,
    latestEpisodeAudio: preferredVersion.isDubbed ? "Thuyết minh" : "Vietsub",
    previousEpisode: recentEpisodeNumbers[1] ? `Tập ${recentEpisodeNumbers[1]}` : "",
    upcomingEpisode,
  };
}

export function extractScheduledSlugs(html) {
  const slugs = new Set();
  const content = html.match(/<main\b[^>]*id=["']main-contents["'][^>]*>([\s\S]*?)<\/main>/i);
  if (!content) throw new Error("Không tìm thấy danh sách lịch chiếu trên trang nguồn.");

  const anchorTags = content[1].match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const tag of anchorTags) {
    const href = readAttribute(tag, "href");
    let path;
    try {
      path = new URL(href, HHKUNGFU_ORIGIN).pathname.replace(/\/+$/, "");
    } catch {
      continue;
    }
    if (/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(path)) slugs.add(path.slice(1).toLowerCase());
  }
  return slugs;
}

export function parseRobotsRules(content) {
  const rules = [];
  let agents = [];
  let hasDirectives = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (hasDirectives) {
        agents = [];
        hasDirectives = false;
      }
      agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && agents.includes("*")) {
      hasDirectives = true;
      if (value) rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "allow" || key === "disallow") {
      hasDirectives = true;
    }
  }

  return rules;
}

export function robotsAllows(rules, pathname) {
  const matchingRules = rules.filter(({ pattern }) => {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\*/g, ".*")
      .replace(/\\\$/g, "$");
    return new RegExp(`^${escaped}`).test(pathname);
  });
  if (matchingRules.length === 0) return true;

  matchingRules.sort((left, right) => {
    const leftLength = left.pattern.replace(/[*$]/g, "").length;
    const rightLength = right.pattern.replace(/[*$]/g, "").length;
    return rightLength - leftLength || Number(right.allow) - Number(left.allow);
  });
  return matchingRules[0].allow;
}

export function getNextReleaseDate(weekday, today) {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return "";
  const date = new Date(`${today}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== today) return "";
  const difference = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + difference);
  return date.toISOString().slice(0, 10);
}
