// js/app.js

import Utils from "./utils.js";
import ThemeManager from "./theme-manager.js";
import SettingsManager from "./settings-manager.js";
import BookLoader from "./book-loader.js";
import SearchManager from "./search-manager.js";
import MediaInjector from "./media-injector.js";
import HintInjector from "./hint-injector.js";
import AudioManager from "./audio-manager.js";
import CustomColorPicker from "./color-picker.js";

class ReadingApp {
  constructor() {
    this.themeManager = null;
    this.settingsManager = null;
    this.bookLoader = null;
    this.searchManager = null;
    this.mediaInjector = null;
    this.isInitialized = false;
    this.initializationError = null;
    this.themeToggleHandler = null;
    this.hintInjector = null;
    this.audioManager = null;
    this.initializationPromise = null;
    this.requestedChapter = 1;
    this.initStarted = false;
    this.isChapterLoading = false;
  }

  showChapterLoadingOverlay() {
    const overlay = document.getElementById('chapter-loading-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      this.isChapterLoading = true;
    }
  }

  hideChapterLoadingOverlay() {
    const overlay = document.getElementById('chapter-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      this.isChapterLoading = false;
    }
  }

  async startBackgroundInitialization() {
    if (this.backgroundInitStarted) {
      return this.backgroundInitPromise;
    }
    this.backgroundInitStarted = true;

    console.log("🚀 Starting background initialization...");
    try {
      this.settingsManager = new SettingsManager();
      this.themeManager = new ThemeManager();

      this.audioManager = new AudioManager();
      window.audioManager = this.audioManager;

      this.mediaInjector = new MediaInjector(
        this.audioManager,
        this.audioManager,
      );
      await this.mediaInjector.init();

      window.mediaInjector = this.mediaInjector;

      this.hintInjector = new HintInjector();
      await this.hintInjector.init();

      window.hintInjector = this.hintInjector;

      this.chapterLoader = new ChapterLoader();
      this.searchManager = new SearchManager();
      await this.chapterLoader.init();

      console.log("✅ Background initialization complete.");
      return true;
    } catch (error) {
      console.error("❌ Error during background initialization:", error);
      this.initializationError = error;
      return false;
    }
  }

  async init() {
    if (this.initStarted) {
      console.log("⚠️ init already started, skipping");
      return;
    }
    this.initStarted = true;

    console.log("📍 Current URL:", window.location.href);
    console.log("📍 Pathname:", window.location.pathname);

    const urlParams = new URLSearchParams(window.location.search);
    this.bookId = urlParams.get("id");

    const chapterParam = urlParams.get("chapter");
    this.requestedChapter =
      chapterParam !== null ? parseInt(chapterParam) : null;

    console.log("🔍 URL params:", {
      book: this.bookId,
      chapter: chapterParam,
      parsed: this.requestedChapter,
    });

    if (!this.bookId) {
      const pathParts = window.location.pathname.split("/");
      if (pathParts.length >= 3 && pathParts[1] === "book") {
        this.bookId = pathParts[2];
      }
    }

    if (!this.bookId) {
      console.error("❌ No book specified in URL!");
      console.log("🔍 Debug info:", {
        search: window.location.search,
        pathname: window.location.pathname,
        hash: window.location.hash,
      });
      this.bookId = "mondschein";
    }

    console.log(
      `📚 Starting Reading App for book: ${this.bookId}, chapter from URL: ${this.requestedChapter}`,
    );

    try {
      const infoResponse = await fetch(`./books/${this.bookId}/info.json`);
      if (infoResponse.ok) {
        const bookInfo = await infoResponse.json();
        this.needAgeGate = bookInfo.showAgeGate ?? bookInfo.ageRating >= 18;
        this.ageRating = bookInfo.ageRating || 0;
      } else {
        this.needAgeGate = false;
        this.ageRating = 0;
      }
    } catch (error) {
      console.warn("Could not load book info for age check, skipping age gate");
      this.needAgeGate = false;
      this.ageRating = 0;
    }

    const ageConfirmed = Utils.loadFromStorage("ageGateConfirmed", false);
    const ageTimestamp = Utils.loadFromStorage("ageGateConfirmedTimestamp", 0);
    const now = Date.now();
    const sessionValid = now - ageTimestamp < 24 * 60 * 60 * 1000;

    if (this.needAgeGate && !(ageConfirmed && sessionValid)) {
      alert(
        "Для доступа к этой книге необходимо подтвердить возраст на главной странице",
      );
      window.location.href = "./index.html";
      return;
    }

    const startChapter =
      this.requestedChapter !== null ? this.requestedChapter : 1;
    this.continueInitialization(startChapter);
  }

  resolveStartChapter(requestedChapter) {
    console.log("🔍 resolveStartChapter called with:", requestedChapter);

    requestedChapter = parseInt(requestedChapter);
    console.log("🔍 after parseInt:", requestedChapter);

    if (requestedChapter === 0) {
      const hasPreface = this.bookLoader?.chapterFiles.some(
        (c) => c.number === 0,
      );
      console.log("🔍 hasPreface:", hasPreface);

      if (hasPreface) {
        console.log("📖 Opening preface chapter (0)");
        return 0;
      } else {
        console.log("ℹ️ Preface not available, opening chapter 1");
        return 1;
      }
    }

    const maxChapter = this.bookLoader?.totalChapters
      ? this.bookLoader.totalChapters - 1
      : 0;

    if (requestedChapter > maxChapter) {
      console.log(
        `ℹ️ Chapter ${requestedChapter} not available, opening last chapter (${maxChapter})`,
      );
      return maxChapter;
    }

    console.log(`📖 Opening chapter ${requestedChapter}`);
    return requestedChapter;
  }

  async continueInitialization(startChapter) {
    console.log("🔍 continueInitialization START");
    console.log("🔍 received startChapter =", startChapter);
    console.log("🔍 this.requestedChapter =", this.requestedChapter);
    if (this.isInitialized) return;

    try {
      this.themeManager = new ThemeManager();
      this.settingsManager = new SettingsManager();
      this.audioManager = new AudioManager();
      window.audioManager = this.audioManager;

      this.bookLoader = new BookLoader();
      const bookLoaded = await this.bookLoader.init(this.bookId);

      if (!bookLoaded) {
        throw new Error(`Failed to load book: ${this.bookId}`);
      }

      const chapterToOpen = this.resolveStartChapter(startChapter);

      this.mediaInjector = new MediaInjector(
        this.themeManager,
        this.audioManager,
      );
      this.hintInjector = new HintInjector();

      this.mediaInjector.setBookRules(this.bookLoader.mediaRules);
      this.hintInjector.setBookRules(this.bookLoader.hintRules);

      window.mediaInjector = this.mediaInjector;
      window.hintInjector = this.hintInjector;

      this.searchManager = new SearchManager();

      this.setupUI();
      this.setupScrollProgressIndicator();

      console.log(`📖 Loading initial chapter: ${chapterToOpen}`);
      this.showChapterLoadingOverlay();
      await this.goToChapter(chapterToOpen);

      this.isInitialized = true;
      console.log("✅ Reading App fully initialized!");

      this.hideGlobalLoadingOverlay();
      window.readingApp = this;
    } catch (error) {
      console.error("❌ Failed to initialize app:", error);
      this.showErrorState(error);
      this.hideGlobalLoadingOverlay();
      this.hideChapterLoadingOverlay();
    }
  }

  async goToChapter(chapterNumber) {
    if (!this.bookLoader) return;

    this.showChapterLoadingOverlay();

    chapterNumber = parseInt(chapterNumber);

    console.log(`📍 goToChapter called with: ${chapterNumber}`);

    const chapterExists = this.bookLoader.chapterFiles.some(
      (c) => c.number === chapterNumber,
    );

    if (!chapterExists) {
      console.warn(`⚠️ Chapter ${chapterNumber} does not exist`);
      if (chapterNumber === 0) {
        chapterNumber = 1;
      } else {
        const availableChapters = this.bookLoader.chapterFiles.map(
          (c) => c.number,
        );
        chapterNumber = Math.max(...availableChapters);
      }

      console.log(`🔄 Falling back to chapter ${chapterNumber}`);
    }

    const url = new URL(window.location);
    url.searchParams.set("id", this.bookId);
    url.searchParams.set("chapter", chapterNumber);
    window.history.replaceState({}, "", url);

    let html = await this.bookLoader.loadChapter(chapterNumber);

    if (chapterNumber > 0) {
      if (this.mediaInjector) {
        const mediaRules =
          this.bookLoader.getMediaRulesForChapter(chapterNumber);
        this.mediaInjector.setBookRules(mediaRules);
        html = await this.mediaInjector.injectMedia(html, chapterNumber);
      }

      if (this.hintInjector) {
        html = await this.hintInjector.injectHints(html, chapterNumber);
      }
    }

    const contentElement = document.getElementById("chapter-content");
    if (contentElement) {
      contentElement.innerHTML = html;

      if (this.mediaInjector && chapterNumber > 0) {
        this.mediaInjector.postProcessInsteadMedia(contentElement);
      }

      this.centerSpecialElements();

      this.bookLoader.currentChapter = chapterNumber;
      this.bookLoader.updateNavigationUI();

      document.querySelector(".reading-area")?.scrollTo(0, 0);

      this.setupParagraphHighlighting();

      if (this.mediaInjector && chapterNumber > 0) {
        this.mediaInjector.reinitializeAudioPlayersInContainer(contentElement);
      }

      setTimeout(() => {
        if (this.hintInjector && chapterNumber > 0) {
          this.hintInjector.setupHintTooltips();
        }
      }, 50);
    }
    this.hideChapterLoadingOverlay();
  }

  setupParagraphHighlighting() {
    const contentElement = document.getElementById("chapter-content");
    if (!contentElement) return;

    const paragraphs = contentElement.querySelectorAll("p");

    paragraphs.forEach((paragraph) => {
      if (!this.isParagraphHighlightable(paragraph)) {
        paragraph.classList.add("no-highlight");
        return;
      }

      paragraph.classList.add("highlightable");

      paragraph.addEventListener("click", () => {
        const currentlyHighlighted =
          contentElement.querySelector("p.highlighted");

        if (paragraph.classList.contains("highlighted")) {
          paragraph.classList.remove("highlighted");
        } else {
          if (currentlyHighlighted) {
            currentlyHighlighted.classList.remove("highlighted");
          }
          paragraph.classList.add("highlighted");
        }
      });
    });
  }

  isParagraphHighlightable(paragraph) {
    const text = paragraph.textContent.trim();

    if (
      !text ||
      text === "" ||
      text === "***" ||
      text === "---" ||
      text === "* * *" ||
      text === "- - -"
    ) {
      return false;
    }

    if (
      paragraph.querySelector("img, audio, video, iframe, .media-container")
    ) {
      return false;
    }

    return true;
  }

  centerSpecialElements() {
    const contentElement = document.getElementById("chapter-content");
    if (!contentElement) return;

    const paragraphs = contentElement.querySelectorAll("p");
    paragraphs.forEach((p) => {
      const text = p.textContent.trim();

      if (
        text === "***" ||
        text === "---" ||
        text === "* * *" ||
        text === "- - -"
      ) {
        p.style.textAlign = "center";
        p.style.fontWeight = "bold";
        p.style.opacity = "0.7";
        p.style.margin = "2rem 0";
        p.style.fontSize = "1.2em";
        p.classList.add("divider-paragraph");
      }

      const cleanText = text.replace(/\*/g, "").replace(/-/g, "").trim();
      if (cleanText === "" && (text.includes("*") || text.includes("-"))) {
        p.style.textAlign = "center";
        p.classList.add("divider-paragraph");
      }
    });

    const h2Elements = contentElement.querySelectorAll("h2");
    h2Elements.forEach((h2) => {
      h2.style.textAlign = "center";
      h2.classList.add("centered-heading");
    });
  }

  hideGlobalLoadingOverlay() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.style.transition =
        "opacity 0.3s ease, visibility 0.3s ease";
      loadingOverlay.style.opacity = "0";
      loadingOverlay.style.visibility = "hidden";

      setTimeout(() => {
        if (loadingOverlay.parentNode) {
          loadingOverlay.remove();
        }
      }, 300);
    }
  }

  hideLoadingOverlay() {
    this.hideGlobalLoadingOverlay();
  }

  setupUI() {
    this.setupMenu();
    this.setupLyricsPanel();
    this.setupHomeButton();
  }

  setupLyricsPanel() {
    const lyricsPanel = document.getElementById("lyrics-panel");
    const closeBtn = document.getElementById("close-lyrics-btn");
    const overlay = document.getElementById("overlay");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        lyricsPanel.classList.remove("open");
        if (overlay) overlay.classList.remove("visible");
      });
    }

    if (overlay) {
      overlay.addEventListener("click", () => {
        lyricsPanel.classList.remove("open");
        overlay.classList.remove("visible");
      });
    }
  }

  setupMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    const closeSidebar = document.getElementById("close-sidebar");
    const overlay = document.getElementById("overlay");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
      menuToggle.addEventListener("click", () => {
        sidebar.classList.add("open");
        if (overlay) overlay.classList.add("visible");
      });
    }

    if (closeSidebar && sidebar) {
      closeSidebar.addEventListener("click", () => {
        sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("visible");
      });
    }

    if (overlay) {
      overlay.addEventListener("click", () => {
        if (sidebar) sidebar.classList.remove("open");
        overlay.classList.remove("visible");

        const settingsPanel = document.getElementById("settings-panel");
        if (settingsPanel) settingsPanel.classList.remove("open");
      });
    }
  }

  setupHomeButton() {
    const homeButton = document.getElementById("home-button");
    if (homeButton) {
      homeButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isPlaying =
          window.audioManager?.activeAudio &&
          !window.audioManager.activeAudio.paused;

        if (isPlaying) {
          if (confirm("Музыка остановится. Вернуться в библиотеку?")) {
            window.location.href = "./index.html";
          }
        } else {
          window.location.href = "./index.html";
        }
      });
    }
  }

  setupScrollProgressIndicator() {
    const readingArea = document.querySelector(".reading-area");
    const progressBar = document.getElementById("reading-progress-bar");
    const progressValue = document.getElementById("reading-progress-value");

    if (!readingArea || !progressBar || !progressValue) {
      console.warn("Scroll progress elements not found");
      return;
    }

    const updateProgress = () => {
      const scrollTop = readingArea.scrollTop;
      const clientHeight = readingArea.clientHeight;
      const scrollHeight = readingArea.scrollHeight;
      const maxScrollTop = scrollHeight - clientHeight;

      let scrollPercentage = 0;
      if (maxScrollTop > 0) {
        scrollPercentage = (scrollTop / maxScrollTop) * 100;
        scrollPercentage = Math.min(100, Math.max(0, scrollPercentage));
      }

      progressBar.style.setProperty("--progress-width", `${scrollPercentage}%`);
      progressValue.textContent = `${Math.round(scrollPercentage)}%`;
    };

    const debouncedUpdate = Utils.debounce(updateProgress, 10);
    readingArea.addEventListener("scroll", debouncedUpdate);

    updateProgress();
  }

  setupErrorHandling() {
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
    });

    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
    });
  }

  showErrorState(error) {
    this.hideGlobalLoadingOverlay();
    this.hideChapterLoadingOverlay();
    const contentElement = document.getElementById("chapter-content");
    if (!contentElement) return;

    const errorHTML = `
      <div class="error-chapter">
        <h1 class="chapter-title">Ошибка запуска приложения</h1>
        <p class="chapter-meta">${error.message || "Неизвестная ошибка"}</p>
        
        <div class="error-content">
          <p>Приложение не смогло запуститься. Попробуйте:</p>
          <div class="error-actions">
            <button onclick="location.reload()" class="error-btn">
              Обновить страницу
            </button>
            <button onclick="localStorage.clear(); location.reload()" class="error-btn">
              Очистить данные и обновить
            </button>
          </div>
          <div class="error-details" style="margin-top: 1rem; font-size: 0.8rem; color: #666;">
            <details>
              <summary>Детали ошибки</summary>
              <pre style="text-align: left; margin-top: 0.5rem;">${error.stack || error.toString()}</pre>
            </details>
          </div>
        </div>
      </div>
    `;

    contentElement.innerHTML = errorHTML;
  }

  getThemeManager() {
    return this.themeManager;
  }

  getChapterLoader() {
    return this.chapterLoader;
  }

  getSettingsManager() {
    return this.settingsManager;
  }

  getSearchManager() {
    return this.searchManager;
  }

  getMediaInjector() {
    return this.mediaInjector;
  }

  getHintInjector() {
    return this.hintInjector;
  }

  cleanup() {
    if (this.mediaInjector) {
      this.mediaInjector.cleanup();
    }

    this.isInitialized = false;
    delete window.readingApp;
  }
}

function setupIOSAudioHandling() {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.addEventListener(
      "touchstart",
      () => {
        const audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();
        audioContext
          .resume()
          .then(() => {
            audioContext.close();
          })
          .catch((e) => console.log("AudioContext init:", e));
      },
      { once: true },
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM loaded, starting app background init...");
  setupIOSAudioHandling();

  if (!window.readingAppInstance) {
    window.readingAppInstance = new ReadingApp();

    const globalOverlay = document.getElementById('loading-overlay');
    if (globalOverlay) {
      globalOverlay.style.display = 'flex';
    }

    setTimeout(() => {
      window.readingAppInstance.init().catch((error) => {
        console.error("App initialization failed:", error);
        window.readingAppInstance.showErrorState(error);
        window.readingAppInstance.hideLoadingOverlay();
      });
    }, 100);
  }

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    window.debugApp = () => {
      console.log("📋 App state:", {
        themeManager: window.readingAppInstance?.themeManager,
        bookLoader: window.readingAppInstance?.bookLoader,
        settingsManager: window.readingAppInstance?.settingsManager,
        searchManager: window.readingAppInstance?.searchManager,
        mediaInjector: window.readingAppInstance?.mediaInjector,
        isInitialized: window.readingAppInstance?.isInitialized,
        error: window.readingAppInstance?.initializationError,
      });
    };

    console.log("\n📋 Debug commands available:");
    console.log("window.debugApp() - show app state");
    console.log("window.readingAppInstance - access app instance");
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && window.readingApp?.mediaInjector) {
    window.readingApp.mediaInjector.stopAllCurrentPlayers();
  }
});

window.addEventListener("beforeunload", () => {
  if (window.readingApp) {
    window.readingApp.mediaInjector?.stopAllCurrentPlayers();
  }
});