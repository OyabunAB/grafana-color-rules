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

import { DataFrame, DataTransformContext, Field, FieldColorModeId, FieldType } from '@grafana/data';
import { colorRulesTransformer } from './transformer';
import { ColorRule } from './types';

jest.mock('@grafana/runtime', () => ({
  config: {
    theme2: {
      visualization: {
        getColorByName: (name: string) => (name.startsWith('#') ? name : ''),
        palette: [],
      },
    },
  },
}));

function makeField(
  name: string,
  type: FieldType,
  displayNameFromDS?: string
): Field {
  return {
    name,
    type,
    values: [],
    config: { displayNameFromDS },
  } as unknown as Field;
}

function makeFrame(name: string, fields: Field[]): DataFrame {
  return { name, length: 0, fields } as unknown as DataFrame;
}

function makeRule(overrides: Partial<ColorRule> = {}): ColorRule {
  return {
    id: 'r1',
    namePattern: '^(.+)$',
    colorGroup: '1',
    lineStyles: [],
    ...overrides,
  };
}

const noopContext = {} as DataTransformContext;

describe('colorRulesTransformer.transformer', () => {
  it('has the correct id', () => {
    expect(colorRulesTransformer.id).toBe('color-rules');
  });

  it('passes frames through unchanged when colorRules is empty', () => {
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const transform = colorRulesTransformer.transformer({ colorRules: [] }, noopContext);
    const result = transform([frame]);
    expect(result).toEqual([frame]);
  });

  it('passes frames through unchanged when no series matches', () => {
    const rule = makeRule({ namePattern: '^prefix-' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'other')]);
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [resultFrame] = transform([frame]);
    expect(resultFrame.fields[0].config.color).toBeUndefined();
  });

  it('does not mutate the original frame reference', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const original = frame;
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [result] = transform([frame]);
    expect(result).not.toBe(original);
  });

  it('applies Fixed color mode to a matching series', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [makeField('v', FieldType.number, 'node1')]);
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [resultFrame] = transform([frame]);
    const valueField = resultFrame.fields[0];
    expect(valueField.config.color?.mode).toBe(FieldColorModeId.Fixed);
    expect(valueField.config.color?.fixedColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('leaves time fields unchanged', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame = makeFrame('f', [
      makeField('Time', FieldType.time, 'Time'),
      makeField('Value', FieldType.number, 'node1'),
    ]);
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [resultFrame] = transform([frame]);
    const timeField = resultFrame.fields.find((f) => f.type === FieldType.time)!;
    expect(timeField.config.color).toBeUndefined();
  });

  it('applies consistent colors — same series name gets same color across calls', () => {
    const rule = makeRule({ namePattern: '^(.+)$', colorGroup: '1' });
    const frame1 = makeFrame('f1', [makeField('v', FieldType.number, 'server-01')]);
    const frame2 = makeFrame('f2', [makeField('v', FieldType.number, 'server-01')]);
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [r1] = transform([frame1]);
    const [r2] = transform([frame2]);
    expect(r1.fields[0].config.color?.fixedColor).toBe(r2.fields[0].config.color?.fixedColor);
  });

  it('applies dash custom overrides when a line style rule matches', () => {
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
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [resultFrame] = transform([frame]);
    const rxField = resultFrame.fields.find((f) => f.config.displayNameFromDS === 'node1 rx')!;
    const txField = resultFrame.fields.find((f) => f.config.displayNameFromDS === 'node1 tx')!;
    expect(rxField.config.custom?.lineStyle).toBeUndefined();
    expect(txField.config.custom?.lineStyle).toEqual({ fill: 'dash', dash: [6, 3] });
    expect(txField.config.custom?.fillOpacity).toBe(0);
  });

  it('preserves existing custom field properties for non-matched fields', () => {
    const rule = makeRule({ namePattern: '^node1$', colorGroup: '' });
    const frame = makeFrame('f', [
      makeField('v', FieldType.number, 'node1'),
    ]);
    // Add pre-existing custom property
    (frame.fields[0].config as any).custom = { existingProp: 42 };
    const transform = colorRulesTransformer.transformer({ colorRules: [rule] }, noopContext);
    const [resultFrame] = transform([frame]);
    expect(resultFrame.fields[0].config.custom?.existingProp).toBe(42);
  });
});
