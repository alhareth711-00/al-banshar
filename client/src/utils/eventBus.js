/**
 * Unified Global Event Bus for Al-Banshar POS/ERP System.
 * Ensures instant, cross-module ripple effect synchronization across all screens,
 * modals, header pulse indicators, cash vault, and closing reports without page reloads.
 */

export const APP_EVENTS = {
  DATA_INVALIDATED: 'app:data-invalidated',
  INVOICE_CREATED: 'app:invoice-created',
  INVOICE_VOIDED: 'app:invoice-voided',
  SERVICE_COMPLETED: 'app:service-completed',
  VOUCHER_SAVED: 'app:voucher-saved',
  SHIFT_CHANGED: 'app:shift-changed',
};

export function emitAppEvent(eventName, detail = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    if (eventName !== APP_EVENTS.DATA_INVALIDATED) {
      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.DATA_INVALIDATED, {
          detail: { source: eventName, ...detail },
        })
      );
    }
  } catch (err) {
    console.warn('[EventBus] Emit failed:', err);
  }
}

export function subscribeAppEvent(eventName, callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    try {
      callback(e.detail || {});
    } catch (err) {
      console.error(`[EventBus] Error in listener for ${eventName}:`, err);
    }
  };
  window.addEventListener(eventName, handler);
  return () => {
    window.removeEventListener(eventName, handler);
  };
}
