export const MARKER_COLORS = [
  "Red",
  "Green",
  "Blue",
  "Cyan",
  "Magenta",
  "Yellow",
  "Black",
  "White",
  "NearWhite",
  "Pink",
  "Forest",
  "Denim",
  "Violet",
  "Purple",
  "Orange",
  "Grey",
  "Gold"
];

export function secondsToFrames(seconds, fps) {
  const numericSeconds = Number(seconds);
  const numericFps = Number(fps);
  if (!Number.isFinite(numericSeconds) || !Number.isFinite(numericFps) || numericFps <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(numericSeconds * numericFps));
}

export function markerLengthFrames(startSeconds, endSeconds, fps) {
  const startFrame = secondsToFrames(startSeconds, fps);
  const endFrame = secondsToFrames(endSeconds, fps);
  return Math.max(1, endFrame - startFrame);
}

export function createGuid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function replaceGuidToken(char) {
    const random = Math.random() * 16 | 0;
    const value = char === "x" ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

export function clampMarker(marker) {
  const startTime = Math.max(0, Number(marker.startTime) || 0);
  const rawEnd = Number(marker.endTime);
  const endTime = Number.isFinite(rawEnd) && rawEnd > startTime ? rawEnd : startTime + 1;

  return {
    id: marker.id || createGuid(),
    use: marker.use !== false,
    name: String(marker.name || "Mark marker").slice(0, 80),
    comment: String(marker.comment || "").slice(0, 4000),
    color: MARKER_COLORS.includes(marker.color) ? marker.color : "Yellow",
    startTime,
    endTime,
    thumbnailUrl: String(marker.thumbnailUrl || "")
  };
}
