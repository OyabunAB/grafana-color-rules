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

export interface PalettePreset {
  label: string;
  colors: string[];
}

export const PALETTE_PRESETS: Record<string, PalettePreset> = {
  theme: {
    label: 'Theme (default)',
    colors: [],
  },
  grafana: {
    label: 'Grafana Classic',
    colors: [
      '#7EB26D', '#EAB839', '#6ED0E0', '#EF843C', '#E24D42',
      '#1F78C1', '#BA43A9', '#705DA0', '#508642', '#CCA300',
    ],
  },
  tableau: {
    label: 'Tableau 10',
    colors: [
      '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
      '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
    ],
  },
  vivid: {
    label: 'Vivid',
    colors: [
      '#E8000D', '#1AC938', '#023EFF', '#FF7C00', '#8B2BE2',
      '#FFC400', '#00D7FF', '#FF0096', '#FFBE00', '#00D100',
    ],
  },
  pastel: {
    label: 'Pastel',
    colors: [
      '#A6CEE3', '#B2DF8A', '#FB9A99', '#FDBF6F', '#CAB2D6',
      '#FFFF99', '#8DD3C7', '#BEBADA', '#FDB462', '#B3DE69',
    ],
  },
  colorrules: {
    label: 'Color Rules',
    colors: [
      '#E74C3C',  // 0:  red
      '#2ECC71',  // 1:  green
      '#3498DB',  // 2:  blue
      '#F39C12',  // 3:  amber
      '#9B59B6',  // 4:  purple
      '#1ABC9C',  // 5:  turquoise
      '#E91E8C',  // 6:  pink
      '#27AE60',  // 7:  dark green
      '#F1C40F',  // 8:  yellow
      '#2980B9',  // 9:  steel blue
      '#FF5722',  // 10: deep orange
      '#00BCD4',  // 11: cyan
    ],
  },
  custom: {
    label: 'Custom',
    colors: [],
  },
};

export const PALETTE_OPTIONS = Object.entries(PALETTE_PRESETS).map(([value, { label }]) => ({
  value,
  label,
}));
