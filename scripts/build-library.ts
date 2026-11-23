/**
 * Writes library/library.json from the audio files in library/songs.
 *
 *   library/
 *     songs/
 *       song-a/            one folder per song
 *         lead-vocal.mp3   one file per track
 *         bass.mp3
 *
 * Run: npm run library:build
 * The library folder is gitignored: recordings are never committed.
 */
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LIBRARY_FOLDER = 'library';
const SONGS_FOLDER = join(LIBRARY_FOLDER, 'songs');
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
const FREE_STORAGE_BYTES = 1024 * 1024 * 1024;
const MAX_TRACKS_PER_SONG = 32;

interface TrackEntry {
  id: string;
  label: string;
  file: string;
}

interface SongEntry {
  id: string;
  title: string;
  tracks: TrackEntry[];
}

/** "Lead_Vocal 2" becomes "lead-vocal-2": safe in a web address. */
function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "lead-vocal" becomes "Lead vocal". */
function toLabel(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim();
  if (words.length === 0) {
    return name;
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isAudioFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function withoutExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot <= 0 ? fileName : fileName.slice(0, lastDot);
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function main(): void {
  if (!existsSync(SONGS_FOLDER)) {
    console.error(`There is no ${SONGS_FOLDER} folder. Create it, with one folder per song inside.`);
    process.exitCode = 1;
    return;
  }

  const songs: SongEntry[] = [];
  const problems: string[] = [];
  let totalBytes = 0;

  const songFolders = readdirSync(SONGS_FOLDER).sort();
  for (const folderName of songFolders) {
    const folderPath = join(SONGS_FOLDER, folderName);
    if (!statSync(folderPath).isDirectory()) {
      continue;
    }
    // Vercel Blob suggests lowercase paths, and spaces in a web address cause trouble.
    if (toId(folderName) !== folderName) {
      problems.push(`Rename the folder "${folderName}" to "${toId(folderName)}" (lowercase letters, numbers and dashes only).`);
      continue;
    }

    const tracks: TrackEntry[] = [];
    let songBytes = 0;
    const fileNames = readdirSync(folderPath).filter(isAudioFile).sort();
    for (const fileName of fileNames) {
      const baseName = withoutExtension(fileName);
      const extension = fileName.slice(baseName.length);
      if (toId(baseName) !== baseName || extension !== extension.toLowerCase()) {
        problems.push(`Rename "${folderName}/${fileName}" to "${toId(baseName)}${extension.toLowerCase()}".`);
        continue;
      }
      songBytes = songBytes + statSync(join(folderPath, fileName)).size;
      tracks.push({ id: baseName, label: toLabel(baseName), file: `songs/${folderName}/${fileName}` });
    }

    if (tracks.length === 0) {
      continue;
    }
    if (tracks.length > MAX_TRACKS_PER_SONG) {
      problems.push(`"${folderName}" has ${tracks.length} tracks. The lab loads at most ${MAX_TRACKS_PER_SONG}.`);
      continue;
    }
    totalBytes = totalBytes + songBytes;
    songs.push({ id: folderName, title: toLabel(folderName), tracks });
    console.log(`${folderName}: ${tracks.length} tracks, ${formatMegabytes(songBytes)}`);
  }

  if (problems.length > 0) {
    console.error('\nFix these, then run again:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exitCode = 1;
    return;
  }
  if (songs.length === 0) {
    console.error(`No audio files found in ${SONGS_FOLDER}.`);
    process.exitCode = 1;
    return;
  }

  const outputPath = join(LIBRARY_FOLDER, 'library.json');
  writeFileSync(outputPath, `${JSON.stringify({ version: 1, songs }, null, 2)}\n`);

  const percentOfFree = (totalBytes / FREE_STORAGE_BYTES) * 100;
  console.log(`\nWrote ${outputPath}: ${songs.length} songs, ${formatMegabytes(totalBytes)} in all.`);
  console.log(`That is ${percentOfFree.toFixed(0)}% of the 1 GB a free Vercel Blob store holds.`);
  console.log('Song titles and track labels are guessed from the names. Edit library.json to change them.');
  if (totalBytes > FREE_STORAGE_BYTES) {
    console.error('This is more than the free store holds. Remove songs, or use shorter or more compressed files.');
    process.exitCode = 1;
  }
}

main();
