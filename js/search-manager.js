// js/search-manager.js

import Utils from "./utils.js";

class SearchManager {
  constructor() {
    this.searchInput = null;
    this.searchPrevBtn = null;
    this.searchNextBtn = null;
    this.searchStatus = null;

    this.currentSearch = "";
    this.searchResults = [];
    this.currentResultIndex = -1;

    this.init();
  }

  init() {
    this.searchInput = document.getElementById("search-input");
    this.searchPrevBtn = document.getElementById("search-prev");
    this.searchNextBtn = document.getElementById("search-next");
    this.searchStatus = document.getElementById("search-status");

    this.setupEventListeners();
    console.log("✅ SearchManager initialized");
  }

  setupEventListeners() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener(
      "input",
      Utils.debounce((e) => {
        this.performSearch(e.target.value);
      }, 300),
    );

    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          this.goToPrevResult();
        } else {
          this.goToNextResult();
        }
      }

      if (e.key === "Escape") {
        this.clearSearch();
        this.searchInput.blur();
      }
    });

    if (this.searchPrevBtn) {
      this.searchPrevBtn.addEventListener("click", () => this.goToPrevResult());
    }

    if (this.searchNextBtn) {
      this.searchNextBtn.addEventListener("click", () => this.goToNextResult());
    }

    if (window.readingApp && window.readingApp.chapterLoader) {
      const originalGoToChapter = window.readingApp.chapterLoader.goToChapter;
      window.readingApp.chapterLoader.goToChapter = async function (...args) {
        this.clearSearch();
        return originalGoToChapter.apply(this, args);
      }.bind(this);
    }
  }

  performSearch(query) {
    this.clearHighlights();

    if (!query || query.trim() === "") {
      this.searchResults = [];
      this.currentResultIndex = -1;
      this.updateStatus();
      this.updateButtons();
      return;
    }

    this.currentSearch = query.trim();
    const contentElement = document.getElementById("chapter-content");

    if (!contentElement) {
      console.warn("SearchManager: No chapter content found");
      return;
    }

    this.searchResults = [];
    const walker = document.createTreeWalker(
      contentElement,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    let node;
    const searchRegex = new RegExp(this.escapeRegex(query), "gi");

    while ((node = walker.nextNode())) {
      const text = node.textContent;
      let match;

      while ((match = searchRegex.exec(text)) !== null) {
        this.searchResults.push({
          node: node,
          offset: match.index,
          length: match[0].length,
        });
      }
    }

    this.highlightAllResults();

    if (this.searchResults.length > 0) {
      this.currentResultIndex = 0;
      this.highlightCurrentResult();
      this.scrollToCurrentResult();
    } else {
      this.currentResultIndex = -1;
    }

    this.updateStatus();
    this.updateButtons();
  }

  highlightAllResults() {
    this.searchResults.forEach((result, index) => {
      this.highlightResult(result, index === this.currentResultIndex);
    });
  }

  highlightResult(result, isCurrent = false) {
    try {
      if (!result.node || !result.node.parentNode) {
        return;
      }

      const nodeLength = result.node.textContent.length;
      if (result.offset >= nodeLength) {
        console.warn(
          `Invalid offset: ${result.offset} for node length: ${nodeLength}`,
        );
        return;
      }

      const maxLength = nodeLength - result.offset;
      const length = Math.min(result.length, maxLength);

      const span = document.createElement("span");
      span.className = isCurrent
        ? "search-current-highlight"
        : "search-highlight";
      span.dataset.searchIndex = this.searchResults.indexOf(result);

      const range = document.createRange();
      range.setStart(result.node, result.offset);
      range.setEnd(result.node, result.offset + length);

      range.surroundContents(span);
    } catch (error) {
      console.error("Error highlighting search result:", error);
    }
  }

  highlightCurrentResult() {
    document.querySelectorAll(".search-current-highlight").forEach((el) => {
      el.className = "search-highlight";
    });

    if (
      this.currentResultIndex >= 0 &&
      this.currentResultIndex < this.searchResults.length
    ) {
      const currentHighlight = document.querySelector(
        `[data-search-index="${this.currentResultIndex}"]`,
      );
      if (currentHighlight) {
        currentHighlight.className = "search-current-highlight";
      }
    }
  }

  goToNextResult() {
    if (this.searchResults.length === 0) {
      this.performSearch(this.searchInput.value);
      return;
    }

    if (this.searchResults.length > 0) {
      this.currentResultIndex =
        (this.currentResultIndex + 1) % this.searchResults.length;
      this.highlightCurrentResult();
      this.scrollToCurrentResult();
      this.updateStatus();
      this.updateButtons();
    }
  }

  goToPrevResult() {
    if (this.searchResults.length === 0) return;

    if (this.searchResults.length > 0) {
      this.currentResultIndex =
        this.currentResultIndex <= 0
          ? this.searchResults.length - 1
          : this.currentResultIndex - 1;
      this.highlightCurrentResult();
      this.scrollToCurrentResult();
      this.updateStatus();
      this.updateButtons();
    }
  }

  scrollToCurrentResult() {
    if (
      this.currentResultIndex < 0 ||
      this.currentResultIndex >= this.searchResults.length
    )
      return;

    const currentHighlight = document.querySelector(
      `[data-search-index="${this.currentResultIndex}"]`,
    );
    if (currentHighlight) {
      currentHighlight.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      currentHighlight.style.animation = "none";
      setTimeout(() => {
        currentHighlight.style.animation = "";
      }, 10);
    }
  }

  updateStatus() {
    if (!this.searchStatus) return;

    if (this.currentSearch === "") {
      this.searchStatus.textContent = "";
    } else if (this.searchResults.length === 0) {
      this.searchStatus.textContent = "Не найдено";
    } else {
      this.searchStatus.textContent = `${this.currentResultIndex + 1}/${this.searchResults.length}`;
    }
  }

  updateButtons() {
    if (this.searchPrevBtn && this.searchNextBtn) {
      this.searchPrevBtn.disabled = this.searchResults.length === 0;
      this.searchNextBtn.disabled = this.searchResults.length === 0;
    }
  }

  clearHighlights() {
    document
      .querySelectorAll(".search-highlight, .search-current-highlight")
      .forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        }
      });
  }

  clearSearch() {
    this.clearHighlights();
    if (this.searchInput) {
      this.searchInput.value = "";
    }
    this.currentSearch = "";
    this.searchResults = [];
    this.currentResultIndex = -1;
    this.updateStatus();
    this.updateButtons();
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  refreshSearch() {
    if (this.currentSearch) {
      this.performSearch(this.currentSearch);
    }
  }
}

export default SearchManager;