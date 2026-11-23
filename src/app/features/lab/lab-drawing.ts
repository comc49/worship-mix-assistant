import { fromDb } from '../../core/audio/dynamics';

/** Draws the lab's picture: the sound before and after, the gain reduction, the threshold and the playhead. */

export interface LabPicture {
  input: Float32Array;
  output: Float32Array;
  gainReductionDb: Float32Array;
  thresholdDb: number;
  /** The gain reduction that reaches the bottom of the picture. */
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

function drawReduction(context: CanvasRenderingContext2D, picture: LabPicture, width: number, height: number, color: string): void {
  const values = picture.gainReductionDb;
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
    drawReduction(context, picture, width, height, colors.reduction);
  }
  drawThreshold(context, picture.thresholdDb, width, height, colors.threshold);

  if (picture.playheadFraction !== null) {
    const x = picture.playheadFraction * width;
    context.fillStyle = colors.playhead;
    context.fillRect(x, 0, Math.max(1, pixelRatio), height);
  }
}
