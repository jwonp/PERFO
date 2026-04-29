import {
  THEME_DARK_CLASS,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from "@/lib/theme/theme.constants"

const themeScript = `
(() => {
  const storageKey = "${THEME_STORAGE_KEY}";
  const darkClass = "${THEME_DARK_CLASS}";
  const mediaQuery = "${THEME_MEDIA_QUERY}";
  const root = document.documentElement;

  const getSystemTheme = () => {
    try {
      return window.matchMedia(mediaQuery).matches ? "dark" : "light";
    } catch {
      return "light";
    }
  };

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    const preference =
      storedValue === "light" || storedValue === "dark" || storedValue === "system"
        ? storedValue
        : null;
    const resolvedTheme =
      preference === "dark" || preference === "light"
        ? preference
        : getSystemTheme();

    if (resolvedTheme === "dark") {
      root.classList.add(darkClass);
    } else {
      root.classList.remove(darkClass);
    }

    root.style.colorScheme = resolvedTheme;
  } catch {
    const resolvedTheme = getSystemTheme();

    if (resolvedTheme === "dark") {
      root.classList.add(darkClass);
    } else {
      root.classList.remove(darkClass);
    }

    root.style.colorScheme = resolvedTheme;
  }
})();
`

const ThemeScript = () => {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />
}

export default ThemeScript
