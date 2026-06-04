grammar EventStormingDiagram
import "../common/common";

entry EventStorming:
    'eventstorming'
    NEWLINE*
    (
        TitleAndAccessibilities
        | groups+=EsGroup
        | elements+=EsElement
        | flows+=EsFlow
        | NEWLINE
    )*
;

EsGroup:
    'group' name=STRING '{' NEWLINE*
    (members+=EsElement NEWLINE*)*
    '}'
;

// Union: named elements (have IDs, can appear in flows) or pivots (decoration only)
EsElement:
    EsNamedElement | EsPivot
;

// All element types that carry an ID
EsNamedElement:
    type=EsNodeType id=ES_ID (label=STRING)?
;

EsNodeType returns string:
    'event'
    | 'cmd' | 'command'
    | 'actor' | 'user'
    | 'policy' | 'reactor'
    | 'readmodel' | 'rm'
    | 'system'
    | 'aggregate' | 'agg'
    | 'hotspot'
    | 'opportunity'
;

// Special decorator: vertical divider line, label only — cannot appear in flows
EsPivot:
    'pivot' label=STRING
;

// Flow: first node + chain of links; each link preserves the operator type
EsFlow:
    first=ES_ID links+=EsLink+ EOL
;

EsLink:
    op=EsFlowOp target=ES_ID (label=STRING)?
;

EsFlowOp returns string:
    '->' | '..' | '..>'
;

terminal ES_ID: /[_a-zA-Z][\w]*/;
