import type {
  ExternalDiagramDefinition,
  DiagramDetector,
  DiagramLoader,
} from '../../diagram-api/types.js';

const id = 'eventstorming';

const detector: DiagramDetector = (txt) => {
  return /^\s*eventstorming(?:[\s:]|$)/.test(txt);
};

const loader: DiagramLoader = async () => {
  const { diagram } = await import('./diagram.js');
  return { id, diagram };
};

export const eventstorming: ExternalDiagramDefinition = {
  id,
  detector,
  loader,
};
