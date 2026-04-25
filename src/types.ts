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

export interface LineStyleRule {
  id: string;
  /** Named capture group name or 0-based positional index (0 = full match, 1 = first group) */
  captureGroup: string;
  /** The captured value that must match for this override to apply */
  matchValue: string;
  style: 'solid' | 'dash';
  /** [dashLen, gapLen]. Defaults to [6, 3] */
  dash?: [number, number];
  /** Fill opacity, 0–1. Defaults to 0 for dash */
  opacity?: number;
}

export interface ColorRule {
  /** React key — not displayed */
  id: string;
  /** Regex applied to each series display name, e.g. "^(?<node>\\S+) (rx|tx)$" */
  namePattern: string;
  /**
   * Named capture group name or 0-based positional index whose value drives color
   * assignment. All series with the same captured value share a color.
   * Leave empty to key on the full match.
   */
  colorGroup: string;
  /** Explicit hex color from the palette. Overrides hash-based assignment when set. */
  color?: string;
  lineStyles?: LineStyleRule[];
}

export interface SeriesColorOverride {
  seriesName: string;
  color: string;
  lineStyle?: 'solid' | 'dash';
  dash?: [number, number];
  fillOpacity?: number;
}

/** Default dash pattern used when no explicit dash is configured */
export const DEFAULT_DASH: [number, number] = [6, 3];
