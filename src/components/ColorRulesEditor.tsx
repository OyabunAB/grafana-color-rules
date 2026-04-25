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
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Field, Input, Select, useStyles2, Collapse, useTheme2 } from '@grafana/ui';
import { ColorRule, LineStyleRule } from '../types';
import { groupNameToColor } from '../colorUtils';

export interface ColorRulesEditorProps {
  value: ColorRule[];
  onChange: (rules: ColorRule[]) => void;
  palette?: string[];
}

const LINE_STYLE_OPTIONS = [
  { value: 'solid' as const, label: 'Solid' },
  { value: 'dash' as const, label: 'Dashed' },
];

function newRule(): ColorRule {
  return { id: Math.random().toString(36).slice(2), namePattern: '', colorGroup: '', lineStyles: [] };
}

function newLineStyleRule(): LineStyleRule {
  return { captureGroup: '', matchValue: '', style: 'dash', dash: [6, 3], opacity: 0 };
}

const getStyles = (theme: GrafanaTheme2) => ({
  rule: css`padding: ${theme.spacing(1.5)};`,
  fields: css`display: grid; grid-template-columns: 1fr 1fr; gap: ${theme.spacing(1)}; margin-bottom: ${theme.spacing(1)};`,
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
  sectionLabel: css`font-size: ${theme.typography.bodySmall.fontSize}; color: ${theme.colors.text.secondary}; margin-top: ${theme.spacing(1)}; margin-bottom: ${theme.spacing(0.5)};`,
  hint: css`font-size: ${theme.typography.bodySmall.fontSize}; color: ${theme.colors.text.disabled}; margin-bottom: ${theme.spacing(0.5)};`,
  addButton: css`margin-top: ${theme.spacing(1)};`,
  removeButton: css`margin-left: ${theme.spacing(1)};`,
  headerRow: css`display: flex; align-items: center; justify-content: space-between; width: 100%;`,
  swatchRow: css`display: flex; flex-wrap: wrap; gap: 4px; margin-top: ${theme.spacing(0.5)};`,
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
    border-color: ${theme.colors.text.primary} !important;
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
  colorRow: css`display: flex; align-items: center; gap: ${theme.spacing(1)}; flex-wrap: wrap;`,
});

export const ColorRulesEditor: React.FC<ColorRulesEditorProps> = ({ value = [], onChange, palette = [] }) => {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const [openRules, setOpenRules] = useState<Record<string, boolean>>({});

  const toggleRule = (id: string) => setOpenRules((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));

  const addRule = useCallback(() => {
    const rule = newRule();
    onChange([...value, rule]);
    setOpenRules((prev) => ({ ...prev, [rule.id]: true }));
  }, [value, onChange]);

  const removeRule = useCallback((id: string) => onChange(value.filter((r) => r.id !== id)), [value, onChange]);

  const updateRule = useCallback(
    (id: string, patch: Partial<ColorRule>) => onChange(value.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [value, onChange]
  );

  const addLineStyle = useCallback((ruleId: string) => {
    const rule = value.find((r) => r.id === ruleId);
    if (!rule) { return; }
    updateRule(ruleId, { lineStyles: [...(rule.lineStyles ?? []), newLineStyleRule()] });
  }, [value, updateRule]);

  const removeLineStyle = useCallback((ruleId: string, idx: number) => {
    const rule = value.find((r) => r.id === ruleId);
    if (!rule) { return; }
    updateRule(ruleId, { lineStyles: rule.lineStyles.filter((_, i) => i !== idx) });
  }, [value, updateRule]);

  const updateLineStyle = useCallback((ruleId: string, idx: number, patch: Partial<LineStyleRule>) => {
    const rule = value.find((r) => r.id === ruleId);
    if (!rule) { return; }
    updateRule(ruleId, { lineStyles: rule.lineStyles.map((ls, i) => (i === idx ? { ...ls, ...patch } : ls)) });
  }, [value, updateRule]);

  return (
    <div>
      {value.map((rule, ruleIdx) => {
        const isOpen = openRules[rule.id] ?? true;

        // Effective color for preview: explicit pick or hash-based
        const autoColor = rule.colorGroup
          ? groupNameToColor(rule.colorGroup, theme, false, palette)
          : undefined;
        const activeColor = rule.color ?? autoColor;

        const label = (
          <div className={styles.headerRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeColor && (
                <span style={{ width: 12, height: 12, borderRadius: 2, background: activeColor, display: 'inline-block', flexShrink: 0 }} />
              )}
              <span>
                Rule {ruleIdx + 1}
                {rule.namePattern && (
                  <span style={{ marginLeft: 8, opacity: 0.55, fontSize: '0.85em' }}>
                    {rule.namePattern.length > 36 ? rule.namePattern.slice(0, 36) + '…' : rule.namePattern}
                  </span>
                )}
              </span>
            </div>
            <Button variant="destructive" size="sm" icon="trash-alt" className={styles.removeButton}
              onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }} tooltip="Remove rule" />
          </div>
        );

        return (
          <Collapse key={rule.id} label={label} isOpen={isOpen} onToggle={() => toggleRule(rule.id)}>
            <div className={styles.rule}>
              <div className={styles.fields}>
                <Field label="Name pattern" description={<>Regex on series name. Named groups: <code>{'(?<node>\\S+)'}</code></>}>
                  <Input value={rule.namePattern} placeholder="^(?<node>\\S+) (rx|tx)$"
                    onChange={(e) => updateRule(rule.id, { namePattern: e.currentTarget.value })} />
                </Field>
                <Field label="Color group" description="Capture group name or index. Series sharing the same value get the same color.">
                  <Input value={rule.colorGroup} placeholder="node"
                    onChange={(e) => updateRule(rule.id, { colorGroup: e.currentTarget.value })} />
                </Field>
              </div>

              {palette.length > 0 && (
                <Field label="Color" description="Pick a color from the palette, or leave on Auto to use hash-based assignment.">
                  <div className={styles.colorRow}>
                    <span
                      className={styles.swatchAuto}
                      style={!rule.color ? { borderColor: theme.colors.primary.border, color: theme.colors.text.primary } : {}}
                      onClick={() => updateRule(rule.id, { color: undefined })}
                    >
                      Auto
                    </span>
                    <div className={styles.swatchRow}>
                      {palette.map((hex) => (
                        <span
                          key={hex}
                          className={`${styles.swatch}${rule.color === hex ? ' ' + styles.swatchSelected : ''}`}
                          style={{ background: hex, borderColor: rule.color === hex ? theme.colors.text.primary : 'transparent' }}
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

              {rule.lineStyles?.map((ls, idx) => (
                <div key={idx} className={styles.lineStyleRule}>
                  <Field label="Capture group">
                    <Input value={ls.captureGroup} placeholder="2 or name"
                      onChange={(e) => updateLineStyle(rule.id, idx, { captureGroup: e.currentTarget.value })} />
                  </Field>
                  <Field label="Match value">
                    <Input value={ls.matchValue} placeholder="tx"
                      onChange={(e) => updateLineStyle(rule.id, idx, { matchValue: e.currentTarget.value })} />
                  </Field>
                  <Field label="Style">
                    <Select value={ls.style} options={LINE_STYLE_OPTIONS}
                      onChange={(opt) => updateLineStyle(rule.id, idx, { style: opt.value! })} />
                  </Field>
                  <Button variant="destructive" size="sm" icon="trash-alt"
                    onClick={() => removeLineStyle(rule.id, idx)} style={{ marginBottom: 4 }} />
                </div>
              ))}

              <Button variant="secondary" size="sm" icon="plus" className={styles.addButton}
                onClick={() => addLineStyle(rule.id)}>
                Add line style override
              </Button>
            </div>
          </Collapse>
        );
      })}
      <Button variant="secondary" icon="plus" className={styles.addButton} onClick={addRule}>
        Add color rule
      </Button>
    </div>
  );
};
