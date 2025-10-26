/**
 * Splash screen module for Fantasy Survival.
 */

/** Storage key for the serialized game save. */
export const SAVE_STORAGE_KEY = "gameSave";
/** Supported schema version for saved games. */
export const SAVE_SCHEMA_VERSION = 1;

/**
 * Placeholder callback; should be replaced by the consuming app to resume the game.
 */
export let resumeGame: () => void = () => {};
/**
 * Placeholder callback; should be replaced by the consuming app to display the load UI.
 */
export let showLoadUI: () => void = () => {};
/**
 * Placeholder callback; should be replaced by the consuming app to start a new game.
 */
export let startNewGame: () => void = () => {};
/**
 * Placeholder callback; should be replaced by the consuming app to display settings.
 */
export let showSettingsUI: () => void = () => {};

/**
 * Replace the resume callback used by the splash screen.
 */
export function setResumeGame(handler: () => void): void {
  resumeGame = handler;
}

/**
 * Replace the load UI callback used by the splash screen.
 */
export function setShowLoadUI(handler: () => void): void {
  showLoadUI = handler;
}

/**
 * Replace the new game callback used by the splash screen.
 */
export function setStartNewGame(handler: () => void): void {
  startNewGame = handler;
}

/**
 * Replace the settings callback used by the splash screen.
 */
export function setShowSettingsUI(handler: () => void): void {
  showSettingsUI = handler;
}

type SaveCheckResult = {
  valid: boolean;
  mismatchedVersion: boolean;
};

let mountedSplashRoot: HTMLElement | null = null;

function checkStoredSave(): SaveCheckResult {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return { valid: false, mismatchedVersion: false };
    }

    const storage = window.localStorage;
    if (!storage) {
      return { valid: false, mismatchedVersion: false };
    }
    const raw = storage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return { valid: false, mismatchedVersion: false };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") {
      return { valid: false, mismatchedVersion: false };
    }
    const version = parsed["version"];
    const timestamp = parsed["timestamp"];
    if (typeof version !== "number" || typeof timestamp !== "number") {
      return { valid: false, mismatchedVersion: false };
    }
    if (!Number.isFinite(version) || !Number.isFinite(timestamp)) {
      return { valid: false, mismatchedVersion: false };
    }
    if (version !== SAVE_SCHEMA_VERSION) {
      return { valid: false, mismatchedVersion: true };
    }
    return { valid: true, mismatchedVersion: false };
  } catch (error) {
    console.error("Failed to read save data", error);
    return { valid: false, mismatchedVersion: false };
  }
}

/** Determine if a usable save exists in storage. */
export function hasValidSave(): boolean {
  return checkStoredSave().valid;
}

/** Create a button with standardized splash styling and behavior. */
function buildButton(
  label: string,
  onActivate: () => void,
  enabled: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = "splash-button";
  if (enabled) {
    button.setAttribute("data-enabled", "true");
  } else {
    button.setAttribute("data-enabled", "false");
    button.setAttribute("aria-disabled", "true");
    button.tabIndex = -1;
    button.classList.add("is-disabled");
  }

  button.addEventListener("click", (event) => {
    if (button.getAttribute("data-enabled") !== "true") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    try {
      onActivate();
    } catch (error) {
      console.error("Splash button handler failed", error);
    }
  });

  return button;
}

function handleKeyboardNavigation(root: HTMLElement): void {
  const getEnabledButtons = () =>
    Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-enabled='true']"));

  root.addEventListener("keydown", (event) => {
    const enabledButtons = getEnabledButtons();
    if (enabledButtons.length === 0) {
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const currentIndex = activeElement
      ? enabledButtons.findIndex((button) => button === activeElement)
      : -1;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + delta + enabledButtons.length) % enabledButtons.length;
      enabledButtons[nextIndex].focus();
    } else if (event.key === "Enter" || event.key === " ") {
      if (activeElement && activeElement.tagName === "BUTTON") {
        event.preventDefault();
        (activeElement as HTMLButtonElement).click();
      }
    }
  });
}

function createSplashContent(status: SaveCheckResult): HTMLElement {
  const container = document.createElement("div");
  container.className = "splash-panel";

  const logoSlot = document.createElement("div");
  logoSlot.className = "splash-logo-slot";
  logoSlot.setAttribute("aria-hidden", "true");
  container.appendChild(logoSlot);

  const header = document.createElement("header");
  header.className = "splash-header";
  const title = document.createElement("h1");
  title.className = "splash-title";
  title.textContent = "Fantasy Survival";
  header.appendChild(title);
  container.appendChild(header);

  const buttonList = document.createElement("div");
  buttonList.className = "splash-actions";

  const resumeButton = buildButton("Resume", () => resumeGame(), status.valid);
  resumeButton.id = "splash-resume";
  buttonList.appendChild(resumeButton);

  if (status.mismatchedVersion) {
    const note = document.createElement("p");
    note.className = "resume-note";
    note.textContent = "Save is from an older version. Use 'Load Game' or 'New Game'.";
    buttonList.appendChild(note);
  }

  const loadButton = buildButton("Load Game", () => showLoadUI(), true);
  loadButton.id = "splash-load";
  buttonList.appendChild(loadButton);

  const newButton = buildButton("New Game", () => startNewGame(), true);
  newButton.id = "splash-new";
  buttonList.appendChild(newButton);

  const settingsButton = buildButton("Settings", () => showSettingsUI(), true);
  settingsButton.id = "splash-settings";
  buttonList.appendChild(settingsButton);

  container.appendChild(buttonList);

  return container;
}

/**
 * Mount the splash screen into the supplied root element.
 * Safely handles re-mounting by removing any existing splash instance first.
 */
export function mountSplash(rootEl: HTMLElement): void {
  if (!rootEl) {
    console.warn("mountSplash called without a root element");
    return;
  }

  if (mountedSplashRoot) {
    mountedSplashRoot.remove();
    mountedSplashRoot = null;
  }

  const status = checkStoredSave();

  const splashRoot = document.createElement("div");
  splashRoot.className = "splash-root fade-in";

  try {
    const content = createSplashContent(status);
    splashRoot.appendChild(content);
    rootEl.appendChild(splashRoot);
    mountedSplashRoot = splashRoot;
    handleKeyboardNavigation(splashRoot);

    const firstEnabledButton = splashRoot.querySelector<HTMLButtonElement>(
      "button[data-enabled='true']",
    );
    if (firstEnabledButton) {
      firstEnabledButton.focus();
    }
  } catch (error) {
    console.error("Failed to mount splash screen", error);
    splashRoot.remove();
    mountedSplashRoot = null;
  }
}

/**
 * Initiates the splash screen fade-out animation and removes the DOM node when finished.
 */
export async function unmountSplash(): Promise<void> {
  const root = mountedSplashRoot;
  if (!root) {
    return;
  }
  return new Promise((resolve) => {
    let resolved = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
      root.remove();
      if (mountedSplashRoot === root) {
        mountedSplashRoot = null;
      }
      resolve();
    };

    const onAnimationEnd = () => {
      root.removeEventListener("animationend", onAnimationEnd);
      cleanup();
    };

    root.addEventListener("animationend", onAnimationEnd, { once: true });

    const fallbackDuration = 400;
    fallbackTimer = setTimeout(() => {
      root.removeEventListener("animationend", onAnimationEnd);
      cleanup();
    }, fallbackDuration);

    const startFadeOut = () => {
      if (resolved) {
        return;
      }
      root.classList.remove("fade-in");
      root.classList.add("fade-out");
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        startFadeOut();
      });
    } else {
      startFadeOut();
    }
  });
}

// Example (in src/main.ts after build outputs docs/assets):
// import { mountSplash } from "./splash.js"; // <- note: compiled path in HTML will be ./assets/splash.js
// const app = document.getElementById("app")!;
// mountSplash(app);
