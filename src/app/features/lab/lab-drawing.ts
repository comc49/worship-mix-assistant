import { fromDb } from '../../core/audio/dynamics';

/** Draws the lab's picture: the sound before and after, the gain reduction, the threshold and the playhead. */

export interface LabPicture {
  input: Float32Array;
  output: Float32Array;
  /** How many dB the level is being changed at each sample. null when there is nothing to draw. */
  changeDb: Float32Array | null;
  /** null when the threshold cannot be compared with the waveform. */
  thresholdDb: number | null;
  /** The change that reaches the bottom of the picture. */
  reductionScaleDb: number;
  /** 0 to 1, or null when stopped. */
  playheadFraction: number | null;
  showOutput: boolean;
}

export interface LabColors {
  input: string;
  output: string;
  reduction: string;
  threshold: string;
  playhead: string;
}

function drawWaveform(context: CanvasRenderingContext2D, samples: Float32Array, width: number, height: number, color: string): void {
  const middle = height / 2;
  const samplesPerPixel = samples.length / width;
  context.fillStyle = color;

  for (let x = 0; x < width; x = x + 1) {
    const from = Math.floor(x * samplesPerPixel);
    const to = Math.min(samples.length, Math.floor((x + 1) * samplesPerPixel));
    let lowest = 0;
    let highest = 0;
    for (let index = from; index < to; index = index + 1) {
      const sample = samples[index];
      if (sample < lowest) {
        lowest = sample;
      }
      if (sample > highest) {
        highest = sample;
      }
    }
    const top = middle - Math.min(1, highest) * middle;
    const bottom = middle - Math.max(-1, lowest) * middle;
    context.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
}

function drawReduction(context: CanvasRenderingContext2D, values: Float32Array, picture: LabPicture, width: number, height: number, color: string): void {
  const samplesPerPixel = values.length / width;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();

  for (let x = 0; x < width; x = x + 1) {
    const from = Math.floor(x * samplesPerPixel);
    const to = Math.min(values.length, Math.floor((x + 1) * samplesPerPixel));
    let most = 0;
    for (let index = from; index < to; index = index + 1) {
      if (values[index] > most) {
        most = values[index];
      }
    }
    // Gain reduction hangs down from the top edge, like the meter on a console.
    const y = Math.min(1, most / picture.reductionScaleDb) * height;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

function drawThreshold(context: CanvasRenderingContext2D, thresholdDb: number, width: number, height: number, color: string): void {
  const middle = height / 2;
  const offset = Math.min(1, fromDb(thresholdDb)) * middle;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.setLineDash([6, 6]);
  for (const y of [middle - offset, middle + offset]) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.setLineDash([]);
}

export function drawLabPicture(canvas: HTMLCanvasElement, picture: LabPicture, colors: LabColors): void {
  const context = canvas.getContext('2d');
  if (context === null) {
    return;
  }
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  drawWaveform(context, picture.input, width, height, colors.input);
  if (picture.showOutput) {
    drawWaveform(context, picture.output, width, height, colors.output);
    if (picture.changeDb !== null) {
      drawReduction(context, picture.changeDb, picture, width, height, colors.reduction);
    }
  }
  if (picture.thresholdDb !== null) {
    drawThreshold(context, picture.thresholdDb, width, height, colors.threshold);
  }

  if (picture.playheadFraction !== null) {
    const x = picture.playheadFraction * width;
    context.fillStyle = colors.playhead;
    context.fillRect(x, 0, Math.max(1, pixelRatio), height);
  }
}

// ---------------------------------------------------------------------------
// EQ curve
// ---------------------------------------------------------------------------

const CURVE_LOWEST_HZ = 20;
const CURVE_HIGHEST_HZ = 20000;
const CURVE_RANGE_DB = 18;
const CURVE_POINTS = 240;

/** The frequencies the EQ curve is drawn at: evenly spaced by pitch, as on a console's EQ screen. */
export function buildCurveFrequencies(): number[] {
  const frequencies: number[] = [];
  for (let point = 0; point < CURVE_POINTS; point = point + 1) {
    const fraction = point / (CURVE_POINTS - 1);
    frequencies.push(CURVE_LOWEST_HZ * Math.pow(CURVE_HIGHEST_HZ / CURVE_LOWEST_HZ, fraction));
  }
  return frequencies;
}

export interface CurveColors {
  grid: string;
  label: string;
  curve: string;
}

export function drawEqCurve(canvas: HTMLCanvasElement, responseDb: number[], colors: CurveColors): void {
  const context = canvas.getContext('2d');
  if (context === null) {
    return;
  }
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, width, height);

  const xForFrequency = (frequencyHz: number): number => (Math.log(frequencyHz / CURVE_LOWEST_HZ) / Math.log(CURVE_HIGHEST_HZ / CURVE_LOWEST_HZ)) * width;
  const yForDb = (db: number): number => height / 2 - (Math.max(-CURVE_RANGE_DB, Math.min(CURVE_RANGE_DB, db)) / CURVE_RANGE_DB) * (height / 2);

  context.font = `${11 * pixelRatio}px system-ui, sans-serif`;
  context.fillStyle = colors.label;
  context.strokeStyle = colors.grid;
  context.lineWidth = 1;

  // Vertical lines at round frequencies.
  const marks: { frequencyHz: number; text: string }[] = [
    { frequencyHz: 50, text: '50' },
    { frequencyHz: 100, text: '100' },
    { frequencyHz: 250, text: '250' },
    { frequencyHz: 500, text: '500' },
    { frequencyHz: 1000, text: '1k' },
    { frequencyHz: 2500, text: '2.5k' },
    { frequencyHz: 5000, text: '5k' },
    { frequencyHz: 10000, text: '10k' },
  ];
  for (const mark of marks) {
    const x = xForFrequency(mark.frequencyHz);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    context.fillText(mark.text, x + 4 * pixelRatio, height - 6 * pixelRatio);
  }

  // Horizontal lines every 6 dB; the 0 dB line is the brightest.
  for (const db of [-12, -6, 0, 6, 12]) {
    const y = yForDb(db);
    context.strokeStyle = db === 0 ? colors.label : colors.grid;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
    const sign = db > 0 ? '+' : '';
    context.fillText(`${sign}${db} dB`, 4 * pixelRatio, y - 4 * pixelRatio);
  }

  // The curve itself.
  const frequencies = buildCurveFrequencies();
  context.strokeStyle = colors.curve;
  context.lineWidth = 3 * pixelRatio;
  context.beginPath();
  for (let point = 0; point < frequencies.length; point = point + 1) {
    const x = xForFrequency(frequencies[point]);
    const y = yForDb(responseDb[point] ?? 0);
    if (point === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}
