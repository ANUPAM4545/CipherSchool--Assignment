export interface SampleArchitectureTemplate {
  requirementsUnderstanding: string;
  assumptionsAndConstraints: string;
  classesAndEntities: string;
  responsibilities: string;
  relationshipsAndInterfaces: string;
  patternsAndTradeoffs: string;
  edgeCasesAndReasoning: string;
}

export const SAMPLE_TEMPLATES: Record<string, SampleArchitectureTemplate> = {
  'parking-lot-system': {
    requirementsUnderstanding:
      'Design an object-oriented multi-level parking lot supporting motorcycles, compact cars, large trucks, and electric vehicles. The system must allocate spots nearest to entry, generate tickets, calculate dynamic fees, process payment, and release spots upon exit.',
    assumptionsAndConstraints:
      'Assuming in-memory slot indexing for high throughput, multiple concurrent entry and exit gates, standard 24/7 operating hours, and a flat hourly rate with dynamic surge surcharge during peak hours.',
    classesAndEntities:
      'ParkingLot (Singleton/Coordinator), ParkingFloor, ParkingSpot (MotorcycleSpot, CompactSpot, LargeSpot, ElectricSpot), Vehicle (Motorcycle, Car, Truck, EV), Ticket, Payment, EntranceGate, ExitGate.',
    responsibilities:
      'ParkingLot manages floors and gates; ParkingFloor tracks available spots by type; ParkingSpot tracks its occupied status and assigned vehicle; Ticket records entry timestamp and allocated spot; Payment processes transactions; PricingService calculates tariffs.',
    relationshipsAndInterfaces:
      'IPricingStrategy interface implemented by HourlyPricingStrategy and WeekendSurgePricingStrategy; IParkingAllocationStrategy interface implemented by NearestFirstStrategy; ParkingLot compositionally contains multiple ParkingFloors; ParkingFloor contains multiple ParkingSpots.',
    patternsAndTradeoffs:
      'Strategy Pattern applied for pricing calculation to allow runtime switching without altering ExitGate logic. Factory Pattern used for Vehicle and ParkingSpot creation. Trade-off: Used in-memory concurrent locks around floor spot pools rather than coarse-grained whole-lot locking to maximize entrance throughput.',
    edgeCasesAndReasoning:
      'Thread safety: Concurrent spot allocation handled using synchronized mutexes per floor level. Full lot scenario: System gracefully returns ParkingFullException before gate barrier opens. Vehicle size mismatch: Spot allocation enforces strictly vehicleSize <= spotCapacity.',
  },

  'vending-machine': {
    requirementsUnderstanding:
      'Design a state-driven vending machine managing inventory, coin/cash acceptance across multiple denominations, item dispensing, transaction cancellation, and greedy change computation.',
    assumptionsAndConstraints:
      'Single customer interaction at any moment; physical hardware sensors represented by abstraction callbacks; exact change notification when coin inventory is exhausted.',
    classesAndEntities:
      'VendingMachine (Context), IVendingState (State interface), IdleState, HasMoneyState, DispensingState, SoldOutState, Product, Coin (Enum), CashBank, Inventory.',
    responsibilities:
      'VendingMachine holds references to states, inventory, and cash bank; State implementations handle insertMoney, selectProduct, dispense, and cancelTransaction; Inventory maintains stock counts; CashBank manages balance and calculates change.',
    relationshipsAndInterfaces:
      'IVendingState interface with methods (insertCoin, selectItem, dispense, refund); VendingMachine holds current IVendingState; CashBank contains Coin denominations.',
    patternsAndTradeoffs:
      'State Pattern applied to eliminate sprawling nested switch-cases and encapsulate state-specific behavior. Command Pattern could be used for hardware actions, but State Pattern offers superior lifecycle clarity for MVP. Trade-off: State transitions are managed directly by state instances for simplicity.',
    edgeCasesAndReasoning:
      'Insufficient change: Machine refunds full inserted deposit and reverts to IdleState. Concurrent product selection prevented by single-threaded lock on machine context. Sold-out transition handled automatically when item quantity reaches 0.',
  },

  'elevator-system': {
    requirementsUnderstanding:
      'Design a multi-car elevator control system for an N-story building with internal floor selection and external hall call dispatching.',
    assumptionsAndConstraints:
      '10-story building with 3 elevator cars; maximum passenger weight limit enforced via weight sensor; cars operate asynchronously.',
    classesAndEntities:
      'ElevatorController, ElevatorCar, Direction (UP, DOWN, IDLE), HallCall, InternalRequest, IDispatchStrategy, Door (OPEN, CLOSED).',
    responsibilities:
      'ElevatorController receives hall calls and delegates to dispatch algorithm; ElevatorCar executes movement and services its queue; IDispatchStrategy selects the optimal car based on proximity and direction.',
    relationshipsAndInterfaces:
      'ElevatorController delegates to IDispatchStrategy (LOOKDispatchStrategy); ElevatorCar contains a PriorityQueue of requested floors; ElevatorCar notifies Controller of floor arrivals.',
    patternsAndTradeoffs:
      'Strategy Pattern used for dispatch algorithm to allow swapping between SCAN, LOOK, and Nearest-Car algorithms. Observer Pattern used for car state changes broadcasting to floor displays.',
    edgeCasesAndReasoning:
      'Direction reversal starvation prevented by servicing all pending requests in current direction before flipping. Overweight sensor halts door closing and triggers alert buzzer until load is reduced.',
  },

  'library-management-system': {
    requirementsUnderstanding:
      'Design a comprehensive library system supporting book cataloging, multi-criteria search, lending policies, reservations, and fine computation.',
    assumptionsAndConstraints:
      'Standard barcode identification for each book copy; 14-day loan period with $1/day overdue fine; members restricted to max 5 concurrent checkouts.',
    classesAndEntities:
      'Library, Book, BookCopy, Member, Loan, Reservation, ISearchSpecification, IFineCalculationStrategy.',
    responsibilities:
      'Library manages catalogs and accounts; BookCopy tracks loan status; Member holds active loans; Loan tracks dates and fine dues.',
    relationshipsAndInterfaces:
      'ISearchSpecification implemented by TitleSpecification, AuthorSpecification; IFineCalculationStrategy implemented by StandardFineStrategy and VIPFineStrategy.',
    patternsAndTradeoffs:
      'Specification / Composite Pattern for flexible book search combinations without explosion of if-statements. Strategy Pattern for fine computation.',
    edgeCasesAndReasoning:
      'Overdue fine blocking: Checkout automatically prevented if unpaid fines exceed $10. Concurrent reservation on the last copy locked with atomic check.',
  },

  'movie-ticket-booking-system': {
    requirementsUnderstanding:
      'Design a cinema booking platform handling seat layouts, temporary 10-minute hold locks, payment processing, and booking workflows.',
    assumptionsAndConstraints:
      'Multiple users attempting to book the same prime seat simultaneously; 10-minute hold expiration timer; seat tier pricing.',
    classesAndEntities:
      'Cinema, Hall, Show, Seat, SeatStatus (AVAILABLE, LOCKED, BOOKED), Booking, Payment, IPaymentGateway.',
    responsibilities:
      'Show manages seat matrix and temporary locks; Booking tracks user selection and timer; IPaymentGateway processes transactions.',
    relationshipsAndInterfaces:
      'IPaymentGateway implemented by StripeGateway and UpiGateway; Show aggregates Seats; Booking references Show and locked Seats.',
    patternsAndTradeoffs:
      'State Pattern for booking lifecycle (CREATED ➔ LOCKED ➔ CONFIRMED / EXPIRED). Adapter Pattern for third-party payment gateways.',
    edgeCasesAndReasoning:
      'Double-booking race condition prevented via atomic conditional CAS (Compare-And-Swap) lock on Seat entity. Expired timer releases locks automatically.',
  },
};
