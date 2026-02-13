if (!customElements.get("testimonial-video-player")) {
  class TestimonialVideoPlayer extends HTMLElement {
    // Static property to track the currently playing video instance
    static currentlyPlaying = null;

    constructor() {
      super();
      this.playVideo = this.playVideo.bind(this);
      this.handleVideoEnd = this.handleVideoEnd.bind(this);
      this.handleIntersect = this.handleIntersect.bind(this);
    }

    connectedCallback() {
      this.trigger = this.querySelector("[data-video-trigger]");
      this.inlineVideo = this.querySelector("[data-inline-video] video");
      this.autoplayWhenVisible = this.hasAttribute("data-autoplay-when-visible");
      this.isInViewport = !this.autoplayWhenVisible;

      if (!this.trigger || !this.inlineVideo) return;

      this.trigger.addEventListener("click", this.playVideo);
      this.inlineVideo.addEventListener("ended", this.handleVideoEnd);

      if (this.autoplayWhenVisible) {
        if ("IntersectionObserver" in window) {
          this.intersectionObserver = new IntersectionObserver(this.handleIntersect, {
            threshold: 0.4,
          });
          this.intersectionObserver.observe(this);
        } else {
          this.isInViewport = true;
          this.resumeAutoplayIfAllowed();
        }
      }
    }

    disconnectedCallback() {
      this.trigger?.removeEventListener("click", this.playVideo);
      this.inlineVideo?.removeEventListener("ended", this.handleVideoEnd);
      this.intersectionObserver?.disconnect();

      if (TestimonialVideoPlayer.currentlyPlaying === this) {
        TestimonialVideoPlayer.currentlyPlaying = null;
      }
    }

    playVideo(event) {
      if (!this.inlineVideo) return;

      // If video is already active, reset it
      if (this.hasAttribute("data-active")) {
        event?.preventDefault();
        event?.stopPropagation();
        this.resetVideo();
        return;
      }

      // Pause any currently playing video
      if (
        TestimonialVideoPlayer.currentlyPlaying &&
        TestimonialVideoPlayer.currentlyPlaying !== this
      ) {
        TestimonialVideoPlayer.currentlyPlaying.resetVideo();
      }

      // Prevent default button behavior
      event?.preventDefault();
      event?.stopPropagation();

      // Start playing with sound
      this.inlineVideo.muted = false;
      this.inlineVideo.loop = false;
      this.inlineVideo.currentTime = 0;

      // Set active state
      this.setAttribute("data-active", "");
      TestimonialVideoPlayer.currentlyPlaying = this;

      const playPromise = this.inlineVideo.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    }

    handleIntersect(entries) {
      const [entry] = entries;
      if (!entry) return;

      this.isInViewport = entry.isIntersecting && entry.intersectionRatio >= 0.4;

      if (this.hasAttribute("data-active")) {
        if (!this.isInViewport) {
          this.resetVideo({ resumeAutoplay: false });
        }
        return;
      }

      if (this.isInViewport) {
        this.resumeAutoplayIfAllowed();
      } else {
        this.pauseAutoplay();
      }
    }

    handleVideoEnd() {
      this.resetVideo();
    }

    resetVideo({ resumeAutoplay } = {}) {
      if (!this.inlineVideo) return;

      // Pause the video
      this.inlineVideo.pause();

      // Reset video properties
      this.inlineVideo.muted = true;
      this.inlineVideo.loop = true;
      this.inlineVideo.currentTime = 0;

      // Remove active state
      this.removeAttribute("data-active");

      // Clear the currently playing reference if this was the active video
      if (TestimonialVideoPlayer.currentlyPlaying === this) {
        TestimonialVideoPlayer.currentlyPlaying = null;
      }

      const shouldResumeAutoplay =
        typeof resumeAutoplay === "boolean" ? resumeAutoplay : this.shouldAutoplay();

      if (shouldResumeAutoplay) {
        this.resumeAutoplayIfAllowed();
      }
    }

    shouldAutoplay() {
      if (!this.autoplayWhenVisible) return true;
      return this.isInViewport;
    }

    pauseAutoplay() {
      if (!this.inlineVideo) return;

      this.inlineVideo.pause();
      this.inlineVideo.currentTime = 0;
      this.inlineVideo.muted = true;
      this.inlineVideo.loop = true;
    }

    resumeAutoplayIfAllowed() {
      if (!this.inlineVideo || this.hasAttribute("data-active")) return;
      if (!this.shouldAutoplay()) return;

      this.inlineVideo.muted = true;
      this.inlineVideo.loop = true;

      const playPromise = this.inlineVideo.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    }
  }

  customElements.define("testimonial-video-player", TestimonialVideoPlayer);
}
