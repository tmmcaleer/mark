export function framesToTimecode(frameNumber, fps, dropFrame) {
  const nominalFps = Math.max(1, Math.round(Number(fps) || 24));
  let frames = Math.max(0, Math.round(Number(frameNumber) || 0));
  const separator = dropFrame ? ";" : ":";

  if (dropFrame && (nominalFps === 30 || nominalFps === 60)) {
    const dropFrames = Math.round(nominalFps * 0.066666);
    const framesPerHour = nominalFps * 60 * 60;
    const framesPer24Hours = framesPerHour * 24;
    const framesPer10Minutes = (nominalFps * 60 * 10) - (dropFrames * 9);
    const framesPerMinute = (nominalFps * 60) - dropFrames;

    frames %= framesPer24Hours;
    const tenMinuteChunks = Math.floor(frames / framesPer10Minutes);
    const remainingFrames = frames % framesPer10Minutes;
    frames += (dropFrames * 9 * tenMinuteChunks) +
      (dropFrames * Math.floor(Math.max(0, remainingFrames - dropFrames) / framesPerMinute));
  }

  const hours = Math.floor(frames / (nominalFps * 60 * 60));
  const minutes = Math.floor(frames / (nominalFps * 60)) % 60;
  const seconds = Math.floor(frames / nominalFps) % 60;
  const frame = frames % nominalFps;

  return [
    hours,
    minutes,
    seconds
  ].map(function pad(value) {
    return String(value).padStart(2, "0");
  }).join(":") + separator + String(frame).padStart(2, "0");
}

export function secondsToTimecode(seconds, fps, dropFrame) {
  return framesToTimecode(Math.round((Number(seconds) || 0) * (Number(fps) || 24)), fps, dropFrame);
}

export function markerTimecodeRange(marker, project) {
  const fps = project && project.fps ? project.fps : 24;
  const dropFrame = Boolean(project && project.dropFrame);
  return `${secondsToTimecode(marker.startTime, fps, dropFrame)} - ${secondsToTimecode(marker.endTime, fps, dropFrame)}`;
}

export function markerInTimecode(marker, project) {
  const fps = project && project.fps ? project.fps : 24;
  const dropFrame = Boolean(project && project.dropFrame);
  return secondsToTimecode(marker.startTime, fps, dropFrame);
}
