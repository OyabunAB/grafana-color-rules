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
import { resolveSeriesName, groupNameToColor, computeSeriesOverrides } from './colorUtils';
import { ColorRule } from './types';
import { COLORRULES_PALETTE } from './palettes';

// Minimal theme mock: getColorByName passes hex through, returns empty for named tokens.
const mockTheme = {
  visualization: {
    getColorByName: (name: string) => (name.startsWith('#') ? name : ''),
    palette: [],
  },
} as unknown as GrafanaTheme2;

function makeField(
  name: string,
  type: FieldType,
  displayNameFromDS?: string,
  displayName?: string
): Field {
  return {
    name,
    type,
    values: [],
    config: {
      displayNameFromDS,
      displayName,
    },
  } as unknown as Field;
}

function makeFrame(name: string, fields: Field[]): DataFrame {
  return { name, length: 0, fields } as unknown as DataFrame;
}

// ---------------------------------------------------------------------------
// resolveSeriesName
// ---------------------------------------------------------------------------

describe('resolveSeriesName', () => {
  it('prefers displayNameFromDS over everything', () => {
    const field = makeField('fieldName', FieldType.number, 'fromDS', 'displayName');
    const frame = makeFrame('frameName', [field]);
    expect(resolveSeriesName(field, frame)).toBe('fromDS');
  });

  it('falls back to displayName when displayNameFromDS is absent', () => {
    const field = makeField('fieldName', FieldType.number, undefined, 'displayName');
    const frame = makeFrame('frameName', [field]);
    expect(resolveSeriesName(field, frame)).toBe('displayName');
  });

  it('falls back to frame.name when displayName is absent', () => {
    const field = makeField('fieldName', FieldType.number);
    const frame = makeFrame('frameName', [field]);
    expect(resolveSeriesName(field, frame)).toBe('frameName');
  });

  it('falls back to field.name when frame is absent', () => {
    const field = makeField('fieldName', FieldType.number);
    expect(resolveSeriesName(field)).toBe('fieldName');
  });

  it('falls back to field.name when frame.name is undefined', () => {
    const field = makeField('fieldName', FieldType.number);
    const frame = makeFrame(undefined as unknown as string, [field]);
    expect(resolveSeriesName(field, frame)).toBe('fieldName');
  });
});

// ---------------------------------------------------------------------------
// groupNameToColor
// ---------------------------------------------------------------------------

describe('groupNameToColor', () => {
  it('returns a hex color string', () => {
    const color = groupNameToColor('node1', mockTheme, false, COLORRULES_PALETTE);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is deterministic — same input always produces same color', () => {
    const a = groupNameToColor('server-01', mockTheme, false, COLORRULES_PALETTE);
    const b = groupNameToColor('server-01', mockTheme, false, COLORRULES_PALETTE);
    expect(a).toBe(b);
  });

  it('produces different colors for different names', () => {
    const a = groupNameToColor('alpha', mockTheme, false, COLORRULES_PALETTE);
    const b = groupNameToColor('beta', mockTheme, false, COLORRULES_PALETTE);
    // Not a hard guarantee but overwhelmingly likely for distinct names
    expect(a).not.toBe(b);
  });

  it('secondary color differs from primary', () => {
    const primary = groupNameToColor('node1', mockTheme, false, COLORRULES_PALETTE);
    const secondary = groupNameToColor('node1', mockTheme, true, COLORRULES_PALETTE);
    expect(secondary).not.toBe(primary);
    expect(secondary).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('falls back to hash-based HSL when no palette provided', () => {
    const color = groupNameToColor('node1', mockTheme, false, []);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('falls back to hash-based HSL when palette is undefined', () => {
    const color = groupNameToColor('node1', mockTheme);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ---------------------------------------------------------------------------
// computeSeriesOverrides
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<ColorRule> = {}): ColorRule {
  return {
    id: 'r1',
    namePattern: '^(.+)$',
    colorGroup: '1',
    lineStyles: [],
    ...overrides,
  };
}

describe('computeSeriesOverrides', () => {
  it('returns empty array when rules is empty', () => {
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    expect(computeSeriesOverrides([frame], [], mockTheme, COLORRULES_PALETTE)).toEqual([]);
  });

  it('returns empty array when all rules have empty namePattern', () => {
    const rule = makeRule({ namePattern: '' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    expect(computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE)).toEqual([]);
  });

  it('returns empty array when no series matches the pattern', () => {
    const rule = makeRule({ namePattern: '^prefix-' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'other-series')]);
    expect(computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE)).toEqual([]);
  });

  it('skips time fields', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [makeField('Time', FieldType.time, 'Time')]);
    expect(computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE)).toEqual([]);
  });

  it('returns an override for a matching series', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(1);
    expect(result[0].seriesName).toBe('node1');
    expect(result[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('series sharing the same colorGroup value get the same color', () => {
    const rule = makeRule({ namePattern: '^(?<node>\\S+) (rx|tx)$', colorGroup: 'node' });
    const frame = makeFrame('f', [
      makeField('rx', FieldType.number, 'node1 rx'),
      makeField('tx', FieldType.number, 'node1 tx'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(2);
    expect(result[0].color).toBe(result[1].color);
  });

  it('different colorGroup values produce different colors', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [
      makeField('v1', FieldType.number, 'node1'),
      makeField('v2', FieldType.number, 'node2'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(2);
    expect(result[0].color).not.toBe(result[1].color);
  });

  it('uses named capture group when colorGroup is a group name', () => {
    const rule = makeRule({ namePattern: '^(?<node>\\S+) (?:rx|tx)$', colorGroup: 'node' });
    const frame = makeFrame('f', [
      makeField('rx', FieldType.number, 'server-01 rx'),
      makeField('tx', FieldType.number, 'server-01 tx'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result[0].color).toBe(result[1].color);
  });

  it('uses positional capture group when colorGroup is a numeric string', () => {
    const rule = makeRule({ namePattern: '^(\\S+) (?:rx|tx)$', colorGroup: '1' });
    const frame = makeFrame('f', [
      makeField('a', FieldType.number, 'server-01 rx'),
      makeField('b', FieldType.number, 'server-01 tx'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result[0].color).toBe(result[1].color);
  });

  it('keys on full match when colorGroup is empty', () => {
    const rule = makeRule({ namePattern: '^node\\d+$', colorGroup: '' });
    const frame = makeFrame('f', [
      makeField('a', FieldType.number, 'node1'),
      makeField('b', FieldType.number, 'node2'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(2);
    // Different full matches → different colors
    expect(result[0].color).not.toBe(result[1].color);
  });

  it('uses explicit rule.color when set and valid hex', () => {
    const rule = makeRule({ color: '#ff0000' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const [override] = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(override.color).toBe('#ff0000');
  });

  it('ignores rule.color when it is not a valid hex string', () => {
    const rule = makeRule({ color: 'red' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const [override] = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    // Falls back to palette-based color
    expect(override.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(override.color).not.toBe('red');
  });

  it('ignores rule.color for shorthand hex like #fff', () => {
    const rule = makeRule({ color: '#fff' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const [override] = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(override.color).not.toBe('#fff');
    expect(override.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('skips the rule silently when namePattern is invalid regex', () => {
    const rule = makeRule({ namePattern: '(invalid[' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    expect(computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE)).toEqual([]);
  });

  it('skips series when out-of-range positional colorGroup index is used', () => {
    // Match has only 1 capture group; index 99 is out of range → colorGroupValue = '' → skip
    const rule = makeRule({ namePattern: '^(\\w+)$', colorGroup: '99' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    expect(computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE)).toEqual([]);
  });

  it('applies a dash line style override when capture group matches', () => {
    const rule = makeRule({
      namePattern: '^(?<node>\\S+) (?<dir>rx|tx)$',
      colorGroup: 'node',
      lineStyles: [{
        id: 'ls1',
        captureGroup: 'dir',
        matchValue: 'tx',
        style: 'dash',
        dash: [6, 3],
        opacity: 0,
      }],
    });
    const frame = makeFrame('f', [
      makeField('rx', FieldType.number, 'node1 rx'),
      makeField('tx', FieldType.number, 'node1 tx'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(2);

    const rx = result.find((o) => o.seriesName === 'node1 rx')!;
    const tx = result.find((o) => o.seriesName === 'node1 tx')!;

    expect(rx.lineStyle).toBeUndefined();
    expect(tx.lineStyle).toBe('dash');
    expect(tx.dash).toEqual([6, 3]);
    expect(tx.fillOpacity).toBe(0);
  });

  it('secondary (dash) color differs from primary color', () => {
    const rule = makeRule({
      namePattern: '^(?<node>\\S+) (?<dir>rx|tx)$',
      colorGroup: 'node',
      lineStyles: [{
        id: 'ls1',
        captureGroup: 'dir',
        matchValue: 'tx',
        style: 'dash',
      }],
    });
    const frame = makeFrame('f', [
      makeField('rx', FieldType.number, 'node1 rx'),
      makeField('tx', FieldType.number, 'node1 tx'),
    ]);
    const result = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    const rx = result.find((o) => o.seriesName === 'node1 rx')!;
    const tx = result.find((o) => o.seriesName === 'node1 tx')!;
    expect(tx.color).not.toBe(rx.color);
  });

  it('skips line style rule when captureGroup is empty', () => {
    const rule = makeRule({
      namePattern: '^(\\S+)$',
      colorGroup: '1',
      lineStyles: [{ id: 'ls1', captureGroup: '', matchValue: 'tx', style: 'dash' }],
    });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const [override] = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(override.lineStyle).toBeUndefined();
  });

  it('first matching line style rule wins', () => {
    const rule = makeRule({
      namePattern: '^(?<dir>rx|tx)$',
      colorGroup: 'dir',
      lineStyles: [
        { id: 'ls1', captureGroup: 'dir', matchValue: 'tx', style: 'dash', dash: [10, 5] },
        { id: 'ls2', captureGroup: 'dir', matchValue: 'tx', style: 'dash', dash: [2, 2] },
      ],
    });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'tx')]);
    const [override] = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(override.dash).toEqual([10, 5]);
  });

  it('is deterministic across multiple calls', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'server-01')]);
    const r1 = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    const r2 = computeSeriesOverrides([frame], [rule], mockTheme, COLORRULES_PALETTE);
    expect(r1[0].color).toBe(r2[0].color);
  });

  it('handles multiple frames', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const f1 = makeFrame('f1', [makeField('v', FieldType.number, 'node1')]);
    const f2 = makeFrame('f2', [makeField('v', FieldType.number, 'node2')]);
    const result = computeSeriesOverrides([f1, f2], [rule], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(2);
  });

  it('applies only first matching rule per series', () => {
    const rule1 = makeRule({ id: 'r1', namePattern: '^node1$', colorGroup: '' });
    const rule2 = makeRule({ id: 'r2', namePattern: '^node1$', colorGroup: '' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const result = computeSeriesOverrides([frame], [rule1, rule2], mockTheme, COLORRULES_PALETTE);
    expect(result).toHaveLength(1);
  });
});
