export const THEME_STORAGE_KEY = "cf-worker-chat.theme.v1";
const PREFERENCES = new Set(["system", "light", "dark"]);

export function resolveTheme(preference, systemDark = false) {
  return preference === "light" || preference === "dark"
    ? preference
    : systemDark ? "dark" : "light";
}

export function readThemePreference(storage) {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.has(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function saveThemePreference(storage, preference) {
  try {
    if (!storage || !PREFERENCES.has(preference)) return false;
    storage.setItem(THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function initAppearance({ root, select, storage, media }) {
  let preference = readThemePreference(storage);
  const apply = () => {
    root.dataset.theme = resolveTheme(preference, media?.matches);
    select.value = preference;
  };
  apply();
  select.addEventListener("change", () => {
    preference = PREFERENCES.has(select.value) ? select.value : "system";
    saveThemePreference(storage, preference);
    apply();
  });
  media?.addEventListener("change", () => {
    if (preference === "system") apply();
  });
}
