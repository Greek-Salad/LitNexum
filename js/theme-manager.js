// js/theme-manager.js

import Utils from "./utils.js";
import { THEME_PRESETS } from "./constants.js";
import CustomColorPicker from "./color-picker.js";

class ThemeManager {
  constructor() {
    this.PRESETS = {
      light: { ...THEME_PRESETS.light },
      dark: { ...THEME_PRESETS.dark },
    };
    this.LINK_COLORS = {
      light: {
        base: "#1a5fb4",
        hover: "#0d47a1",
      },
      dark: {
        base: "#8ab4f8",
        hover: "#aecbfa",
      }
    };
    this.currentPreset = "light";
    this.customColors = { ...THEME_PRESETS.light };
    this.isApplying = false;
    this.metaThemeColor = null;
    this.init();
  }

  init() {
    this.metaThemeColor = document.getElementById("theme-color-meta");
    if (!this.metaThemeColor) {
      this.metaThemeColor = document.createElement("meta");
      this.metaThemeColor.name = "theme-color";
      this.metaThemeColor.id = "theme-color-meta";
      document.head.appendChild(this.metaThemeColor);
    }
    this.loadSavedState();
    this.applyTheme();
    this.setupEventListeners();
    this.updateThemeSwitcherLocation();
    console.log("✅ ThemeManager initialized");
  }

  loadSavedState() {
    const savedPreset = Utils.loadFromStorage("themePreset", "light");
    const savedColors = Utils.loadFromStorage(
      "themeColors",
      THEME_PRESETS.light,
    );

    this.currentPreset = savedPreset;
    this.customColors = savedColors;
    console.log("📝 Loaded theme:", {
      preset: this.currentPreset,
      colors: this.customColors,
    });
  }

  saveState() {
    Utils.saveToStorage("themePreset", this.currentPreset);
    Utils.saveToStorage("themeColors", this.customColors);
  }

  applyTheme() {
    if (this.isApplying) return;
    this.isApplying = true;

    try {
      document.body.setAttribute("data-theme", this.currentPreset);

      this.applyMainColors();

      this.updateIcons();
      this.updateColorPreviews();
      this.updatePresetButtons();
      this.updateMetaThemeColor();

      this.saveState();

      console.log(
        `🎨 Applied theme preset: ${this.currentPreset}, colors:`,
        this.customColors,
      );
    } catch (error) {
      console.error("Error applying theme:", error);
    } finally {
      this.isApplying = false;
    }
  }

  updateMetaThemeColor() {
    if (!this.metaThemeColor) {
      console.warn("Cannot update theme-color meta tag: element not found.");
      return;
    }

    const bgColor = this.customColors.bg;

    if (bgColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(bgColor)) {
      this.metaThemeColor.setAttribute("content", bgColor);
      console.log(`📱 Updated theme-color meta tag to: ${bgColor}`);
    } else {
      console.warn(`Invalid theme-color value: ${bgColor}`);
    }
  }

  isThemeLight() {
    const bgColor = this.customColors.bg;
    return !Utils.isDarkColor(bgColor);
  }

  applyMainColors() {
    const root = document.documentElement;
    const { bg: bgColor, text: textColor } = this.customColors;

    root.style.setProperty("--bg-color", bgColor);
    root.style.setProperty("--text-color", textColor);

    const isBgDark = Utils.isDarkColor(bgColor);
    const isThemeLight = this.isThemeLight();
    
    console.log("🎨 Theme colors:", { bgColor, textColor, isBgDark, isThemeLight });

    const adjust = (color, amount) => this.adjustColor(color, amount);

    root.style.setProperty(
      "--sidebar-bg",
      adjust(bgColor, isBgDark ? 0.05 : -0.05),
    );
    root.style.setProperty(
      "--sidebar-text",
      adjust(textColor, isBgDark ? 0.2 : -0.2),
    );

    root.style.setProperty(
      "--settings-bg",
      adjust(bgColor, isBgDark ? 0.05 : -0.05),
    );
    root.style.setProperty("--settings-text", textColor);

    root.style.setProperty(
      "--toolbar-bg",
      adjust(bgColor, isBgDark ? 0.03 : -0.03),
    );

    const btnBg = adjust(bgColor, isBgDark ? 0.1 : -0.1);
    root.style.setProperty("--btn-bg", btnBg);
    root.style.setProperty("--btn-text", textColor);
    root.style.setProperty("--btn-hover", adjust(btnBg, 0.1));
    root.style.setProperty("--btn-active", adjust(btnBg, 0.15));
    // root.style.setProperty("--preset-btn-bg", btnBg);
    // root.style.setProperty("--preset-btn-text", textColor);
    // root.style.setProperty("--preset-btn-border", adjust(bgColor, isBgDark ? 0.15 : -0.15));
    // root.style.setProperty("--preset-btn-hover", adjust(btnBg, 0.1));

    root.style.setProperty(
      "--border-color",
      adjust(bgColor, isBgDark ? 0.15 : -0.15),
    );

    root.style.setProperty(
      "--toolbar-border",
      adjust(bgColor, isBgDark ? 0.1 : -0.1),
    );

    if (isThemeLight) {
      root.style.setProperty("--link-color", this.LINK_COLORS.light.base);
      root.style.setProperty("--link-hover", this.LINK_COLORS.light.hover);
    } else {
      root.style.setProperty("--link-color", this.LINK_COLORS.dark.base);
      root.style.setProperty("--link-hover", this.LINK_COLORS.dark.hover);
    }

    const highlightColor = isBgDark
      ? "rgba(138, 180, 248, 0.2)"
      : "rgba(26, 115, 232, 0.1)";
    root.style.setProperty("--highlight-bg", highlightColor);

    root.style.setProperty(
      "--progress-bg",
      adjust(bgColor, isBgDark ? 0.1 : -0.1),
    );

    root.style.setProperty("--progress-fill", 
      isThemeLight ? this.LINK_COLORS.light.base : this.LINK_COLORS.dark.base
    );

    root.style.setProperty("--player-bg", bgColor);
    root.style.setProperty(
      "--player-border",
      adjust(bgColor, isBgDark ? 0.15 : -0.15),
    );

    if (isBgDark) {
      root.style.setProperty("--hint-text-color", "#ffb74d");
    } else {
      root.style.setProperty("--hint-text-color", "#d35400");
    }
  }

  adjustColor(color, amount) {
    try {
      const hex = color.replace("#", "");
      if (hex.length === 3) {
        const hex6 = hex
          .split("")
          .map((c) => c + c)
          .join("");
        return this.adjustColor(`#${hex6}`, amount);
      }

      const num = parseInt(hex, 16);
      let r = (num >> 16) & 0xff;
      let g = (num >> 8) & 0xff;
      let b = num & 0xff;

      const adjustment = Math.round(amount * 255);
      r = Utils.clamp(r + adjustment, 0, 255);
      g = Utils.clamp(g + adjustment, 0, 255);
      b = Utils.clamp(b + adjustment, 0, 255);

      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    } catch (error) {
      console.error("Error adjusting color:", error, color, amount);
      return color;
    }
  }

  updateIcons() {
    const isBgDark = Utils.isDarkColor(this.customColors.bg);

    let themeIconClass = "";

    if (this.currentPreset === "custom") {
      themeIconClass = isBgDark ? "show-sun" : "show-moon";
    } else {
      themeIconClass = this.currentPreset === "dark" ? "show-sun" : "show-moon";
    }

    this.updateThemeIconByClass(themeIconClass);
  }

  updateThemeIconByClass(themeIconClass) {
    const themeIconSvg = document.getElementById("theme-icon");
    if (!themeIconSvg) return;

    themeIconSvg.classList.remove("show-sun", "show-moon");
    themeIconSvg.classList.add(themeIconClass);
  }

  updateColorPreviews() {
    const bgPicker = document.getElementById("bg-color-picker");
    const textPicker = document.getElementById("text-color-picker");

    if (bgPicker) {
      bgPicker.dataset.color = this.customColors.bg;
      const preview = bgPicker.querySelector(".color-preview");
      if (preview) {
        preview.style.backgroundColor = this.customColors.bg;
      }
    }

    if (textPicker) {
      textPicker.dataset.color = this.customColors.text;
      const preview = textPicker.querySelector(".color-preview");
      if (preview) {
        preview.style.backgroundColor = this.customColors.text;
      }
    }
  }

  updatePresetButtons() {
    const presetButtons = document.querySelectorAll(".theme-preset-btn");
    presetButtons.forEach((btn) => {
      const isActive = btn.dataset.theme === this.currentPreset;
      btn.classList.toggle("active", isActive);
    });
  }

  setupEventListeners() {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.togglePreset();
      });
    }

    const presetButtons = document.querySelectorAll(".theme-preset-btn");
    presetButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const preset = btn.dataset.theme;
        this.applyPreset(preset);
      });
    });

    const bgPicker = document.getElementById("bg-color-picker");
    const textPicker = document.getElementById("text-color-picker");

    if (bgPicker) {
      bgPicker.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openCustomColorPicker("bg");
      });
    }

    if (textPicker) {
      textPicker.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openCustomColorPicker("text");
      });
    }

    window.addEventListener("resize", () => {
      this.updateThemeSwitcherLocation();
    });
  }

  togglePreset() {
    if (this.currentPreset === "custom") {
      const isBgDark = Utils.isDarkColor(this.customColors.bg);
      const newPreset = isBgDark ? "light" : "dark";
      this.applyPreset(newPreset);
    } else {
      const newPreset = this.currentPreset === "light" ? "dark" : "light";
      this.applyPreset(newPreset);
    }
  }

  applyPreset(preset) {
    if (!this.PRESETS[preset]) {
      console.warn(`Unknown preset: ${preset}`);
      return;
    }

    console.log(`🎯 Applying preset: ${preset}`);
    this.currentPreset = preset;
    this.customColors = { ...this.PRESETS[preset] };
    this.applyTheme();
  }

  openCustomColorPicker(type) {
    const currentColor = this.customColors[type];
    const targetElement = document.getElementById(`${type}-color-picker`);

    const picker = new CustomColorPicker({
      target: targetElement,
      currentColor: currentColor,
      onSelect: (color) => {
        this.setCustomColor(type, color);
      },
      position: "center",
    });

    picker.open();
  }

  setCustomColor(type, color) {
    if (!color || this.customColors[type] === color) return;

    console.log(`🎨 Setting custom ${type} color: ${color}`);
    console.log(`🎨 Before change:`, { ...this.customColors });

    this.customColors[type] = color;
    console.log(`🎨 After change:`, { ...this.customColors });

    const matchesLight = this.colorsMatch(
      this.customColors,
      this.PRESETS.light,
    );
    const matchesDark = this.colorsMatch(this.customColors, this.PRESETS.dark);

    console.log(
      `🎨 Matches light:`,
      matchesLight,
      `Matches dark:`,
      matchesDark,
    );

    if (matchesLight) {
      this.currentPreset = "light";
      console.log("🎨 Colors match light preset exactly");
    } else if (matchesDark) {
      this.currentPreset = "dark";
      console.log("🎨 Colors match dark preset exactly");
    } else {
      this.currentPreset = "custom";
      console.log("🎨 Colors are custom");
    }

    this.applyTheme();
  }

  colorsMatch(colors1, colors2) {
    const normalize = (color) =>
      color.toLowerCase().replace(/#/g, "").padStart(6, "0");
    return (
      normalize(colors1.bg) === normalize(colors2.bg) &&
      normalize(colors1.text) === normalize(colors2.text)
    );
  }

  updateThemeSwitcherLocation() {
    const themeSwitcher = document.querySelector(".theme-switcher");
    const mobileThemeSwitcher = document.querySelector(
      ".mobile-theme-switcher",
    );
    const themeToggle = document.getElementById("theme-toggle");

    if (!themeSwitcher || !mobileThemeSwitcher || !themeToggle) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (themeToggle.parentNode !== mobileThemeSwitcher) {
        mobileThemeSwitcher.appendChild(themeToggle);
      }
    } else {
      if (themeToggle.parentNode !== themeSwitcher) {
        themeSwitcher.appendChild(themeToggle);
      }
    }
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  getCustomColors() {
    return { ...this.customColors };
  }
}

export default ThemeManager;