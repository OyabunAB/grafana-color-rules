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

import React from 'react';
import { TransformerUIProps } from '@grafana/data';
import { ColorRulesTransformOptions } from '../transformer';
import { ColorRulesEditor } from './ColorRulesEditor';
import { PALETTE_PRESETS } from '../palettes';

const COLOR_MODE_ID = 'colorrules';

export const ColorRulesTransformEditor: React.FC<TransformerUIProps<ColorRulesTransformOptions>> = ({
  options,
  onChange,
}) => {
  const palette = PALETTE_PRESETS[COLOR_MODE_ID].colors;

  return (
    <ColorRulesEditor
      value={options.colorRules ?? []}
      onChange={(colorRules) => onChange({ ...options, colorRules })}
      palette={palette}
    />
  );
};
