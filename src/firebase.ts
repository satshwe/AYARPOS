import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sanitize string length and characters to match firebase-blueprint.json & firestore.rules
function clampStr(val: unknown, fallback: string, maxLen: number): string {
  const s = String(val ?? '').trim();
  const nonEmpty = s.length > 0 ? s : fallback;
  return nonEmpty.slice(0, maxLen);
}

function sanitizeId(rawId: unknown): string {
  const cleaned = String(rawId ?? '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return cleaned || `doc_${Date.now()}`;
}

/**
 * Sign in with Google via Firebase Authentication and initialize user profile documents
 */
export async function signInWithGoogleCloud(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  if (fbUser && fbUser.emailVerified) {
    const uid = sanitizeId(fbUser.uid);
    const userPubPath = `users/${uid}`;
    try {
      const existingSnap = await getDoc(doc(db, 'users', uid));
      const isBootstrapAdmin = fbUser.email === 'satshwe36@gmail.com';
      if (!existingSnap.exists()) {
        await setDoc(doc(db, 'users', uid), {
          uid,
          displayName: clampStr(fbUser.displayName || fbUser.email?.split('@')[0], 'Staff', 100),
          role: isBootstrapAdmin ? 'admin' : 'cashier',
          createdAt: serverTimestamp(),
        });

        // Also store isolated PII in /users/{uid}/private/info
        if (fbUser.email) {
          await setDoc(doc(db, 'users', uid, 'private', 'info'), {
            uid,
            email: clampStr(fbUser.email, 'user@example.com', 254),
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      // Do not block sign-in if profile doc check fails
      console.warn('User profile sync notice:', error);
    }
  }

  return fbUser;
}

export async function signOutFromGoogleCloud(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Upsert a POS product to Firestore `/products/{productId}`
 */
export async function syncProductToFirestore(product: any): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const docId = sanitizeId(`prod_${product.id}`);
  const path = `products/${docId}`;

  try {
    const snap = await getDoc(doc(db, 'products', docId));
    const payload = {
      ownerId: currentUser.uid,
      name: clampStr(product.name, 'Product', 200),
      category: clampStr(product.category, 'အထွေထွေ', 100),
      unit: clampStr(product.unit, 'pc', 40),
      barcode: clampStr(product.barcode || `88500${product.id || 1}`, '885000001', 64),
      price: Math.max(0, Number(product.price) || 0),
      cost_price: Math.max(0, Number(product.cost_price) || 0),
      stock: Math.max(0, Number(product.stock) || 0),
      low_stock_threshold: Math.max(0, Number(product.low_stock_threshold ?? 10)),
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(doc(db, 'products', docId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data();
      await updateDoc(doc(db, 'products', docId), {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        barcode: payload.barcode,
        price: payload.price,
        cost_price: payload.cost_price,
        stock: payload.stock,
        low_stock_threshold: payload.low_stock_threshold,
        ownerId: existingData.ownerId,
        createdAt: existingData.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a product from Firestore `/products/{productId}`
 */
export async function deleteProductFromFirestore(productId: number | string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const docId = sanitizeId(`prod_${productId}`);
  const path = `products/${docId}`;
  try {
    await deleteDoc(doc(db, 'products', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Sync a completed POS sale and its line items to Firestore `/sales/{saleId}` and `/sales/{saleId}/items/{itemId}`
 */
export async function syncSaleToFirestore(sale: any, items: any[] = []): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const saleDocId = sanitizeId(`sale_${sale.id || Date.now()}`);
  const salePath = `sales/${saleDocId}`;

  const validPaymentMethods = ['cash', 'kpay', 'wave', 'aya', 'credit', 'bank'];
  const validPaymentStatuses = ['paid', 'credit', 'refunded'];
  const validStatuses = ['pending', 'completed', 'cancelled'];

  const payMethod = validPaymentMethods.includes(String(sale.payment_method))
    ? String(sale.payment_method)
    : 'cash';
  const payStatus = validPaymentStatuses.includes(String(sale.payment_status))
    ? String(sale.payment_status)
    : 'paid';
  const status = validStatuses.includes(String(sale.status))
    ? String(sale.status)
    : 'completed';

  try {
    await setDoc(doc(db, 'sales', saleDocId), {
      ownerId: currentUser.uid,
      slip_number: clampStr(sale.slip_number || `SLP-${sale.id}`, 'SLP-000001', 64),
      customer_name: clampStr(sale.customer_name, 'Walk-in Customer', 120),
      total_amount: Math.max(0, Number(sale.total_amount) || 0),
      discount_amount: Math.max(0, Number(sale.discount_amount) || 0),
      tax_amount: Math.max(0, Number(sale.tax_amount) || 0),
      payment_method: payMethod,
      payment_status: payStatus,
      status,
      branch: clampStr(sale.branch, 'ရတနာ (မော်လမြိုင်)', 100),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Sync bounded line items to subcollection /sales/{saleId}/items/{itemId}
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemDocId = sanitizeId(`item_${i + 1}`);
      const itemPath = `sales/${saleDocId}/items/${itemDocId}`;
      try {
        await setDoc(doc(db, 'sales', saleDocId, 'items', itemDocId), {
          ownerId: currentUser.uid,
          saleId: saleDocId,
          product_name: clampStr(item.product_name || item.name || `Product #${item.product_id}`, 'Product', 200),
          quantity: Math.max(1, Number(item.quantity) || 1),
          price: Math.max(0, Number(item.price) || 0),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, itemPath);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, salePath);
  }
}

/**
 * Push all local products to Firestore so initial catalog is backed up to the cloud
 */
export async function pushInitialCatalogToFirestore(products: any[]): Promise<number> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return 0;

  let syncedCount = 0;
  for (const prod of products) {
    try {
      await syncProductToFirestore(prod);
      syncedCount++;
    } catch {
      // continue
    }
  }
  return syncedCount;
}

/**
 * Subscribe to real-time product updates in Firestore for the current authenticated user
 */
export function subscribeToCloudProducts(
  user: FirebaseUser,
  onProductsUpdate: (cloudProducts: any[]) => void
): () => void {
  if (!user.emailVerified) return () => {};

  const isAdminUser = user.email === 'satshwe36@gmail.com';
  const productsRef = collection(db, 'products');
  const q = isAdminUser
    ? productsRef
    : query(productsRef, where('ownerId', '==', user.uid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const numericId = Number(String(docSnap.id).replace(/^prod_/, '')) || Date.now();
        items.push({
          id: numericId,
          name: data.name,
          category: data.category,
          unit: data.unit,
          barcode: data.barcode,
          price: data.price,
          cost_price: data.cost_price,
          stock: data.stock,
          low_stock_threshold: data.low_stock_threshold,
        });
      });
      if (items.length > 0) {
        onProductsUpdate(items);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );

  return unsubscribe;
}

export { onAuthStateChanged };
export type { FirebaseUser };
