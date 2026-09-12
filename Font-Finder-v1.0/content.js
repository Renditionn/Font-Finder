(() => {
  if (window.__fontFinderLoaded) return;
  window.__fontFinderLoaded = true;

  let enabled = false;
  let lockedElement = null;
  let hoveredElement = null;

  let panel = null;
  let selection = null;
  let hoverLabel = null;
  let selectionHeader = null;

  const STORAGE_KEY = "font-finder-colors";

  let savedColors = [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        savedColors = parsed;
      }
    }
  } catch {
    savedColors = [];
  }

  

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clean(value) {
    return String(value ?? "").trim();
  }

  function getPrimaryFontName(fontFamily) {
    if (!fontFamily) return "Unknown";

    return (
      fontFamily
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "") ||
      "Unknown"
    );
  }

  function isInspectorElement(element) {
    if (!element) return false;

    if (panel && panel.contains(element)) {
      return true;
    }

    if (selection && selection.contains(element)) {
      return true;
    }

    if (hoverLabel && hoverLabel.contains(element)) {
      return true;
    }

    if (
      selectionHeader &&
      selectionHeader.contains(element)
    ) {
      return true;
    }

    return false;
  }

  function getTextElement(target) {
    let element = target;

    while (
      element &&
      element !== document.documentElement &&
      element !== document.body
    ) {
      if (
        element.nodeType === 1 &&
        element.textContent &&
        element.textContent.trim()
      ) {
        const tag = element.tagName;

        if (
          tag !== "SCRIPT" &&
          tag !== "STYLE" &&
          tag !== "NOSCRIPT" &&
          tag !== "SVG" &&
          tag !== "PATH"
        ) {
          return element;
        }
      }

      element = element.parentElement;
    }

    return null;
  }

  function getFontInfo(element) {
    if (!element) return null;

    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const text =
      element.innerText ||
      element.textContent ||
      "";

    return {
      element,

      tag: element.tagName.toLowerCase(),

      fontFamily:
        style.fontFamily || "unknown",

      fontWeight:
        style.fontWeight || "normal",

      fontSize:
        style.fontSize || "unknown",

      lineHeight:
        style.lineHeight || "normal",

      letterSpacing:
        style.letterSpacing || "normal",

      fontStyle:
        style.fontStyle || "normal",

      color:
        style.color || "rgb(0, 0, 0)",

      backgroundColor:
        style.backgroundColor ||
        "rgba(0, 0, 0, 0)",

      opacity:
        style.opacity || "1",

      textTransform:
        style.textTransform || "none",

      textDecoration:
        style.textDecorationLine ||
        "none",

      textAlign:
        style.textAlign || "start",

      cursor:
        style.cursor || "auto",

      text,

      textLength:
        text.trim().length,

      rect
    };
  }

  function getSelector(element) {
    if (!element || element.nodeType !== 1) {
      return "";
    }

    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];

    let current = element;

    while (
      current &&
      current.nodeType === 1 &&
      current !== document.body &&
      current !== document.documentElement &&
      parts.length < 5
    ) {
      let part =
        current.tagName.toLowerCase();

      if (current.classList.length) {
        const classes = [
          ...current.classList
        ]
          .filter(Boolean)
          .slice(0, 2)
          .map(
            (name) =>
              `.${CSS.escape(name)}`
          )
          .join("");

        part += classes;
      }

      const parent =
        current.parentElement;

      if (parent) {
        const siblings =
          [...parent.children]
            .filter(
              (child) =>
                child.tagName ===
                current.tagName
            );

        if (siblings.length > 1) {
          const index =
            siblings.indexOf(current) + 1;

          part += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(part);

      current = parent;
    }

    return parts.join(" > ");
  }

  

  function createUI() {
    if (panel) return;

    panel = document.createElement("div");

    panel.id = "font-finder-panel";
    panel.hidden = true;

    panel.innerHTML = `
      <div class="ff-header">
        <div class="ff-title">
          Font Finder
        </div>

        <button
          class="ff-close"
          type="button"
          aria-label="Close"
        >×</button>
      </div>

      <div class="ff-body">

        <div class="ff-empty">
          Hover over text to inspect it
        </div>

        <div class="ff-details"></div>

        <div class="ff-section">
          <div class="ff-section-title">
            Fonts on this page
          </div>

          <div class="ff-font-list"></div>

          <div class="ff-actions">
            <button
              class="ff-button"
              id="ff-refresh-fonts"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="ff-section">
          <div class="ff-section-title">
            Saved colours
          </div>

          <div class="ff-saved"></div>

          <div class="ff-actions">

            <button
              class="ff-button"
              id="ff-export"
              type="button"
            >
              Save colours as JSON
            </button>

            <button
              class="ff-button"
              id="ff-clear-colors"
              type="button"
            >
              Clear
            </button>

          </div>
        </div>

      </div>
    `;

    document.documentElement.appendChild(panel);

    selection =
      document.createElement("div");

    selection.id =
      "font-finder-selection";

    selection.style.display = "none";

    document.documentElement.appendChild(
      selection
    );

    hoverLabel =
      document.createElement("div");

    hoverLabel.id =
      "font-finder-hover-label";

    hoverLabel.style.display = "none";

    document.documentElement.appendChild(
      hoverLabel
    );

    createSelectionHeader();

    panel
      .querySelector(".ff-close")
      ?.addEventListener(
        "click",
        closeInspector
      );

    panel
      .querySelector("#ff-export")
      ?.addEventListener(
        "click",
        exportColors
      );

    panel
      .querySelector("#ff-clear-colors")
      ?.addEventListener(
        "click",
        clearColors
      );

    panel
      .querySelector("#ff-refresh-fonts")
      ?.addEventListener(
        "click",
        renderFontList
      );

    renderSavedColors();
    renderFontList();
  }

  function createSelectionHeader() {
    if (selectionHeader) return;

    selectionHeader =
      document.createElement("div");

    selectionHeader.id =
      "font-finder-selection-header";

    selectionHeader.style.cssText = `
      position: absolute;
      display: none;
      z-index: 2147483646;
      pointer-events: none;
      padding: 5px 8px;
      border: 1px solid #35383d;
      border-radius: 5px;
      background: #18191b;
      color: #e9eaec;
      box-shadow: 0 6px 18px rgba(0,0,0,.32);
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      font-size: 10px;
      line-height: 1.25;
      white-space: nowrap;
      box-sizing: border-box;
    `;

    document.documentElement.appendChild(
      selectionHeader
    );
  }

  

  function openInspector() {
    createUI();

    enabled = true;

    lockedElement = null;
    hoveredElement = null;

    panel.hidden = false;

    selection.style.display = "none";
    hoverLabel.style.display = "none";
    selectionHeader.style.display = "none";

    renderDetails(null);
    renderFontList();
  }

  function closeInspector() {
    enabled = false;

    lockedElement = null;
    hoveredElement = null;

    if (panel) {
      panel.hidden = true;
    }

    if (selection) {
      selection.style.display = "none";
    }

    if (hoverLabel) {
      hoverLabel.style.display = "none";
    }

    if (selectionHeader) {
      selectionHeader.style.display = "none";
    }
  }

  function toggleInspector() {
    if (enabled) {
      closeInspector();
    } else {
      openInspector();
    }
  }

  

  function updateSelectionHeader(
    element,
    locked = false
  ) {
    if (!selectionHeader || !element) {
      return;
    }

    const info =
      getFontInfo(element);

    if (!info) return;

    const font =
      getPrimaryFontName(
        info.fontFamily
      );

    const state =
      locked ? "Locked" : "Inspecting";

    selectionHeader.innerHTML = `
      <span style="
        color:#8e949b;
        margin-right:6px;
      ">${escapeHTML(info.tag)}</span>

      <span style="
        color:#f1f2f3;
        font-weight:600;
      ">${escapeHTML(font)}</span>

      <span style="
        color:#747980;
        margin:0 5px;
      ">·</span>

      <span style="
        color:#aeb2b8;
      ">${escapeHTML(info.fontWeight)}</span>

      <span style="
        color:#747980;
        margin:0 5px;
      ">·</span>

      <span style="
        color:#aeb2b8;
      ">${escapeHTML(info.fontSize)}</span>

      <span style="
        color:#747980;
        margin-left:7px;
      ">${state}</span>
    `;

    selectionHeader.style.display =
      "block";

    positionSelectionHeader(element);
  }

  function positionSelectionHeader(element) {
    if (
      !selectionHeader ||
      !element
    ) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    const width =
      selectionHeader.offsetWidth || 150;

    const height =
      selectionHeader.offsetHeight || 24;

    let left =
      rect.left +
      window.scrollX;

    let top =
      rect.top +
      window.scrollY -
      height -
      7;

    if (
      top <
      window.scrollY + 5
    ) {
      top =
        rect.bottom +
        window.scrollY +
        7;
    }

    if (
      left + width >
      window.scrollX +
      window.innerWidth -
      7
    ) {
      left =
        window.scrollX +
        window.innerWidth -
        width -
        7;
    }

    if (
      left <
      window.scrollX + 7
    ) {
      left =
        window.scrollX + 7;
    }

    selectionHeader.style.left =
      `${left}px`;

    selectionHeader.style.top =
      `${top}px`;
  }

  

  function positionSelection(element) {
    if (!selection || !element) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    selection.style.display =
      "block";

    selection.style.left =
      `${rect.left + window.scrollX}px`;

    selection.style.top =
      `${rect.top + window.scrollY}px`;

    selection.style.width =
      `${rect.width}px`;

    selection.style.height =
      `${rect.height}px`;
  }

  

  function positionHoverLabel(element) {
    if (
      !hoverLabel ||
      !element
    ) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    const width =
      hoverLabel.offsetWidth || 100;

    const height =
      hoverLabel.offsetHeight || 22;

    let left =
      rect.left +
      window.scrollX;

    let top =
      rect.top +
      window.scrollY -
      height -
      6;

    if (
      top <
      window.scrollY + 4
    ) {
      top =
        rect.bottom +
        window.scrollY +
        6;
    }

    if (
      left + width >
      window.scrollX +
      window.innerWidth -
      8
    ) {
      left =
        window.scrollX +
        window.innerWidth -
        width -
        8;
    }

    if (
      left <
      window.scrollX + 8
    ) {
      left =
        window.scrollX + 8;
    }

    hoverLabel.style.left =
      `${left}px`;

    hoverLabel.style.top =
      `${top}px`;
  }

  

  function updateHover(element) {
    if (!enabled) return;

    if (
      !element ||
      isInspectorElement(element)
    ) {
      return;
    }

    hoveredElement = element;

    if (lockedElement) {
      positionSelection(
        lockedElement
      );

      updateSelectionHeader(
        lockedElement,
        true
      );

      hoverLabel.style.display =
        "none";

      return;
    }

    renderDetails(element);

    positionSelection(element);

    const info =
      getFontInfo(element);

    if (!info) return;

    const font =
      getPrimaryFontName(
        info.fontFamily
      );

    hoverLabel.textContent =
      `${font} · ${info.fontWeight} · ${info.fontSize}`;

    hoverLabel.style.display =
      "block";

    positionHoverLabel(element);

    updateSelectionHeader(
      element,
      false
    );
  }

  

  function renderDetails(element) {
    if (!panel) return;

    const details =
      panel.querySelector(
        ".ff-details"
      );

    const empty =
      panel.querySelector(
        ".ff-empty"
      );

    if (!details || !empty) {
      return;
    }

    if (!element) {
      empty.style.display =
        "block";

      details.innerHTML = "";

      return;
    }

    const info =
      getFontInfo(element);

    if (!info) {
      empty.style.display =
        "block";

      details.innerHTML = "";

      return;
    }

    empty.style.display =
      "none";

    const font =
      getPrimaryFontName(
        info.fontFamily
      );

    details.innerHTML = `
      <div class="ff-font-header">

        <div class="ff-font-name-large">
          ${escapeHTML(font)}
        </div>

        <div class="ff-font-sub">
          ${escapeHTML(info.fontWeight)}
          ·
          ${escapeHTML(info.fontSize)}
        </div>

      </div>

      <div class="ff-group">

        ${detailRow(
          "font-family",
          info.fontFamily
        )}

        ${detailRow(
          "font-weight",
          info.fontWeight
        )}

        ${detailRow(
          "font-size",
          info.fontSize
        )}

        ${detailRow(
          "line-height",
          info.lineHeight
        )}

        ${detailRow(
          "letter-spacing",
          info.letterSpacing
        )}

        ${detailRow(
          "font-style",
          info.fontStyle
        )}

        ${detailRow(
          "text-transform",
          info.textTransform
        )}

        ${detailRow(
          "text-decoration",
          info.textDecoration
        )}

        ${detailRow(
          "text-align",
          info.textAlign
        )}

        ${detailRow(
          "opacity",
          info.opacity
        )}

        ${detailRow(
          "cursor",
          info.cursor
        )}

        ${detailRow(
          "element",
          `<${escapeHTML(info.tag)}>`,
          true
        )}

        ${detailRow(
          "text length",
          info.textLength
        )}

        <div class="ff-row">
          <div class="ff-key">
            color
          </div>

          <div class="ff-value">
            <div class="ff-color-value">

              <span
                class="ff-color-swatch"
                style="
                  background-color:
                  ${escapeHTML(info.color)};
                "
                title="${escapeHTML(info.color)}"
              ></span>

              <span
                class="ff-color-text"
                title="${escapeHTML(info.color)}"
              >
                ${escapeHTML(info.color)}
              </span>

              <button
                class="ff-save-color"
                id="ff-copy-color"
                type="button"
              >
                Copy
              </button>

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

        ${detailRow(
          "background",
          info.backgroundColor
        )}

      </div>

      <div class="ff-group">

        <div class="ff-row">
          <div class="ff-key">
            selector
          </div>

          <div
            class="ff-value"
            title="${escapeHTML(
              getSelector(element)
            )}"
          >
            ${escapeHTML(
              getSelector(element)
            )}
          </div>
        </div>

        <div class="ff-row">
          <div class="ff-key">
            size
          </div>

          <div class="ff-value">
            ${Math.round(
              info.rect.width
            )} ×
            ${Math.round(
              info.rect.height
            )}px
          </div>
        </div>

      </div>

      <div class="ff-actions">

        <button
          class="ff-button ff-primary"
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

      <div class="ff-actions">

        <button
          class="ff-button"
          id="ff-copy-selector"
          type="button"
        >
          Copy selector
        </button>

        <button
          class="ff-button"
          id="ff-copy-text"
          type="button"
        >
          Copy text
        </button>

      </div>
    `;

    attachDetailEvents(
      info,
      element
    );
  }

  function detailRow(
    key,
    value,
    raw = false
  ) {
    return `
      <div class="ff-row">

        <div class="ff-key">
          ${escapeHTML(key)}
        </div>

        <div
          class="ff-value"
          title="${escapeHTML(
            raw
              ? String(value)
              : String(value)
          )}"
        >
          ${
            raw
              ? value
              : escapeHTML(value)
          }
        </div>

      </div>
    `;
  }

  function attachDetailEvents(
    info,
    element
  ) {
    const save =
      panel.querySelector(
        "#ff-save-current-color"
      );

    save?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        saveColor(
          info.color,
          save
        );
      }
    );

    const copyColor =
      panel.querySelector(
        "#ff-copy-color"
      );

    copyColor?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        copyText(
          info.color,
          copyColor,
          "Copied"
        );
      }
    );

    const copyCSS =
      panel.querySelector(
        "#ff-copy-css"
      );

    copyCSS?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        copyText(
          buildCSS(info),
          copyCSS,
          "Copied"
        );
      }
    );

    const copyFont =
      panel.querySelector(
        "#ff-copy-font"
      );

    copyFont?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        copyText(
          getPrimaryFontName(
            info.fontFamily
          ),
          copyFont,
          "Copied"
        );
      }
    );

    const copySelector =
      panel.querySelector(
        "#ff-copy-selector"
      );

    copySelector?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        copyText(
          getSelector(element),
          copySelector,
          "Copied"
        );
      }
    );

    const copyTextButton =
      panel.querySelector(
        "#ff-copy-text"
      );

    copyTextButton?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        copyText(
          info.text.trim(),
          copyTextButton,
          "Copied"
        );
      }
    );
  }

  

  function buildCSS(info) {
    return [
      `font-family: ${info.fontFamily};`,
      `font-weight: ${info.fontWeight};`,
      `font-size: ${info.fontSize};`,
      `line-height: ${info.lineHeight};`,
      `letter-spacing: ${info.letterSpacing};`,
      `font-style: ${info.fontStyle};`,
      `text-transform: ${info.textTransform};`,
      `text-decoration: ${info.textDecoration};`,
      `text-align: ${info.textAlign};`,
      `color: ${info.color};`,
      `background-color: ${info.backgroundColor};`,
      `opacity: ${info.opacity};`
    ].join("\n");
  }

  

  async function copyText(
    text,
    button,
    success = "Copied"
  ) {
    try {
      await navigator.clipboard.writeText(
        String(text)
      );
    } catch {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        String(text);

      textarea.style.position =
        "fixed";

      textarea.style.left =
        "-9999px";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      try {
        document.execCommand(
          "copy"
        );
      } catch {}

      textarea.remove();
    }

    if (!button) return;

    const original =
      button.textContent;

    button.textContent =
      success;

    setTimeout(() => {
      if (button.isConnected) {
        button.textContent =
          original;
      }
    }, 900);
  }

  

  function saveColor(
    color,
    button
  ) {
    if (!color) return;

    if (
      !savedColors.includes(color)
    ) {
      savedColors.push(color);

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            savedColors
          )
        );
      } catch {}

      renderSavedColors();
    }

    if (button) {
      const original =
        button.textContent;

      button.textContent =
        "Saved";

      setTimeout(() => {
        if (button.isConnected) {
          button.textContent =
            original;
        }
      }, 900);
    }
  }

  function clearColors() {
    savedColors = [];

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch {}

    renderSavedColors();
  }

  function renderSavedColors() {
    if (!panel) return;

    const container =
      panel.querySelector(
        ".ff-saved"
      );

    if (!container) return;

    container.innerHTML = "";

    if (!savedColors.length) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "ff-no-colors";

      empty.textContent =
        "No saved colours yet";

      container.appendChild(
        empty
      );

      return;
    }

    for (const color of savedColors) {
      const swatch =
        document.createElement(
          "button"
        );

      swatch.type = "button";

      swatch.className =
        "ff-saved-color";

      swatch.style.backgroundColor =
        color;

      swatch.title =
        `${color} — click to copy`;

      swatch.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          copyText(
            color,
            swatch,
            "Copied"
          );
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

    const blob =
      new Blob(
        [
          JSON.stringify(
            data,
            null,
            2
          )
        ],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "font-finder-colours.json";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(
        url
      );
    }, 1000);
  }

  

  function renderFontList() {
    if (!panel) return;

    const list =
      panel.querySelector(
        ".ff-font-list"
      );

    if (!list) return;

    const counts =
      new Map();

    const elements =
      document.querySelectorAll(
        "body *"
      );

    for (const element of elements) {
      if (
        isInspectorElement(
          element
        )
      ) {
        continue;
      }

      if (
        element.tagName ===
          "SCRIPT" ||
        element.tagName ===
          "STYLE" ||
        element.tagName ===
          "NOSCRIPT"
      ) {
        continue;
      }

      if (
        !element.textContent ||
        !element.textContent.trim()
      ) {
        continue;
      }

      const style =
        getComputedStyle(
          element
        );

      const family =
        style.fontFamily;

      if (!family) continue;

      const font =
        getPrimaryFontName(
          family
        );

      counts.set(
        font,
        (counts.get(font) || 0) +
          1
      );
    }

    const sorted =
      [...counts.entries()]
        .sort(
          (a, b) =>
            b[1] - a[1]
        );

    list.innerHTML = "";

    if (!sorted.length) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "ff-no-colors";

      empty.textContent =
        "No fonts found";

      list.appendChild(
        empty
      );

      return;
    }

    for (
      const [font, count]
      of sorted
    ) {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "ff-font-item";

      const name =
        document.createElement(
          "span"
        );

      name.className =
        "ff-font-name-small";

      name.textContent =
        font;

      const number =
        document.createElement(
          "span"
        );

      number.className =
        "ff-count";

      number.textContent =
        count;

      row.appendChild(name);
      row.appendChild(number);

      list.appendChild(row);
    }
  }

  

  function lockElement(element) {
    if (!element) return;

    lockedElement =
      element;

    hoveredElement =
      element;

    positionSelection(
      element
    );

    updateSelectionHeader(
      element,
      true
    );

    hoverLabel.style.display =
      "none";

    renderDetails(
      element
    );
  }

  function unlockElement() {
    lockedElement = null;

    if (hoveredElement) {
      updateHover(
        hoveredElement
      );
    } else {
      selection.style.display =
        "none";

      selectionHeader.style.display =
        "none";
    }
  }

  

  function handleMouseMove(
    event
  ) {
    if (!enabled) return;

    const target =
      document.elementFromPoint(
        event.clientX,
        event.clientY
      );

    if (!target) return;

    if (
      isInspectorElement(
        target
      )
    ) {
      return;
    }

    const element =
      getTextElement(
        target
      );

    if (!element) return;

    if (lockedElement) {
      positionSelection(
        lockedElement
      );

      updateSelectionHeader(
        lockedElement,
        true
      );

      return;
    }

    if (
      element ===
      hoveredElement
    ) {
      positionSelection(
        element
      );

      positionHoverLabel(
        element
      );

      positionSelectionHeader(
        element
      );

      return;
    }

    updateHover(
      element
    );
  }

  function handleClick(
    event
  ) {
    if (!enabled) return;

    if (
      panel &&
      panel.contains(
        event.target
      )
    ) {
      return;
    }

    if (
      isInspectorElement(
        event.target
      )
    ) {
      return;
    }

    const element =
      getTextElement(
        event.target
      );

    if (!element) return;

    event.preventDefault();
    event.stopPropagation();

    lockElement(
      element
    );
  }

  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
      "Escape"
    ) {
      if (!enabled) return;

      if (lockedElement) {
        unlockElement();
      } else {
        closeInspector();
      }

      return;
    }

    if (
      enabled &&
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === "c"
    ) {
      if (!lockedElement) return;

      event.preventDefault();

      const info =
        getFontInfo(
          lockedElement
        );

      if (info) {
        copyText(
          buildCSS(info)
        );
      }
    }
  }

  function handleScroll() {
    if (!enabled) return;

    const element =
      lockedElement ||
      hoveredElement;

    if (!element) return;

    positionSelection(
      element
    );

    updateSelectionHeader(
      element,
      Boolean(
        lockedElement
      )
    );

    if (
      !lockedElement &&
      hoverLabel.style.display !==
        "none"
    ) {
      positionHoverLabel(
        element
      );
    }
  }

  function handleResize() {
    const element =
      lockedElement ||
      hoveredElement;

    if (!element) return;

    positionSelection(
      element
    );

    updateSelectionHeader(
      element,
      Boolean(
        lockedElement
      )
    );

    if (
      !lockedElement &&
      hoverLabel.style.display !==
        "none"
    ) {
      positionHoverLabel(
        element
      );
    }
  }

  

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
        message.type ===
        "toggle"
      ) {
        toggleInspector();
      }

      if (
        message.type ===
        "open"
      ) {
        openInspector();
      }

      if (
        message.type ===
        "close"
      ) {
        closeInspector();
      }
    }
  );
})();