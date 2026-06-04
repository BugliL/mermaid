import type {
  EventStorming,
  EsGroup as AstEsGroup,
  EsNamedElement,
  EsPivot,
} from '@mermaid-js/parser';
import { getConfig as commonGetConfig } from '../../config.js';
import type { EventStormingDiagramConfig } from '../../config.type.js';
import DEFAULT_CONFIG from '../../defaultConfig.js';
import { cleanAndMerge } from '../../utils.js';
import {
  clear as commonClear,
  getAccDescription,
  getAccTitle,
  getDiagramTitle,
  setAccDescription,
  setAccTitle,
  setDiagramTitle,
} from '../common/commonDb.js';
import type { EsDB, EsEdge, EsGroup, EsNode, EsNodeType } from './types.js';

const isEsNamedElement = (item: unknown): item is EsNamedElement =>
  (item as { $type?: string })?.$type === 'EsNamedElement';

const isEsPivot = (item: unknown): item is EsPivot =>
  (item as { $type?: string })?.$type === 'EsPivot';

/** Normalize type aliases to canonical values */
const normalizeType = (raw: string): EsNodeType => {
  switch (raw) {
    case 'command':
      return 'cmd';
    case 'user':
      return 'actor';
    case 'reactor':
      return 'policy';
    case 'rm':
      return 'readmodel';
    case 'agg':
      return 'aggregate';
    default:
      return raw as EsNodeType;
  }
};

interface EsData {
  nodes: EsNode[];
  edges: EsEdge[];
  groups: EsGroup[];
}

const createDefaultData = (): EsData => ({
  nodes: [],
  edges: [],
  groups: [],
});

let data: EsData = createDefaultData();

const processGroup = (group: AstEsGroup, groupIndex: number) => {
  data.groups.push({ name: group.name, index: groupIndex });
  let pos = 0;
  for (const member of group.members ?? []) {
    if (isEsNamedElement(member)) {
      data.nodes.push({
        id: member.id,
        type: normalizeType(member.type),
        label: member.label ?? member.id,
        groupIndex,
        positionInGroup: pos++,
      });
    } else if (isEsPivot(member)) {
      data.nodes.push({
        id: `__pivot_${groupIndex}_${pos}`,
        type: 'pivot',
        label: member.label,
        groupIndex,
        positionInGroup: pos++,
      });
    }
  }
};

const setAst = (ast: EventStorming) => {
  let groupIndex = 0;

  for (const group of ast.groups ?? []) {
    processGroup(group, groupIndex++);
  }

  // Top-level elements (outside groups, e.g. Software Design standalone aggregates)
  for (const element of ast.elements ?? []) {
    if (isEsNamedElement(element)) {
      data.nodes.push({
        id: element.id,
        type: normalizeType(element.type),
        label: element.label ?? element.id,
        groupIndex: -1,
        positionInGroup: data.nodes.filter((n) => n.groupIndex === -1).length,
      });
    }
  }

  for (const flow of ast.flows ?? []) {
    let sourceId = flow.first;
    for (const link of flow.links ?? []) {
      data.edges.push({
        sourceId,
        targetId: link.target,
        op: link.op,
        label: link.label ?? undefined,
      });
      sourceId = link.target;
    }
  }
};

const getNodes = () => data.nodes;
const getEdges = () => data.edges;
const getGroups = () => data.groups;

const getConfig = (): Required<EventStormingDiagramConfig> => {
  return cleanAndMerge({
    ...DEFAULT_CONFIG.eventstorming,
    ...commonGetConfig().eventstorming,
  });
};

const clear = () => {
  commonClear();
  data = createDefaultData();
};

export const db: EsDB = {
  clear,
  setAst,
  getNodes,
  getEdges,
  getGroups,
  getConfig,
  setAccTitle,
  getAccTitle,
  setDiagramTitle,
  getDiagramTitle,
  getAccDescription,
  setAccDescription,
};
