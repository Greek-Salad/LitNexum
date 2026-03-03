// js/library.js
import ThemeManager from "./theme-manager.js";
import Utils from "./utils.js";

class LibraryApp {
  constructor() {
    this.themeManager = null;
    this.books = [];
    this.booksGrid = document.getElementById("books-grid");
    this.loadingOverlay = document.getElementById("loading-overlay");
  }

  async init() {
    console.log("📚 Initializing Library...");

    this.themeManager = new ThemeManager();

    try {
      await this.scanBooks();
      this.render();
    } catch (error) {
      console.error("Failed to load library:", error);
      this.showError();
    } finally {
      this.hideLoadingOverlay();
    }
  }

  async scanBooks() {
    console.log("🔍 Starting scanBooks...");

    try {
      const indexResponse = await fetch("./books/index.json");
      if (!indexResponse.ok) {
        throw new Error("Failed to load books index");
      }

      const indexData = await indexResponse.json();
      const candidateBooks = indexData.books || [];

      console.log(`📋 Found book list from index:`, candidateBooks);

      const books = [];

      for (const bookId of candidateBooks) {
        try {
          const infoPath = `./books/${bookId}/info.json`;
          console.log(`🔍 Checking: ${infoPath}`);

          const response = await fetch(infoPath);

          if (response.ok) {
            const info = await response.json();
            console.log(`✅ Found book: ${info.title} (id: ${bookId})`);

            books.push({
              id: bookId,
              ...info,
              coverUrl: `./books/${bookId}/${info.cover || ""}`,
              ageRating: info.ageRating || 0,
              tags: info.tags || [],
            });
          }
        } catch (error) {
          console.warn(`⚠️ Error loading book ${bookId}:`, error);
        }
      }

      this.books = books;
      console.log(
        "📚 Final books list:",
        this.books.map((b) => ({ id: b.id, title: b.title })),
      );
    } catch (error) {
      console.error("❌ Failed to load books index:", error);
      this.books = [];
    }
  }

  render() {
    console.log("📋 Rendering library, books:", this.books);

    if (!this.booksGrid) {
      console.error("❌ booksGrid element not found!");
      return;
    }

    if (this.books.length === 0) {
      this.booksGrid.innerHTML =
        '<div class="no-books">📚 В библиотеке пока нет книг</div>';
      return;
    }

    let html = "";
    this.books.forEach((book) => {
      console.log("📚 Processing book:", book);
      html += this.createBookCard(book);
    });

    this.booksGrid.innerHTML = html;

    const cards = this.booksGrid.querySelectorAll(".book-card");
    console.log(`🔍 Found ${cards.length} cards in DOM`);

    cards.forEach((card, index) => {
      console.log(`Card ${index}:`, {
        element: card,
        bookId: card.dataset.bookId,
        dataset: card.dataset,
      });

      card.addEventListener("click", function (event) {
        const clickedCard = event.currentTarget;
        const bookId = clickedCard.dataset.bookId;

        console.log("🔍 CLICK DETECTED! bookId:", bookId);

        if (!bookId) {
          console.error("❌ No bookId found!");
          return;
        }
        const url = `./book?book=${encodeURIComponent(bookId)}&chapter=1`;
        console.log("🔗 Redirecting to:", url);

        window.location.href = url;
      });
    });
  }

  getTagIcon() {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L3 13V3H13L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41V13.41Z" 
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M8 8H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  createBookCard(book) {
    console.log("📚 Creating card for:", book.id, book.title);

    const coverHtml = book.cover
      ? `<img src="${book.coverUrl}" alt="${book.title}" class="book-cover" 
              onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22300%22%20viewBox%3D%220%200%20200%20300%22%3E%3Crect%20width%3D%22200%22%20height%3D%22300%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2224%22%20fill%3D%22%23666666%22%3E${book.title.charAt(0)}%3C%2Ftext%3E%3C%2Fsvg%3E';">`
      : `<div class="book-cover-placeholder">${book.title.charAt(0)}</div>`;

    const ageBadge =
      book.ageRating >= 18
        ? '<span class="age-badge age-18">18+</span>'
        : book.ageRating > 0
          ? `<span class="age-badge age-${book.ageRating}">${book.ageRating}+</span>`
          : "";

    const tagsHtml =
      book.tags && book.tags.length > 0
        ? `<div class="book-tags">${book.tags
            .map(
              (tag) =>
                `<span class="book-tag">${this.getTagIcon()} ${Utils.escapeHtml(tag)}</span>`,
            )
            .join("")}</div>`
        : "";

    return `
        <div class="book-card" data-book-id="${book.id}" data-age-rating="${book.ageRating || 0}">
            <div class="book-cover-wrapper">
                ${coverHtml}
            </div>
            <div class="book-info">
                ${ageBadge}
                <h2 class="book-title">${Utils.escapeHtml(book.title)}</h2>
                <p class="book-author">${Utils.escapeHtml(book.author || "Автор неизвестен")}</p>
                <p class="book-description">${Utils.escapeHtml(book.description || "")}</p>
                
                ${tagsHtml}  <!-- Теги вставляем здесь -->
                
                <div class="book-meta">
                    <span>📖 ${book.totalChapters || "?"} ${this.pluralizeChapters(book.totalChapters)}</span>
                    ${book.hasMedia ? "<span>🎵 аудио</span>" : ""}
                    ${book.hasHints ? "<span>💡 подсказки</span>" : ""}
                </div>
            </div>
        </div>
    `;
  }

  pluralizeChapters(count) {
    count = parseInt(count) || 0;

    if (count % 10 === 1 && count % 100 !== 11) {
      return "глава";
    } else if (
      [2, 3, 4].includes(count % 10) &&
      ![12, 13, 14].includes(count % 100)
    ) {
      return "главы";
    } else {
      return "глав";
    }
  }

  showError() {
    if (this.booksGrid) {
      this.booksGrid.innerHTML =
        '<div class="error">❌ Ошибка загрузки библиотеки</div>';
    }
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.opacity = "0";
      this.loadingOverlay.style.visibility = "hidden";
      setTimeout(() => this.loadingOverlay?.remove(), 300);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new LibraryApp();
  app.init();
});
