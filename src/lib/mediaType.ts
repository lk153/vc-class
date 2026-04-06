const EXTENSION_MAP: Record<string, string> = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".webp": "image",
  ".svg": "image",
  ".mp3": "audio",
  ".wav": "audio",
  ".ogg": "audio",
  ".m4a": "audio",
  ".mp4": "video",
  ".webm": "video",
  ".mov": "video",
};

/**
 * Detect media type ("image" | "audio" | "video") from a URL's file extension.
 * Returns null if the extension is not recognized.
 */
export function detectMediaType(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.substring(pathname.lastIndexOf(".")).toLowerCase();
    return EXTENSION_MAP[ext] ?? null;
  } catch {
    return null;
  }
}
