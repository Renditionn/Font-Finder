(() => {
  if (window.__fontFinderLoaded) {
    if (window.__fontFinderToggle) {
      window.__fontFinderToggle();
    }

    return;
  }

  window.__fontFinderLoaded = true;

  let enabled = true;
  let lockedElement = null;
  let hoveredElement = null;

  let root = null;
  let selectionBox = null;
  let hoverLabel = null;

  let savedColors = [];

  try {
    const stored = localStorage.getItem("font-finder-colors");

    if (stored) {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        savedColors = parsed;
      }
    }
  } catch {}

  function getFontInfo(element) {
    if (!element) return null;

    const style = window.getComputedStyle(element);

    return {
      family: style.fontFamily || "unknown",
      weight: style.fontWeight || "normal",
      size: style.fontSize || "unknown",
      lineHeight: style.lineHeight || "normal",
      letterSpacing: style.letterSpacing || "normal",
      color: style.color || "unknown",
      style: style.fontStyle || "normal"
    };
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getElementName(element) {
    if (!element) return "";

    let name = element.tagName.toLowerCase();

    if (element.id) {
      name += "#" + element.id;
    }

    if (element.classList && element.classList.length) {
      const classes = Array.from(element.classList)
        .slice(0, 2)
        .join(".");

      if (classes) {
        name += "." + classes;
      }
    }

    return name;
  }

  function hasVisibleText(element) {
    if (!element) return false;

    const text = element.textContent?.trim();

    if (!text) return false;

    const style = window.getComputedStyle(element);

    if (
      style.display === "none" ||
      style.visibility === "hidden"
    ) {
      return false;
    }

    return true;
  }

  function findTextElement(element) {
    let current = element;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      if (hasVisibleText(current)) {
        return current;
      }

      current = current.parentElement;
    }

    return element;
  }

  function isInspectorElement(element) {
    if (!element) return true;

    if (root && root.contains(element)) {
      return true;
    }

    if (selectionBox === element) {
      return true;
    }

    if (hoverLabel === element) {
      return true;
    }

    return false;
  }

  function createUI() {
    root = document.createElement("div");

    root.id = "font-finder-root";

    root.innerHTML = `
      <div class="ff-panel">

        <div class="ff-header">

          <div class="ff-title">
            Font Finder
          </div>

          <button
            class="ff-close"
            type="button"
            title="Close"
          >×</button>

        </div>

        <div class="ff-body">

          <div
            class="ff-element"
            id="ff-element"
          >
            Hover over text to inspect it
          </div>

          <div class="ff-selected-font">

            <div
              class="ff-font-name-large"
              id="ff-main-font"
            >
              —
            </div>

            <div
              class="ff-font-meta"
              id="ff-font-meta"
            >
              —
            </div>

          </div>

          <div
            class="ff-details"
            id="ff-details"
          >
            ${createEmptyDetails()}
          </div>

          <div class="ff-actions">

            <button
              class="ff-button primary"
              id="ff-copy-css"
              type="button"
            >
              Copy CSS
            </button>

            <button
              class="ff-button"
              id="ff-copy-font"
              type="button"
            >
              Copy font
            </button>

          </div>

          <div class="ff-section-title">
            Fonts on this page
          </div>

          <div
            class="ff-font-list"
            id="ff-fonts"
          ></div>

          <div class="ff-saved-colors">

            <div class="ff-section-title">
              Saved colours
            </div>

            <div
              class="ff-color-list"
              id="ff-color-list"
            ></div>

            <button
              class="ff-button ff-save-colors"
              id="ff-save-colors"
              type="button"
            >
              Save colours as JSON
            </button>

          </div>

          <div class="ff-shortcut">

            <kbd>Ctrl</kbd>
            +
            <kbd>Shift</kbd>
            +
            <kbd>F</kbd>

          </div>

        </div>

      </div>
    `;

    document.documentElement.appendChild(root);

    selectionBox = document.createElement("div");

    selectionBox.className = "ff-selection";

    selectionBox.style.display = "none";

    document.documentElement.appendChild(selectionBox);

    hoverLabel = document.createElement("div");

    hoverLabel.className = "ff-hover-label";

    hoverLabel.style.display = "none";

    document.documentElement.appendChild(hoverLabel);

    root
      .querySelector(".ff-close")
      .addEventListener(
        "click",
        closeInspector
      );

    root
      .querySelector("#ff-copy-css")
      .addEventListener(
        "click",
        copyCSS
      );

    root
      .querySelector("#ff-copy-font")
      .addEventListener(
        "click",
        copyFont
      );

    root
      .querySelector("#ff-save-colors")
      .addEventListener(
        "click",
        exportColors
      );

    renderFonts();

    renderSavedColors();
  }

  function createEmptyDetails() {
    const rows = [
      "font-family",
      "font-weight",
      "font-size",
      "line-height",
      "letter-spacing",
      "font-style",
      "color"
    ];

    return rows
      .map(
        (name) => `
          <div class="ff-row">

            <div class="ff-key">
              ${name}
            </div>

            <div class="ff-value">
              —
            </div>

          </div>
        `
      )
      .join("");
  }

  function renderDetails(element) {
    if (!root) return;

    const elementDisplay =
      root.querySelector("#ff-element");

    const mainFont =
      root.querySelector("#ff-main-font");

    const fontMeta =
      root.querySelector("#ff-font-meta");

    const details =
      root.querySelector("#ff-details");

    if (!element) {
      elementDisplay.textContent =
        "Hover over text to inspect it";

      mainFont.textContent = "—";

      fontMeta.textContent = "—";

      details.innerHTML =
        createEmptyDetails();

      return;
    }

    const info =
      getFontInfo(element);

    const family =
      info.family
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");

    elementDisplay.textContent =
      getElementName(element);

    mainFont.textContent =
      family;

    fontMeta.textContent =
      `${info.weight} · ${info.size}`;

    const values = [
      ["font-family", info.family],
      ["font-weight", info.weight],
      ["font-size", info.size],
      ["line-height", info.lineHeight],
      ["letter-spacing", info.letterSpacing],
      ["font-style", info.style]
    ];

    details.innerHTML =
      values
        .map(
          ([key, value]) => `
            <div class="ff-row">

              <div class="ff-key">
                ${key}
              </div>

              <div
                class="ff-value"
                title="${escapeHTML(value)}"
              >
                ${escapeHTML(value)}
              </div>

            </div>
          `
        )
        .join("") +
      createColorRow(info.color);

    const saveButton =
      details.querySelector(
        "#ff-save-current-color"
      );

    if (saveButton) {
      saveButton.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          saveColor(
            info.color,
            saveButton
          );
        }
      );
    }
  }

  function createColorRow(color) {
    const safeColor =
      escapeHTML(color);

    return `
      <div class="ff-row">

        <div class="ff-key">
          color
        </div>

        <div class="ff-value">

          <div class="ff-color-value">

            <span
              class="ff-color-swatch"
              style="background-color: ${safeColor};"
              title="${safeColor}"
            ></span>

            <span
              class="ff-color-text"
              title="${safeColor}"
            >
              ${safeColor}
            </span>

            <button
              class="ff-save-color"
              id="ff-save-current-color"
              type="button"
            >
              Save
            </button>

          </div>

        </div>

      </div>
    `;
  }

  function saveColor(color, button) {
    if (!color) return;

    if (!savedColors.includes(color)) {
      savedColors.push(color);

      try {
        localStorage.setItem(
          "font-finder-colors",
          JSON.stringify(savedColors)
        );
      } catch {}

      renderSavedColors();
    }

    if (button) {
      button.textContent = "Saved";

      setTimeout(() => {
        if (button.isConnected) {
          button.textContent = "Save";
        }
      }, 900);
    }
  }

  function renderSavedColors() {
    if (!root) return;

    const container =
      root.querySelector(
        "#ff-color-list"
      );

    if (!container) return;

    container.innerHTML = "";

    for (const color of savedColors) {
      const swatch =
        document.createElement(
          "button"
        );

      swatch.className =
        "ff-saved-color";

      swatch.type = "button";

      swatch.title =
        `Copy ${color}`;

      swatch.style.backgroundColor =
        color;

      swatch.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          event.stopPropagation();

          try {
            await navigator.clipboard.writeText(
              color
            );

            swatch.title = "Copied";

            setTimeout(() => {
              if (swatch.isConnected) {
                swatch.title =
                  `Copy ${color}`;
              }
            }, 800);
          } catch {}
        }
      );

      container.appendChild(
        swatch
      );
    }
  }

  function exportColors() {
    const data = {
      colours: savedColors
    };

    const json =
      JSON.stringify(
        data,
        null,
        2
      );

    const blob =
      new Blob(
        [json],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "font-finder-colours.json";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showButtonMessage(
      "#ff-save-colors",
      "JSON saved"
    );
  }

  function updateSelection(element) {
    if (!selectionBox || !element) {
      return;
    }

    if (
      root &&
      root.contains(element)
    ) {
      selectionBox.style.display =
        "none";

      return;
    }

    const rect =
      element.getBoundingClientRect();

    selectionBox.style.display =
      "block";

    selectionBox.style.left =
      `${rect.left}px`;

    selectionBox.style.top =
      `${rect.top}px`;

    selectionBox.style.width =
      `${rect.width}px`;

    selectionBox.style.height =
      `${rect.height}px`;
  }

  function updateHoverLabel(element) {
    if (!hoverLabel || !element) {
      return;
    }

    const info =
      getFontInfo(element);

    const rect =
      element.getBoundingClientRect();

    hoverLabel.textContent =
      `${getElementName(element)} · ${info.family}`;

    hoverLabel.style.display =
      "block";

    let left = rect.left;

    let top =
      rect.top - 25;

    if (top < 4) {
      top =
        rect.bottom + 4;
    }

    if (left < 4) {
      left = 4;
    }

    const width =
      hoverLabel.offsetWidth;

    if (
      left + width >
      window.innerWidth - 4
    ) {
      left =
        window.innerWidth -
        width -
        4;
    }

    hoverLabel.style.left =
      `${left}px`;

    hoverLabel.style.top =
      `${top}px`;
  }

  function handleMouseMove(event) {
    if (!enabled) return;

    if (lockedElement) {
      updateSelection(
        lockedElement
      );

      return;
    }

    if (
      isInspectorElement(
        event.target
      )
    ) {
      return;
    }

    const target =
      findTextElement(
        event.target
      );

    if (
      !target ||
      isInspectorElement(target)
    ) {
      return;
    }

    hoveredElement =
      target;

    renderDetails(target);

    updateSelection(target);

    updateHoverLabel(target);
  }

  function handleClick(event) {
    if (!enabled) return;

    if (
      root &&
      root.contains(event.target)
    ) {
      return;
    }

    if (lockedElement) {
      return;
    }

    const target =
      findTextElement(
        event.target
      );

    if (
      !target ||
      isInspectorElement(target)
    ) {
      return;
    }

    event.preventDefault();

    event.stopPropagation();

    event.stopImmediatePropagation();

    lockedElement =
      target;

    renderDetails(target);

    updateSelection(target);

    if (hoverLabel) {
      hoverLabel.style.display =
        "none";
    }
  }

  function handleKeyDown(event) {
    if (
      event.key !== "Escape"
    ) {
      return;
    }

    if (!lockedElement) {
      return;
    }

    lockedElement = null;

    if (hoveredElement) {
      renderDetails(
        hoveredElement
      );

      updateSelection(
        hoveredElement
      );
    } else {
      renderDetails(null);

      if (selectionBox) {
        selectionBox.style.display =
          "none";
      }
    }
  }

  function handleScroll() {
    const target =
      lockedElement ||
      hoveredElement;

    if (!target) return;

    updateSelection(target);

    if (!lockedElement) {
      updateHoverLabel(target);
    }
  }

  function handleResize() {
    const target =
      lockedElement ||
      hoveredElement;

    if (!target) return;

    updateSelection(target);

    if (!lockedElement) {
      updateHoverLabel(target);
    }
  }

  function renderFonts() {
    if (!root) return;

    const container =
      root.querySelector(
        "#ff-fonts"
      );

    if (!container) return;

    const counts =
      new Map();

    const elements =
      document.body
        ? document.body.querySelectorAll("*")
        : [];

    for (
      const element
      of elements
    ) {
      if (
        isInspectorElement(
          element
        )
      ) {
        continue;
      }

      if (
        !hasVisibleText(
          element
        )
      ) {
        continue;
      }

      const style =
        window.getComputedStyle(
          element
        );

      let family =
        style.fontFamily;

      if (!family) {
        continue;
      }

      family =
        family
          .split(",")[0]
          .trim()
          .replace(
            /^["']|["']$/g,
            ""
          );

      if (!family) {
        continue;
      }

      counts.set(
        family,
        (counts.get(family) || 0) + 1
      );
    }

    const fonts =
      Array.from(
        counts.entries()
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 20);

    container.innerHTML =
      "";

    if (!fonts.length) {
      container.innerHTML = `
        <div class="ff-empty">
          No fonts found
        </div>
      `;

      return;
    }

    for (
      const [font, count]
      of fonts
    ) {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "ff-font";

      const name =
        document.createElement(
          "div"
        );

      name.className =
        "ff-font-name";

      name.textContent =
        font;

      const number =
        document.createElement(
          "div"
        );

      number.className =
        "ff-count";

      number.textContent =
        count;

      item.appendChild(name);

      item.appendChild(
        number
      );

      container.appendChild(
        item
      );
    }
  }

  async function copyFont() {
    const target =
      lockedElement ||
      hoveredElement;

    if (!target) return;

    const info =
      getFontInfo(target);

    if (!info) return;

    const family =
      info.family
        .split(",")[0]
        .trim()
        .replace(
          /^["']|["']$/g,
          ""
        );

    try {
      await navigator.clipboard.writeText(
        family
      );

      showButtonMessage(
        "#ff-copy-font",
        "Copied"
      );
    } catch {}
  }

  async function copyCSS() {
    const target =
      lockedElement ||
      hoveredElement;

    if (!target) return;

    const info =
      getFontInfo(target);

    if (!info) return;

    const css =
`font-family: ${info.family};
font-weight: ${info.weight};
font-size: ${info.size};
line-height: ${info.lineHeight};
letter-spacing: ${info.letterSpacing};
font-style: ${info.style};
color: ${info.color};`;

    try {
      await navigator.clipboard.writeText(
        css
      );

      showButtonMessage(
        "#ff-copy-css",
        "Copied"
      );
    } catch {}
  }

  function showButtonMessage(
    selector,
    message
  ) {
    if (!root) return;

    const button =
      root.querySelector(
        selector
      );

    if (!button) return;

    const original =
      button.textContent;

    button.textContent =
      message;

    setTimeout(() => {
      if (button.isConnected) {
        button.textContent =
          original;
      }
    }, 900);
  }

  function closeInspector() {
    enabled = false;

    lockedElement = null;

    hoveredElement = null;

    if (root) {
      root.style.display =
        "none";
    }

    if (selectionBox) {
      selectionBox.style.display =
        "none";
    }

    if (hoverLabel) {
      hoverLabel.style.display =
        "none";
    }
  }

  function openInspector() {
    enabled = true;

    if (root) {
      root.style.display =
        "block";
    }

    renderFonts();

    renderSavedColors();

    if (hoveredElement) {
      renderDetails(
        hoveredElement
      );
    }
  }

  function toggleInspector() {
    if (enabled) {
      closeInspector();
    } else {
      openInspector();
    }
  }

  window.__fontFinderToggle =
    toggleInspector;

  createUI();

  document.addEventListener(
    "mousemove",
    handleMouseMove,
    true
  );

  document.addEventListener(
    "click",
    handleClick,
    true
  );

  document.addEventListener(
    "keydown",
    handleKeyDown,
    true
  );

  window.addEventListener(
    "scroll",
    handleScroll,
    true
  );

  window.addEventListener(
    "resize",
    handleResize
  );

  chrome.runtime.onMessage.addListener(
    (message) => {
      if (!message) return;

      if (
        message.type === "toggle"
      ) {
        toggleInspector();
      }
    }
  );
})();
