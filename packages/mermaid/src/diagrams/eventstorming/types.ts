import type { EventStorming } from '@mermaid-js/parser';
import type { EventStormingDiagramConfig } from '../../config.type.js';

export type EsNodeType =
  | 'event'
  | 'cmd'
  | 'actor'
  | 'policy'
  | 'readmodel'
  | 'system'
  | 'aggregate'
  | 'hotspot'
  | 'opportunity'
  | 'pivot';

export type EsFlowOp = '->' | '..' | '..>';

export interface EsNode {
  id: string;
  type: EsNodeType;
  label: string;
  groupIndex: number; // -1 for top-level elements outside groups
  positionInGroup: number;
}

export interface EsEdge {
  sourceId: string;
  targetId: string;
  op: EsFlowOp;
  label?: string;
}

export interface EsGroup {
  name: string;
  index: number;
}

export interface EsContext {
  nodes: EsNode[];
  edges: EsEdge[];
  groups: EsGroup[];
}

export interface EsDB {
  clear: () => void;
  setAst: (ast: EventStorming) => void;
  getNodes: () => EsNode[];
  getEdges: () => EsEdge[];
  getGroups: () => EsGroup[];
  getConfig: () => Required<EventStormingDiagramConfig>;
  setAccTitle: (title: string) => void;
  getAccTitle: () => string;
  setDiagramTitle: (title: string) => void;
  getDiagramTitle: () => string;
  getAccDescription: () => string;
  setAccDescription: (description: string) => void;
}
