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
    {
      title: 'Hotel Booking — All Features',
      code: `eventstorming
  title Hotel Booking
  accDescr: Full hotel booking flow showcasing every element type and arrow

  group "Guest Journey" {
    user Guest
    rm AvailabilityCalendar "Available rooms"
    command SearchRooms "Search for a room"
    event RoomsListed "Rooms listed"
    hotspot NoRoomsHotspot "What if no rooms match?"
  }

  group "Reservation" {
    cmd BookRoom
    agg Reservation
    event ReservationCreated "Reservation created"
    pivot "Payment checkpoint"
    reactor ConfirmIfPrepaid "Auto-confirm prepaid bookings"
    event ReservationConfirmed
  }

  group "Payment" {
    system StripeGateway "Stripe"
    cmd ChargeGuest
    aggregate Payment
    event PaymentCaptured
    opportunity LoyaltyOpportunity "Offer loyalty points on capture"
  }

  group "Notifications" {
    policy NotifyGuest "Always notify on confirmation"
    system EmailService
    event ConfirmationEmailSent
  }

  Guest -> SearchRooms -> RoomsListed -> BookRoom -> Reservation -> ReservationCreated
  ReservationCreated -> ConfirmIfPrepaid -> ReservationConfirmed
  ReservationConfirmed -> ChargeGuest -> Payment -> PaymentCaptured
  ReservationConfirmed -> NotifyGuest -> ConfirmationEmailSent
  AvailabilityCalendar .. Guest
  StripeGateway ..> ChargeGuest
  EmailService ..> ConfirmationEmailSent
`,
    },
  ],
} satisfies DiagramMetadata;
