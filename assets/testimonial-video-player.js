if (!customElements.get("testimonial-video-player")) {
  class TestimonialVideoPlayer extends HTMLElement {
    // Static property to track the currently playing video instance
    static currentlyPlaying = null;

    constructor() {
      super();
      this.playVideo = this.playVideo.bind(this);
      this.handleVideoEnd = this.handleVideoEnd.bind(this);
      this.handleMouseEnter = this.handleMouseEnter.bind(this);
      this.handleMouseLeave = this.handleMouseLeave.bind(this);
      this.isPlayingWithSound = false;
    }

    connectedCallback() {
      this.trigger = this.querySelector("[data-video-trigger]");
      this.inlineVideo = this.querySelector("[data-inline-video] video");
      this.playOverlay = this.querySelector("[data-play-overlay]");
      this.pauseOverlay = this.querySelector("[data-pause-overlay]");
      this.pauseButton = this.querySelector("[data-pause-button]");
      this.videoContainer = this.querySelector("[data-inline-video]");

      if (!this.trigger || !this.inlineVideo) return;

      this.trigger.addEventListener("click", this.playVideo);
      this.inlineVideo.addEventListener("ended", this.handleVideoEnd);
      
      // Handle pause button click
      if (this.pauseButton) {
        this.pauseButton.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.resetVideo();
        });
      }

      // Show pause overlay on hover when playing with sound
      if (this.videoContainer) {
        this.videoContainer.addEventListener("mouseenter", this.handleMouseEnter);
        this.videoContainer.addEventListener("mouseleave", this.handleMouseLeave);
      }
    }

    disconnectedCallback() {
      this.trigger?.removeEventListener("click", this.playVideo);
      this.inlineVideo?.removeEventListener("ended", this.handleVideoEnd);
      if (this.pauseButton) {
        this.pauseButton.removeEventListener("click", this.resetVideo);
      }
      if (this.videoContainer) {
        this.videoContainer.removeEventListener("mouseenter", this.handleMouseEnter);
        this.videoContainer.removeEventListener("mouseleave", this.handleMouseLeave);
      }
    }

    playVideo(event) {
      if (!this.inlineVideo) return;

      // If video is already playing with sound, reset it to sound-less mode
      if (this.isPlayingWithSound) {
        event?.preventDefault();
        event?.stopPropagation();
        this.resetVideo();
        return;
      }

      // Pause any currently playing video
      if (TestimonialVideoPlayer.currentlyPlaying && 
          TestimonialVideoPlayer.currentlyPlaying !== this) {
        TestimonialVideoPlayer.currentlyPlaying.resetVideo();
      }

      // Prevent default button behavior
      event?.preventDefault();
      event?.stopPropagation();

      // Start playing with sound
      this.inlineVideo.muted = false;
      this.inlineVideo.loop = false;
      this.inlineVideo.controls = false;
      this.inlineVideo.currentTime = 0;
      
      // Hide play overlay, show pause overlay (hidden by default, shown on hover)
      if (this.playOverlay) {
        this.playOverlay.style.display = "none";
      }
      if (this.pauseOverlay) {
        this.pauseOverlay.style.display = "flex";
        this.pauseOverlay.style.opacity = "0";
      }

      // Disable pointer events on trigger so video controls work
      if (this.trigger) {
        this.trigger.style.pointerEvents = "none";
      }

      const playPromise = this.inlineVideo.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
      
      this.isPlayingWithSound = true;
      // Set this instance as the currently playing video
      TestimonialVideoPlayer.currentlyPlaying = this;
    }

    handleVideoEnd() {
      this.resetVideo();
    }

    resetVideo() {
      if (!this.inlineVideo) return;

      // Pause the video
      this.inlineVideo.pause();

      this.inlineVideo.muted = true;
      this.inlineVideo.loop = true;
      this.inlineVideo.controls = false;
      this.inlineVideo.currentTime = 0;

      // Show play overlay again, hide pause overlay
      if (this.playOverlay) {
        this.playOverlay.style.display = "";
      }
      if (this.pauseOverlay) {
        this.pauseOverlay.style.display = "none";
        this.pauseOverlay.style.opacity = "0";
      }

      // Re-enable pointer events on trigger
      if (this.trigger) {
        this.trigger.style.pointerEvents = "";
      }

      // Resume autoplay
      const playPromise = this.inlineVideo.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }

      this.isPlayingWithSound = false;
      
      // Clear the currently playing reference if this was the active video
      if (TestimonialVideoPlayer.currentlyPlaying === this) {
        TestimonialVideoPlayer.currentlyPlaying = null;
      }
    }

    handleMouseEnter() {
      // Show pause overlay on hover when playing with sound
      if (this.isPlayingWithSound && this.pauseOverlay) {
        this.pauseOverlay.style.opacity = "1";
      }
    }

    handleMouseLeave() {
      // Hide pause overlay when not hovering
      if (this.isPlayingWithSound && this.pauseOverlay) {
        this.pauseOverlay.style.opacity = "0";
      }
    }
  }

  customElements.define("testimonial-video-player", TestimonialVideoPlayer);
}


