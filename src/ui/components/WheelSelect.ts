import './WheelSelect.css';

export interface WheelSelectOption {
  id: string;
  label: string;
  description?: string;
  color?: string | null;
}

export interface WheelSelectConfig {
  options: WheelSelectOption[];
  value?: string | null;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  onChange?: (value: string, option: WheelSelectOption) => void;
  onCommit?: (value: string, option: WheelSelectOption) => void;
}

const ITEM_SPACING = 62;
const SNAP_DELAY_MS = 140;
const ANIMATION_DURATION = 220;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeHex(color?: string | null) {
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

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB | null {
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

function rgbToHex({ r, g, b }: RGB) {
  const clampChannel = (channel: number) => Math.min(Math.max(Math.round(channel), 0), 255);
  return `#${[clampChannel(r), clampChannel(g), clampChannel(b)]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixHex(hexA: string, hexB: string, weight: number) {
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

function lighten(hex: string, amount = 0.18) {
  return mixHex(hex, '#ffffff', amount);
}

function darken(hex: string, amount = 0.22) {
  return mixHex(hex, '#000000', amount);
}

function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const transform = (channel: number) => {
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

function contrastRatio(foreground: string, background: string) {
  const fg = normalizeHex(foreground);
  const bg = normalizeHex(background);
  if (!fg || !bg) return 1;
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function pickTextColor(base: string) {
  const normalized = normalizeHex(base) || '#546a94';
  const lightContrast = contrastRatio('#ffffff', normalized);
  const darkContrast = contrastRatio('#111827', normalized);
  if (lightContrast >= 4.5 || lightContrast >= darkContrast) {
    return '#ffffff';
  }
  return darkContrast >= 4.5 ? '#111827' : lightContrast >= darkContrast ? '#ffffff' : '#111827';
}

function createPalette(color?: string | null) {
  const base = normalizeHex(color) || '#4c6ef5';
  return {
    base,
    light: lighten(base, 0.24),
    dark: darken(base, 0.28),
    contrast: pickTextColor(base)
  };
}

export class WheelSelect {
  private root: HTMLElement;
  private options: WheelSelectOption[];
  private items: HTMLElement[] = [];
  private value: string = '';
  private offset = 0;
  private activeIndex = -1;
  private dragging = false;
  private dragPointerId: number | null = null;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private snapTimer: number | null = null;
  private animationTimer: number | null = null;
  private readonly onChange?: (value: string, option: WheelSelectOption) => void;
  private readonly onCommit?: (value: string, option: WheelSelectOption) => void;
  private readonly viewport: HTMLElement;
  private readonly track: HTMLElement;
  private readonly idPrefix: string;

  constructor(root: HTMLElement, config: WheelSelectConfig) {
    this.root = root;
    this.options = [...config.options];
    this.onChange = config.onChange;
    this.onCommit = config.onCommit;
    this.idPrefix = `wheel-option-${Math.random().toString(36).slice(2, 10)}`;

    this.root.classList.add('wheel-select');
    this.root.tabIndex = 0;
    this.root.setAttribute('role', 'listbox');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-orientation', 'vertical');
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

  setValue(value: string, options: { silent?: boolean; animate?: boolean; commit?: boolean } = {}) {
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

  private get maxIndex() {
    return Math.max(0, this.options.length - 1);
  }

  private renderOptions() {
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

  private bindEvents() {
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('pointermove', this.handlePointerMove);
    this.root.addEventListener('pointerup', this.handlePointerUp);
    this.root.addEventListener('pointercancel', this.handlePointerUp);
    this.root.addEventListener('pointerleave', this.handlePointerLeave);
    this.root.addEventListener('wheel', this.handleWheel, { passive: false });
    this.root.addEventListener('keydown', this.handleKeyDown);
    this.root.addEventListener('blur', this.handleBlur, true);
  }

  private detachEvents() {
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('pointermove', this.handlePointerMove);
    this.root.removeEventListener('pointerup', this.handlePointerUp);
    this.root.removeEventListener('pointercancel', this.handlePointerUp);
    this.root.removeEventListener('pointerleave', this.handlePointerLeave);
    this.root.removeEventListener('wheel', this.handleWheel as EventListener);
    this.root.removeEventListener('keydown', this.handleKeyDown);
    this.root.removeEventListener('blur', this.handleBlur, true);
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }
    this.root.focus({ preventScroll: true });
    this.dragging = true;
    this.dragPointerId = event.pointerId;
    this.dragStartY = event.clientY;
    this.dragStartOffset = this.offset;
    this.stopSnap();
    this.root.classList.add('wheel-select--dragging');
    try {
      this.root.setPointerCapture(event.pointerId);
    } catch (error) {
      // ignore capture errors on unsupported elements
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.dragging || this.dragPointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const delta = event.clientY - this.dragStartY;
    const nextOffset = this.dragStartOffset + delta / ITEM_SPACING;
    this.offset = clamp(nextOffset, 0, this.maxIndex);
    this.updateTransforms();
    this.updateSelection(false);
  };

  private handlePointerUp = (event: PointerEvent) => {
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

  private handlePointerLeave = (event: PointerEvent) => {
    if (!this.dragging || (this.dragPointerId !== null && event.pointerId !== this.dragPointerId)) {
      return;
    }
    this.snapToNearest(true);
  };

  private handleWheel = (event: WheelEvent) => {
    if (!this.options.length) return;
    event.preventDefault();
    const delta = event.deltaY;
    const nextOffset = this.offset + delta / (ITEM_SPACING * 2.4);
    this.offset = clamp(nextOffset, 0, this.maxIndex);
    this.updateTransforms();
    this.updateSelection(false);
    this.scheduleSnap();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
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

  private handleBlur = () => {
    if (this.dragging) {
      this.dragging = false;
      this.dragPointerId = null;
      this.root.classList.remove('wheel-select--dragging');
      this.snapToNearest();
    }
  };

  private goToIndex(index: number, options: { animate?: boolean; commit?: boolean } = {}) {
    if (!this.options.length) return;
    const clampedIndex = clamp(index, 0, this.maxIndex);
    this.offset = clampedIndex;
    this.updateTransforms(options.animate ?? false);
    this.updateSelection(true, { commit: options.commit });
  }

  private updateTransforms(animate = false) {
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

    const maxIndex = this.maxIndex;
    this.items.forEach((item, index) => {
      const distance = index - this.offset;
      const translate = distance * ITEM_SPACING;
      const rotate = distance * -18;
      const scale = 1 - Math.min(Math.abs(distance) * 0.08, 0.35);
      const opacity = 1 - Math.min(Math.abs(distance) * 0.26, 0.68);
      const depth = maxIndex - Math.abs(Math.round(distance));
      item.style.transform = `translate3d(0, ${translate}px, 0) rotateX(${rotate}deg) scale(${scale})`;
      item.style.opacity = String(clamp(opacity, 0.08, 1));
      item.style.zIndex = String(depth + 1);
    });
  }

  private updateSelection(force = false, options: { silent?: boolean; commit?: boolean } = {}) {
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

    if (changed && !options.silent && option) {
      this.onChange?.(option.id, option);
    }
    if (options.commit && option && !options.silent) {
      this.onCommit?.(option.id, option);
    }
  }

  private scheduleSnap() {
    this.stopSnap();
    this.snapTimer = window.setTimeout(() => {
      this.snapTimer = null;
      this.snapToNearest(true);
    }, SNAP_DELAY_MS);
  }

  private stopSnap() {
    if (this.snapTimer) {
      window.clearTimeout(this.snapTimer);
      this.snapTimer = null;
    }
  }

  private snapToNearest(commit = false) {
    if (!this.options.length) return;
    const targetIndex = clamp(Math.round(this.offset), 0, this.maxIndex);
    this.offset = targetIndex;
    this.updateTransforms(true);
    this.updateSelection(true, { commit });
  }
}
