import type { DiagramMetadata } from '../types.js';

export default {
  id: 'eventstorming',
  name: 'EventStorming',
  description: 'Collaborative domain modelling using color-coded sticky notes (Alberto Brandolini)',
  examples: [
    {
      title: 'Order Processing',
      isDefault: true,
      code: `eventstorming
  title Order Processing

  group "Customer Actions" {
    actor Customer
    readmodel OrderCatalog "Browsable products"
    hotspot StockQuestion "How does stock affect availability?"
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
    opportunity InstantSettlement "Instant settlement"
  }

  Customer -> PlaceOrder -> Order -> OrderPlaced -> AutoApprove -> ChargeCard -> Payment -> PaymentProcessed
  OrderCatalog .. Customer
  PaymentGateway ..> ChargeCard
`,
    },
  ],
} satisfies DiagramMetadata;
