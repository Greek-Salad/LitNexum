// js/book-loader.js

import Utils from "./utils.js";

class BookLoader {
  constructor() {
    this.currentChapter = 1;
    this.bookId = null;
    this.bookInfo = null;
    this.chapterFiles = [];
    this.chapterTitles = {};
    this.mediaRules = [];
    this.hintRules = [];
  }

  async init(bookId) {
    this.bookId = bookId;

    try {
      await this.loadBookInfo();

      await this.scanChapters();

      await this.loadChapterTitles();

      await this.loadMediaRules();

      await this.loadHintRules();

      console.log(
        `✅ BookLoader initialized for "${this.bookInfo.title}", found ${this.totalChapters} chapters`,
      );

      this.createChapterNavigation();
      this.setupNavigation();

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize BookLoader:", error);
      return false;
    }
  }

  async loadBookInfo() {
    const infoPath = `./books/${this.bookId}/info.json`;
    const response = await fetch(infoPath);
    
    if (!response.ok) {
        throw new Error(`Book info not found for ${this.bookId}`);
    }
    
    this.bookInfo = await response.json();
    
    this.bookInfo.ageRating = this.bookInfo.ageRating || 0;
    this.bookInfo.showAgeGate = this.bookInfo.showAgeGate ?? (this.bookInfo.ageRating >= 18);
    
    document.title = `${this.bookInfo.title} — Читальный движок`;
    document.body.dataset.ageRating = this.bookInfo.ageRating;
    
    return this.bookInfo;
}

  async loadMediaRules() {
    const rulesPath = `./books/${this.bookId}/media-rules.json`;
    try {
      const response = await fetch(rulesPath);
      if (response.ok) {
        const data = await response.json();
        this.mediaRules = data.media || [];
        console.log(
          `📦 Loaded ${this.mediaRules.length} media rules for ${this.bookId}`,
        );
      } else {
        console.log(`ℹ️ No media-rules.json for ${this.bookId}`);
        this.mediaRules = [];
      }
    } catch (error) {
      console.log(`ℹ️ No media rules for ${this.bookId} (optional)`);
      this.mediaRules = [];
    }
  }

  async loadHintRules() {
    const rulesPath = `./books/${this.bookId}/hint-rules.json`;
    try {
      const response = await fetch(rulesPath);
      if (response.ok) {
        const data = await response.json();
        this.hintRules = data.hints || [];
        console.log(
          `📦 Loaded ${this.hintRules.length} hint rules for ${this.bookId}`,
        );
      }
    } catch (error) {
      console.log(`ℹ️ No hint rules for ${this.bookId} (optional)`);
      this.hintRules = [];
    }
  }

  async scanChapters() {
    this.chapterFiles = [];
    const maxChapters = this.bookInfo?.totalChapters || 200;

    for (let i = 1; i <= maxChapters; i++) {
      try {
        const padded = i.toString().padStart(2, "0");
        const url = `./books/${this.bookId}/chapters/${padded}.html`;

        console.log(`Scanning chapter ${i}: ${url}`);

        const response = await fetch(url, {
          method: "HEAD",
          cache: "no-cache",
        });

        if (response.ok) {
          this.chapterFiles.push({
            number: i,
            filename: `${padded}.html`,
            exists: true,
          });
          console.log(`✅ Chapter ${i} found`);
        } else {
          console.log(`⏹️ Chapter ${i} not found, stopping scan`);
          break;
        }
      } catch (error) {
        console.log(`⏹️ Error scanning chapter ${i}, stopping scan`);
        break;
      }
    }

    this.totalChapters = this.chapterFiles.length;
    console.log(`📚 Total chapters found: ${this.totalChapters}`);

    if (this.totalChapters === 0) {
      console.warn(`No chapters found for book ${this.bookId}`);
      this.totalChapters = 1;
    }

    return this.totalChapters;
  }

  async loadChapterTitles() {
    this.chapterTitles = {};

    for (const chapter of this.chapterFiles) {
      try {
        const response = await fetch(
          `./books/${this.bookId}/chapters/${chapter.filename}`,
          {
            cache: "no-cache",
          },
        );

        if (response.ok) {
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const h2 = doc.querySelector("h2");

          if (h2 && h2.textContent.trim()) {
            this.chapterTitles[chapter.number] = h2.textContent.trim();
          } else {
            this.chapterTitles[chapter.number] = `Глава ${chapter.number}`;
          }
        }
      } catch (error) {
        this.chapterTitles[chapter.number] = `Глава ${chapter.number}`;
      }
    }

    if (this.currentChapter === 1 && this.chapterTitles[1]) {
      document.title = `${this.chapterTitles[1]} — ${this.bookInfo?.title || "Читальный движок"}`;
    }
  }

  async loadChapter(chapterNumber) {
    chapterNumber = parseInt(chapterNumber);

    if (chapterNumber < 1 || chapterNumber > this.totalChapters) {
      chapterNumber = Utils.clamp(chapterNumber, 1, this.totalChapters);
    }

    console.log(`📖 Loading chapter ${chapterNumber} of ${this.bookId}`);

    try {
      const chapterInfo = this.chapterFiles.find(
        (c) => c.number === chapterNumber,
      );

      if (!chapterInfo) {
        throw new Error(`Chapter ${chapterNumber} not found`);
      }

      const url = `./books/${this.bookId}/chapters/${chapterInfo.filename}`;
      console.log(`Fetching: ${url}`);

      const response = await fetch(url, {
        cache: "no-cache",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let html = await response.text();

      html = html.replace(
        /(src|href)=["'](?!http|https|\/\/)([^"']*\.(mp3|png|jpg|jpeg|gif|webp))["']/gi,
        `$1="./books/${this.bookId}/media/$2"`,
      );

      return html;
    } catch (error) {
      console.error(`Error loading chapter ${chapterNumber}:`, error);
      return this.createErrorChapter(chapterNumber);
    }
  }

  getMediaRulesForChapter(chapterNumber) {
    return this.mediaRules.filter((rule) => rule.chapter === chapterNumber);
  }

  getHintRulesForChapter(chapterNumber) {
    return this.hintRules.filter((rule) => rule.chapter === chapterNumber);
  }

  createPlaceholderChapter() {
    const placeholder = `
            <div class="placeholder-chapter">
                <h1 class="chapter-title">${this.bookInfo?.title || "Книга"}</h1>
                <p class="chapter-meta">Главы ещё не добавлены</p>
                <div class="placeholder-content">
                    <p>Добавьте файлы глав в папку <code>books/${this.bookId}/chapters/</code></p>
                    <p>Файлы должны называться <code>01.html</code>, <code>02.html</code> и так далее.</p>
                </div>
            </div>
        `;

    localStorage.setItem(`chapter_${this.bookId}_1_cache`, placeholder);
    return placeholder;
  }

  createErrorChapter(chapterNumber) {
    return `
            <div class="error-chapter">
                <h1 class="chapter-title">Ошибка загрузки главы ${chapterNumber}</h1>
                <p class="chapter-meta">Файл books/${this.bookId}/chapters/${chapterNumber.toString().padStart(2, "0")}.html не найден</p>
                <div class="error-content">
                    <div class="error-actions">
                        <button onclick="window.readingApp?.goToChapter(1)" class="error-btn">
                            Перейти к главе 1
                        </button>
                        <button onclick="location.reload()" class="error-btn">
                            Обновить страницу
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  createChapterNavigation() {
    const navElement = document.getElementById("chapter-nav");
    if (!navElement) return;

    navElement.innerHTML = "";

    for (let i = 1; i <= this.totalChapters; i++) {
      const chapterInfo = this.chapterFiles.find((c) => c.number === i);
      if (!chapterInfo || !chapterInfo.exists) continue;

      const isActive = i === this.currentChapter;
      const chapterTitle = this.chapterTitles[i] || `Глава ${i}`;

      const item = document.createElement("a");
      item.className = `chapter-item ${isActive ? "active" : ""}`;
      item.href = "#";
      item.dataset.chapter = i;
      item.innerHTML = `<span class="chapter-item-title">${chapterTitle}</span>`;

      item.addEventListener("click", (e) => {
        e.preventDefault();
        window.readingApp?.goToChapter(i);

        if (window.innerWidth < 768) {
          document.getElementById("sidebar")?.classList.remove("open");
          document.getElementById("overlay")?.classList.remove("visible");
        }
      });

      navElement.appendChild(item);
    }
  }

  setupNavigation() {
    const prevBtn = document.getElementById("prev-chapter");
    const nextBtn = document.getElementById("next-chapter");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.goToPreviousChapter());
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.goToNextChapter());
    }
  }

  async goToPreviousChapter() {
    if (this.currentChapter > 1) {
      await window.readingApp?.goToChapter(this.currentChapter - 1);
    }
  }

  async goToNextChapter() {
    if (this.currentChapter < this.totalChapters) {
      await window.readingApp?.goToChapter(this.currentChapter + 1);
    }
  }

  updateNavigationUI() {
    const prevBtn = document.getElementById("prev-chapter");
    const nextBtn = document.getElementById("next-chapter");
    const breadcrumb = document.getElementById("current-chapter-title");

    const prevTitle =
      this.currentChapter > 1
        ? this.chapterTitles[this.currentChapter - 1] ||
          `Глава ${this.currentChapter - 1}`
        : null;

    const nextTitle =
      this.currentChapter < this.totalChapters
        ? this.chapterTitles[this.currentChapter + 1] ||
          `Глава ${this.currentChapter + 1}`
        : null;

    if (prevBtn) {
      prevBtn.disabled = this.currentChapter <= 1;

      if (this.currentChapter > 1) {
        prevBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
                </svg>
                ${prevTitle}
            `;
      } else {
        prevBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
                </svg>
                Начало
            `;
      }
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentChapter >= this.totalChapters;

      if (this.currentChapter < this.totalChapters) {
        nextBtn.innerHTML = `
                ${nextTitle}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
            `;
      } else {
        nextBtn.innerHTML = `
                Конец
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
            `;
      }
    }

    if (breadcrumb) {
      breadcrumb.textContent = `Глава ${this.currentChapter}`;
    }

    const navElement = document.getElementById("chapter-nav");
    if (navElement) {
      navElement.querySelectorAll(".chapter-item").forEach((item) => {
        item.classList.remove("active");
        if (parseInt(item.dataset.chapter) === this.currentChapter) {
          item.classList.add("active");
        }
      });
    }
  }

  getCurrentChapter() {
    return this.currentChapter;
  }

  getTotalChapters() {
    return this.totalChapters;
  }

  getBookInfo() {
    return this.bookInfo;
  }

  getBookId() {
    return this.bookId;
  }
}

export default BookLoader;
