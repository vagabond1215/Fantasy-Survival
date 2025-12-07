const WHEEL_SELECT_STYLESHEET_ID = 'wheel-select-stylesheet';

/**
 * Ensures the WheelSelect component styles are loaded when running without a bundler.
 * When served through native ES modules, the browser cannot import CSS files directly,
 * so we dynamically inject a stylesheet link instead of relying on a build step.
 */
function ensureWheelSelectStylesheet() {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(WHEEL_SELECT_STYLESHEET_ID)) {
    return;
  }

  const link = document.createElement('link');
  link.id = WHEEL_SELECT_STYLESHEET_ID;
  link.rel = 'stylesheet';
  try {
    link.href = new URL('./WheelSelect.css', import.meta.url).href;
  } catch (error) {
    // Fallback for environments that cannot resolve the relative URL via import.meta.
    link.href = './src/ui/components/WheelSelect.css';
  }
  document.head.appendChild(link);
}

/**
 * @typedef {Object} WheelSelectOption
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {string|null} [color]
 */

/**
 * @typedef {Object} WheelSelectConfig
 * @property {WheelSelectOption[]} options
 * @property {string|null} [value]
 * @property {string} [ariaLabel]
 * @property {string} [ariaLabelledBy]
 * @property {string} [ariaDescribedBy]
 * @property {(value: string, option: WheelSelectOption) => void} [onChange]
 * @property {(value: string, option: WheelSelectOption) => void} [onCommit]
 */

ensureWheelSelectStylesheet();

// Fallback spacing between cards. The runtime measurement reads from the track
// gap + item width so the active card can stay centered without overlap.
const ITEM_SPACING = 200;
const SNAP_DELAY_MS = 140;
const ANIMATION_DURATION = 220;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * @param {string|null|undefined} color
 * @returns {string|null}
 */
function normalizeHex(color) {
  if (!color) return null;
  const value = String(color).trim();
  if (!value) return null;
  const prefixed = value.startsWith('#') ? value.slice(1) : value;
  if (/^[0-9a-f]{6}$/i.test(prefixed)) {
    return `#${prefixed.toLowerCase()}`;
  }
  if (/^[0-9a-f]{3}$/i.test(prefixed)) {
    const [r, g, b] = prefixed.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/**
 * @typedef {{ r: number, g: number, b: number }} RGB
 */

/**
 * @param {string} hex
 * @returns {RGB|null}
 */
function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(channel => Number.isNaN(channel))) {
    return null;
  }
  return { r, g, b };
}

/**
 * @param {RGB} param0
 */
function rgbToHex({ r, g, b }) {
  const clampChannel = channel => Math.min(Math.max(Math.round(channel), 0), 255);
  return `#${[clampChannel(r), clampChannel(g), clampChannel(b)]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * @param {string} hexA
 * @param {string} hexB
 * @param {number} weight
 */
function mixHex(hexA, hexB, weight) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) {
    return normalizeHex(hexA) || normalizeHex(hexB) || '#7c8ba1';
  }
  const ratio = clamp(weight, 0, 1);
  return rgbToHex({
    r: a.r * (1 - ratio) + b.r * ratio,
    g: a.g * (1 - ratio) + b.g * ratio,
    b: a.b * (1 - ratio) + b.b * ratio
  });
}

/**
 * @param {string} hex
 * @param {number} [amount]
 */
function lighten(hex, amount = 0.18) {
  return mixHex(hex, '#ffffff', amount);
}

/**
 * @param {string} hex
 * @param {number} [amount]
 */
function darken(hex, amount = 0.22) {
  return mixHex(hex, '#000000', amount);
}

/**
 * @param {string} hex
 */
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const transform = channel => {
    const value = channel / 255;
    if (value <= 0.03928) {
      return value / 12.92;
    }
    return Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const r = transform(rgb.r);
  const g = transform(rgb.g);
  const b = transform(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} foreground
 * @param {string} background
 */
function contrastRatio(foreground, background) {
  const fg = normalizeHex(foreground);
  const bg = normalizeHex(background);
  if (!fg || !bg) return 1;
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {string} base
 */
function pickTextColor(base) {
  const normalized = normalizeHex(base) || '#546a94';
  const lightContrast = contrastRatio('#ffffff', normalized);
  const darkContrast = contrastRatio('#111827', normalized);
  if (lightContrast >= 4.5 || lightContrast >= darkContrast) {
    return '#ffffff';
  }
  return darkContrast >= 4.5 ? '#111827' : lightContrast >= darkContrast ? '#ffffff' : '#111827';
}

/**
 * @param {string|null|undefined} color
 */
function createPalette(color) {
  const base = normalizeHex(color) || '#4c6ef5';
  return {
    base,
    light: lighten(base, 0.24),
    dark: darken(base, 0.28),
    contrast: pickTextColor(base)
  };
}

export class WheelSelect {
  /**
   * @param {HTMLElement} root
   * @param {WheelSelectConfig} config
   */
  constructor(root, config) {
    /** @type {HTMLElement} */
    this.root = root;
    /** @type {WheelSelectOption[]} */
    this.options = [...config.options];
    /** @type {HTMLElement[]} */
    this.items = [];
    /** @type {string} */
    this.value = '';
    this.offset = 0;
    this.activeIndex = -1;
    this.dragging = false;
    /** @type {number|null} */
    this.dragPointerId = null;
    this.dragStartX = 0;
    this.dragStartOffset = 0;
    /** @type {number|null} */
    this.snapTimer = null;
    /** @type {number|null} */
    this.animationTimer = null;
    this.onChange = config.onChange;
    this.onCommit = config.onCommit;
    this.idPrefix = `wheel-option-${Math.random().toString(36).slice(2, 10)}`;

    this.root.classList.add('wheel-select');
    this.root.tabIndex = 0;
    this.root.setAttribute('role', 'listbox');
    this.root.setAttribute('aria-live', 'polite');
      this.root.setAttribute('aria-orientation', 'horizontal');
    if (config.ariaLabel) {
      this.root.setAttribute('aria-label', config.ariaLabel);
    }
    if (config.ariaLabelledBy) {
      this.root.setAttribute('aria-labelledby', config.ariaLabelledBy);
    }
    if (config.ariaDescribedBy) {
      this.root.setAttribute('aria-describedby', config.ariaDescribedBy);
    }

    this.viewport = document.createElement('div');
    this.viewport.className = 'wheel-select__viewport';
    this.track = document.createElement('div');
    this.track.className = 'wheel-select__track';
    this.viewport.appendChild(this.track);
    this.root.appendChild(this.viewport);

    this.renderOptions();

    const initialValue = config.value ?? this.options[0]?.id ?? null;
    if (initialValue) {
      this.setValue(initialValue, { silent: true, animate: false });
    } else {
      this.updateSelection(true);
      this.updateTransforms();
    }

    this.bindEvents();
  }

  getValue() {
    return this.value;
  }

  /**
   * @param {string} value
   * @param {{ silent?: boolean, animate?: boolean, commit?: boolean }} [options]
   */
  setValue(value, options = {}) {
    if (!this.options.length) {
      this.value = '';
      this.activeIndex = -1;
      this.root.removeAttribute('aria-activedescendant');
      return;
    }
    const index = this.options.findIndex(option => option.id === value);
    const targetIndex = index >= 0 ? index : 0;
    this.offset = targetIndex;
    this.updateTransforms(options.animate ?? false);
    this.updateSelection(true, { silent: options.silent, commit: options.commit });
  }

  destroy() {
    this.stopSnap();
    if (this.animationTimer) {
      window.clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    this.detachEvents();
    this.items.length = 0;
  }

  get maxIndex() {
    return Math.max(0, this.options.length - 1);
  }

  renderOptions() {
    this.track.innerHTML = '';
    this.items = this.options.map((option, index) => {
      const item = document.createElement('div');
      item.className = 'wheel-select__item';
      item.id = `${this.idPrefix}-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.dataset.value = option.id;
      item.tabIndex = -1;

      const palette = createPalette(option.color);
      item.style.setProperty('--wheel-option-base', palette.base);
      item.style.setProperty('--wheel-option-light', palette.light);
      item.style.setProperty('--wheel-option-dark', palette.dark);
      item.style.setProperty('--wheel-option-contrast', palette.contrast);

      const label = document.createElement('div');
      label.className = 'wheel-select__item-label';
      label.textContent = option.label;

      const description = document.createElement('div');
      description.className = 'wheel-select__item-desc';
      description.textContent = option.description ?? '';
      description.hidden = !(option.description && option.description.trim());

      if (option.description) {
        const accessibleDescription = `${option.label}. ${option.description}`;
        item.setAttribute('aria-label', accessibleDescription);
        item.title = option.description;
      } else {
        item.setAttribute('aria-label', option.label);
        item.removeAttribute('title');
      }

      item.append(label);
      if (!description.hidden) {
        item.append(description);
      }

      item.addEventListener('click', event => {
        event.stopPropagation();
        this.root.focus({ preventScroll: true });
        this.goToIndex(index, { animate: true, commit: true });
      });

      this.track.appendChild(item);
      return item;
    });
  }

  bindEvents() {
    this.handlePointerDown = event => {
      if (event.button !== 0 && event.pointerType !== 'touch') {
        return;
      }
      this.root.focus({ preventScroll: true });
      this.dragging = true;
      this.dragPointerId = event.pointerId;
      this.dragStartX = event.clientX;
      this.dragStartOffset = this.offset;
      this.stopSnap();
      this.root.classList.add('wheel-select--dragging');
      try {
        this.root.setPointerCapture(event.pointerId);
      } catch (error) {
        // ignore capture errors on unsupported elements
      }
    };

    this.handlePointerMove = event => {
      if (!this.dragging || this.dragPointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const delta = event.clientX - this.dragStartX;
      const nextOffset = this.dragStartOffset + delta / this.measureItemSpacing();
      this.offset = clamp(nextOffset, 0, this.maxIndex);
      this.updateTransforms();
      this.updateSelection(false);
    };

    this.handlePointerUp = event => {
      if (!this.dragging || (this.dragPointerId !== null && event.pointerId !== this.dragPointerId)) {
        return;
      }
      if (this.dragPointerId !== null) {
        try {
          this.root.releasePointerCapture(this.dragPointerId);
        } catch (error) {
          // ignore release errors
        }
      }
      this.dragging = false;
      this.dragPointerId = null;
      this.root.classList.remove('wheel-select--dragging');
      this.snapToNearest(true);
    };

    this.handlePointerLeave = event => {
      if (!this.dragging || (this.dragPointerId !== null && event.pointerId !== this.dragPointerId)) {
        return;
      }
      this.snapToNearest(true);
    };

    this.handleWheel = event => {
      if (!this.options.length) return;
      event.preventDefault();
      const dominantDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const direction = Math.sign(dominantDelta);
      if (!direction) return;
      const targetIndex = this.activeIndex + direction;
      this.goToIndex(targetIndex, { animate: true, commit: true });
    };

    this.handleKeyDown = event => {
      if (!this.options.length) return;
      let handled = false;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        this.goToIndex(this.activeIndex - 1, { animate: true, commit: true });
        handled = true;
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        this.goToIndex(this.activeIndex + 1, { animate: true, commit: true });
        handled = true;
      } else if (event.key === 'Home') {
        this.goToIndex(0, { animate: true, commit: true });
        handled = true;
      } else if (event.key === 'End') {
        this.goToIndex(this.maxIndex, { animate: true, commit: true });
        handled = true;
      } else if (event.key === 'PageUp') {
        this.goToIndex(this.activeIndex - 3, { animate: true, commit: true });
        handled = true;
      } else if (event.key === 'PageDown') {
        this.goToIndex(this.activeIndex + 3, { animate: true, commit: true });
        handled = true;
      } else if (event.key === 'Enter' || event.key === ' ') {
        this.updateSelection(true, { commit: true });
        handled = true;
      }
      if (handled) {
        event.preventDefault();
      }
    };

    this.handleBlur = () => {
      if (this.dragging) {
        this.dragging = false;
        this.dragPointerId = null;
        this.root.classList.remove('wheel-select--dragging');
        this.snapToNearest();
      }
    };

    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('pointermove', this.handlePointerMove);
    this.root.addEventListener('pointerup', this.handlePointerUp);
    this.root.addEventListener('pointercancel', this.handlePointerUp);
    this.root.addEventListener('pointerleave', this.handlePointerLeave);
    this.root.addEventListener('wheel', this.handleWheel, { passive: false });
    this.root.addEventListener('keydown', this.handleKeyDown);
    this.root.addEventListener('blur', this.handleBlur, true);

    this.handleResize = () => {
      this.updateTransforms();
    };

    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  detachEvents() {
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('pointermove', this.handlePointerMove);
    this.root.removeEventListener('pointerup', this.handlePointerUp);
    this.root.removeEventListener('pointercancel', this.handlePointerUp);
    this.root.removeEventListener('pointerleave', this.handlePointerLeave);
    this.root.removeEventListener('wheel', this.handleWheel);
    this.root.removeEventListener('keydown', this.handleKeyDown);
    this.root.removeEventListener('blur', this.handleBlur, true);
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * @param {number} index
   * @param {{ animate?: boolean, commit?: boolean }} [options]
   */
  goToIndex(index, options = {}) {
    if (!this.options.length) return;
    const clampedIndex = clamp(index, 0, this.maxIndex);
    this.offset = clampedIndex;
    this.updateTransforms(options.animate ?? false);
    this.updateSelection(true, { commit: options.commit });
  }

  /**
   * @param {boolean} [animate]
   */
  updateTransforms(animate = false) {
    if (!this.items.length) return;
    if (animate) {
      this.root.classList.add('wheel-select--animating');
      if (this.animationTimer) {
        window.clearTimeout(this.animationTimer);
      }
      this.animationTimer = window.setTimeout(() => {
        this.root.classList.remove('wheel-select--animating');
        this.animationTimer = null;
      }, ANIMATION_DURATION);
    } else if (!this.dragging) {
      this.root.classList.remove('wheel-select--animating');
    }

    const spacing = this.measureItemSpacing();
    const viewportRect = this.viewport?.getBoundingClientRect();
    const viewportWidth = viewportRect?.width ?? this.viewport?.clientWidth ?? 0;
    const activeIndex = clamp(Math.round(this.offset), 0, this.maxIndex);
    const activeItem = this.items[activeIndex] ?? this.items[0];
    const sampleItem = activeItem || this.items[0];
    const itemRect = activeItem?.getBoundingClientRect?.();
    const itemWidth = itemRect?.width || sampleItem?.offsetWidth || spacing;
    const itemStart = activeItem?.offsetLeft ?? activeIndex * spacing;
    const translateX = viewportWidth > 0 ? viewportWidth / 2 - (itemStart + itemWidth / 2) : 0;

    this.track.style.transform = `translate3d(${translateX}px, 0, 0)`;

    this.items.forEach((item, index) => {
      const distance = index - this.offset;
      const absDistance = Math.abs(distance);
      const logFalloff = 1 / (1 + Math.log1p(absDistance * 1.25));
      const emphasis = Math.max(0, Math.min(logFalloff, 1));
      const scale = 0.9 + 0.16 * Math.pow(emphasis, 0.92);
      const opacity = clamp(0.2 + 0.85 * Math.pow(emphasis, 1.1), 0.15, 1);
      const blur = 12 * Math.pow(1 - emphasis, 1.1);
      const saturation = 0.82 + 0.4 * emphasis;
      const contrast = 0.86 + 0.38 * emphasis;
      const depth = this.maxIndex - Math.abs(Math.round(distance));

      item.style.transform = `scale(${scale})`;
      item.style.opacity = String(opacity);
      item.style.zIndex = String(depth + 1);
      item.style.pointerEvents = absDistance <= 0.8 ? 'auto' : 'none';
      item.style.filter = `blur(${blur.toFixed(2)}px) saturate(${saturation.toFixed(2)}) contrast(${contrast.toFixed(2)})`;
      item.classList.toggle('wheel-select__item--hidden', opacity <= 0.2);
    });
  }

  measureItemSpacing() {
    if (!this.items.length) return ITEM_SPACING;
    const first = this.items[0];
    const width = first?.getBoundingClientRect?.().width || first?.offsetWidth || ITEM_SPACING;
    const style = this.track ? window.getComputedStyle(this.track) : null;
    const gapValue = style?.columnGap ?? style?.gap ?? '0';
    const gap = Number.parseFloat(gapValue) || 0;
    return width + gap;
  }

  /**
   * @param {boolean} [force]
   * @param {{ silent?: boolean, commit?: boolean }} [options]
   */
  updateSelection(force = false, options = {}) {
    if (!this.options.length) {
      this.value = '';
      this.activeIndex = -1;
      this.root.removeAttribute('aria-activedescendant');
      return;
    }

    const nearestIndex = clamp(Math.round(this.offset), 0, this.maxIndex);
    const option = this.options[nearestIndex];
    if (!option) return;

    const changed = this.value !== option.id || force;
    this.activeIndex = nearestIndex;
    this.value = option.id;

    this.items.forEach((item, index) => {
      const isSelected = index === nearestIndex;
      item.setAttribute('aria-selected', String(isSelected));
      if (isSelected) {
        this.root.setAttribute('aria-activedescendant', item.id);
      }
    });

    if (changed && !options.silent) {
      this.onChange?.(option.id, option);
    }
    if (options.commit && !options.silent) {
      this.onCommit?.(option.id, option);
    }
  }

  scheduleSnap() {
    this.stopSnap();
    this.snapTimer = window.setTimeout(() => {
      this.snapTimer = null;
      this.snapToNearest(true);
    }, SNAP_DELAY_MS);
  }

  stopSnap() {
    if (this.snapTimer) {
      window.clearTimeout(this.snapTimer);
      this.snapTimer = null;
    }
  }

  /**
   * @param {boolean} [commit]
   */
  snapToNearest(commit = false) {
    if (!this.options.length) return;
    const targetIndex = clamp(Math.round(this.offset), 0, this.maxIndex);
    this.offset = targetIndex;
    this.updateTransforms(true);
    this.updateSelection(true, { commit });
  }
}
