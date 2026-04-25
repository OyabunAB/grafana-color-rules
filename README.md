# Color Rules

A Grafana app plugin that provides deterministic, consistent series coloring across panels — via a dedicated **Color Rules** color scheme and a regex-based data transformer.

## Features

- **Color Rules color scheme** — Select *Color Rules* in any panel's Standard options → Color scheme. Series names are hashed deterministically to the Color Rules palette: the same name always maps to the same color, across every panel and dashboard.
- **Color Rules transformer** — Define regex rules for group-based coloring. Series sharing the same captured group value share a color. Add line style overrides to visually distinguish series within a group, e.g. `rx` solid / `tx` dashed.

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
4. Optionally add **line style overrides** to visually distinguish series within the same color group, e.g. make `tx` a dashed line.

## Development

```bash
npm install
npm run build      # production build
npm run dev        # watch mode
npm run server     # start Grafana via Docker with the plugin loaded
npm test           # run unit tests
```

## Requirements

Grafana ≥ 11.5.0
