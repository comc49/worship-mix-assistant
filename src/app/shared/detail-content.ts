import { NumericSetting } from '../core/model';

/**
 * What the "tap a value" panel shows. The console sheet's StepDetail and the
 * mix plan's NumericSetting are both turned into this shape, so one component
 * can show either.
 */
export interface DetailContent {
  /** The usable range, as text. null when there is no numeric range. */
  range: string | null;
  why: string;
  listenFor: string;
  provenance: DetailProvenanceLine[];
}

export interface DetailProvenanceLine {
  source: string;
  description: string;
}

/** "130 Hz", "-2 dB", "2.5:1". A ratio has no space before its unit. */
export function formatNumericValue(value: number, unit: NumericSetting['unit']): string {
  if (unit === ':1') {
    return `${value}:1`;
  }
  return `${value} ${unit}`;
}

/** The setting's own value as text. */
export function formatSettingValue(setting: NumericSetting): string {
  return formatNumericValue(setting.value, setting.unit);
}

/** Turns a mix plan setting into the content of the detail panel. */
export function detailFromNumericSetting(setting: NumericSetting): DetailContent {
  const rangeMin = formatNumericValue(setting.range.min, setting.unit);
  const rangeMax = formatNumericValue(setting.range.max, setting.unit);

  const provenance: DetailProvenanceLine[] = setting.provenance.map((step) => ({
    source: step.source,
    description: step.description,
  }));

  return {
    range: `${rangeMin} to ${rangeMax}`,
    why: setting.why,
    listenFor: setting.listenFor,
    provenance,
  };
}
