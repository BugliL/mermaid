import type { Selection } from 'd3';
import { select } from 'd3';
import { setupGraphViewbox } from '../../diagram-api/diagramAPI.js';
import { getConfig } from '../../config.js';
import { cleanAndMerge } from '../../utils.js';
import { getThemeVariables } from '../../themes/theme-default.js';
import type { DrawDefinition } from '../../diagram-api/types.js';
import type { EsDB, EsEdge, EsNode, EsNodeType } from './types.js';

// ── Theme ─────────────────────────────────────────────────────────────────────

const getEsTheme = () => {
  const merged = cleanAndMerge(getThemeVariables(), getConfig().themeVariables);
  return merged.eventstorming as {
    eventFill: string;
    cmdFill: string;
    actorFill: string;
    policyFill: string;
    readmodelFill: string;
    systemFill: string;
    aggregateFill: string;
    hotspotFill: string;
    opportunityFill: string;
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

type EsTheme = ReturnType<typeof getEsTheme>;

// ── Shared types ──────────────────────────────────────────────────────────────

type SvgGroup = Selection<SVGGElement, unknown, HTMLElement, unknown>;

interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface RenderContext {
  theme: EsTheme;
  shadowFilterId: string;
  /** Top y-coordinate of the current swimlane (used by PivotRenderer). */
  swimlaneTop: number;
  swimlaneHeight: number;
  padding: number;
}

// ── Strategy interface ────────────────────────────────────────────────────────

interface NodeRenderer {
  /**
   * When true, this node type is rendered on top of the preceding element
   * rather than occupying its own column in the layout.
   */
  readonly isOverlay: boolean;

  render(svg: SvgGroup, node: EsNode, box: NodeBox, ctx: RenderContext): void;
}

// ── Primitive drawing helpers ─────────────────────────────────────────────────

const drawSquare = (
  parent: SvgGroup,
  node: EsNode,
  box: NodeBox,
  fill: string,
  shadowFilterId: string
) =>
  parent
    .append('rect')
    .attr('class', `es-node es-node-${node.type}`)
    .attr('x', box.x)
    .attr('y', box.y)
    .attr('width', box.width)
    .attr('height', box.height)
    .attr('fill', fill)
    .attr('stroke', 'none')
    .attr('filter', `url(#${shadowFilterId})`);

const drawCentredLabel = (
  parent: SvgGroup,
  text: string,
  box: NodeBox,
  fontSize: number,
  color: string
) =>
  parent
    .append('text')
    .attr('class', 'es-node-label')
    .attr('x', box.centerX)
    .attr('y', box.centerY)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', color)
    .attr('font-size', `${fontSize}px`)
    .text(text);

// ── Concrete strategies ───────────────────────────────────────────────────────

/**
 * Standard post-it sticky note: flat square, centred label, drop shadow.
 * Used for event, cmd, actor, policy, readmodel, system, aggregate.
 */
class StickyRenderer implements NodeRenderer {
  readonly isOverlay = false;

  constructor(private readonly getFill: (t: EsTheme) => string) {}

  render(svg: SvgGroup, node: EsNode, box: NodeBox, ctx: RenderContext) {
    const fill = this.getFill(ctx.theme);
    drawSquare(svg, node, box, fill, ctx.shadowFilterId);
    drawCentredLabel(svg, node.label, box, ctx.theme.fontSizeNode, ctx.theme.textColor);
  }
}

/**
 * Overlay sticky note: same as StickyRenderer but rendered on top of the
 * preceding element, slightly offset and rotated to mimic a physical workshop.
 * Used for hotspot and opportunity.
 */
class OverlayRenderer implements NodeRenderer {
  readonly isOverlay = true;

  constructor(private readonly getFill: (t: EsTheme) => string) {}

  render(svg: SvgGroup, node: EsNode, box: NodeBox, ctx: RenderContext) {
    const fill = this.getFill(ctx.theme);
    const g = svg
      .append('g')
      .attr('class', `es-node-overlay es-node-overlay-${node.type}`)
      .attr('transform', `rotate(4,${box.centerX},${box.centerY})`);
    drawSquare(g, node, box, fill, ctx.shadowFilterId);
    drawCentredLabel(g, node.label, box, ctx.theme.fontSizeNode, ctx.theme.textColor);
  }
}

/**
 * Vertical dashed divider line with a top label.
 * Used for pivot.
 */
class PivotRenderer implements NodeRenderer {
  readonly isOverlay = false;

  render(svg: SvgGroup, node: EsNode, box: NodeBox, ctx: RenderContext) {
    const { theme: t, swimlaneTop, swimlaneHeight, padding } = ctx;
    const midX = box.centerX;

    svg
      .append('line')
      .attr('class', 'es-pivot')
      .attr('x1', midX)
      .attr('y1', swimlaneTop)
      .attr('x2', midX)
      .attr('y2', swimlaneTop + swimlaneHeight - padding)
      .attr('stroke', t.pivotStroke)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3');

    svg
      .append('text')
      .attr('class', 'es-node-label')
      .attr('x', midX)
      .attr('y', swimlaneTop + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', t.pivotStroke)
      .attr('font-size', `${t.fontSizeNode}px`)
      .text(node.label);
  }
}

// ── Strategy registry ─────────────────────────────────────────────────────────

const NODE_RENDERERS: Record<EsNodeType, NodeRenderer> = {
  event: new StickyRenderer((t) => t.eventFill),
  cmd: new StickyRenderer((t) => t.cmdFill),
  actor: new StickyRenderer((t) => t.actorFill),
  policy: new StickyRenderer((t) => t.policyFill),
  readmodel: new StickyRenderer((t) => t.readmodelFill),
  system: new StickyRenderer((t) => t.systemFill),
  aggregate: new StickyRenderer((t) => t.aggregateFill),
  hotspot: new OverlayRenderer((t) => t.hotspotFill),
  opportunity: new OverlayRenderer((t) => t.opportunityFill),
  pivot: new PivotRenderer(),
};

// ── Layout helpers ────────────────────────────────────────────────────────────

/** Resolve the rendered box for a node, accounting for overlay positioning. */
const resolveBox = (
  node: EsNode,
  nodeList: EsNode[],
  nodeBoxMap: Map<string, NodeBox>,
  nodeX: number,
  nodeY: number,
  nodeSize: number
): NodeBox | null => {
  if (NODE_RENDERERS[node.type].isOverlay) {
    const nonOverlays = nodeList.filter((n) => !NODE_RENDERERS[n.type].isOverlay);
    const targetNode = nonOverlays.findLast((n) => n.positionInGroup < node.positionInGroup);
    const targetBox = targetNode ? nodeBoxMap.get(targetNode.id) : null;
    if (!targetBox) {
      return null; // nothing to attach to
    }
    const x = targetBox.x + 8;
    const y = targetBox.y - 40;
    return {
      x,
      y,
      width: nodeSize,
      height: nodeSize,
      centerX: x + nodeSize / 2,
      centerY: y + nodeSize / 2,
    };
  }

  return {
    x: nodeX,
    y: nodeY,
    width: nodeSize,
    height: nodeSize,
    centerX: nodeX + nodeSize / 2,
    centerY: nodeY + nodeSize / 2,
  };
};

// ── Main draw ─────────────────────────────────────────────────────────────────

const draw: DrawDefinition = (_text, id, _version, diagObj) => {
  const db = diagObj.db as EsDB;
  const config = db.getConfig();
  const theme = getEsTheme();

  const nodes = db.getNodes();
  const edges = db.getEdges();
  const groups = db.getGroups();

  const padding = config.padding ?? 8;
  const nodeSize = config.nodeWidth ?? 100; // square: width === height
  const swimlaneHeight = config.swimlaneHeight ?? 150;
  const swimlaneLabelWidth = 120;
  const nodeSep = padding * 2;

  const svg: SvgGroup = select(`[id="${id}"]`);

  // ── SVG definitions ───────────────────────────────────────────────────────

  const arrowheadId = `es-arrowhead-${id}`;
  const shadowFilterId = `es-shadow-${id}`;
  const defs = svg.append('defs');

  const shadowFilter = defs
    .append('filter')
    .attr('id', shadowFilterId)
    .attr('x', '-25%')
    .attr('y', '-25%')
    .attr('width', '150%')
    .attr('height', '150%');
  shadowFilter
    .append('feDropShadow')
    .attr('dx', '5')
    .attr('dy', '5')
    .attr('stdDeviation', '3.5')
    .attr('flood-color', 'rgba(33,33,33,0.65)');

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
    .attr('fill', theme.arrowhead);

  // ── Layout ────────────────────────────────────────────────────────────────

  const nodeBoxMap = new Map<string, NodeBox>();

  const groupNodes = new Map<number, EsNode[]>();
  for (const node of nodes) {
    if (!groupNodes.has(node.groupIndex)) {
      groupNodes.set(node.groupIndex, []);
    }
    groupNodes.get(node.groupIndex)!.push(node);
  }

  // ── Swimlanes ─────────────────────────────────────────────────────────────

  for (const group of groups) {
    const groupNodeList = (groupNodes.get(group.index) ?? []).sort(
      (a, b) => a.positionInGroup - b.positionInGroup
    );
    const swimlaneTop = group.index * swimlaneHeight + padding;

    // Overlay nodes don't occupy their own column.
    const nonOverlayNodes = groupNodeList.filter((n) => !NODE_RENDERERS[n.type].isOverlay);
    const laneWidth = swimlaneLabelWidth + nonOverlayNodes.length * (nodeSize + nodeSep) + padding;

    // Column index = number of non-overlay nodes that come before this one.
    const columnOf = (node: EsNode) =>
      nonOverlayNodes.filter((n) => n.positionInGroup < node.positionInGroup).length;

    svg
      .append('rect')
      .attr('class', 'es-group-bg')
      .attr('x', 0)
      .attr('y', swimlaneTop)
      .attr('width', laneWidth)
      .attr('height', swimlaneHeight - padding)
      .attr('rx', 4)
      .attr('fill', theme.swimlaneBg)
      .attr('stroke', theme.swimlaneStroke);

    svg
      .append('text')
      .attr('class', 'es-group-label')
      .attr('x', padding * 2)
      .attr('y', swimlaneTop + swimlaneHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', theme.textColor)
      .attr('font-size', `${theme.fontSizeLabel}px`)
      .attr('font-weight', 'bold')
      .text(group.name);

    const ctx: RenderContext = {
      theme,
      shadowFilterId,
      swimlaneTop,
      swimlaneHeight,
      padding,
    };

    // ── Nodes ───────────────────────────────────────────────────────────────

    for (const node of groupNodeList) {
      const nodeX = swimlaneLabelWidth + columnOf(node) * (nodeSize + nodeSep);
      const nodeY = swimlaneTop + (swimlaneHeight - padding - nodeSize) / 2;

      const box = resolveBox(node, groupNodeList, nodeBoxMap, nodeX, nodeY, nodeSize);
      if (!box) {
        continue; // overlay with no preceding target — skip
      }

      nodeBoxMap.set(node.id, box);
      NODE_RENDERERS[node.type].render(svg, node, box, ctx);
    }
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  for (const edge of edges) {
    renderEdge(svg, edge, nodeBoxMap, theme, arrowheadId);
  }

  setupGraphViewbox(undefined, svg, config.padding ?? 8, config.useMaxWidth);
};

const renderEdge = (
  svg: SvgGroup,
  edge: EsEdge,
  nodeBoxMap: Map<string, NodeBox>,
  theme: EsTheme,
  arrowheadId: string
) => {
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
    .attr('stroke', theme.edgeStroke)
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
      .attr('fill', theme.textColor)
      .attr('font-size', `${theme.fontSizeNode - 1}px`)
      .text(edge.label);
  }
};

export default { draw };
