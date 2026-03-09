/**
 * Detect media type from a URL string.
 * Returns 'youtube' | 'video' | 'audio' | null
 */
export function detectMediaType(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    const ext = u.pathname.split(".").pop().toLowerCase();
    if (["mp4", "webm", "ogg", "mov"].includes(ext)) return "video";
    if (["mp3", "m4a", "wav", "flac", "aac"].includes(ext)) return "audio";
    return null;
  } catch {
    return null;
  }
}
