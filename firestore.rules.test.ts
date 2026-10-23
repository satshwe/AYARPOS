/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof on Admin Protected Route',
    operation: 'create',
    path: '/products/prod_1',
    auth: { uid: 'attacker_1', email: 'satshwe36@gmail.com', email_verified: false },
    payload: {
      ownerId: 'attacker_1',
      name: 'Biogesic',
      category: 'Medicine',
      unit: 'box',
      barcode: '880123',
      price: 1500,
      cost_price: 1000,
      stock: 10,
      low_stock_threshold: 5
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Create',
    operation: 'create',
    path: '/products/prod_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      name: 'Biogesic',
      category: 'Medicine',
      unit: 'box',
      barcode: '880123',
      price: 1500,
      cost_price: 1000,
      stock: 10,
      low_stock_threshold: 5,
      isSuperAdmin: true
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Update',
    operation: 'update',
    path: '/products/prod_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      stock: 50,
      hackedField: 'injected'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Identity Spoofing on Product Create',
    operation: 'create',
    path: '/products/prod_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'victim_uid',
      name: 'Biogesic',
      category: 'Medicine',
      unit: 'box',
      barcode: '880123',
      price: 1500,
      cost_price: 1000,
      stock: 10,
      low_stock_threshold: 5
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Self-Assigned Admin Role on User Profile Create',
    operation: 'create',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Attacker',
      role: 'admin'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'PII Cross-Read Attempt on Isolated Private Subcollection',
    operation: 'get',
    path: '/users/user_1/private/info',
    auth: { uid: 'user_2', email: 'user2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Orphaned Subcollection Write to Non-Existent Sale',
    operation: 'create',
    path: '/sales/missing_sale/items/item_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      saleId: 'missing_sale',
      product_name: 'Biogesic',
      quantity: 2,
      price: 1500
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Terminal State Mutation on Completed Sale',
    operation: 'update',
    path: '/sales/completed_sale_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      total_amount: 100
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Immortal Field Mutation (Changing ownerId)',
    operation: 'update',
    path: '/products/prod_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'new_owner'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/products/prod_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      name: 'Biogesic',
      category: 'Medicine',
      unit: 'box',
      barcode: '880123',
      price: 1500,
      cost_price: 1000,
      stock: 10,
      low_stock_threshold: 5,
      createdAt: '2000-01-01T00:00:00Z',
      updatedAt: '2000-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Resource Exhaustion Oversized String',
    operation: 'update',
    path: '/products/prod_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      name: 'A'.repeat(5000)
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unauthenticated Blanket List Query',
    operation: 'list',
    path: '/sales',
    auth: null,
    expectedResult: 'PERMISSION_DENIED'
  }
];
