import { computed, signal } from '@angular/core';
import { extractRegion, findMixGain, LibrarySong, LibraryTrack, SongLibrary, sumTracks } from '../../core/audio/song-library';
import { decodeToMono, fetchSongLibrary, fetchTrackBytes } from './song-loader';

/**
 * The state of "Your songs" in the Sound lab: which library, song, track and section are loaded.
 *
 * A whole song of decoded stems is hundreds of megabytes, so only two things are kept:
 * the downloaded files as they came (compressed, small) and one short section of every track.
 * Choosing another section decodes the files again, one at a time.
 */

export type SectionLength = 5 | 10 | 15;
export const SECTION_LENGTHS: SectionLength[] = [5, 10, 15];

const DEFAULT_SECTION_LENGTH: SectionLength = 10;
/** Songs mostly start with a count-in or a quiet intro, so the first section starts further in. */
const DEFAULT_START_SECONDS = 30;

export type SongStatus =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export class SongSession {
  /** Bumped whenever a new load starts, so an older load that finishes late is ignored. */
  private loadToken = 0;
  /** Cancels the downloads of the load in progress when a newer one starts. */
  private downloads = new AbortController();
  private readonly bytesByTrackId = new Map<string, ArrayBuffer>();

  readonly library = signal<SongLibrary | null>(null);
  readonly status = signal<SongStatus>({ kind: 'idle' });
  readonly songId = signal<string | null>(null);
  readonly trackId = signal<string | null>(null);
  readonly startSeconds = signal(0);
  readonly lengthSeconds = signal<SectionLength>(DEFAULT_SECTION_LENGTH);
  /** Length of the loaded song. null until its first track has been decoded. */
  readonly durationSeconds = signal<number | null>(null);
  /** The loaded section of every track of the song, by track id. */
  private readonly sections = signal<Map<string, Float32Array> | null>(null);
  /** The start and length the loaded sections were cut with. */
  private readonly loadedSection = signal<{ startSeconds: number; lengthSeconds: number } | null>(null);

  constructor(private readonly sampleRate: number) {}

  readonly song = computed<LibrarySong | null>(() => {
    const library = this.library();
    const songId = this.songId();
    if (library === null || songId === null) {
      return null;
    }
    return library.songs.find((entry) => entry.id === songId) ?? null;
  });

  readonly track = computed<LibraryTrack | null>(() => {
    const song = this.song();
    const trackId = this.trackId();
    if (song === null || trackId === null) {
      return null;
    }
    return song.tracks.find((entry) => entry.id === trackId) ?? null;
  });

  /** The section of the track being worked on. null until a section is loaded. */
  readonly trackSamples = computed<Float32Array | null>(() => {
    const sections = this.sections();
    const trackId = this.trackId();
    if (sections === null || trackId === null) {
      return null;
    }
    return sections.get(trackId) ?? null;
  });

  /** Every other track of the song added together, for the same section. */
  readonly restOfBand = computed<Float32Array | null>(() => {
    const sections = this.sections();
    const trackId = this.trackId();
    const own = this.trackSamples();
    if (sections === null || own === null) {
      return null;
    }
    const others: Float32Array[] = [];
    for (const [id, samples] of sections) {
      if (id !== trackId) {
        others.push(samples);
      }
    }
    if (others.length === 0) {
      return null;
    }
    return sumTracks(others, own.length);
  });

  /** Turns the mix down when the untouched track plus the rest of the band would clip. */
  readonly mixGain = computed<number>(() => {
    const own = this.trackSamples();
    const rest = this.restOfBand();
    if (own === null || rest === null) {
      return 1;
    }
    return findMixGain(own, rest);
  });

  /** true when the start or length was changed and "Load this section" has not been pressed yet. */
  readonly sectionChanged = computed<boolean>(() => {
    const loaded = this.loadedSection();
    if (loaded === null) {
      return false;
    }
    return loaded.startSeconds !== this.startSeconds() || loaded.lengthSeconds !== this.lengthSeconds();
  });

  /** The latest start the slider allows, so the section always fits inside the song. */
  readonly latestStartSeconds = computed<number>(() => {
    const duration = this.durationSeconds();
    if (duration === null) {
      return 0;
    }
    return Math.max(0, Math.floor(duration - this.lengthSeconds()));
  });

  /** Fetches the list of songs. Returns true when it loaded. */
  async loadLibrary(libraryUrl: string): Promise<boolean> {
    const token = this.startLoad('Reading the song list...');
    this.clearSong();
    this.library.set(null);

    const result = await fetchSongLibrary(libraryUrl, this.downloads.signal);
    if (token !== this.loadToken) {
      return false;
    }
    if (!result.ok) {
      this.status.set({ kind: 'error', message: result.error });
      return false;
    }
    this.library.set(result.value);
    this.status.set({ kind: 'idle' });
    return true;
  }

  /** Downloads every track of the song, then loads the first section. */
  async chooseSong(songId: string): Promise<void> {
    const library = this.library();
    const song = library?.songs.find((entry) => entry.id === songId);
    if (song === undefined) {
      return;
    }
    const token = this.startLoad('Starting the download...');
    this.clearSong();
    this.songId.set(song.id);
    this.trackId.set(song.tracks[0].id);

    for (let index = 0; index < song.tracks.length; index = index + 1) {
      const track = song.tracks[index];
      this.status.set({ kind: 'working', message: `Downloading track ${index + 1} of ${song.tracks.length} (${track.label})...` });
      const result = await fetchTrackBytes(track.url, this.downloads.signal);
      if (token !== this.loadToken) {
        return;
      }
      if (!result.ok) {
        this.status.set({ kind: 'error', message: result.error });
        return;
      }
      this.bytesByTrackId.set(track.id, result.value);
    }

    await this.cutSection(song, token);
  }

  chooseTrack(trackId: string): void {
    this.trackId.set(trackId);
  }

  setStart(seconds: number): void {
    const clamped = Math.min(this.latestStartSeconds(), Math.max(0, Math.round(seconds)));
    this.startSeconds.set(clamped);
  }

  setLength(seconds: SectionLength): void {
    this.lengthSeconds.set(seconds);
    // A longer section may no longer fit at the current start.
    this.setStart(this.startSeconds());
  }

  /** Cuts the chosen section out of every track of the loaded song. */
  async loadSection(): Promise<void> {
    const song = this.song();
    if (song === null || this.bytesByTrackId.size !== song.tracks.length) {
      return;
    }
    const token = this.startLoad('Preparing the section...');
    await this.cutSection(song, token);
  }

  private async cutSection(song: LibrarySong, token: number): Promise<void> {
    const cut = new Map<string, Float32Array>();
    let longestSeconds = 0;

    for (let index = 0; index < song.tracks.length; index = index + 1) {
      const track = song.tracks[index];
      const bytes = this.bytesByTrackId.get(track.id);
      if (bytes === undefined) {
        return;
      }
      this.status.set({ kind: 'working', message: `Preparing track ${index + 1} of ${song.tracks.length} (${track.label})...` });
      const decoded = await decodeToMono(bytes, this.sampleRate);
      if (token !== this.loadToken) {
        return;
      }
      if (!decoded.ok) {
        this.status.set({ kind: 'error', message: `${track.label}: ${decoded.error}` });
        return;
      }

      const trackSeconds = decoded.value.length / this.sampleRate;
      longestSeconds = Math.max(longestSeconds, trackSeconds);

      // The first time a song is loaded, its length is not known until the first track is decoded.
      const isFirstTrackOfNewSong = index === 0 && this.durationSeconds() === null;
      if (isFirstTrackOfNewSong) {
        this.durationSeconds.set(trackSeconds);
        const roomAfterDefaultStart = trackSeconds - DEFAULT_START_SECONDS;
        const startsFurtherIn = roomAfterDefaultStart >= this.lengthSeconds();
        this.startSeconds.set(startsFurtherIn ? DEFAULT_START_SECONDS : 0);
      }

      cut.set(track.id, extractRegion(decoded.value, this.sampleRate, this.startSeconds(), this.lengthSeconds()));
    }

    this.durationSeconds.set(longestSeconds);
    this.loadedSection.set({ startSeconds: this.startSeconds(), lengthSeconds: this.lengthSeconds() });
    this.sections.set(cut);
    this.status.set({ kind: 'ready' });
  }

  private startLoad(message: string): number {
    this.loadToken = this.loadToken + 1;
    // Whatever the previous load was still downloading is no longer wanted.
    this.downloads.abort();
    this.downloads = new AbortController();
    this.status.set({ kind: 'working', message });
    return this.loadToken;
  }

  private clearSong(): void {
    this.bytesByTrackId.clear();
    this.songId.set(null);
    this.trackId.set(null);
    this.sections.set(null);
    this.loadedSection.set(null);
    this.durationSeconds.set(null);
    this.startSeconds.set(0);
  }
}
