import { expect, Page, test } from '@playwright/test';

/**
 * "Your songs" in the Sound lab, against a pretend file host. The host is answered by the test
 * itself, with two generated tones as the tracks, so no real recording is needed or committed.
 */

const HOST = 'https://library.example.test';
const LIBRARY_URL = `${HOST}/library.json`;
const SONG_SECONDS = 40;
const WAV_SAMPLE_RATE = 8000;

/** A mono 16-bit WAV file holding one steady tone. */
function buildToneWav(frequencyHz: number, level: number): Buffer {
  const sampleCount = SONG_SECONDS * WAV_SAMPLE_RATE;
  const dataBytes = sampleCount * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); // size of the format block
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // one channel
  wav.writeUInt32LE(WAV_SAMPLE_RATE, 24);
  wav.writeUInt32LE(WAV_SAMPLE_RATE * 2, 28); // bytes per second
  wav.writeUInt16LE(2, 32); // bytes per sample
  wav.writeUInt16LE(16, 34); // bits per sample
  wav.write('data', 36);
  wav.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < sampleCount; index = index + 1) {
    const value = Math.sin((2 * Math.PI * frequencyHz * index) / WAV_SAMPLE_RATE) * level;
    wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  return wav;
}

const CORS_HEADERS = { 'access-control-allow-origin': '*' };

async function servePretendLibrary(page: Page): Promise<void> {
  const library = {
    version: 1,
    songs: [
      {
        id: 'song-a',
        title: 'Song A',
        tracks: [
          { id: 'lead-vocal', label: 'Lead vocal', file: 'songs/song-a/lead-vocal.wav' },
          { id: 'bass', label: 'Bass', file: 'songs/song-a/bass.wav' },
        ],
      },
    ],
  };
  await page.route(LIBRARY_URL, (route) => route.fulfill({ json: library, headers: CORS_HEADERS }));
  await page.route(`${HOST}/songs/song-a/lead-vocal.wav`, (route) =>
    route.fulfill({ body: buildToneWav(440, 0.8), contentType: 'audio/wav', headers: CORS_HEADERS }),
  );
  await page.route(`${HOST}/songs/song-a/bass.wav`, (route) =>
    route.fulfill({ body: buildToneWav(110, 0.5), contentType: 'audio/wav', headers: CORS_HEADERS }),
  );
  await page.route(`${HOST}/missing.json`, (route) => route.fulfill({ status: 404, body: 'Not found', headers: CORS_HEADERS }));
}

test('the Sound lab loads a song from a library address and processes one track', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet', 'The lab is a laptop screen; one run is enough.');
  await page.setViewportSize({ width: 1366, height: 800 });
  await servePretendLibrary(page);
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Got it' }).click();

  await page.getByTestId('lab-source-song').click();

  // Something that is not an address is refused before any request is made.
  await page.getByTestId('lab-library-url').fill('library.json');
  await page.getByTestId('lab-library-load').click();
  await expect(page.getByRole('alert')).toContainText('starting with https://');

  // A wrong address says what the host answered.
  await page.getByTestId('lab-library-url').fill(`${HOST}/missing.json`);
  await page.getByTestId('lab-library-load').click();
  await expect(page.getByTestId('lab-song-error')).toContainText('404');

  await page.getByTestId('lab-library-url').fill(LIBRARY_URL);
  await page.getByTestId('lab-library-load').click();
  await page.getByTestId('lab-song').selectOption('song-a');
  await expect(page.getByTestId('lab-song-status')).toContainText('Loaded');

  // A 40-second song starts 30 seconds in, with a 10-second section.
  await expect(page.getByTestId('lab-section-text')).toHaveText('0:30 to 0:40 of 0:40');

  // The compressor now works on the lead vocal tone, which peaks near -2 dB.
  await page.locator('[data-control="thresholdDb"]').fill('200');
  const maxReduction = Number.parseFloat((await page.getByTestId('lab-max-reduction').innerText()).trim());
  expect(maxReduction).toBeGreaterThan(5);

  // Another section is cut only when asked for.
  await page.getByTestId('lab-section-start').fill('5');
  await expect(page.getByTestId('lab-section-text')).toHaveText('0:05 to 0:15 of 0:40');
  await page.getByTestId('lab-section-load').click();
  await expect(page.getByTestId('lab-section-load')).toBeDisabled();
  await expect(page.getByTestId('lab-song-status')).toContainText('Loaded');

  await page.getByTestId('lab-play').click();
  await expect(page.getByTestId('lab-play')).toHaveText('Stop');
  await expect(page.getByTestId('lab-live-reduction')).toContainText('dB');

  await page.getByTestId('lab-with-band').click();
  await expect(page.getByTestId('lab-with-band')).toHaveText('This track alone (solo)');
  await page.getByTestId('lab-track').selectOption('bass');
  await expect(page.getByTestId('lab-play')).toHaveText('Stop');

  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/lab-songs-laptop.png', fullPage: true });
  await page.getByTestId('lab-play').click();

  // The address is remembered on this device.
  await page.reload();
  await page.getByTestId('lab-source-song').click();
  await expect(page.getByTestId('lab-library-url')).toHaveValue(LIBRARY_URL);
});
