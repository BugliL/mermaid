import type { Selection } from 'd3';
import { select } from 'd3';
import { setupGraphViewbox } from '../../diagram-api/diagramAPI.js';
import { getConfig } from '../../config.js';
import { cleanAndMerge } from '../../utils.js';
import { getThemeVariables } from '../../themes/theme-default.js';
import type { DrawDefinition } from '../../diagram-api/types.js';
import type { EsDB, EsEdge, EsNode } from './types.js';

/** Resolve EventStorming theme block from current mermaid theme. */
const getEsTheme = () => {
  const defaultVars = getThemeVariables();
  const currentConfig = getConfig();
  const merged = cleanAndMerge(defaultVars, currentConfig.themeVariables);
  return merged.eventstorming as {
    eventFill: string;
    eventStroke: string;
    cmdFill: string;
    cmdStroke: string;
    actorFill: string;
    actorStroke: string;
    policyFill: string;
    policyStroke: string;
    readmodelFill: string;
    readmodelStroke: string;
    systemFill: string;
    systemStroke: string;
    aggregateFill: string;
    aggregateStroke: string;
    hotspotFill: string;
    hotspotStroke: string;
    opportunityFill: string;
    opportunityStroke: string;
    swimlaneBg: string;
    swimlaneStroke: string;
    pivotStroke: string;
    edgeStroke: string;
    arrowhead: string;
    fontSizeNode: number;
    fontSizeLabel: number;
    textColor: string;
  };
};

const getNodeColors = (
  type: EsNode['type'],
  t: ReturnType<typeof getEsTheme>
): { fill: string; stroke: string } => {
  switch (type) {
    case 'event':
      return { fill: t.eventFill, stroke: t.eventStroke };
    case 'cmd':
      return { fill: t.cmdFill, stroke: t.cmdStroke };
    case 'actor':
      return { fill: t.actorFill, stroke: t.actorStroke };
    case 'policy':
      return { fill: t.policyFill, stroke: t.policyStroke };
    case 'readmodel':
      return { fill: t.readmodelFill, stroke: t.readmodelStroke };
    case 'system':
      return { fill: t.systemFill, stroke: t.systemStroke };
    case 'aggregate':
      return { fill: t.aggregateFill, stroke: t.aggregateStroke };
    case 'hotspot':
      return { fill: t.hotspotFill, stroke: t.hotspotStroke };
    case 'opportunity':
      return { fill: t.opportunityFill, stroke: t.opportunityStroke };
    default:
      return { fill: '#eeeeee', stroke: '#999999' };
  }
};

interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

const draw: DrawDefinition = (_text, id, _version, diagObj) => {
  const db = diagObj.db as EsDB;
  const config = db.getConfig();
  const t = getEsTheme();

  const nodes = db.getNodes();
  const edges = db.getEdges();
  const groups = db.getGroups();

  const padding = config.padding ?? 8;
  const nodeWidth = config.nodeWidth ?? 100;
  const nodeHeight = config.nodeHeight ?? 60;
  const swimlaneHeight = config.swimlaneHeight ?? 100;
  const swimlaneLabelWidth = 120;
  const nodeSep = padding * 2;

  const svg: Selection<SVGGElement, unknown, HTMLElement, unknown> = select(`[id="${id}"]`);

  const arrowheadId = `es-arrowhead-${id}`;
  const defs = svg.append('defs');

  // Arrowhead marker for '->' edges
  defs
    .append('marker')
    .attr('id', arrowheadId)
    .attr('markerWidth', '10')
    .attr('markerHeight', '7')
    .attr('refX', '10')
    .attr('refY', '3.5')
    .attr('orient', 'auto')
    .append('polygon')
    .attr('points', '0 0, 10 3.5, 0 7')
    .attr('fill', t.arrowhead);

  // Build node-to-box position map
  const nodeBoxMap = new Map<string, NodeBox>();

  // Layout: assign x positions per group (left-to-right)
  const groupNodes = new Map<number, EsNode[]>();
  for (const node of nodes) {
    if (!groupNodes.has(node.groupIndex)) {
      groupNodes.set(node.groupIndex, []);
    }
    groupNodes.get(node.groupIndex)!.push(node);
  }

  // Render swimlanes and nodes
  for (const group of groups) {
    const groupNodeList = (groupNodes.get(group.index) ?? []).sort(
      (a, b) => a.positionInGroup - b.positionInGroup
    );
    const y = group.index * swimlaneHeight + padding;
    const laneWidth = swimlaneLabelWidth + groupNodeList.length * (nodeWidth + nodeSep) + padding;

    // Swimlane background
    svg
      .append('rect')
      .attr('class', 'es-group-bg')
      .attr('x', 0)
      .attr('y', y)
      .attr('width', laneWidth)
      .attr('height', swimlaneHeight - padding)
      .attr('rx', 4)
      .attr('fill', t.swimlaneBg)
      .attr('stroke', t.swimlaneStroke);

    // Swimlane label
    svg
      .append('text')
      .attr('class', 'es-group-label')
      .attr('x', padding * 2)
      .attr('y', y + swimlaneHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', t.textColor)
      .attr('font-size', `${t.fontSizeLabel}px`)
      .attr('font-weight', 'bold')
      .text(group.name);

    // Render nodes in group
    for (const node of groupNodeList) {
      const nodeX = swimlaneLabelWidth + node.positionInGroup * (nodeWidth + nodeSep);
      const nodeY = y + (swimlaneHeight - padding - nodeHeight) / 2;

      if (node.type === 'pivot') {
        // Render as vertical divider line
        svg
          .append('line')
          .attr('class', 'es-pivot')
          .attr('x1', nodeX + nodeWidth / 2)
          .attr('y1', y)
          .attr('x2', nodeX + nodeWidth / 2)
          .attr('y2', y + swimlaneHeight - padding)
          .attr('stroke', t.pivotStroke)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,3');

        svg
          .append('text')
          .attr('class', 'es-node-label')
          .attr('x', nodeX + nodeWidth / 2)
          .attr('y', y + 12)
          .attr('text-anchor', 'middle')
          .attr('fill', t.pivotStroke)
          .attr('font-size', `${t.fontSizeNode}px`)
          .text(node.label);

        nodeBoxMap.set(node.id, {
          x: nodeX,
          y: nodeY,
          width: nodeWidth,
          height: nodeHeight,
          centerX: nodeX + nodeWidth / 2,
          centerY: nodeY + nodeHeight / 2,
        });
        continue;
      }

      const colors = getNodeColors(node.type, t);

      // Sticky-note rectangle
      svg
        .append('rect')
        .attr('class', `es-node es-node-${node.type}`)
        .attr('x', nodeX)
        .attr('y', nodeY)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 4)
        .attr('fill', colors.fill)
        .attr('stroke', colors.stroke)
        .attr('stroke-width', 1.5);

      // Node label
      svg
        .append('text')
        .attr('class', 'es-node-label')
        .attr('x', nodeX + nodeWidth / 2)
        .attr('y', nodeY + nodeHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', t.textColor)
        .attr('font-size', `${t.fontSizeNode}px`)
        .text(node.label);

      nodeBoxMap.set(node.id, {
        x: nodeX,
        y: nodeY,
        width: nodeWidth,
        height: nodeHeight,
        centerX: nodeX + nodeWidth / 2,
        centerY: nodeY + nodeHeight / 2,
      });
    }
  }

  // Render edges
  const renderEdge = (edge: EsEdge) => {
    const src = nodeBoxMap.get(edge.sourceId);
    const tgt = nodeBoxMap.get(edge.targetId);
    if (!src || !tgt) {
      return;
    }

    const isDashed = edge.op === '..' || edge.op === '..>';
    const hasArrow = edge.op === '->' || edge.op === '..>';

    const x1 = src.centerX + src.width / 2;
    const y1 = src.centerY;
    const x2 = tgt.centerX - tgt.width / 2;
    const y2 = tgt.centerY;

    svg
      .append('line')
      .attr('class', 'es-edge')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', t.edgeStroke)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', isDashed ? '5,3' : 'none')
      .attr('marker-end', hasArrow ? `url(#${arrowheadId})` : null);

    if (edge.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 6;
      svg
        .append('text')
        .attr('class', 'es-edge-label')
        .attr('x', mx)
        .attr('y', my)
        .attr('text-anchor', 'middle')
        .attr('fill', t.textColor)
        .attr('font-size', `${t.fontSizeNode - 1}px`)
        .text(edge.label);
    }
  };

  for (const edge of edges) {
    renderEdge(edge);
  }

  setupGraphViewbox(undefined, svg, config.padding ?? 8, config.useMaxWidth);
};

export default { draw };
