import { Problem } from '../../domain/entities/Problem';
import { IProblemRepository } from '../../domain/repositories/IProblemRepository';

export const SEED_PROBLEMS: Problem[] = [
  // ==========================================
  // LOW-LEVEL DESIGN (LLD) PROBLEMS
  // ==========================================
  new Problem({
    id: 'prob-parking-lot',
    title: 'Parking Lot System',
    slug: 'parking-lot-system',
    difficulty: 'MEDIUM',
    type: 'LLD',
    shortDescription:
      'Design an object-oriented multi-level parking lot supporting diverse vehicle types, dynamic pricing strategies, and concurrent slot allocation.',
    functionalRequirements: [
      'The parking lot has multiple floors, each with dedicated spots for Motorcycles, Compact Cars, Large SUVs, and Electric Vehicles (with chargers).',
      'The system must assign the nearest available spot based on entry point and vehicle type.',
      'Upon vehicle entry, generate a Ticket recording entry timestamp, allocated spot ID, and vehicle license plate.',
      'Support dynamic pricing strategies (e.g. hourly rate, flat rate, or weekend surcharge).',
      'Upon exit, calculate fee, process payment, and immediately release spot for incoming vehicles.',
    ],
    nonFunctionalRequirements: [
      'Concurrency: Multiple entry and exit gates operating simultaneously without race conditions or double-booking.',
      'Extensibility: New vehicle types or pricing schemes can be plugged in without modifying core floor management.',
      'Fault tolerance: Unoccupied spots must be accurately tracked in-memory with zero stale states.',
    ],
    constraints: [
      'Single vehicle occupying exactly one fitting spot.',
      'A vehicle cannot occupy a spot smaller than its class size.',
      'Electric spots may only be assigned to EV vehicles.',
    ],
    conceptsPracticed: [
      'Strategy Pattern (Pricing calculation)',
      'Factory Pattern (Vehicle & Spot creation)',
      'Single Responsibility Principle (Floor vs Ticket vs Payment)',
      'Concurrency & Thread-Safety (Spot reservation locks)',
    ],
  }),

  new Problem({
    id: 'prob-vending-machine',
    title: 'Vending Machine',
    slug: 'vending-machine',
    difficulty: 'EASY',
    type: 'LLD',
    shortDescription:
      'Design a state-driven vending machine managing inventory, multi-denomination payment acceptance, item dispensing, and change calculation.',
    functionalRequirements: [
      'Display inventory of products with item code, price, and available count.',
      'Support coin and cash insertion across multiple denominations ($1, $5, 10c, 25c).',
      'State-driven behavior: Idle ➔ HasMoney ➔ Dispensing ➔ SoldOut.',
      'Calculate change accurately using greedy or coin-change denomination logic.',
      'Allow transaction cancellation before dispensing, returning full deposited money.',
      'Allow operator replenishment of inventory and collection of accumulated cash.',
    ],
    nonFunctionalRequirements: [
      'State Pattern: State transitions must be cleanly isolated so adding a state (e.g. Maintenance) requires no modifications to other states.',
      'Invariant: Cannot dispense without sufficient deposit or when item is out of stock.',
      'Robustness: Handle insufficient change in the cash bank gracefully.',
    ],
    constraints: [
      'Only one customer interaction at any given moment.',
      'Exact change warning when change reserves run low.',
    ],
    conceptsPracticed: [
      'State Pattern (Idle, HasMoney, Dispensing, SoldOut)',
      'Encapsulation of Cash Inventory',
      'Open-Closed Principle for new payment methods',
    ],
  }),

  new Problem({
    id: 'prob-elevator-system',
    title: 'Elevator System',
    slug: 'elevator-system',
    difficulty: 'HARD',
    type: 'LLD',
    shortDescription:
      'Design an optimal multi-car elevator control system for an N-story building with internal and external call dispatching.',
    functionalRequirements: [
      'An N-floor building served by M elevator cars.',
      'External hall call buttons (Up, Down) on each floor.',
      'Internal elevator control panel buttons for selecting target floors.',
      'Dispatching controller selects the most efficient elevator car to service each floor request.',
      'Support elevator direction states: Moving Up, Moving Down, Idle, Door Open, Maintenance.',
      'Track door open/close intervals and maximum weight/passenger limits.',
    ],
    nonFunctionalRequirements: [
      'Dispatching Algorithm Extensibility: Pluggable dispatch algorithms (e.g., SCAN, LOOK, Nearest-Car-First).',
      'Concurrency: Simultaneous hall calls and internal requests handled without starvation.',
      'Safety invariants: Overweight alarms prevent car movement until load is reduced.',
    ],
    constraints: [
      'Cars cannot reverse direction while outstanding requests exist in the current travel direction.',
      'Maximum capacity constraint strictly enforced.',
    ],
    conceptsPracticed: [
      'Strategy Pattern (Elevator Dispatch Algorithms)',
      'Observer Pattern (Floor requests broadcast to controller)',
      'Command Pattern (Internal & External button presses)',
      'State Pattern (Elevator Car States)',
    ],
  }),

  new Problem({
    id: 'prob-rate-limiter',
    title: 'Distributed Rate Limiter',
    slug: 'rate-limiter',
    difficulty: 'MEDIUM',
    type: 'LLD',
    shortDescription:
      'Design an extensible API rate limiter supporting multiple throttling algorithms (Token Bucket, Leaky Bucket, Sliding Window Counter).',
    functionalRequirements: [
      'Evaluate incoming client API requests against configured tier quotas (e.g., 100 req/min).',
      'Return rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.',
      'Support multiple pluggable rate-limiting algorithms.',
      'Differentiate limits by Client IP, User ID, or API Key.',
      'Graceful fallback when throttle cache is degraded.',
    ],
    nonFunctionalRequirements: [
      'Low Latency: Throttle evaluation must complete in < 2 milliseconds.',
      'Extensibility: Adding a new algorithm requires zero changes to API gateway interceptor.',
      'Thread Safety: Atomic counter increments across parallel client calls.',
    ],
    constraints: [
      'Memory efficiency: Evict expired client keys after window expiration.',
      'Strict window boundaries without off-by-one errors.',
    ],
    conceptsPracticed: [
      'Strategy Pattern (Algorithm Selection)',
      'Decorator Pattern (Request Handler Interceptor)',
      'Factory Pattern (Rate Limiter instantiation)',
      'Concurrency & Atomic Primitives',
    ],
  }),

  new Problem({
    id: 'prob-movie-ticket-booking',
    title: 'Movie Ticket Booking System',
    slug: 'movie-ticket-booking-system',
    difficulty: 'MEDIUM',
    type: 'LLD',
    shortDescription:
      'Design an online multiplex cinema reservation platform managing shows, dynamic seat maps, temporary locking, and payment timeouts.',
    functionalRequirements: [
      'Search shows by Cinema City, Movie Title, and Showtime.',
      'Select and temporarily hold seats for a maximum of 10 minutes during checkout.',
      'If payment completes before expiration, confirm booking and issue tickets.',
      'If timer expires, automatically release held seats back to the public pool.',
      'Support distinct seat classes (Silver, Gold, VIP Recliner) with tiered pricing.',
    ],
    nonFunctionalRequirements: [
      'High Concurrency: Zero double-booking under blockbuster movie ticket drops.',
      'Locking Strategy: Distributed lease locks with TTL.',
      'Decoupled Payment: Adapter pattern across multiple payment gateways (Stripe, Razorpay, PayPal).',
    ],
    constraints: [
      'Hold window strictly enforced (10 minutes).',
      'Contiguous seat selection validation.',
    ],
    conceptsPracticed: [
      'State Pattern (Booking Lifecycle)',
      'Adapter / Strategy Pattern (Payment Processors)',
      'Locking & Concurrency Management (Seat Hold Manager)',
      'Factory Pattern (Ticket Generation)',
    ],
  }),

  // ==========================================
  // CODING / DSA PROBLEMS
  // ==========================================
  new Problem({
    id: 'prob-two-sum',
    title: 'Two Sum / Target Sum Pair',
    slug: 'two-sum',
    difficulty: 'EASY',
    type: 'CODING',
    shortDescription:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    functionalRequirements: [
      'Given an array of integers nums and an integer target.',
      'Find exactly two distinct indices i and j such that nums[i] + nums[j] == target.',
      'Return the indices in any order or as [i, j].',
      'Each input is guaranteed to have exactly one valid solution.',
      'You may not use the same element twice.',
    ],
    nonFunctionalRequirements: [
      'Time Complexity: Achieve O(n) runtime complexity using an efficient lookup data structure.',
      'Space Complexity: O(n) auxiliary space complexity.',
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    conceptsPracticed: [
      'Hash Map Lookup',
      'Array Traversal',
      'Time vs Space Trade-offs',
      'Boundary & Negative Number Handling',
    ],
    codingConfig: {
      entryPoint: 'twoSum',
      inputFormat: 'nums: number[], target: number',
      outputFormat: 'number[] (array of two indices)',
      examples: [
        {
          input: 'nums = [2, 7, 11, 15], target = 9',
          output: '[0, 1]',
          explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].',
        },
        {
          input: 'nums = [3, 2, 4], target = 6',
          output: '[1, 2]',
          explanation: 'Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2].',
        },
        {
          input: 'nums = [3, 3], target = 6',
          output: '[0, 1]',
          explanation: 'Both duplicate elements are used at distinct indices.',
        },
      ],
      visibleTestCases: [
        {
          id: 'ts-vis-1',
          input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }),
          expectedOutput: JSON.stringify([0, 1]),
          explanation: 'Standard positive array target match.',
          isHidden: false,
        },
        {
          id: 'ts-vis-2',
          input: JSON.stringify({ nums: [3, 2, 4], target: 6 }),
          expectedOutput: JSON.stringify([1, 2]),
          explanation: 'Indices not at start.',
          isHidden: false,
        },
        {
          id: 'ts-vis-3',
          input: JSON.stringify({ nums: [3, 3], target: 6 }),
          expectedOutput: JSON.stringify([0, 1]),
          explanation: 'Duplicate numbers as pair.',
          isHidden: false,
        },
      ],
      hiddenTestCases: [
        {
          id: 'ts-hid-1',
          input: JSON.stringify({ nums: [-1, -2, -3, -4, -5], target: -8 }),
          expectedOutput: JSON.stringify([2, 4]),
          isHidden: true,
        },
        {
          id: 'ts-hid-2',
          input: JSON.stringify({ nums: [0, 4, 3, 0], target: 0 }),
          expectedOutput: JSON.stringify([0, 3]),
          isHidden: true,
        },
        {
          id: 'ts-hid-3',
          input: JSON.stringify({ nums: [1000000000, 500, -1000000000], target: 0 }),
          expectedOutput: JSON.stringify([0, 2]),
          isHidden: true,
        },
      ],
      starterCode: {
        javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Implement an O(n) solution using a Hash Map
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
        python: `def twoSum(nums: list[int], target: int) -> list[int]:
    """
    Finds two indices such that nums[i] + nums[j] == target.
    """
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []`,
      },
      allowedLanguages: ['javascript', 'python'],
      timeLimitMs: 2000,
      memoryLimitMb: 128,
    },
  }),

  new Problem({
    id: 'prob-valid-parentheses',
    title: 'Valid Parentheses / Bracket Validator',
    slug: 'valid-parentheses',
    difficulty: 'EASY',
    type: 'CODING',
    shortDescription:
      'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
    functionalRequirements: [
      'Open brackets must be closed by the same type of brackets.',
      'Open brackets must be closed in the correct order.',
      'Every close bracket has a corresponding open bracket of the same type.',
      'An empty string is considered valid.',
    ],
    nonFunctionalRequirements: [
      'Time Complexity: O(n) where n is the length of string s.',
      'Space Complexity: O(n) in worst case (e.g. all opening brackets).',
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only: "()[]{}"',
    ],
    conceptsPracticed: [
      'Stack Data Structure (LIFO)',
      'String Processing',
      'Boundary Conditions',
      'Hash Map Bracket Pairing',
    ],
    codingConfig: {
      entryPoint: 'isValid',
      inputFormat: 's: string',
      outputFormat: 'boolean',
      examples: [
        { input: 's = "()"', output: 'true', explanation: 'Matching round parentheses.' },
        { input: 's = "()[]{}"', output: 'true', explanation: 'All three bracket types properly opened and closed.' },
        { input: 's = "(]"', output: 'false', explanation: 'Mismatched closing bracket.' },
      ],
      visibleTestCases: [
        {
          id: 'vp-vis-1',
          input: JSON.stringify({ s: '()' }),
          expectedOutput: 'true',
          explanation: 'Single matching pair.',
          isHidden: false,
        },
        {
          id: 'vp-vis-2',
          input: JSON.stringify({ s: '()[]{}' }),
          expectedOutput: 'true',
          explanation: 'Sequential valid pairs.',
          isHidden: false,
        },
        {
          id: 'vp-vis-3',
          input: JSON.stringify({ s: '(]' }),
          expectedOutput: 'false',
          explanation: 'Mismatched brackets.',
          isHidden: false,
        },
      ],
      hiddenTestCases: [
        {
          id: 'vp-hid-1',
          input: JSON.stringify({ s: '([)]' }),
          expectedOutput: 'false',
          isHidden: true,
        },
        {
          id: 'vp-hid-2',
          input: JSON.stringify({ s: '{[]}' }),
          expectedOutput: 'true',
          isHidden: true,
        },
        {
          id: 'vp-hid-3',
          input: JSON.stringify({ s: '(((((' }),
          expectedOutput: 'false',
          isHidden: true,
        },
      ],
      starterCode: {
        javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Use a stack to validate matching open and closing brackets
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
        python: `def isValid(s: str) -> bool:
    """
    Validates bracket ordering using a stack.
    """
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            return False
    return len(stack) == 0`,
      },
      allowedLanguages: ['javascript', 'python'],
      timeLimitMs: 1500,
      memoryLimitMb: 128,
    },
  }),
];

export async function seedProblems(repo: IProblemRepository): Promise<void> {
  for (const problem of SEED_PROBLEMS) {
    await repo.save(problem);
  }
}
