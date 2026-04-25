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

import { DataFrame, FieldType, DynamicConfigValue, FieldColorModeId, GrafanaTheme2 } from '@grafana/data';
import { ColorRule } from './types';

// Matches Grafana's palette-classic-by-name hash so our Fixed colors produce
// the same palette entry as Grafana's native name-based assignment would.
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (((hash << 5) - hash) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const val = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
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

function resolveColor(
  groupName: string,
  palette: string[],
  theme: GrafanaTheme2,
  secondary: boolean
): string {
  const idx = hashString(groupName) % palette.length;
  const entry = palette[idx];

  // If the palette entry is already a hex color, use it directly.
  // Otherwise resolve via Grafana's theme (handles named colors like 'semi-dark-blue').
  const baseHex = entry.startsWith('#') && entry.length >= 7
    ? entry
    : theme.visualization.getColorByName(entry);

  if (typeof baseHex === 'string' && baseHex.startsWith('#') && baseHex.length >= 7) {
    const [h, s, l] = hexToHsl(baseHex);
    return secondary
      ? hslToHex(h, s * 0.9, Math.min(l + 8, 85))
      : hslToHex(h, s, l);
  }

  // Final fallback: pure HSL from hash
  const hue = hashString(groupName) % 360;
  return secondary ? hslToHex(hue, 55, 68) : hslToHex(hue, 70, 52);
}

export function groupNameToColor(
  groupName: string,
  theme: GrafanaTheme2,
  secondary = false,
  overridePalette?: string[]
): string {
  const palette = (overridePalette?.length ? overridePalette : null)
    ?? theme?.visualization?.palette
    ?? [];

  if (!palette.length) {
    const hue = hashString(groupName) % 360;
  return secondary ? hslToHex(hue, 65, 60) : hslToHex(hue, 70, 52);
  }

  return resolveColor(groupName, palette, theme, secondary);
}

export interface SeriesColorOverride {
  seriesName: string;
  color: string;
  lineStyle?: 'solid' | 'dash';
  dash?: [number, number];
  fillOpacity?: number;
}

export function computeSeriesOverrides(
  frames: DataFrame[],
  rules: ColorRule[],
  theme: GrafanaTheme2,
  overridePalette?: string[]
): SeriesColorOverride[] {
  const palette = (overridePalette?.length ? overridePalette : null)
    ?? theme?.visualization?.palette
    ?? [];

  const result: SeriesColorOverride[] = [];

  for (const frame of frames) {
    for (const field of frame.fields) {
      if (field.type === FieldType.time) {
        continue;
      }

      // At transform time frame.name is null in the scenes pipeline; the Prometheus
      // data source sets displayNameFromDS from legendFormat during query parsing.
      const seriesName: string =
        field.config?.displayNameFromDS ?? field.config?.displayName ?? frame.name ?? field.name;

      for (const rule of rules) {
        if (!rule.namePattern) {
          continue;
        }

        let regex: RegExp;
        try {
          regex = new RegExp(rule.namePattern);
        } catch {
          continue;
        }

        const match = seriesName.match(regex);
        if (!match) {
          continue;
        }

        const groups = match.groups ?? {};

        let colorGroupValue: string;
        if (!rule.colorGroup) {
          colorGroupValue = match[0];
        } else if (/^\d+$/.test(rule.colorGroup)) {
          colorGroupValue = match[parseInt(rule.colorGroup, 10)] ?? match[0];
        } else {
          colorGroupValue = groups[rule.colorGroup] ?? match[0];
        }

        const baseColor = rule.color
          ? rule.color
          : palette.length
            ? resolveColor(colorGroupValue, palette, theme, false)
            : (() => { const h = hashString(colorGroupValue) % 360; return hslToHex(h, 70, 52); })();

        const override: SeriesColorOverride = { seriesName, color: baseColor };

        for (const ls of rule.lineStyles ?? []) {
          if (!ls.captureGroup || !ls.matchValue) {
            continue;
          }
          const captureValue = /^\d+$/.test(ls.captureGroup)
            ? match[parseInt(ls.captureGroup, 10)]
            : groups[ls.captureGroup];

          if (captureValue === ls.matchValue) {
            override.lineStyle = ls.style;
            if (ls.style === 'dash') {
              override.dash = ls.dash ?? [6, 3];
              override.fillOpacity = ls.opacity ?? 0;
              if (rule.color) {
                const [h, s, l] = hexToHsl(rule.color);
                override.color = hslToHex(h, s * 0.9, Math.min(l + 8, 85));
              } else {
                override.color = palette.length
                  ? resolveColor(colorGroupValue, palette, theme, true)
                  : (() => { const h = hashString(colorGroupValue) % 360; return hslToHex(h, 65, 60); })();
              }
            }
          }
        }

        result.push(override);
        break;
      }
    }
  }

  return result;
}

export function buildConfigProperties(override: SeriesColorOverride): DynamicConfigValue[] {
  const props: DynamicConfigValue[] = [
    {
      id: 'color',
      value: { mode: FieldColorModeId.Fixed, fixedColor: override.color },
    },
  ];

  if (override.lineStyle === 'dash') {
    props.push({
      id: 'custom.lineStyle',
      value: { fill: 'dash', dash: override.dash ?? [6, 3] },
    });
    if (override.fillOpacity !== undefined) {
      props.push({ id: 'custom.fillOpacity', value: override.fillOpacity });
    }
  }

  return props;
}
