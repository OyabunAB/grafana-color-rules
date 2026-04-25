# oyabun-colorrules-panel

Grafana panel plugin that assigns consistent colors to time series based on regex capture groups, and lets you control line style per matched value.

The problem it solves: Grafana's `palette-classic-by-name` assigns colors by series name, so `node1 rx` and `node1 tx` get different colors even though they belong to the same node. This plugin lets you define that the color key is the `node` capture group, and that `tx` series should render dashed.

## How it works

You define rules. Each rule has:

- **Name pattern** — a regex applied to each series display name
- **Color group** — a named capture group (or positional index) whose value determines the color. Series sharing the same value here share a color.
- **Line style overrides** — map a captured value to solid or dashed

Example: pattern `^(?<node>\S+) (rx|tx)$`, color group `node`, line style override on capture group `2` matching `tx` → dashed. Result: all series from the same node get the same color, rx is solid, tx is dashed.

Colors come from the Grafana theme palette so dark/light mode works correctly.

## Building

```bash
npm install
npm run build   # production
npm run dev     # watch mode
npm run server  # starts Grafana via Docker with the plugin loaded
```

## Installation

Copy `dist/` into your Grafana plugin directory and restart Grafana. No signing required for private use.
