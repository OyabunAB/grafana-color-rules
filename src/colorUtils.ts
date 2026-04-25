// Copyright 2026 Daniel Sundberg, Oyabun AB
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DataFrame, Field, FieldType, GrafanaTheme2 } from '@grafana/data';
import { ColorRule, SeriesColorOverride, DEFAULT_DASH } from './types';

// Matches Grafana's palette-classic-by-name hash algorithm so our Fixed colors
// produce the same palette index as Grafana's native name-based assignment would.
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (((hash << 5) - hash) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function hashHsl(name: string, s: number, l: number): string {
  return hslToHex(hashString(name) % 360, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const val = lNorm - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * val).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l * 100];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function isValidHex(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s);
}

// Derive a slightly lighter, less saturated shade from a base hex color —
// used to distinguish dashed (secondary) series from their solid counterparts
// while keeping them visually related.
function secondaryHex(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s * 0.9, Math.min(l + 8, 85));
}

function resolveColor(groupName: string, palette: string[], theme: GrafanaTheme2, secondary: boolean): string {
  const entry = palette[hashString(groupName) % palette.length];

  const resolved = isValidHex(entry) ? entry : theme.visualization.getColorByName(entry);

  // getColorByName may return rgba() strings or other non-hex formats.
  // Only accept 6-digit hex; fall back to hash-based HSL otherwise.
  if (isValidHex(resolved)) {
    return secondary ? secondaryHex(resolved) : resolved;
  }

  return secondary ? hashHsl(groupName, 65, 60) : hashHsl(groupName, 70, 52);
}

export function resolveSeriesName(field: Field, frame?: DataFrame): string {
  return field.config?.displayNameFromDS ?? field.config?.displayName ?? frame?.name ?? field.name;
}

export function groupNameToColor(
  groupName: string,
  theme: GrafanaTheme2,
  secondary = false,
  palette?: string[]
): string {
  if (!palette?.length) {
    return secondary ? hashHsl(groupName, 65, 60) : hashHsl(groupName, 70, 52);
  }
  return resolveColor(groupName, palette, theme, secondary);
}

export function computeSeriesOverrides(
  frames: DataFrame[],
  rules: ColorRule[],
  theme: GrafanaTheme2,
  palette: string[]
): SeriesColorOverride[] {
  // Compile regexes once per call, not per field.
  const compiledRules = rules.flatMap((rule) => {
    if (!rule.namePattern) {
      return [];
    }
    try {
      return [{ rule, regex: new RegExp(rule.namePattern) }];
    } catch {
      return [];
    }
  });

  if (!compiledRules.length) {
    return [];
  }

  const result: SeriesColorOverride[] = [];

  for (const frame of frames) {
    for (const field of frame.fields) {
      if (field.type === FieldType.time) {
        continue;
      }

      const seriesName = resolveSeriesName(field, frame);

      for (const { rule, regex } of compiledRules) {
        const match = seriesName.match(regex);
        if (!match) {
          continue;
        }

        const groups = match.groups ?? {};

        let colorGroupValue: string;
        if (!rule.colorGroup) {
          colorGroupValue = match[0];
        } else if (/^\d+$/.test(rule.colorGroup)) {
          colorGroupValue = match[parseInt(rule.colorGroup, 10)] ?? '';
        } else {
          colorGroupValue = groups[rule.colorGroup] ?? match[0];
        }

        if (!colorGroupValue) {
          continue;
        }

        const baseColor = rule.color && isValidHex(rule.color)
          ? rule.color
          : groupNameToColor(colorGroupValue, theme, false, palette);

        const override: SeriesColorOverride = { seriesName, color: baseColor };

        for (const ls of rule.lineStyles ?? []) {
          if (ls.captureGroup === '' || !ls.matchValue) {
            continue;
          }

          const captureValue = /^\d+$/.test(ls.captureGroup)
            ? match[parseInt(ls.captureGroup, 10)]
            : groups[ls.captureGroup];

          if (captureValue === ls.matchValue) {
            override.lineStyle = ls.style;
            if (ls.style === 'dash') {
              override.dash = ls.dash ?? DEFAULT_DASH;
              override.fillOpacity = ls.opacity ?? 0;
              override.color = rule.color && isValidHex(rule.color)
                ? secondaryHex(rule.color)
                : groupNameToColor(colorGroupValue, theme, true, palette);
            }
            // First matching line style rule wins.
            break;
          }
        }

        result.push(override);
        break;
      }
    }
  }

  return result;
}
