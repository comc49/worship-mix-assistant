import { mixToMono, parseSongLibrary, SongLibrary } from '../../core/audio/song-library';

/**
 * Fetches the song library and its audio files, and decodes audio to plain samples.
 * This and loop-player.ts are the only lab files that touch the network or the Web Audio API.
 */

export type LoadResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Limits on what is downloaded. A wrong or hostile address must not be able to fill the tab's memory. */
const MAX_LIBRARY_FILE_BYTES = 1024 * 1024;
export const MAX_TRACK_BYTES = 100 * 1024 * 1024;
export const MAX_TRACK_MINUTES = 15;
const MEGABYTE = 1024 * 1024;

/** The size the host announces for a file, or null when it does not say. */
function announcedBytes(response: Response): number | null {
  const header = response.headers.get('content-length');
  if (header === null) {
    return null;
  }
  const bytes = Number(header);
  return Number.isFinite(bytes) ? bytes : null;
}

function isTooBig(response: Response, limitBytes: number): boolean {
  const announced = announcedBytes(response);
  return announced !== null && announced > limitBytes;
}

function describeFetchFailure(url: string): string {
  return (
    `Could not read ${url}. Check the address and your connection. ` +
    'If the address opens in a browser tab but fails here, the file host is not allowing this app to read it (its CORS setting).'
  );
}

/** The list of songs. Always asks the host whether the list changed, so a new upload shows up. */
export async function fetchSongLibrary(libraryUrl: string, signal: AbortSignal): Promise<LoadResult<SongLibrary>> {
  let response: Response;
  try {
    response = await fetch(libraryUrl, { cache: 'no-cache', signal });
  } catch {
    return { ok: false, error: describeFetchFailure(libraryUrl) };
  }
  if (!response.ok) {
    return { ok: false, error: `The library address answered with error ${response.status}.` };
  }

  const tooBigMessage = 'The library file is larger than 1 MB, so this is not a song list.';
  if (isTooBig(response, MAX_LIBRARY_FILE_BYTES)) {
    return { ok: false, error: tooBigMessage };
  }

  let json: unknown;
  try {
    const text = await response.text();
    // The host does not always announce the size, so it is checked again once it is known.
    if (text.length > MAX_LIBRARY_FILE_BYTES) {
      return { ok: false, error: tooBigMessage };
    }
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The library file is not valid JSON.' };
  }

  const parsed = parseSongLibrary(json, libraryUrl);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, value: parsed.library };
}

/** One audio file, still compressed. The browser's own cache keeps it for the next visit. */
export async function fetchTrackBytes(trackUrl: string, signal: AbortSignal): Promise<LoadResult<ArrayBuffer>> {
  let response: Response;
  try {
    response = await fetch(trackUrl, { signal });
  } catch {
    return { ok: false, error: describeFetchFailure(trackUrl) };
  }
  if (!response.ok) {
    return { ok: false, error: `${trackUrl} answered with error ${response.status}.` };
  }
  const tooBigMessage = `${trackUrl} is larger than ${MAX_TRACK_BYTES / MEGABYTE} MB. Use an MP3 or a shorter excerpt.`;
  if (isTooBig(response, MAX_TRACK_BYTES)) {
    return { ok: false, error: tooBigMessage };
  }
  try {
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_TRACK_BYTES) {
      return { ok: false, error: tooBigMessage };
    }
    return { ok: true, value: bytes };
  } catch {
    return { ok: false, error: `The download of ${trackUrl} was cut off.` };
  }
}

/**
 * Decodes an audio file (MP3, WAV, AAC, whatever this browser plays) into mono samples at the
 * given sample rate. An OfflineAudioContext resamples for us and needs no click to start.
 */
export async function decodeToMono(bytes: ArrayBuffer, sampleRate: number): Promise<LoadResult<Float32Array>> {
  if (typeof OfflineAudioContext === 'undefined') {
    return { ok: false, error: 'This browser cannot decode audio files.' };
  }
  const context = new OfflineAudioContext(1, 1, sampleRate);

  let decoded: AudioBuffer;
  try {
    // decodeAudioData empties the buffer it is given, so it gets a copy and ours stays usable.
    decoded = await context.decodeAudioData(bytes.slice(0));
  } catch {
    return { ok: false, error: 'This browser could not decode the file. MP3 and WAV work everywhere.' };
  }

  const minutes = decoded.duration / 60;
  if (minutes > MAX_TRACK_MINUTES) {
    return { ok: false, error: `The file is ${Math.round(minutes)} minutes long. The lab takes files up to ${MAX_TRACK_MINUTES} minutes.` };
  }

  const channels: Float32Array[] = [];
  for (let channel = 0; channel < decoded.numberOfChannels; channel = channel + 1) {
    channels.push(decoded.getChannelData(channel));
  }
  return { ok: true, value: mixToMono(channels) };
}
