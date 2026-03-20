/** Dispatched when UI preferences in localStorage change (same window). */
export const SYAG_PREFS_UPDATED = "syag-preferences-updated";

export function dispatchPreferencesUpdated(): void {
  window.dispatchEvent(new Event(SYAG_PREFS_UPDATED));
}
