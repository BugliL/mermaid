import { describe, it, expect, beforeEach } from 'vitest';
import type {
  EventStorming,
  EsGroup as AstEsGroup,
  EsFlow,
  EsNamedElement,
} from '@mermaid-js/parser';
import { db } from './db.js';

/** Helper: build a partial EsNamedElement. */
const mkNamed = (type: string, id: string, label?: string): EsNamedElement =>
  ({ $type: 'EsNamedElement', type, id, label }) as unknown as EsNamedElement;

/** Helper: build a partial AST group. */
const mkGroup = (name: string, members: EsNamedElement[] = []): AstEsGroup =>
  ({ $type: 'EsGroup', name, members }) as unknown as AstEsGroup;

/** Helper: build a partial EsFlow. */
const mkFlow = (first: string, ...links: { op: string; target: string }[]): EsFlow =>
  ({
    $type: 'EsFlow',
    first,
    links: links.map((l) => ({ $type: 'EsLink', op: l.op, target: l.target })),
  }) as unknown as EsFlow;

/** Helper: build a minimal EventStorming AST. */
const mkAst = (
  groups: AstEsGroup[] = [],
  elements: EsNamedElement[] = [],
  flows: EsFlow[] = []
): EventStorming =>
  ({
    $type: 'EventStorming',
    groups,
    elements,
    flows,
  }) as unknown as EventStorming;

describe('EventStorming Database', () => {
  beforeEach(() => db.clear());

  it('should start empty after clear', () => {
    expect(db.getNodes()).toHaveLength(0);
    expect(db.getEdges()).toHaveLength(0);
    expect(db.getGroups()).toHaveLength(0);
  });

  it('should populate groups and nodes from AST', () => {
    const ast = mkAst([
      mkGroup('Customer Actions', [mkNamed('actor', 'Customer'), mkNamed('event', 'OrderPlaced')]),
    ]);
    db.setAst(ast);

    expect(db.getGroups()).toHaveLength(1);
    expect(db.getGroups()[0]).toEqual({ name: 'Customer Actions', index: 0 });
    expect(db.getNodes()).toHaveLength(2);
    expect(db.getNodes()[0]).toMatchObject({ id: 'Customer', type: 'actor', groupIndex: 0 });
    expect(db.getNodes()[1]).toMatchObject({ id: 'OrderPlaced', type: 'event', groupIndex: 0 });
  });

  it('should normalize type aliases', () => {
    const ast = mkAst([
      mkGroup('Aliases', [
        mkNamed('command', 'PlaceOrder'),
        mkNamed('user', 'Bob'),
        mkNamed('reactor', 'AutoApprove'),
        mkNamed('rm', 'Catalog'),
        mkNamed('agg', 'OrderAgg'),
      ]),
    ]);
    db.setAst(ast);
    const types = db.getNodes().map((n) => n.type);
    expect(types).toEqual(['cmd', 'actor', 'policy', 'readmodel', 'aggregate']);
  });

  it('should keep canonical types unchanged', () => {
    const ast = mkAst([
      mkGroup('Canonical', [
        mkNamed('event', 'OrderPlaced'),
        mkNamed('cmd', 'PlaceOrder'),
        mkNamed('system', 'PaymentGateway'),
        mkNamed('hotspot', 'StockIssue'),
        mkNamed('opportunity', 'InstantSettlement'),
      ]),
    ]);
    db.setAst(ast);
    const types = db.getNodes().map((n) => n.type);
    expect(types).toEqual(['event', 'cmd', 'system', 'hotspot', 'opportunity']);
  });

  it('should use id as label when no label provided', () => {
    const ast = mkAst([mkGroup('G', [mkNamed('event', 'OrderPlaced')])]);
    db.setAst(ast);
    expect(db.getNodes()[0].label).toBe('OrderPlaced');
  });

  it('should use explicit label when provided', () => {
    const ast = mkAst([mkGroup('G', [mkNamed('event', 'E1', 'Order was placed')])]);
    db.setAst(ast);
    expect(db.getNodes()[0].label).toBe('Order was placed');
  });

  it('should create edges from flows', () => {
    const ast = mkAst(
      [mkGroup('G', [mkNamed('cmd', 'PlaceOrder'), mkNamed('event', 'OrderPlaced')])],
      [],
      [mkFlow('PlaceOrder', { op: '->', target: 'OrderPlaced' })]
    );
    db.setAst(ast);
    expect(db.getEdges()).toHaveLength(1);
    expect(db.getEdges()[0]).toMatchObject({
      sourceId: 'PlaceOrder',
      targetId: 'OrderPlaced',
      op: '->',
    });
  });

  it('should create multiple edges from a chained flow', () => {
    const ast = mkAst(
      [
        mkGroup('G', [
          mkNamed('actor', 'Customer'),
          mkNamed('cmd', 'PlaceOrder'),
          mkNamed('event', 'OrderPlaced'),
        ]),
      ],
      [],
      [mkFlow('Customer', { op: '->', target: 'PlaceOrder' }, { op: '->', target: 'OrderPlaced' })]
    );
    db.setAst(ast);
    expect(db.getEdges()).toHaveLength(2);
    expect(db.getEdges()[0]).toMatchObject({ sourceId: 'Customer', targetId: 'PlaceOrder' });
    expect(db.getEdges()[1]).toMatchObject({ sourceId: 'PlaceOrder', targetId: 'OrderPlaced' });
  });

  it('should assign positionInGroup in declaration order', () => {
    const ast = mkAst([
      mkGroup('G', [mkNamed('cmd', 'A'), mkNamed('event', 'B'), mkNamed('actor', 'C')]),
    ]);
    db.setAst(ast);
    const positions = db.getNodes().map((n) => n.positionInGroup);
    expect(positions).toEqual([0, 1, 2]);
  });

  it('should place top-level elements with groupIndex -1', () => {
    const ast = mkAst([], [mkNamed('aggregate', 'OrderAgg')]);
    db.setAst(ast);
    expect(db.getNodes()[0]).toMatchObject({ id: 'OrderAgg', type: 'aggregate', groupIndex: -1 });
  });

  it('should handle multiple groups with correct groupIndex', () => {
    const ast = mkAst([
      mkGroup('G0', [mkNamed('event', 'A')]),
      mkGroup('G1', [mkNamed('event', 'B')]),
    ]);
    db.setAst(ast);
    expect(db.getNodes()[0].groupIndex).toBe(0);
    expect(db.getNodes()[1].groupIndex).toBe(1);
    expect(db.getGroups()[0].index).toBe(0);
    expect(db.getGroups()[1].index).toBe(1);
  });

  it('should clear state on second clear call', () => {
    const ast = mkAst([mkGroup('G', [mkNamed('event', 'A')])]);
    db.setAst(ast);
    expect(db.getNodes().length).toBeGreaterThan(0);
    db.clear();
    expect(db.getNodes()).toHaveLength(0);
    expect(db.getGroups()).toHaveLength(0);
    expect(db.getEdges()).toHaveLength(0);
  });
});
