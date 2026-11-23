import { mixToMono, parseSongLibrary, SongLibrary } from '../../core/audio/song-library';

/**
 * Fetches the song library and its audio files, and decodes audio to plain samples.
 * This and loop-player.ts are the only lab files that touch the network or the Web Audio API.
 */

export type LoadResult<T> = { ok: true; value: T } | { ok: false; error: string };

function describeFetchFailure(url: string): string {
  return (
    `Could not read ${url}. Check the address and your connection. ` +
    'If the address opens in a browser tab but fails here, the file host is not allowing this app to read it (its CORS setting).'
  );
}

/** The list of songs. Always asks the host whether the list changed, so a new upload shows up. */
export async function fetchSongLibrary(libraryUrl: string): Promise<LoadResult<SongLibrary>> {
  let response: Response;
  try {
    response = await fetch(libraryUrl, { cache: 'no-cache' });
  } catch {
    return { ok: false, error: describeFetchFailure(libraryUrl) };
  }
  if (!response.ok) {
    return { ok: false, error: `The library address answered with error ${response.status}.` };
  }

  let json: unknown;
  try {
    json = await response.json();
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
export async function fetchTrackBytes(trackUrl: string): Promise<LoadResult<ArrayBuffer>> {
  let response: Response;
  try {
    response = await fetch(trackUrl);
  } catch {
    return { ok: false, error: describeFetchFailure(trackUrl) };
  }
  if (!response.ok) {
    return { ok: false, error: `${trackUrl} answered with error ${response.status}.` };
  }
  try {
    const bytes = await response.arrayBuffer();
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

  const channels: Float32Array[] = [];
  for (let channel = 0; channel < decoded.numberOfChannels; channel = channel + 1) {
    channels.push(decoded.getChannelData(channel));
  }
  return { ok: true, value: mixToMono(channels) };
}
