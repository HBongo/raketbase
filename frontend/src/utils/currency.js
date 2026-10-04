// Display-currency store for the top-bar currency selector.
// Amounts are stored in each job's own currency (PHP or USD); this only changes how
// they are shown, converting with live rates from GET /api/v1/rates (units per 1 PHP).
import { useSyncExternalStore } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const STORAGE_KEY = 'raketbase_currency';

export const CURRENCY_SYMBOLS = { PHP: '₱', USD: '$', EUR: '€', JPY: '¥', GBP: '£', SGD: 'S$' };
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

function readStoredCurrency() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_CURRENCIES.includes(saved) ? saved : 'PHP';
  } catch {
    return 'PHP';
  }
}

let state = { currency: readStoredCurrency(), rates: null };
let ratesRequested = false;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrencyState() {
  return state;
}

export function setDisplayCurrency(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency)) return;
  state = { ...state, currency };
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // Private mode etc. — the choice just won't be remembered.
  }
  emit();
}

// Fetches rates once per page load. Until they arrive (or if they never do),
// amounts are shown in their original currency.
export async function loadRates() {
  if (ratesRequested) return;
  ratesRequested = true;
  try {
    const res = await fetch(`${API_URL}/rates`);
    const body = await res.json();
    if (body.success && body.data) {
      state = { ...state, rates: body.data };
      emit();
    }
  } catch {
    ratesRequested = false;
  }
}

// Re-renders the calling component whenever the display currency or rates change.
export function useDisplayCurrency() {
  return useSyncExternalStore(subscribe, getCurrencyState, getCurrencyState);
}

// Converts an amount from its own currency into the display currency.
// Returns null when no conversion applies (same currency, or rates unavailable).
export function convertForDisplay(amount, fromCurrency = 'PHP') {
  const from = (fromCurrency || 'PHP').toUpperCase();
  const { currency: to, rates } = state;
  if (from === to || !rates || !rates[from] || !rates[to]) return null;
  const inPhp = Number(amount) / rates[from];
  return { value: inPhp * rates[to], currency: to };
}
