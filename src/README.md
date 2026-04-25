# Color Rules

A Grafana app plugin that provides deterministic, consistent series coloring across panels using a dedicated color scheme and a regex-based data transformer.

## Features

- **Color Rules color scheme** — Select *Color Rules* in any panel's Standard options → Color scheme. Series names are hashed deterministically to the Color Rules palette: the same name always maps to the same color, across every panel on every dashboard.
- **Color Rules transformer** — Add the transformer to a panel and define regex rules for group-based coloring. Series that share the same captured group value share a color. For example, `node1 rx` and `node1 tx` both get the color assigned to `node1`, with `tx` rendered as a slightly lighter shade on a dashed line.

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
   - **Color group**: capture group name or 1-based index whose value drives color assignment, e.g. `node` — all series with the same value here share a color
   - Optionally click a swatch to pin the rule to a specific palette color instead of using hash-based assignment
4. Optionally add **line style overrides** to visually distinguish series within the same color group, e.g. make `tx` a dashed line.

## Requirements

Grafana ≥ 11.5.0
