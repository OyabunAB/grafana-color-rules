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

import { AppPlugin, fieldColorModeRegistry, standardTransformersRegistry } from '@grafana/data';
import { config } from '@grafana/runtime';
import { colorRulesTransformer } from './transformer';
import { ColorRulesTransformEditor } from './components/TransformEditor';
import { groupNameToColor } from './colorUtils';
import { PALETTE_PRESETS } from './palettes';

const COLOR_MODE_ID = 'colorrules';

fieldColorModeRegistry.register({
  id: COLOR_MODE_ID,
  name: 'Color Rules',
  description: 'Deterministic palette coloring. Add the Color Rules transformer to a panel for regex-based group coloring.',
  isByValue: false,
  isContinuous: false,
  getCalculator: (field) => {
    const theme = config.theme2;
    const palette = PALETTE_PRESETS[COLOR_MODE_ID].colors;
    const name: string =
      field.config?.displayNameFromDS ?? field.config?.displayName ?? field.name;
    const color = groupNameToColor(name, theme, false, palette);
    return () => color;
  },
});

standardTransformersRegistry.register({
  id: colorRulesTransformer.id,
  name: colorRulesTransformer.name,
  description: colorRulesTransformer.description,
  transformation: colorRulesTransformer,
  editor: ColorRulesTransformEditor,
  imageDark: 'public/img/icn-transforms.svg',
  imageLight: 'public/img/icn-transforms.svg',
});

export const plugin = new AppPlugin();
