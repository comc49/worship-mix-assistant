# Worship Mix Assistant

A web app for volunteer sound mixers. Enter this week's band, the room and the console; get a starting mix as a step-by-step setup sheet for the Behringer X32 or WING Compact, plus a troubleshooter by symptom.

No backend, no accounts, no AI calls at runtime. Everything is computed by a rules engine over a typed knowledge base, and saved only in this browser.

Read `CLAUDE.md` for the design decisions and `docs/DECISIONS.md` for the choices made while building.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Dev server on http://localhost:4200 |
| `npm test -- --watch=false` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run e2e` | Playwright end-to-end tests and screenshots (tablet and phone) |
| `npm run e2e:offline` | Builds for production and checks the app works with the network off |
| `npm run build` | Production build into `dist/` |
| `npm run print:plan` | The fixture band's mix plan as text |
| `npm run print:sheet` | The fixture band's X32 sheet as text (`npm run print:sheet -- wing` for the WING Compact) |
| `npm run library:build` | Writes `library/library.json` from the audio files in `library/songs` (see "Your own songs in the Sound lab") |
| `npm run docs` | Regenerates `docs/console-sources.md`, `docs/knowledge-review.md`, `docs/troubleshooting-review.md` and re-checks every manual quote |

## Your own songs in the Sound lab

The Sound lab can work on a track of a real song, with the rest of the band playing around it. The songs live on a file host; the app only reads them. Nothing here needs a backend.

**What the lab does with a song.** It downloads every track of the song, cuts out one section of 5, 10 or 15 seconds, and loops it. You pick the track to work on; the others play untouched, or you solo your track. Tracks play in mono, like one console channel. It needs a connection: songs are not available offline.

**Before you upload.** Anyone who has the address can listen. Upload only recordings you are allowed to share: your own console recordings, not purchased multitracks, and name tracks by instrument ("lead-vocal"), not by person.

### 1. Lay the files out

```
library/
  songs/
    song-a/            one folder per song
      lead-vocal.mp3   one file per track, all the same length
      bass.mp3
```

Lowercase letters, numbers and dashes only. `library/` is gitignored. Then:

```bash
npm run library:build
```

This writes `library/library.json` and says how much of the free 1 GB the songs use. Titles and labels are guessed from the names; edit the file to change them.

### 2. How much fits for free

A Vercel Blob store on the Hobby (free) plan holds 1 GB and allows 10 GB of downloads a month. Past either limit the store stops answering for 30 days; it does not bill you. (Vercel docs, "Vercel Blob usage and pricing", read 2026-11-23.)

| Files | One 5-minute song, 12 tracks | Songs in 1 GB |
| --- | --- | --- |
| MP3, 192 kbps | about 86 MB | about 11 |
| MP3, 128 kbps | about 58 MB | about 17 |
| WAV, 16-bit 44.1 kHz mono | about 318 MB | 3 |
| MP3, 192 kbps, one-minute excerpt | about 17 MB | about 59 |

Use MP3. The lab only loops a short section, so a one-minute excerpt of the loudest part of a song is as useful as the whole song.

### 3. Upload to Vercel Blob

These commands are from the Vercel CLI docs and have not been run for this project yet. They need a current CLI (`npm i -g vercel@latest`) and `vercel link` run once in this folder.

```bash
vercel blob create-store worship-mix-library --access public --yes
```

```bash
find library/songs -type f | while read -r file; do vercel blob put "$file" --pathname "${file#library/}" --access public --force; done
```

```bash
vercel blob put library/library.json --pathname library.json --access public --force --cache-control-max-age 60
```

The last command prints the address of `library.json` (`https://<store-id>.public.blob.vercel-storage.com/library.json`). Paste it into Sound lab > Your songs > Load. It is remembered on that device.

To add a song later: add its folder, run `npm run library:build`, upload the new files and `library.json` again.

### If it does not load

- **"Could not read ..."**: open the address in a browser tab. If it opens there but not in the lab, the host is not allowing the app to read it (CORS). Vercel's docs do not say whether Blob allows this, and it has not been tested here. Any host that sends `Access-Control-Allow-Origin` works the same way (Cloudflare R2 and S3 let you set it).
- **A changed file still plays the old version**: files are cached by the browser for up to 30 days. Upload it under a new name and run `npm run library:build` again.

## What to review by hand

- `docs/knowledge-review.md`: every audio value, modifier and limit, with the ten least certain at the top.
- `docs/console-sources.md`: every console fact with its manual page and quote, and the UNVERIFIED list to check on the real consoles.
- `docs/troubleshooting-review.md`: every troubleshooting tree in plain language.

## Manuals

`docs/manuals/` is gitignored. Put the X32 and WING series user manual PDFs there (from the product pages on behringer.com) as `x32-user-manual.pdf` and `wing-series-user-manual.pdf` so `npm run docs` can re-check quotes.

## Licence

MIT. See [LICENSE](LICENSE). The console manuals quoted in the knowledge base belong to their publishers and are not covered by it.
