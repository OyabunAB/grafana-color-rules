# Color Rules

A Grafana app plugin that provides deterministic, consistent series coloring across panels — via a dedicated **Color Rules** color scheme and a regex-based data transformer.

**Source:** https://github.com/OyabunAB/grafana-color-rules  
**License:** Apache 2.0

## Features

- **Color Rules color scheme** — Select *Color Rules* in any panel's Standard options → Color scheme. Series names are hashed deterministically to the Color Rules palette: the same name always maps to the same color, across every panel and dashboard.
- **Color Rules transformer** — Define regex rules for group-based coloring. Series sharing the same captured group value share a color. Add line style overrides (e.g. dashed line) to visually distinguish series within a group. When a line style override is set to *dash*, the matched series gets a slightly lighter shade of the group color automatically.

## Usage

### Color scheme only

1. Edit a panel.
2. Standard options → Color scheme → **Color Rules**.

Series names are hashed to the Color Rules palette. No further configuration required.

### With transformer

1. Standard options → Color scheme → **Color Rules**.
2. Transform tab → Add transformation → **Color Rules**.
3. Add a rule:
   - **Name pattern**: regex applied to each series display name, e.g. `^(?<node>\S+) (rx|tx)$`
   - **Color group**: capture group name or 0-based index whose value drives color assignment, e.g. `node` — all series with the same captured value share a color
   - Optionally click a swatch to pin the rule to a specific palette color instead of hash-based assignment
4. Optionally add **line style overrides** to visually distinguish series within the same color group, e.g. make `tx` a dashed line with a lighter shade of the group color.

## Requirements

Grafana ≥ 11.5.0
