# EventStorming

> EventStorming is a collaborative domain-modelling technique created by [Alberto Brandolini](https://www.eventstorming.com/). Participants use color-coded sticky notes to map domain events, commands, actors, policies, and aggregates across a shared timeline.

Mermaid supports EventStorming diagrams using the `eventstorming` keyword. The diagram renders as horizontal swimlane rows (groups), with colored nodes representing each element type, connected by flow arrows.

---

## Syntax

### Diagram declaration

```
eventstorming
  title My Diagram
```

The `title` keyword sets the diagram title (also used as an accessible name).

---

### Groups (swimlanes)

Groups declare named horizontal rows. Elements inside a group appear left-to-right in declaration order. Groups stack vertically in declaration order.

```
eventstorming
  group "Group Name" {
    event OrderPlaced
    cmd PlaceOrder
  }
```

---

### Element types

| Keyword       | Alias     | Color           | Description                                  |
| ------------- | --------- | --------------- | -------------------------------------------- |
| `event`       | —         | 🟠 Orange       | Domain Event: past-tense fact                |
| `cmd`         | `command` | 🔵 Blue         | Command: imperative action                   |
| `actor`       | `user`    | 🟡 Yellow       | Actor: person who triggers a command         |
| `policy`      | `reactor` | 🟣 Lilac        | Policy: automation rule                      |
| `readmodel`   | `rm`      | 🟢 Green        | Read Model: information to support decisions |
| `system`      | —         | 🩷 Pink         | External System                              |
| `aggregate`   | `agg`     | 🟨 Large yellow | Aggregate: DDD domain object                 |
| `hotspot`     | —         | 🟥 Red          | Hot Spot: open question or problem area      |
| `opportunity` | —         | 💚 Light green  | Opportunity: new idea or improvement         |
| `pivot`       | —         | ─── Bold line   | Pivotal Event: phase separator (no ID)       |

Elements are declared as `<type> <ID> [optional label]`:

```
actor Customer
event OrderPlaced "Order was placed"
pivot "Payment Phase"
```

Aliases are automatically normalized: `command` → `cmd`, `user` → `actor`, `reactor` → `policy`, `rm` → `readmodel`, `agg` → `aggregate`.

The `pivot` element has no ID and cannot appear in flow arrows. It renders as a bold vertical divider line.

---

### Flow arrows

Flow arrows connect elements across groups. Multiple elements can be chained in a single line.

| Arrow | Meaning                                               |
| ----- | ----------------------------------------------------- |
| `->`  | Causal / trigger relationship (timeline flow)         |
| `..`  | Informational relationship (read model informs actor) |
| `..>` | External contribution (system produces / triggers)    |

```
eventstorming
  Customer -> PlaceOrder -> Order -> OrderPlaced
  OrderCatalog .. Customer
  PaymentGateway ..> ChargeCard
```

---

### Accessibility

```
eventstorming
  title Order Processing
  accDescr: Diagram showing the order processing flow
```

---

## Full example

```mermaid
eventstorming
  title Order Processing

  group "Customer Actions" {
    actor Customer
    readmodel OrderCatalog "Browsable products"
    hotspot "How does stock affect availability?"
  }

  group "Order Processing" {
    cmd PlaceOrder
    agg Order
    event OrderPlaced
    pivot "Payment Phase"
    policy AutoApprove "Auto-approve orders"
  }

  group "Payment Processing" {
    system PaymentGateway
    cmd ChargeCard
    agg Payment
    event PaymentProcessed
    opportunity "Instant settlement"
  }

  Customer -> PlaceOrder -> Order -> OrderPlaced -> AutoApprove -> ChargeCard -> Payment -> PaymentProcessed
  OrderCatalog .. Customer
  PaymentGateway ..> ChargeCard
```

---

## Configuration

You can customize `eventstorming` diagrams via Mermaid's `initialize` config:

```js
mermaid.initialize({
  eventstorming: {
    padding: 8,
    useMaxWidth: true,
  },
});
```

| Option        | Default | Description                                        |
| ------------- | ------- | -------------------------------------------------- |
| `padding`     | `8`     | Padding between nodes and swimlane borders         |
| `useMaxWidth` | `true`  | Whether the diagram scales to fill container width |

---

## Theme variables

EventStorming colors are controlled by theme variables. You can override them in a custom theme or via `themeVariables`:

| Variable                        | Default (light)    | Description         |
| ------------------------------- | ------------------ | ------------------- |
| `eventstorming.eventFill`       | `#ff9800`          | Domain Event fill   |
| `eventstorming.cmdFill`         | `#2196f3`          | Command fill        |
| `eventstorming.actorFill`       | `#fff176`          | Actor fill          |
| `eventstorming.policyFill`      | `#ce93d8`          | Policy fill         |
| `eventstorming.readmodelFill`   | `#a5d6a7`          | Read Model fill     |
| `eventstorming.systemFill`      | `#f48fb1`          | System fill         |
| `eventstorming.aggregateFill`   | `#ffd54f`          | Aggregate fill      |
| `eventstorming.hotspotFill`     | `#ef5350`          | Hot Spot fill       |
| `eventstorming.opportunityFill` | `#c8e6c9`          | Opportunity fill    |
| `eventstorming.swimlaneBg`      | `rgb(250,250,250)` | Swimlane background |

---

## Further reading

- [eventstorming.com](https://www.eventstorming.com/) — Official EventStorming website by Alberto Brandolini
