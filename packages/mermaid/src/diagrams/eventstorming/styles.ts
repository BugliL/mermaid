import type { DiagramStylesProvider } from '../../diagram-api/types.js';
import { getConfig } from '../../config.js';
import { cleanAndMerge } from '../../utils.js';
import { getThemeVariables } from '../../themes/theme-default.js';

const getEsTheme = () => {
  const defaultVars = getThemeVariables();
  const currentConfig = getConfig();
  const merged = cleanAndMerge(defaultVars, currentConfig.themeVariables);
  return merged.eventstorming as {
    textColor: string;
    swimlaneBg: string;
    swimlaneStroke: string;
    fontSizeNode: number;
    fontSizeLabel: number;
  };
};

export const styles: DiagramStylesProvider = () => {
  const t = getEsTheme();
  return `
  .es-group-bg {
    fill: ${t.swimlaneBg};
    stroke: ${t.swimlaneStroke};
  }
  .es-group-label {
    font-weight: bold;
    font-size: ${t.fontSizeLabel}px;
    fill: ${t.textColor};
  }
  .es-node {
    rx: 4;
  }
  .es-node-label {
    font-size: ${t.fontSizeNode}px;
    text-anchor: middle;
    dominant-baseline: middle;
    fill: ${t.textColor};
  }
  .es-pivot {
    stroke-dasharray: 6, 3;
  }
  .es-edge {
    fill: none;
  }
  .es-edge-label {
    font-size: ${t.fontSizeNode - 1}px;
    fill: ${t.textColor};
  }
  `;
};

export default styles;
