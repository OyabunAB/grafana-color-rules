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

import React, { useCallback, useState } from 'react';
import { css, cx } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Field, Input, Select, useStyles2, Collapse } from '@grafana/ui';
import { ColorRule, LineStyleRule, DEFAULT_DASH } from '../types';

export interface ColorRulesEditorProps {
  value: ColorRule[];
  onChange: (rules: ColorRule[]) => void;
  palette?: string[];
}

const LINE_STYLE_OPTIONS = [
  { value: 'solid' as const, label: 'Solid' },
  { value: 'dash' as const, label: 'Dashed' },
];

// Max characters shown for a name pattern in the collapsed rule header.
const PATTERN_PREVIEW_LENGTH = 36;

function newRule(): ColorRule {
  return {
    id: crypto.randomUUID(),
    namePattern: '',
    colorGroup: '',
    lineStyles: [],
  };
}

function newLineStyleRule(): LineStyleRule {
  return {
    id: crypto.randomUUID(),
    captureGroup: '',
    matchValue: '',
    style: 'dash',
    dash: DEFAULT_DASH,
    opacity: 0,
  };
}

const getStyles = (theme: GrafanaTheme2) => ({
  rule: css`
    padding: ${theme.spacing(1.5)};
  `,
  fields: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(1)};
  `,
  lineStyleRule: css`
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    padding: ${theme.spacing(1)};
    margin-top: ${theme.spacing(0.5)};
    background: ${theme.colors.background.canvas};
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: ${theme.spacing(1)};
    align-items: end;
  `,
  sectionLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    margin-top: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(0.5)};
  `,
  hint: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.disabled};
    margin-bottom: ${theme.spacing(0.5)};
  `,
  addButton: css`
    margin-top: ${theme.spacing(1)};
  `,
  trashButton: css`
    margin-bottom: ${theme.spacing(0.5)};
  `,
  ruleWrapper: css`
    position: relative;
    margin-bottom: ${theme.spacing(0.5)};
  `,
  deleteButton: css`
    position: absolute;
    top: 6px;
    right: ${theme.spacing(1)};
    z-index: 1;
  `,
  ruleLabel: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `,
  ruleLabelDot: css`
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  `,
  ruleLabelPattern: css`
    margin-left: ${theme.spacing(1)};
    opacity: 0.55;
    font-size: 0.85em;
  `,
  colorRow: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    flex-wrap: wrap;
  `,
  swatchRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  swatch: css`
    width: 20px;
    height: 20px;
    border-radius: 3px;
    border: 2px solid transparent;
    cursor: pointer;
    flex-shrink: 0;
    &:hover { opacity: 0.85; }
  `,
  swatchSelected: css`
    border-color: ${theme.colors.text.primary};
  `,
  swatchAuto: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.canvas};
    line-height: 20px;
    &:hover { color: ${theme.colors.text.primary}; }
  `,
  swatchAutoSelected: css`
    border-color: ${theme.colors.primary.border};
    color: ${theme.colors.text.primary};
  `,
});

export const ColorRulesEditor: React.FC<ColorRulesEditorProps> = ({ value = [], onChange, palette = [] }) => {
  const styles = useStyles2(getStyles);
  const [openRules, setOpenRules] = useState<Record<string, boolean>>({});

  const toggleRule = useCallback(
    (id: string) => setOpenRules((prev) => ({ ...prev, [id]: !(prev[id] ?? true) })),
    []
  );

  const addRule = useCallback(() => {
    const rule = newRule();
    onChange([...value, rule]);
    setOpenRules((prev) => ({ ...prev, [rule.id]: true }));
  }, [value, onChange]);

  const removeRule = useCallback(
    (id: string) => onChange(value.filter((r) => r.id !== id)),
    [value, onChange]
  );

  const updateRule = useCallback(
    (id: string, patch: Partial<ColorRule>) =>
      onChange(value.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [value, onChange]
  );

  const addLineStyle = useCallback(
    (ruleId: string) =>
      updateRule(ruleId, {
        lineStyles: [...(value.find((r) => r.id === ruleId)?.lineStyles ?? []), newLineStyleRule()],
      }),
    [value, updateRule]
  );

  const removeLineStyle = useCallback(
    (ruleId: string, lsId: string) =>
      updateRule(ruleId, {
        lineStyles: value.find((r) => r.id === ruleId)?.lineStyles?.filter((ls) => ls.id !== lsId) ?? [],
      }),
    [value, updateRule]
  );

  const updateLineStyle = useCallback(
    (ruleId: string, lsId: string, patch: Partial<LineStyleRule>) =>
      updateRule(ruleId, {
        lineStyles:
          value.find((r) => r.id === ruleId)?.lineStyles?.map((ls) => (ls.id === lsId ? { ...ls, ...patch } : ls)) ?? [],
      }),
    [value, updateRule]
  );

  return (
    <div>
      {value.map((rule, ruleIdx) => {
        const isOpen = openRules[rule.id] ?? true;

        // Only show a color dot in the header when the user has pinned an explicit
        // color. When in Auto mode the color varies per captured series value and
        // cannot be represented by a single swatch.
        const headerColor = rule.color;

        const label = (
          <div className={styles.ruleLabel}>
            {headerColor && (
              <span className={styles.ruleLabelDot} style={{ background: headerColor }} />
            )}
            <span>
              Rule {ruleIdx + 1}
              {rule.namePattern && (
                <span className={styles.ruleLabelPattern}>
                  {rule.namePattern.length > PATTERN_PREVIEW_LENGTH
                    ? rule.namePattern.slice(0, PATTERN_PREVIEW_LENGTH) + '…'
                    : rule.namePattern}
                </span>
              )}
            </span>
          </div>
        );

        return (
          <div key={rule.id} className={styles.ruleWrapper}>
            {/* Delete sits outside Collapse to avoid the event bubbling to the toggle handler */}
            <div className={styles.deleteButton}>
              <Button
                variant="destructive"
                size="sm"
                icon="trash-alt"
                onClick={() => removeRule(rule.id)}
                tooltip="Remove rule"
              />
            </div>

            <Collapse label={label} isOpen={isOpen} onToggle={() => toggleRule(rule.id)}>
              <div className={styles.rule}>
                <div className={styles.fields}>
                  <Field
                    label="Name pattern"
                    description={<>Regex on series name. Named groups: <code>{'(?<node>\\S+)'}</code></>}
                  >
                    <Input
                      value={rule.namePattern}
                      placeholder="^(?<node>\\S+) (rx|tx)$"
                      onChange={(e) => updateRule(rule.id, { namePattern: e.currentTarget.value })}
                    />
                  </Field>
                  <Field
                    label="Color group"
                    description="Capture group name or 0-based index. Series sharing the same captured value get the same color."
                  >
                    <Input
                      value={rule.colorGroup}
                      placeholder="node"
                      onChange={(e) => updateRule(rule.id, { colorGroup: e.currentTarget.value })}
                    />
                  </Field>
                </div>

                {palette.length > 0 && (
                  <Field
                    label="Color"
                    description="Pin to a specific palette color, or leave on Auto to assign colors by hash."
                  >
                    <div className={styles.colorRow}>
                      <span
                        className={cx(styles.swatchAuto, !rule.color && styles.swatchAutoSelected)}
                        onClick={() => updateRule(rule.id, { color: undefined })}
                      >
                        Auto
                      </span>
                      <div className={styles.swatchRow}>
                        {palette.map((hex, i) => (
                          <span
                            key={`${hex}-${i}`}
                            className={cx(styles.swatch, rule.color === hex && styles.swatchSelected)}
                            style={{ background: hex }}
                            title={hex}
                            onClick={() => updateRule(rule.id, { color: hex })}
                          />
                        ))}
                      </div>
                    </div>
                  </Field>
                )}

                <div className={styles.sectionLabel}>Line style overrides</div>
                <div className={styles.hint}>Match a capture group value to override the line style.</div>

                {rule.lineStyles?.map((ls) => (
                  <div key={ls.id} className={styles.lineStyleRule}>
                    <Field label="Capture group">
                      <Input
                        value={ls.captureGroup}
                        placeholder="2 or name"
                        onChange={(e) => updateLineStyle(rule.id, ls.id, { captureGroup: e.currentTarget.value })}
                      />
                    </Field>
                    <Field label="Match value">
                      <Input
                        value={ls.matchValue}
                        placeholder="tx"
                        onChange={(e) => updateLineStyle(rule.id, ls.id, { matchValue: e.currentTarget.value })}
                      />
                    </Field>
                    <Field label="Style">
                      <Select
                        value={ls.style}
                        options={LINE_STYLE_OPTIONS}
                        onChange={(opt) => {
                          if (opt.value !== undefined) {
                            updateLineStyle(rule.id, ls.id, { style: opt.value });
                          }
                        }}
                      />
                    </Field>
                    <Button
                      variant="destructive"
                      size="sm"
                      icon="trash-alt"
                      className={styles.trashButton}
                      onClick={() => removeLineStyle(rule.id, ls.id)}
                    />
                  </div>
                ))}

                <Button
                  variant="secondary"
                  size="sm"
                  icon="plus"
                  className={styles.addButton}
                  onClick={() => addLineStyle(rule.id)}
                >
                  Add line style override
                </Button>
              </div>
            </Collapse>
          </div>
        );
      })}

      <Button variant="secondary" icon="plus" className={styles.addButton} onClick={addRule}>
        Add color rule
      </Button>
    </div>
  );
};
