const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};
function defaultStyleButton(button, style = {}) {
  const size =
    typeof style.size === "number" && Number.isFinite(style.size)
      ? `${style.size}px`
      : typeof style.size === "string"
        ? style.size
        : "48px";
  const variant = style.variant || "square";
  const fontSize = style.fontSize || (variant === "chip" ? "16px" : "18px");
  const isStacked = variant === "stacked";
  const square = style.square ?? !isStacked;
  const padding =
    style.padding !== undefined
      ? style.padding
      : square
        ? "0"
        : variant === "chip"
          ? "0 12px"
          : "0";

  button.style.boxSizing = "border-box";
  button.style.width = square ? size : isStacked ? "auto" : size;
  button.style.minWidth = size;
  button.style.height = square && !isStacked ? size : isStacked ? "auto" : size;
  button.style.minHeight = size;
  button.style.flexBasis = square ? size : "auto";
  button.style.padding = padding;
  button.style.fontSize = fontSize;
  button.style.display = "inline-flex";
  button.style.flexDirection = isStacked ? "column" : "row";
  button.style.gap = isStacked ? "2px" : "0";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.borderRadius = "12px";
  button.style.border =
    "1px solid var(--map-control-border, var(--map-border, #ccc))";
  button.style.background = "var(--map-control-bg, var(--bg-color, #fff))";
  button.style.color = "var(--map-control-fg, inherit)";
  button.style.lineHeight = square ? "1" : "1.1";
  button.style.whiteSpace = "nowrap";
  button.style.cursor = "pointer";
  button.style.transition = "background 0.2s ease, transform 0.1s ease";
  button.style.boxShadow =
    "var(--map-control-shadow, 0 1px 2px rgba(0, 0, 0, 0.08))";
  button.style.fontWeight = "600";
  button.style.textAlign = "center";
  button.style.flexShrink = "0";
  button.style.fontVariantNumeric = "tabular-nums";
}
export function createZoomControls(options) {
  const styleButton = options.styleButton || defaultStyleButton;
  const host = document.createElement("div");
  host.className = "map-zoom-controls";
  host.style.display = "flex";
  host.style.flexDirection = "row";
  host.style.flexWrap = "nowrap";
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
  host.style.gap = "6px";
  host.style.alignSelf = "center";
  host.style.marginTop = "12px";
  host.style.marginInline = "auto";
  host.style.boxSizing = "border-box";
  host.style.flex = "0 0 auto";
  host.style.maxWidth = "100%";
  host.style.pointerEvents = "auto";
  const createButton = (label, ariaLabel, style) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    styleButton(button, style);
    return button;
  };
  const controlSize = 48;
  const zoomOutButton = createButton("−", "Zoom out", {
    fontSize: "22px",
    square: true,
    size: controlSize,
  });
  const zoomInButton = createButton("+", "Zoom in", {
    fontSize: "22px",
    square: true,
    size: controlSize,
  });
  const zoomResetButton = createButton("100%", "Reset zoom to 100%", {
    fontSize: "15px",
    square: true,
    size: controlSize,
  });
  zoomResetButton.classList.add("map-zoom-reset");
  zoomOutButton.addEventListener("click", (event) => {
    event.preventDefault();
    options.onZoomOut();
  });
  zoomInButton.addEventListener("click", (event) => {
    event.preventDefault();
    options.onZoomIn();
  });
  zoomResetButton.addEventListener("click", (event) => {
    event.preventDefault();
    options.onZoomReset();
  });
  host.appendChild(zoomOutButton);
  host.appendChild(zoomInButton);
  host.appendChild(zoomResetButton);
  const handle = {
    element: host,
    update(state) {
      const cameraZoom = state.camera?.zoom ?? state.zoom;
      const cameraMin = state.camera?.minZoom ?? state.minZoom;
      const cameraMax = state.camera?.maxZoom ?? state.maxZoom;
      const baseline = Number.isFinite(state.baselineZoom)
        ? state.baselineZoom
        : 1;
      const clampedZoom = clamp(
        cameraZoom,
        0,
        Number.isFinite(cameraMax) ? cameraMax : 8,
      );
      const clampedMin = clamp(cameraMin, 0, clampedZoom);
      const clampedMax = cameraMax > 0 ? cameraMax : Math.max(clampedZoom, 1);
      const zoomPercent = Math.round(clampedZoom * 100);
      const baselinePercent = Math.round(baseline * 100);
      zoomResetButton.textContent = `${zoomPercent}%`;
      zoomResetButton.setAttribute(
        "aria-label",
        `Reset zoom to ${baselinePercent}% (current ${zoomPercent}%)`,
      );
      zoomOutButton.disabled = clampedZoom <= clampedMin + 0.001;
      zoomInButton.disabled = clampedZoom >= clampedMax - 0.001;
    },
  };
  return handle;
}
export default createZoomControls;
