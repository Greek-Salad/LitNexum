// js/hint-injector.js

import Utils from "./utils.js";

class HintInjector {
  constructor() {
    this.hints = [];
    this.configPath = "./config/hint-rules.json";
    this.activeTooltips = new Set();
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadHints().then(() => {
      this.initialized = true;
      console.log(
        `✅ HintInjector initialized with ${this.hints.length} hints`,
      );
    });

    return this.initPromise;
  }

  async loadHints() {
    try {
      const config = await Utils.loadJSON(this.configPath);
      if (config && Array.isArray(config.hints)) {
        this.hints = config.hints;
        console.log(`📦 Loaded ${this.hints.length} hint rules`);
      }
    } catch (error) {
      console.warn("Error loading hints:", error);
    }
  }

  async ensureHintsLoaded() {
    if (!this.initialized) {
      await this.init();
    }
    return this.hints;
  }

  setBookRules(rules) {
    this.hints = rules || [];
    console.log(
      `📦 HintInjector set with ${this.hints.length} rules for current book`,
    );
  }

  async injectHints(html, chapterNumber) {
    if (this.hints.length === 0) {
      return html;
    }

    console.log(
      `🎯 injectHints called for chapter ${chapterNumber}, using ${this.hints.length} hints`,
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const appliedHints = new Set();

    for (const hintRule of this.hints) {
      if (hintRule.chapter === chapterNumber) {
        this.applyHint(doc, hintRule, appliedHints);
      }
    }

    return doc.body.innerHTML;
  }

  applyHint(doc, hintRule, appliedHints) {
    if (appliedHints.has(hintRule.id)) {
      return;
    }

    const paragraphs = doc.querySelectorAll("p");

    for (const p of paragraphs) {
      const originalText = p.textContent;

      if (originalText.includes(hintRule.text)) {
        console.log(
          `✅ Found text to replace: "${hintRule.text}" in paragraph: "${originalText.substring(0, 50)}..."`,
        );

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = p.innerHTML;

        const newHTML = this.replaceTextWithHintOnce(
          hintRule.text,
          hintRule.hint,
          tempDiv.innerHTML,
        );
        p.innerHTML = newHTML;

        console.log(
          `✅ Text wrapped with hint (first occurrence only): ${hintRule.text}`,
        );

        appliedHints.add(hintRule.id);
        return;
      }
    }
  }

  replaceTextWithHintOnce(searchText, hintText, originalHTML) {
    const regex = new RegExp(Utils.escapeRegex(searchText));

    const safeHintText = this.escapeHtml(hintText);

    return originalHTML.replace(
      regex,
      `<u data-hint="${safeHintText}">${searchText}</u>`,
    );
  }

  replaceTextWithHint(fullText, searchText, hintText, originalHTML) {
    const regex = new RegExp(Utils.escapeRegex(searchText), "g");

    const safeHintText = this.escapeHtml(hintText);

    return originalHTML.replace(
      regex,
      `<u data-hint="${safeHintText}">${searchText}</u>`,
    );
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  setupHintTooltips() {
    this.clearAllTooltips();

    document.querySelectorAll("u[data-hint]").forEach((u) => {
      u.removeEventListener("mouseenter", this.boundHandleHintMouseEnter);
      u.removeEventListener("touchstart", this.boundHandleTouchStart);
      u.removeEventListener("click", this.boundHandleClick);
    });

    this.boundHandleHintMouseEnter = this.handleHintMouseEnter.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);

    document.querySelectorAll("u[data-hint]").forEach((u) => {
      u.addEventListener("mouseenter", this.boundHandleHintMouseEnter);
      u.addEventListener("touchstart", this.boundHandleTouchStart);
      u.addEventListener("click", this.boundHandleClick);
    });

    window.removeEventListener("scroll", this.boundHandleScroll);
    this.boundHandleScroll = this.handleScroll.bind(this);
    window.addEventListener("scroll", this.boundHandleScroll, {
      passive: true,
    });
  }

  clearAllTooltips() {
    document.querySelectorAll(".dynamic-hint-tooltip").forEach((tooltip) => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });
    this.activeTooltips.clear();
  }

  handleHintMouseEnter(event) {
    if ("ontouchstart" in window) return;

    const u = event.currentTarget;
    this.showTooltip(u, event);
  }

  handleTouchStart(event) {
    event.preventDefault();
    event.stopPropagation();

    const u = event.currentTarget;
    this.showTooltip(u, event);

    const closeOnNextTap = (e) => {
      if (!u.contains(e.target)) {
        this.clearAllTooltips();
        document.removeEventListener("touchstart", closeOnNextTap);
        document.removeEventListener("click", closeOnNextTap);
      }
    };

    setTimeout(() => {
      document.addEventListener("touchstart", closeOnNextTap, { once: true });
      document.addEventListener("click", closeOnNextTap, { once: true });
    }, 100);
  }

  handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const u = event.currentTarget;

    const existingTooltip =
      u.querySelector(".dynamic-hint-tooltip") ||
      document.querySelector(
        ".dynamic-hint-tooltip[data-for='" + u.dataset.hintId + "']",
      );

    if (existingTooltip) {
      if (existingTooltip.parentNode) {
        existingTooltip.parentNode.removeChild(existingTooltip);
      }
      this.activeTooltips.delete(existingTooltip);
      return;
    }

    this.showTooltip(u, event);

    const closeOnClickOutside = (e) => {
      if (!u.contains(e.target) && !existingTooltip?.contains(e.target)) {
        this.clearAllTooltips();
        document.removeEventListener("click", closeOnClickOutside);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", closeOnClickOutside, { once: true });
    }, 10);
  }

  handleScroll() {
    this.clearAllTooltips();
  }

  showTooltip(u, event) {
    this.clearAllTooltips();

    const hint = u.getAttribute("data-hint");
    const rect = u.getBoundingClientRect();

    const tempTooltip = document.createElement("div");
    tempTooltip.textContent = hint;
    const maxWidth = window.innerWidth <= 768 ? window.innerWidth * 0.6 : 500;

    Object.assign(tempTooltip.style, {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      zIndex: "-1",
      whiteSpace: "nowrap",
      padding: "0.25rem 0.5rem",
      fontSize: "0.8rem",
      fontFamily: getComputedStyle(u).fontFamily,
      fontWeight: getComputedStyle(u).fontWeight,
    });

    document.body.appendChild(tempTooltip);
    const singleLineWidth = tempTooltip.offsetWidth;
    tempTooltip.remove();

    const tooltipEl = document.createElement("div");
    tooltipEl.className = "dynamic-hint-tooltip";
    tooltipEl.textContent = hint;

    const hintId =
      "hint-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    tooltipEl.dataset.hintId = hintId;
    u.dataset.hintId = hintId;

    const isSingleLine = singleLineWidth <= maxWidth;
    const widthForStyling = isSingleLine ? "fit-content" : maxWidth + "px";

    Object.assign(tooltipEl.style, {
      position: "absolute",
      top: rect.top + window.scrollY - 10 + "px",
      zIndex: "1000",
      background: getComputedStyle(u).getPropertyValue("--sidebar-bg"),
      color: getComputedStyle(u).getPropertyValue("--sidebar-text"),
      padding: "0.25rem 0.5rem",
      borderRadius: "0.25rem",
      fontSize: "0.8rem",
      fontFamily: getComputedStyle(u).fontFamily,
      fontWeight: getComputedStyle(u).fontWeight,
      boxShadow: getComputedStyle(u).getPropertyValue("--shadow"),
      border:
        "1px solid " + getComputedStyle(u).getPropertyValue("--border-color"),
      maxWidth: maxWidth + "px",
      whiteSpace: isSingleLine ? "nowrap" : "normal",
      wordWrap: isSingleLine ? "normal" : "break-word",
      textAlign: "center",
      pointerEvents: "none",
      width: widthForStyling,
    });

    document.body.appendChild(tooltipEl);

    const tooltipWidth = tooltipEl.offsetWidth;
    const targetCenterX = rect.left + rect.width / 2 + window.scrollX;

    let finalLeft = targetCenterX - tooltipWidth / 2;

    if (finalLeft < 10) {
      finalLeft = 10;
    } else if (finalLeft + tooltipWidth > window.innerWidth - 10) {
      finalLeft = window.innerWidth - 10 - tooltipWidth;
    }

    tooltipEl.style.left = finalLeft + "px";
    tooltipEl.style.transform = "translateY(-100%)";

    this.activeTooltips.add(tooltipEl);

    if (!("ontouchstart" in window)) {
      u.addEventListener(
        "mouseleave",
        () => {
          if (tooltipEl.parentNode) {
            tooltipEl.parentNode.removeChild(tooltipEl);
            this.activeTooltips.delete(tooltipEl);
          }
        },
        { once: true },
      );
    }

    const repositionTooltip = () => {
      const newRect = u.getBoundingClientRect();
      tooltipEl.style.top = newRect.top + window.scrollY - 10 + "px";

      const newTargetCenterX =
        newRect.left + newRect.width / 2 + window.scrollX;
      let newFinalLeft = newTargetCenterX - tooltipWidth / 2;

      if (newFinalLeft < 10) {
        newFinalLeft = 10;
      } else if (newFinalLeft + tooltipWidth > window.innerWidth - 10) {
        newFinalLeft = window.innerWidth - 10 - tooltipWidth;
      }

      tooltipEl.style.left = newFinalLeft + "px";
    };

    window.addEventListener("resize", repositionTooltip);

    const cleanup = () => {
      window.removeEventListener("resize", repositionTooltip);
      this.activeTooltips.delete(tooltipEl);
    };

    tooltipEl.addEventListener("DOMNodeRemoved", cleanup, { once: true });
  }

  cleanup() {
    this.clearAllTooltips();
    window.removeEventListener("scroll", this.boundHandleScroll);

    document.querySelectorAll("u[data-hint]").forEach((u) => {
      u.removeEventListener("mouseenter", this.boundHandleHintMouseEnter);
      u.removeEventListener("touchstart", this.boundHandleTouchStart);
      u.removeEventListener("click", this.boundHandleClick);
    });
  }
}

export default HintInjector;
