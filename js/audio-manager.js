// js/audio-manager.js

import Utils from "./utils.js";

class AudioManager {
  constructor() {
    this.activeAudio = null;
    this.currentTrack = null;
    this.isDropdownOpen = false;
    this.audioPlayers = new Map();
    this.currentVolume = 0.7;
    this.isMuted = false;
    this.init();
  }

  init() {
    this.setupDOM();
    this.setupEventListeners();
    this.setupKeyboardControls();
    console.log("✅ AudioManager initialized");
  }

  setupDOM() {
    this.audioToggle = document.getElementById("audio-toggle");
    this.audioIcon = document.getElementById("audio-icon");
    this.audioDropdown = document.getElementById("audio-dropdown");
    this.audioPlayBtn = this.audioDropdown?.querySelector(".audio-play-btn");
    this.playIcon = this.audioDropdown?.querySelector(".play-icon");
    this.pauseIcon = this.audioDropdown?.querySelector(".pause-icon");
    this.audioMuteBtn = this.audioDropdown?.querySelector(".audio-mute-btn");
    this.volumeIcon = this.audioDropdown?.querySelector(".volume-icon");
    this.mutedIcon = this.audioDropdown?.querySelector(".muted-icon");
    this.audioProgressContainer = this.audioDropdown?.querySelector(
      ".audio-progress-container",
    );
    this.audioProgressBar = this.audioDropdown?.querySelector(
      ".audio-progress-bar",
    );
    this.audioTimeDisplay = this.audioDropdown?.querySelector(
      ".audio-time-display",
    );
    this.audioVolumeContainer = this.audioDropdown?.querySelector(
      ".audio-volume-container",
    );
    this.audioVolumeSlider = this.audioDropdown?.querySelector(
      ".audio-volume-slider",
    );
    this.audioArtist = this.audioDropdown?.querySelector(".audio-artist");
    this.audioTitle = this.audioDropdown?.querySelector(".audio-title");
    this.noAudioMessage =
      this.audioDropdown?.querySelector(".no-audio-message");
    this.audioPlayerMain =
      this.audioDropdown?.querySelector(".audio-player-main");

    this.audioPrevBtn = this.audioDropdown?.querySelector(".audio-prev-btn");
    this.audioNextBtn = this.audioDropdown?.querySelector(".audio-next-btn");
  }

  setupEventListeners() {
    if (this.audioToggle) {
      this.audioToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    const closeBtn = document.getElementById("close-audio-dropdown");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeDropdown();
      });
    }

    document.addEventListener("click", (e) => {
      if (
        this.isDropdownOpen &&
        !this.audioDropdown.contains(e.target) &&
        !this.audioToggle.contains(e.target)
      ) {
        this.closeDropdown();
      }
    });

    if (this.audioPlayBtn) {
      this.audioPlayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePlayback();
      });
    }

    if (this.audioProgressContainer) {
      this.audioProgressContainer.addEventListener("click", (e) => {
        e.stopPropagation();
        this.seekAudio(e);
      });
    }

    if (this.audioMuteBtn) {
      this.audioMuteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMute();
      });
    }

    if (this.audioVolumeContainer) {
      this.audioVolumeContainer.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setVolume(e);
      });
    }

    if (this.audioPrevBtn) {
      this.audioPrevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playPreviousTrack();
      });
    }

    if (this.audioNextBtn) {
      this.audioNextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playNextTrack();
      });
    }
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (
        e.code === "Space" &&
        !e.target.matches("input, textarea, [contenteditable]")
      ) {
        e.preventDefault();
        this.togglePlayback();
      }

      if (e.ctrlKey && e.code === "ArrowRight") {
        e.preventDefault();
        this.playNextTrack();
      }

      if (e.ctrlKey && e.code === "ArrowLeft") {
        e.preventDefault();
        this.playPreviousTrack();
      }

      if (
        e.code === "KeyM" &&
        !e.target.matches("input, textarea, [contenteditable]")
      ) {
        e.preventDefault();
        this.toggleMute();
      }
    });
  }

  applyVolumeToAudio(audioElement) {
    if (audioElement) {
      audioElement.volume = this.currentVolume;
      audioElement.muted = this.isMuted;
      if (this.audioVolumeSlider) {
        this.audioVolumeSlider.style.width = `${this.currentVolume * 100}%`;
      }
      if (this.volumeIcon && this.mutedIcon) {
        this.volumeIcon.style.display = this.isMuted ? "none" : "block";
        this.mutedIcon.style.display = this.isMuted ? "block" : "none";
      }
    }
  }

  registerAudioPlayer(audioElement, trackInfo) {
    const playerId = trackInfo.path || `audio-${Date.now()}`;
    this.audioPlayers.set(playerId, {
      audio: audioElement,
      track: trackInfo,
      id: playerId,
      isPlaying: false,
    });
    this.applyVolumeToAudio(audioElement);

    if (!this.activeAudio || !audioElement.paused) {
      console.log(
        `🎵 Setting active player on registration: ${playerId} (Playing: ${!audioElement.paused})`,
      );
      this.setActivePlayer(playerId);
    }

    this.setupAudioListeners(audioElement, playerId);

    console.log(
      `🎵 Audio player registered: ${trackInfo.title} (ID: ${playerId})`,
    );

    if (trackInfo.isLauncher && trackInfo.element) {
      this.updateLauncherUI(trackInfo.element, !audioElement.paused);
    }
  }

  setActivePlayer(playerId) {
    const playerData = this.audioPlayers.get(playerId);
    if (!playerData) return;

    if (this.activeAudio && this.activeAudio !== playerData.audio) {
      this.stopActiveAudio();
    }

    this.activeAudio = playerData.audio;
    this.currentTrack = playerData.track;
    playerData.isPlaying = !playerData.audio.paused;

    this.showAudioIcon();
    this.updateDropdown();
    this.syncAllPlayersUI();

    console.log(`🎵 Active player set: ${playerId}`);
  }

  setupAudioListeners(audioElement, playerId) {
    const playerData = this.audioPlayers.get(playerId);
    if (!playerData) return;

    audioElement.addEventListener("play", () => {
      playerData.isPlaying = true;
      this.setActivePlayer(playerId);
      this.updatePlayButton(true);
      this.syncAllPlayersUI();
    });

    audioElement.addEventListener("pause", () => {
      playerData.isPlaying = false;
      this.updatePlayButton(false);
      this.syncAllPlayersUI();
    });

    audioElement.addEventListener("ended", () => {
      playerData.isPlaying = false;
      this.updatePlayButton(false);
      this.syncAllPlayersUI();
    });

    audioElement.addEventListener("timeupdate", () => {
      if (this.activeAudio === audioElement) {
        this.updateProgress();
        this.updateActivePlayerProgress();
      }
    });
  }

  syncAllPlayersUI() {
    const isPlaying = this.activeAudio ? !this.activeAudio.paused : false;
    const activePath = this.currentTrack?.path;

    const launchers = document.querySelectorAll(".audio-launcher");
    launchers.forEach((launcher) => {
      const audioPath = launcher.getAttribute("data-audio-path");
      const isActive = audioPath === activePath;

      this.updateLauncherUI(launcher, isActive && isPlaying);
    });

    const fullPlayers = document.querySelectorAll(
      ".custom-audio-player:not(.audio-launcher)",
    );
    fullPlayers.forEach((player) => {
      const audioPath = player.getAttribute("data-audio-path");
      const isActive = audioPath === activePath;

      if (isActive) {
        this.updateFullPlayerUI(player, isPlaying);
      }
    });
  }

  updateLauncherUI(launcherElement, isPlaying) {
    const playIcon = launcherElement?.querySelector(".play-icon");
    const pauseIcon = launcherElement?.querySelector(".pause-icon");

    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? "none" : "block";
      pauseIcon.style.display = isPlaying ? "block" : "none";
    }
  }

  updateFullPlayerUI(playerElement, isPlaying) {
    const playIcon = playerElement?.querySelector(".play-icon");
    const pauseIcon = playerElement?.querySelector(".pause-icon");

    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? "none" : "block";
      pauseIcon.style.display = isPlaying ? "block" : "none";
    }
  }

  updateActivePlayerProgress() {
    if (!this.activeAudio || !this.currentTrack?.element) return;

    const playerElement = this.currentTrack.element;
    const progressBar = playerElement.querySelector(".progress-bar");
    const timeDisplay = playerElement.querySelector(".time-display");

    if (!progressBar || !timeDisplay) return;

    const audio = this.activeAudio;
    const currentTime = audio.currentTime || 0;
    const duration = audio.duration || 0;

    if (duration > 0) {
      const progress = (currentTime / duration) * 100;
      progressBar.style.width = `${progress}%`;
    }

    timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
  }

  playActiveAudio() {
    if (!this.activeAudio) return;

    this.stopAllOtherPlayers();

    this.activeAudio.play().catch((err) => {
      console.error("Play error:", err);
    });
  }

  pauseActiveAudio() {
    if (this.activeAudio) {
      this.activeAudio.pause();
    }
  }

  togglePlayback() {
    if (!this.activeAudio) return;

    if (this.activeAudio.paused) {
      this.playActiveAudio();
    } else {
      this.pauseActiveAudio();
    }
  }

  stopActiveAudio() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.updatePlayButton(false);
      this.syncAllPlayersUI();

      console.log("🎵 Active audio stopped");
    }
  }

  stopAllOtherPlayers() {
    for (const [id, playerData] of this.audioPlayers.entries()) {
      if (playerData.audio !== this.activeAudio && !playerData.audio.paused) {
        playerData.audio.pause();
        playerData.audio.currentTime = 0;
        playerData.isPlaying = false;
      }
    }

    if (window.mediaInjector) {
      window.mediaInjector.stopAllCurrentPlayersExcept(this.activeAudio);
    }

    this.syncAllPlayersUI();
  }

  playNextTrack() {
    const playerIds = Array.from(this.audioPlayers.keys());
    const currentIndex = playerIds.findIndex((id) => {
      const player = this.audioPlayers.get(id);
      return player.audio === this.activeAudio;
    });

    if (currentIndex !== -1 && currentIndex < playerIds.length - 1) {
      const nextPlayerId = playerIds[currentIndex + 1];
      this.setActivePlayer(nextPlayerId);
      this.applyVolumeToAudio(this.activeAudio);
      this.playActiveAudio();
    }
  }

  playPreviousTrack() {
    const playerIds = Array.from(this.audioPlayers.keys());
    const currentIndex = playerIds.findIndex((id) => {
      const player = this.audioPlayers.get(id);
      return player.audio === this.activeAudio;
    });

    if (currentIndex > 0) {
      const prevPlayerId = playerIds[currentIndex - 1];
      this.setActivePlayer(prevPlayerId);
      this.applyVolumeToAudio(this.activeAudio);
      this.playActiveAudio();
    }
  }

  toggleMute() {
    if (!this.activeAudio || !this.volumeIcon || !this.mutedIcon) return;

    this.activeAudio.muted = !this.activeAudio.muted;

    this.volumeIcon.style.display = this.activeAudio.muted ? "none" : "block";
    this.mutedIcon.style.display = this.activeAudio.muted ? "block" : "none";
  }

  setVolume(event) {
    if (!this.activeAudio || !this.audioVolumeContainer) return;

    const rect = this.audioVolumeContainer.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.currentVolume = Utils.clamp(percent, 0, 1);

    this.activeAudio.volume = this.currentVolume;
    this.activeAudio.muted = false;
    this.isMuted = false;

    if (this.audioVolumeSlider) {
      this.audioVolumeSlider.style.width = `${this.currentVolume * 100}%`;
    }

    if (this.volumeIcon && this.mutedIcon) {
      this.volumeIcon.style.display = "block";
      this.mutedIcon.style.display = "none";
    }
  }

  seekAudio(event) {
    if (!this.activeAudio || !this.audioProgressContainer) return;

    const rect = this.audioProgressContainer.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.activeAudio.currentTime = percent * (this.activeAudio.duration || 0);
  }

  updateProgress() {
    if (!this.activeAudio || !this.audioProgressBar || !this.audioTimeDisplay)
      return;

    const audio = this.activeAudio;
    const currentTime = audio.currentTime || 0;
    const duration = audio.duration || 0;

    if (duration > 0) {
      const progress = (currentTime / duration) * 100;
      this.audioProgressBar.style.width = `${progress}%`;
    }

    this.audioTimeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
  }

  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    if (this.audioDropdown) {
      const toggleBtn = document.getElementById("audio-toggle");
      if (toggleBtn) {
        const rect = toggleBtn.getBoundingClientRect();
        const toolbar = document.querySelector(".toolbar");

        if (toolbar && window.innerWidth > 768) {
          if (getComputedStyle(toolbar).position === "static") {
            toolbar.style.position = "relative";
          }
          this.audioDropdown.style.top = `${rect.bottom - toolbar.getBoundingClientRect().top + 8}px`;
          this.audioDropdown.style.left = `${rect.left - toolbar.getBoundingClientRect().left + rect.width / 2}px`;
          this.audioDropdown.style.transform = "translateX(-50%) translateY(0)";
        }
      }

      this.audioDropdown.classList.add("open");
      this.isDropdownOpen = true;

      this.updateDropdown();
    }
  }

  closeDropdown() {
    if (this.audioDropdown) {
      this.audioDropdown.classList.remove("open");
      this.isDropdownOpen = false;
    }
  }

  updateDropdown() {
    if (!this.currentTrack || !this.activeAudio) {
      this.showNoAudioMessage();
      return;
    }

    this.showAudioPlayer();
    if (this.audioArtist && this.audioTitle) {
      const [artist, title] = this.splitTrackInfo(this.currentTrack.title);
      this.audioArtist.textContent = artist;
      this.audioTitle.textContent = title;
    }

    this.updatePlayButton(!this.activeAudio.paused);
    this.updateProgress();
  }

  splitTrackInfo(trackString) {
    const parts = trackString.split(" — ");
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(" — ")];
    }
    return ["", trackString];
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  updatePlayButton(isPlaying) {
    if (!this.playIcon || !this.pauseIcon) return;

    this.playIcon.style.display = isPlaying ? "none" : "block";
    this.pauseIcon.style.display = isPlaying ? "block" : "none";
  }

  showNoAudioMessage() {
    if (this.noAudioMessage) this.noAudioMessage.style.display = "block";
    if (this.audioPlayerMain) this.audioPlayerMain.style.display = "none";
  }

  showAudioPlayer() {
    if (this.noAudioMessage) this.noAudioMessage.style.display = "none";
    if (this.audioPlayerMain) this.audioPlayerMain.style.display = "block";
  }

  showAudioIcon() {
    if (this.audioToggle) {
      this.audioToggle.style.display = "flex";
    }
  }

  hideAudioIcon() {
    if (this.audioToggle) {
      this.audioToggle.style.display = "none";
    }
  }

  updateIconColor(color) {
    if (this.audioIcon) {
      this.audioIcon.style.fill = color;
    }
  }

  cleanup() {
    this.stopActiveAudio();
    this.hideAudioIcon();
    this.closeDropdown();

    this.activeAudio = null;
    this.currentTrack = null;

    console.log("🎵 AudioManager cleaned up");
  }
}

export default AudioManager;
