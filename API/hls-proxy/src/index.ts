/**
 * HLS Proxy Worker for Coco
 * 
 * Handles CORS and rewrites m3u8 playlist URLs to enable playback from
 * cross-origin CDNs like vault-99.owocdn.top
 * 
 * Usage: https://your-worker.subdomain.workers.dev/proxy?url=<encoded-m3u8-url>
 */

const M3U8_CONTENT_TYPES = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "application/mpegurl",
  "video/x-mpegurl",
  "audio/mpegurl",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
};

// Known CDN referer mappings
const CDN_REFERRERS: Record<string, string> = {
  'vault': 'https://kwik.cx/',
  'kwik': 'https://kwik.cx/',
};

/**
 * Get the appropriate referer for a CDN
 */
function getRefererForUrl(targetUrl: string): string | null {
  const url = new URL(targetUrl);
  const hostname = url.hostname.toLowerCase();
  
  if (hostname.includes('vault')) {
    return 'https://kwik.cx/';
  }
  
  if (hostname.includes('kwik')) {
    return 'https://kwik.cx/';
  }
  
  // Default to the origin
  return url.origin + '/';
}

/**
 * Convert relative URLs to absolute based on the base URL
 */
function resolveUrl(line: string, baseUrl: URL): string {
  // Skip empty lines and comments
  if (!line.trim() || line.startsWith("#")) {
    return line;
  }

  try {
    // If it's already an absolute URL, return as-is
    return new URL(line).href;
  } catch {
    // It's a relative URL - resolve it
    const basePath = baseUrl.pathname.split("/").slice(0, -1).join("/");
    const resolved = baseUrl.origin + basePath + "/" + line;
    return resolved;
  }
}

/**
 * Check if content is an m3u8 playlist
 */
function isM3u8(contentType: string | null, url: string): boolean {
  if (contentType && M3U8_CONTENT_TYPES.some((t) => contentType.includes(t))) {
    return true;
  }
  return url.toLowerCase().includes(".m3u8");
}

/**
 * Handle CORS preflight requests
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Main proxy handler
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // Extract the target URL from query params
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing 'url' query parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate and decode the URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get referer based on target URL
    const referer = getRefererForUrl(parsedUrl.href);
    
    // Forward these headers to bypass CDN restrictions
    // Use browser-like headers to avoid being blocked by CDN
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      ...(referer ? { "Referer": referer } : {}),
      "Origin": parsedUrl.origin,
      ...(request.headers.get("range")
        ? { Range: request.headers.get("range") || "" }
        : {}),
    };

    try {
      // Fetch the target resource
      const response = await fetch(parsedUrl.href, { headers: fetchHeaders });

      const contentType = response.headers.get("Content-Type");
      let responseBody: BodyInit | null = response.body;

      // If it's an m3u8 playlist, rewrite URLs
      if (isM3u8(contentType, parsedUrl.href) && response.body) {
        const m3u8Content = await response.text();
        const lines = m3u8Content.split("\n");
        const rewrittenLines: string[] = [];

        for (const line of lines) {
          // Preserve comments and metadata lines
          if (line.startsWith("#")) {
            // Handle EXT-X-MAP with URI attribute
            if (line.startsWith("#EXT-X-MAP:URI=")) {
              const uriMatch = line.match(/#EXT-X-MAP:URI="([^"]+)"/);
              if (uriMatch) {
                const resolved = resolveUrl(uriMatch[1], parsedUrl);
                // Reconstruct the line with proxy URL
                const searchParams = new URLSearchParams();
                searchParams.set("url", resolved);
                rewrittenLines.push(
                  `#EXT-X-MAP:URI="/proxy?${searchParams.toString()}"`
                );
                continue;
              }
            }
            // Handle EXTINF with URI attribute
            if (line.toLowerCase().includes("uri=")) {
              const uriMatch = line.match(/URI="([^"]+)"/);
              if (uriMatch) {
                const resolved = resolveUrl(uriMatch[1], parsedUrl);
                const searchParams = new URLSearchParams();
                searchParams.set("url", resolved);
                const newUri = `/proxy?${searchParams.toString()}`;
                rewrittenLines.push(line.replace(uriMatch[1], newUri));
                continue;
              }
            }
            rewrittenLines.push(line);
            continue;
          }

          // Skip empty lines
          if (!line.trim()) {
            rewrittenLines.push(line);
            continue;
          }

          // Rewrite segment URLs
          const resolved = resolveUrl(line, parsedUrl);
          const searchParams = new URLSearchParams();
          searchParams.set("url", resolved);
          rewrittenLines.push(`/proxy?${searchParams.toString()}`);
        }

        responseBody = rewrittenLines.join("\n");
      }

      // Build response headers
      const responseHeaders = new Headers(response.headers);
      
      // Add CORS headers
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      
      // Set proper content type for m3u8
      if (isM3u8(contentType, parsedUrl.href)) {
        responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
      }

      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Proxy error: ${message}`);

      return new Response(
        JSON.stringify({ error: "Failed to fetch resource", details: message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
} as ExportedHandler;