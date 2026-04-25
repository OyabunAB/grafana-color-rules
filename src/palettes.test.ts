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

import { COLORRULES_PALETTE, COLOR_MODE_ID } from './palettes';

describe('COLORRULES_PALETTE', () => {
  it('contains only valid 6-digit hex colors', () => {
    for (const color of COLORRULES_PALETTE) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('contains no duplicates', () => {
    const unique = new Set(COLORRULES_PALETTE);
    expect(unique.size).toBe(COLORRULES_PALETTE.length);
  });

  it('has at least 6 colors to accommodate 6 cluster nodes without collision', () => {
    expect(COLORRULES_PALETTE.length).toBeGreaterThanOrEqual(6);
  });
});

describe('COLOR_MODE_ID', () => {
  it('is a non-empty string', () => {
    expect(typeof COLOR_MODE_ID).toBe('string');
    expect(COLOR_MODE_ID.length).toBeGreaterThan(0);
  });
});
