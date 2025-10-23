import store from './state.js';
import { timeInfo } from './time.js';

export const SANITY_CHECK_EVENT = 'sanity-check-notification';

let toastContainer = null;
const DEFAULT_TOAST_DURATION = 5000;
let detachSanityToast = null;

function ensureEventLog() {
  if (!Array.isArray(store.eventLog)) {
    store.eventLog = [];
  }
  return store.eventLog;
}

function createEntry(message) {
  const now = typeof timeInfo === 'function' ? timeInfo() : null;
  const id = `sanity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    message,
    day: now?.day ?? null,
    month: now?.month ?? null,
    year: now?.year ?? null,
    hour: now?.hour ?? null,
    season: now?.season ?? null,
    weather: now?.weather ?? null
  };
}

function ensureToastContainer() {
  if (toastContainer || typeof document === 'undefined') {
    return toastContainer;
  }
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'false');
  document.body.appendChild(container);
  toastContainer = container;
  return toastContainer;
}

function showToast(message, options = {}) {
  if (typeof document === 'undefined') return;
  const container = ensureToastContainer();
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (options?.type) {
    toast.classList.add(`toast--${options.type}`);
  }
  toast.textContent = typeof message === 'string' ? message : '';
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  const duration = Number.isFinite(options?.duration)
    ? Math.max(0, options.duration)
    : DEFAULT_TOAST_DURATION;

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      if (toast.parentElement === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export function notifySanityCheck(message, detail = {}) {
  const text = typeof message === 'string' && message.trim() ? message.trim() : 'Sanity check adjustment applied.';
  const normalized = text.startsWith('[sanity-check]') ? text : `[sanity-check] ${text}`;
  const log = ensureEventLog();
  log.unshift(createEntry(normalized));
  if (log.length > 30) {
    log.length = 30;
  }

  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
    try {
      document.dispatchEvent(
        new CustomEvent(SANITY_CHECK_EVENT, {
          detail: {
            message: normalized,
            ...detail
          }
        })
      );
    } catch (error) {
      console.error('Failed to dispatch sanity check notification', error);
    }
  }

  return normalized;
}

export function addSanityCheckListener(listener) {
  if (typeof listener !== 'function') return () => {};
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
    return () => {};
  }
  const handler = event => {
    try {
      listener(event.detail || {});
    } catch (error) {
      console.error('Error in sanity check listener', error);
    }
  };
  document.addEventListener(SANITY_CHECK_EVENT, handler);
  return () => document.removeEventListener(SANITY_CHECK_EVENT, handler);
}

export function ensureSanityCheckToasts() {
  if (detachSanityToast || typeof document === 'undefined') {
    return;
  }
  detachSanityToast = addSanityCheckListener(detail => {
    if (!detail || typeof detail.message !== 'string') {
      return;
    }
    showToast(detail.message, { type: detail.type ?? 'info' });
  });
}
