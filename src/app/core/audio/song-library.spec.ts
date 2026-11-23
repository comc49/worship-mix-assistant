import {
  extractRegion,
  findMixGain,
  formatSongTime,
  isLibraryUrl,
  MAX_LIBRARY_TEXT_LENGTH,
  MAX_SONGS,
  MAX_TRACKS_PER_SONG,
  mixToMono,
  mixWithBand,
  parseSongLibrary,
  sumTracks,
} from './song-library';

const LIBRARY_URL = 'https://store.example.com/library.json';

function validLibrary(): Record<string, unknown> {
  return {
    version: 1,
    songs: [
      {
        id: 'song-a',
        title: 'Song A',
        tracks: [
          { id: 'lead-vocal', label: 'Lead vocal', file: 'songs/song-a/lead-vocal.mp3' },
          { id: 'bass', label: 'Bass', file: 'https://other.example.com/bass.mp3' },
        ],
      },
    ],
  };
}

function errorOf(value: unknown): string {
  const result = parseSongLibrary(value, LIBRARY_URL);
  return result.ok ? '' : result.error;
}

describe('parseSongLibrary', () => {
  it('reads a valid library and resolves relative files against the library address', () => {
    const result = parseSongLibrary(validLibrary(), LIBRARY_URL);
    if (!result.ok) {
      throw new Error(result.error);
    }
    const tracks = result.library.songs[0].tracks;
    expect(tracks[0].url).toBe('https://store.example.com/songs/song-a/lead-vocal.mp3');
    expect(tracks[1].url).toBe('https://other.example.com/bass.mp3');
  });

  it('rejects anything that is not a version 1 library with songs', () => {
    expect(errorOf('text')).toContain('not a JSON object');
    expect(errorOf({ version: 2, songs: [] })).toContain('version');
    expect(errorOf({ version: 1, songs: [] })).toContain('no songs');
  });

  it('names the song when a track is incomplete', () => {
    const library = validLibrary();
    library['songs'] = [{ id: 'song-a', title: 'Song A', tracks: [{ id: 'bass', label: 'Bass' }] }];
    expect(errorOf(library)).toContain('Every track in "Song A"');
  });

  it('rejects a file that is not a web address', () => {
    const library = validLibrary();
    library['songs'] = [{ id: 'song-a', title: 'Song A', tracks: [{ id: 'bass', label: 'Bass', file: 'javascript:alert(1)' }] }];
    expect(errorOf(library)).toContain('not an https web address');
  });

  it('rejects plain http files, overlong text and too many songs', () => {
    const plainHttp = validLibrary();
    plainHttp['songs'] = [{ id: 'song-a', title: 'Song A', tracks: [{ id: 'bass', label: 'Bass', file: 'http://192.168.1.1/bass.mp3' }] }];
    expect(errorOf(plainHttp)).toContain('not an https web address');

    const longTitle = validLibrary();
    longTitle['songs'] = [{ id: 'song-a', title: 'x'.repeat(MAX_LIBRARY_TEXT_LENGTH + 1), tracks: [] }];
    expect(errorOf(longTitle)).toContain('at most');

    const songs = [];
    for (let index = 0; index <= MAX_SONGS; index = index + 1) {
      songs.push({ id: `s${index}`, title: `Song ${index}`, tracks: [{ id: 't', label: 'Track', file: 't.mp3' }] });
    }
    expect(errorOf({ version: 1, songs })).toContain('The most the lab reads');
  });

  it('rejects repeated ids and too many tracks', () => {
    const repeated = validLibrary();
    repeated['songs'] = [
      { id: 'song-a', title: 'Song A', tracks: [{ id: 'bass', label: 'Bass', file: 'a.mp3' }, { id: 'bass', label: 'Bass 2', file: 'b.mp3' }] },
    ];
    expect(errorOf(repeated)).toContain('twice');

    const tracks = [];
    for (let index = 0; index <= MAX_TRACKS_PER_SONG; index = index + 1) {
      tracks.push({ id: `t${index}`, label: `Track ${index}`, file: `t${index}.mp3` });
    }
    expect(errorOf({ version: 1, songs: [{ id: 'big', title: 'Big', tracks }] })).toContain('The most the lab loads');
  });
});

describe('isLibraryUrl', () => {
  it('accepts https addresses, and http only on this computer', () => {
    expect(isLibraryUrl('https://store.example.com/library.json')).toBe(true);
    expect(isLibraryUrl('  http://localhost:4200/library.json ')).toBe(true);
    expect(isLibraryUrl('http://store.example.com/library.json')).toBe(false);
    expect(isLibraryUrl('library.json')).toBe(false);
    expect(isLibraryUrl('file:///tmp/library.json')).toBe(false);
    expect(isLibraryUrl('')).toBe(false);
  });
});

describe('sample arithmetic', () => {
  it('averages channels into mono', () => {
    const mono = mixToMono([new Float32Array([1, 0, -1]), new Float32Array([0, 0, -1])]);
    expect(Array.from(mono)).toEqual([0.5, 0, -1]);
  });

  it('cuts a section of the asked-for length and pads a short track with silence', () => {
    const samples = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // Sample rate 2: one second is two samples.
    expect(Array.from(extractRegion(samples, 2, 1, 2))).toEqual([2, 3, 4, 5]);
    expect(Array.from(extractRegion(samples, 2, 4, 2))).toEqual([8, 9, 0, 0]);
    expect(Array.from(extractRegion(samples, 2, 20, 1))).toEqual([0, 0]);
  });

  it('sums tracks of different lengths', () => {
    const sum = sumTracks([new Float32Array([1, 1, 1]), new Float32Array([0.5])], 3);
    expect(Array.from(sum)).toEqual([1.5, 1, 1]);
  });

  it('turns the mix down only when it would clip', () => {
    const quietTrack = new Float32Array([0.2, -0.2]);
    const quietBand = new Float32Array([0.3, -0.3]);
    expect(findMixGain(quietTrack, quietBand)).toBe(1);

    const loudTrack = new Float32Array([0.9, -0.9]);
    const loudBand = new Float32Array([0.9, -0.9]);
    const gain = findMixGain(loudTrack, loudBand);
    expect(gain).toBeCloseTo(0.5, 5);
    const mixed = mixWithBand(loudTrack, loudBand, gain);
    expect(mixed[0]).toBeCloseTo(0.9, 5);
  });

  it('formats seconds as minutes and seconds', () => {
    expect(formatSongTime(0)).toBe('0:00');
    expect(formatSongTime(65.7)).toBe('1:05');
  });
});
