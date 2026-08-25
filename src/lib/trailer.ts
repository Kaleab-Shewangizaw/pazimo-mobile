/**
 * Turning whatever a cinema pasted into `trailerUrl` into something embeddable.
 *
 * The field is stored exactly as given, so it arrives as any of: a full watch
 * URL, a `youtu.be` short link, an already-embed URL, a Shorts link, a Vimeo
 * page, or a direct file. Guessing wrong means a blank player, so each shape is
 * matched explicitly and anything unrecognised is reported as such rather than
 * shoved into an iframe and hoped for.
 */

export type Trailer =
  | { kind: 'youtube'; embedUrl: string; id: string }
  | { kind: 'vimeo'; embedUrl: string; id: string }
  | { kind: 'file'; url: string }
  | null;

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Autoplay muted is the only autoplay mobile browsers honour without a tap. */
const YT_PARAMS = 'autoplay=1&playsinline=1&rel=0&modestbranding=1';
const VIMEO_PARAMS = 'autoplay=1&playsinline=1&title=0&byline=0&portrait=0';

export function parseTrailer(raw?: string | null): Trailer {
  const url = raw?.trim();
  if (!url) return null;

  const youtube = youtubeId(url);
  if (youtube) {
    return {
      kind: 'youtube',
      id: youtube,
      embedUrl: `https://www.youtube.com/embed/${youtube}?${YT_PARAMS}`,
    };
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  if (vimeo) {
    return {
      kind: 'vimeo',
      id: vimeo,
      embedUrl: `https://player.vimeo.com/video/${vimeo}?${VIMEO_PARAMS}`,
    };
  }

  // A direct file plays in a video element without an embed host.
  if (/\.(mp4|m4v|mov|webm)(\?|$)/i.test(url)) return { kind: 'file', url };

  return null;
}

function youtubeId(url: string): string | null {
  // Ordered longest-prefix first: `/embed/` and `/shorts/` would both be missed
  // by a bare `v=` search, and `youtu.be` carries the id in the path.
  const patterns = [
    /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]{11})/i,
    /(?:youtube\.com|youtube-nocookie\.com)\/shorts\/([\w-]{11})/i,
    /(?:youtube\.com|youtube-nocookie\.com)\/live\/([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /[?&]v=([\w-]{11})/i,
  ];

  for (const pattern of patterns) {
    const id = url.match(pattern)?.[1];
    if (id && YOUTUBE_ID.test(id)) return id;
  }
  return null;
}

/**
 * The origin to load the player HTML from. A WebView fed raw `html` has no
 * real origin of its own, so the iframe's request carries no Referer — which
 * YouTube and Vimeo both read when a trailer's owner has restricted embedding
 * to specific domains, and an empty Referer fails that check same as a wrong
 * one. Pointing the WebView's origin at the platform's own domain is
 * self-referential, so it clears that check regardless of what domains the
 * owner actually allowed.
 */
export function trailerOrigin(trailer: NonNullable<Trailer>): string {
  switch (trailer.kind) {
    case 'youtube':
      return 'https://www.youtube.com';
    case 'vimeo':
      return 'https://vimeo.com';
    case 'file':
      return 'about:blank';
  }
}

/**
 * The page handed to the WebView. The iframe is pinned edge to edge in a black
 * document because the player inherits the page's background during buffering,
 * and a white flash behind a poster-shaped cutout is the one thing that makes
 * an embed look broken.
 */
export function trailerHtml(trailer: NonNullable<Trailer>): string {
  const body =
    trailer.kind === 'file'
      ? `<video src="${escapeAttr(trailer.url)}" controls autoplay playsinline></video>`
      : `<iframe src="${escapeAttr(trailer.embedUrl)}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}
  iframe,video{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
</style></head><body>${body}</body></html>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
