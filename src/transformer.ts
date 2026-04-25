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

import { map } from 'rxjs';
import {
  SynchronousDataTransformerInfo,
  DataFrame,
  FieldType,
  FieldColorModeId,
  DataTransformContext,
} from '@grafana/data';
import { config } from '@grafana/runtime';
import { ColorRule, DEFAULT_DASH } from './types';
import { computeSeriesOverrides, resolveSeriesName } from './colorUtils';
import { COLORRULES_PALETTE } from './palettes';

export interface ColorRulesTransformOptions {
  colorRules: ColorRule[];
}

function applyOverrides(frames: DataFrame[], options: ColorRulesTransformOptions): DataFrame[] {
  const overrides = computeSeriesOverrides(
    frames,
    options.colorRules,
    config.theme2,
    COLORRULES_PALETTE
  );
  const overrideMap = new Map(overrides.map((o) => [o.seriesName, o]));

  return frames.map((frame) => ({
    ...frame,
    fields: frame.fields.map((field) => {
      if (field.type === FieldType.time) {
        return field;
      }

      const seriesName = resolveSeriesName(field, frame);
      const override = overrideMap.get(seriesName);
      if (!override) {
        return field;
      }

      const customOverrides: Record<string, unknown> = {};
      if (override.lineStyle === 'dash') {
        customOverrides['lineStyle'] = { fill: 'dash', dash: override.dash ?? DEFAULT_DASH };
        customOverrides['fillOpacity'] = override.fillOpacity ?? 0;
      }

      return {
        ...field,
        config: {
          ...field.config,
          color: { mode: FieldColorModeId.Fixed, fixedColor: override.color },
          custom: Object.keys(customOverrides).length
            ? { ...field.config?.custom, ...customOverrides }
            : field.config?.custom,
        },
      };
    }),
  }));
}

export const colorRulesTransformer: SynchronousDataTransformerInfo<ColorRulesTransformOptions> = {
  id: 'color-rules',
  name: 'Color Rules',
  description: 'Assign consistent colors to series using regex capture groups. Series sharing the same captured value share a color.',
  defaultOptions: { colorRules: [] },
  operator: (options: ColorRulesTransformOptions, _context: DataTransformContext) =>
    map((frames: DataFrame[]) =>
      !options.colorRules?.length ? frames : applyOverrides(frames, options)
    ),
  transformer: (options: ColorRulesTransformOptions, _context: DataTransformContext) => {
    return (frames: DataFrame[]) => {
      if (!options.colorRules?.length) {
        return frames;
      }
      return applyOverrides(frames, options);
    };
  },
};
