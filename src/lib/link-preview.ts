/**
 * Link unfurling for chat messages — the title/image card other messaging
 * apps show under a pasted link. Done on the device, straight from the
 * page's own Open Graph / Twitter-card tags, so no backend endpoint is
 * involved. YouTube gets a special case: its thumbnails live at a fixed URL
 * and its oEmbed endpoint returns the title without scraping the page.
 *
 * On web this mostly comes back empty — browsers block reading another
 * site's HTML (CORS) — and the message simply renders without a card.
 */

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName: string;
  /** A video page — the card overlays a play button on the image. */
  video: boolean;
};

const TIMEOUT_MS = 8000;
// Open Graph tags live in <head>; there's no need to scan a whole page.
const MAX_HTML_CHARS = 400_000;

const YOUTUBE_ID =
  /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

function hostOf(url: string): string {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return (match?.[1] ?? url).toLowerCase().replace(/^www\./, '');
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    .trim();
}

function attr(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return match ? (match[2] ?? match[3] ?? match[4]) : undefined;
}

/** `og:image` is sometimes relative or protocol-relative. */
function absolutize(src: string | undefined, base: string): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return `https:${src}`;
  const origin = /^https?:\/\/[^/?#]+/i.exec(base)?.[0];
  if (!origin) return undefined;
  if (src.startsWith('/')) return origin + src;
  return `${base.replace(/[?#].*$/, '').replace(/[^/]*$/, '')}${src}`;
}

async function fetchYouTube(url: string, videoId: string): Promise<LinkPreview> {
  const preview: LinkPreview = {
    url,
    image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    siteName: 'YouTube',
    video: true,
  };
  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    );
    if (res.ok) {
      const data: { title?: string; author_name?: string } = await res.json();
      preview.title = data.title;
      preview.description = data.author_name;
    }
  } catch {
    // The thumbnail alone is still a good card.
  }
  return preview;
}

async function fetchOpenGraph(url: string): Promise<LinkPreview | null> {
  const res = await fetchWithTimeout(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!res.ok) return null;
  const type = res.headers.get('content-type') ?? '';

  // A direct link to an image is its own preview.
  if (type.startsWith('image/')) {
    return { url, image: url, siteName: hostOf(url), video: false };
  }
  if (!type.includes('html')) return null;

  const html = (await res.text()).slice(0, MAX_HTML_CHARS);
  const head = html.split(/<\/head>/i)[0];
  const meta: Record<string, string> = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, 'property') ?? attr(tag, 'name'))?.toLowerCase();
    const content = attr(tag, 'content');
    if (key && content && !(key in meta)) meta[key] = decodeEntities(content);
  }
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];

  // Redirects (a shortener, http→https) land on the final page; resolve
  // relative images against that, not the link as typed.
  const finalUrl = res.url || url;
  const title = meta['og:title'] ?? meta['twitter:title'] ?? (titleTag ? decodeEntities(titleTag) : undefined);
  const image = absolutize(
    meta['og:image:secure_url'] ?? meta['og:image'] ?? meta['twitter:image'] ?? meta['twitter:image:src'],
    finalUrl,
  );
  if (!title && !image) return null;

  return {
    url,
    title,
    description: meta['og:description'] ?? meta['twitter:description'] ?? meta.description,
    image,
    siteName: meta['og:site_name'] ?? hostOf(finalUrl),
    video: (meta['og:type'] ?? '').startsWith('video'),
  };
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  const youtube = YOUTUBE_ID.exec(url);
  if (youtube) return fetchYouTube(url, youtube[1]);
  try {
    return await fetchOpenGraph(url);
  } catch {
    return null;
  }
}
