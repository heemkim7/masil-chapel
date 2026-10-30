// Payment abstraction (disabled). Providers: 'iap' (Capacitor StoreKit/Play Billing), 'web' (PG e.g. Toss). 
// 달란트 can never be bought — real-money purchases (if ever enabled) grant only 만나 for cosmetics; 헌금 stays free-달란트-only.
export const PAY = {
  enabled: false, provider: null,
  async products() { const n = window.G?.net; if (!n?.sb) return []; return []; /* products table is not public until launch */ },
  async buy(productId) { if (!this.enabled) { window.G?.toast?.('아직 결제 기능이 없어요 · 모든 기능을 무료로 즐겨요'); return { ok: false, reason: 'disabled' }; }
    throw new Error('not implemented: create order → provider checkout → verify_receipt Edge Function'); },
};
window.PAY = PAY;
