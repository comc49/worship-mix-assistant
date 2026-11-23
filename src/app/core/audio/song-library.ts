/**
 * The song library: a list of songs, each with separate tracks (stems), that lives on a file host
 * such as Vercel Blob. The app only reads it. This file is pure: it checks the list and does the
 * sample arithmetic. Fetching and decoding live in features/lab/song-loader.ts.
 *
 * The list is one JSON file ("library.json"):
 *
 *   {
 *     "version": 1,
 *     "songs": [
 *       {
 *         "id": "song-a",
 *         "title": "Song A",
 *         "tracks": [
 *           { "id": "lead-vocal", "label": "Lead vocal", "file": "songs/song-a/lead-vocal.mp3" }
 *         ]
 *       }
 *     ]
 *   }
 *
 * A track's "file" is a full URL, or a path relative to where library.json itself is.
 */

export const SONG_LIBRARY_VERSION = 1;

/** More stems than this is too much to download and hold in a browser tab. */
export const MAX_TRACKS_PER_SONG = 32;
export const MAX_SONGS = 200;
/** Longest id, title or label. The list comes from the internet, so its text is not trusted. */
export const MAX_LIBRARY_TEXT_LENGTH = 120;

export interface LibraryTrack {
  id: string;
  label: string;
  /** Always a full URL after parsing. */
  url: string;
}

export interface LibrarySong {
  id: string;
  title: string;
  tracks: LibraryTrack[];
}

export interface SongLibrary {
  songs: LibrarySong[];
}

export type LibraryParseResult = { ok: true; library: SongLibrary } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Like readText, for the texts that are shown on screen: also refuses an overlong one. */
function readShortText(record: Record<string, unknown>, key: string): string | null {
  const text = readText(record, key);
  if (text === null || text.length > MAX_LIBRARY_TEXT_LENGTH) {
    return null;
  }
  return text;
}

/**
 * Only https addresses are accepted: the deployed app is served over https and the browser
 * blocks anything else, and a list must not be able to point the app at plain-http hosts on
 * the local network. Plain http is allowed for this computer only, for trying things out.
 */
function isAllowedAddress(address: URL): boolean {
  if (address.protocol === 'https:') {
    return true;
  }
  const isThisComputer = address.hostname === 'localhost' || address.hostname === '127.0.0.1';
  return address.protocol === 'http:' && isThisComputer;
}

/** Turns a track's "file" into a full URL. null when it cannot be one, or is not an allowed address. */
function resolveFileUrl(file: string, libraryUrl: string): string | null {
  let resolved: URL;
  try {
    resolved = new URL(file, libraryUrl);
  } catch {
    return null;
  }
  return isAllowedAddress(resolved) ? resolved.toString() : null;
}

function parseTrack(value: unknown, songTitle: string, libraryUrl: string): LibraryTrack | string {
  if (!isRecord(value)) {
    return `A track in "${songTitle}" is not an object.`;
  }
  const id = readShortText(value, 'id');
  const label = readShortText(value, 'label');
  const file = readText(value, 'file');
  if (id === null || label === null || file === null) {
    return `Every track in "${songTitle}" needs an "id", a "label" and a "file", each at most ${MAX_LIBRARY_TEXT_LENGTH} characters.`;
  }
  const url = resolveFileUrl(file, libraryUrl);
  if (url === null) {
    return `A file in "${songTitle}" is not an https web address.`;
  }
  return { id, label, url };
}

function parseSong(value: unknown, libraryUrl: string): LibrarySong | string {
  if (!isRecord(value)) {
    return 'A song in the list is not an object.';
  }
  const id = readShortText(value, 'id');
  const title = readShortText(value, 'title');
  if (id === null || title === null) {
    return `Every song needs an "id" and a "title", each at most ${MAX_LIBRARY_TEXT_LENGTH} characters.`;
  }
  const rawTracks = value['tracks'];
  if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
    return `"${title}" has no tracks.`;
  }
  if (rawTracks.length > MAX_TRACKS_PER_SONG) {
    return `"${title}" has ${rawTracks.length} tracks. The most the lab loads is ${MAX_TRACKS_PER_SONG}.`;
  }

  const tracks: LibraryTrack[] = [];
  const seenIds = new Set<string>();
  for (const rawTrack of rawTracks) {
    const track = parseTrack(rawTrack, title, libraryUrl);
    if (typeof track === 'string') {
      return track;
    }
    if (seenIds.has(track.id)) {
      return `"${title}" uses the track id "${track.id}" twice.`;
    }
    seenIds.add(track.id);
    tracks.push(track);
  }
  return { id, title, tracks };
}

/**
 * Checks the JSON of a library file and resolves every track file to a full URL.
 * The value comes from the internet, so nothing about its shape is trusted.
 */
export function parseSongLibrary(value: unknown, libraryUrl: string): LibraryParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'The library file is not a JSON object.' };
  }
  if (value['version'] !== SONG_LIBRARY_VERSION) {
    return { ok: false, error: `The library file needs "version": ${SONG_LIBRARY_VERSION}.` };
  }
  const rawSongs = value['songs'];
  if (!Array.isArray(rawSongs) || rawSongs.length === 0) {
    return { ok: false, error: 'The library file lists no songs.' };
  }
  if (rawSongs.length > MAX_SONGS) {
    return { ok: false, error: `The library file lists ${rawSongs.length} songs. The most the lab reads is ${MAX_SONGS}.` };
  }

  const songs: LibrarySong[] = [];
  const seenIds = new Set<string>();
  for (const rawSong of rawSongs) {
    const song = parseSong(rawSong, libraryUrl);
    if (typeof song === 'string') {
      return { ok: false, error: song };
    }
    if (seenIds.has(song.id)) {
      return { ok: false, error: `The song id "${song.id}" is used twice.` };
    }
    seenIds.add(song.id);
    songs.push(song);
  }
  return { ok: true, library: { songs } };
}

/** true when the text is an address the lab may fetch: https, or http on this computer. */
export function isLibraryUrl(text: string): boolean {
  return resolveFileUrl(text.trim(), 'invalid:') !== null;
}

// --- Sample arithmetic ---------------------------------------------------------

/** Averages a file's channels into one. The lab works in mono, like one console channel. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) {
    return new Float32Array(0);
  }
  if (channels.length === 1) {
    return new Float32Array(channels[0]);
  }
  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (const channel of channels) {
    for (let index = 0; index < length; index = index + 1) {
      mono[index] = mono[index] + channel[index];
    }
  }
  for (let index = 0; index < length; index = index + 1) {
    mono[index] = mono[index] / channels.length;
  }
  return mono;
}

/**
 * Cuts a section out of a track. The result always has the asked-for length: where the track is
 * shorter than the section, the rest is silence, so every track of a song stays lined up.
 */
export function extractRegion(samples: Float32Array, sampleRate: number, startSeconds: number, lengthSeconds: number): Float32Array {
  const startIndex = Math.max(0, Math.round(startSeconds * sampleRate));
  const length = Math.max(0, Math.round(lengthSeconds * sampleRate));
  const region = new Float32Array(length);
  if (startIndex >= samples.length) {
    return region;
  }
  const available = samples.subarray(startIndex, Math.min(samples.length, startIndex + length));
  region.set(available);
  return region;
}

/** Adds tracks together, sample by sample. Used for "the rest of the band". */
export function sumTracks(tracks: Float32Array[], length: number): Float32Array {
  const sum = new Float32Array(length);
  for (const track of tracks) {
    const usable = Math.min(length, track.length);
    for (let index = 0; index < usable; index = index + 1) {
      sum[index] = sum[index] + track[index];
    }
  }
  return sum;
}

const MIX_PEAK_TARGET = 0.9;

/**
 * How much to turn the whole mix down so the untouched track plus the rest of the band does not
 * clip. Worked out once per section from the untouched track, so moving a control never changes
 * it and the loudness comparison stays fair. Never turns the mix up.
 */
export function findMixGain(track: Float32Array, restOfBand: Float32Array): number {
  let peak = 0;
  const length = Math.min(track.length, restOfBand.length);
  for (let index = 0; index < length; index = index + 1) {
    const magnitude = Math.abs(track[index] + restOfBand[index]);
    if (magnitude > peak) {
      peak = magnitude;
    }
  }
  if (peak <= MIX_PEAK_TARGET) {
    return 1;
  }
  return MIX_PEAK_TARGET / peak;
}

/** The track being worked on, plus the rest of the band, at the given gain. */
export function mixWithBand(track: Float32Array, restOfBand: Float32Array, gain: number): Float32Array {
  const mixed = new Float32Array(track.length);
  for (let index = 0; index < track.length; index = index + 1) {
    const other = index < restOfBand.length ? restOfBand[index] : 0;
    mixed[index] = (track[index] + other) * gain;
  }
  return mixed;
}

/** "1:05" for 65 seconds. */
export function formatSongTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  const paddedSeconds = remainder < 10 ? `0${remainder}` : `${remainder}`;
  return `${minutes}:${paddedSeconds}`;
}
