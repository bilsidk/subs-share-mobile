// Google Play Billing via expo-iap (Play Billing 8.x, OpenIAP spec). Works with
// React Native 0.85 / new architecture. Coins are ONLY credited by the backend
// after it verifies the purchase token with Google — the client never self-credits.
import {
  initConnection,
  endConnection,
  fetchProducts as expoFetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'expo-iap';
import { api } from './api';

let _connected = false;

export async function initIAP() {
  if (_connected) return;
  try { await initConnection(); _connected = true; }
  catch (_) { _connected = false; }
}

export async function endIAP() {
  try { await endConnection(); } catch (_) {}
  _connected = false;
}

// Normalize expo-iap products to the shape the Buy screen already expects
// ({ productId, localizedPrice, price }), so no screen changes are needed.
export async function fetchProducts(skus) {
  try {
    const products = await expoFetchProducts({ skus, type: 'in-app' });
    return (products || []).map((p) => ({
      productId: p.id,
      localizedPrice: p.displayPrice,
      price: p.price,
    }));
  } catch (_) {
    return [];
  }
}

export async function buy(sku) {
  return requestPurchase({
    request: { google: { skus: [sku] }, apple: { sku } },
    type: 'in-app',
  });
}

// Wire purchase result listeners. onCredited(result) fires after the backend
// confirms + credits; then the purchase is consumed so it can be bought again.
// Drain any purchase that Google recorded but the app never finished consuming —
// e.g. connectivity dropped between the buy and the backend verify, or the app was
// killed mid-flow. Without this, the consumable stays pending in Play, blocks a
// re-purchase of the same SKU (stuck checkout), and Google auto-refunds after ~3
// days (user paid, got no coins). The backend verify is idempotent, so re-verifying
// a token that was already credited is safe; we only finish/consume after a 2xx.
export async function reconcilePurchases({ onCredited } = {}) {
  try {
    const pending = await getAvailablePurchases();
    for (const purchase of (pending || [])) {
      const token = purchase?.purchaseToken;
      const productId = purchase?.productId;
      if (!token || !productId) continue;
      try {
        const result = await api.verifyGooglePlay(productId, token);
        try { await finishTransaction({ purchase, isConsumable: true }); } catch (_) {}
        onCredited && onCredited(result);
      } catch (_) {
        // Still unreachable — leave it unconsumed and try again next launch.
      }
    }
  } catch (_) { /* getAvailablePurchases unsupported/offline — no-op */ }
}

export function attachPurchaseListeners({ onCredited, onError }) {
  const updateSub = purchaseUpdatedListener(async (purchase) => {
    const token = purchase?.purchaseToken;
    const productId = purchase?.productId;
    if (!token || !productId) return;
    try {
      const result = await api.verifyGooglePlay(productId, token);
      try { await finishTransaction({ purchase, isConsumable: true }); } catch (_) {}
      onCredited && onCredited(result);
    } catch (e) {
      // leave the purchase unconsumed so it can be retried/verified later
      onError && onError(e);
    }
  });

  const errorSub = purchaseErrorListener((err) => {
    if (err?.code === 'user-cancelled') return; // user backed out — not an error
    onError && onError(err);
  });

  return () => {
    try { updateSub?.remove?.(); } catch (_) {}
    try { errorSub?.remove?.(); } catch (_) {}
  };
}
