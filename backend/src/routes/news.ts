import { Elysia } from "elysia";

// ── In-memory cache ─────────────────────────────────────
interface NewsItem {
  img: string;
  tag: string;
  title: string;
  desc: string;
  date: string;
  url: string;
}

let cachedNews: NewsItem[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchCryptoNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cachedNews.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedNews;
  }

  try {
    const res = await fetch(
      "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular"
    );
    if (!res.ok) throw new Error(`CryptoCompare HTTP ${res.status}`);
    const json = await res.json();
    const articles: any[] = json?.Data ?? [];

    // Filter only articles that have a real image (not placeholder)
    const withImages = articles.filter(
      (a: any) =>
        a.imageurl &&
        !a.imageurl.includes("default") &&
        !a.imageurl.includes("placeholder") &&
        a.imageurl.startsWith("http")
    );

    const items: NewsItem[] = withImages.slice(0, 9).map((a: any) => ({
      img: a.imageurl,
      tag: (a.categories || "Crypto").split("|")[0].trim(),
      title: a.title || "",
      desc: a.body ? a.body.slice(0, 200) + "..." : "",
      date: new Date((a.published_on || 0) * 1000).toISOString().slice(0, 10),
      url: a.url || "#",
    }));

    if (items.length > 0) {
      cachedNews = items;
      cacheTimestamp = now;
      console.log(`[News] Fetched ${items.length} crypto news articles`);
    }

    return items;
  } catch (err) {
    console.error("[News] Failed to fetch:", err);
    // Return cache even if stale
    return cachedNews;
  }
}

// ── Route ───────────────────────────────────────────────
export const newsRoutes = new Elysia({ prefix: "/news" }).get(
  "/",
  async () => {
    return fetchCryptoNews();
  },
  {
    detail: {
      tags: ["News"],
      summary: "Get latest crypto news (cached 24h)",
    },
  }
);
