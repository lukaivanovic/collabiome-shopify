if (!customElements.get("testimonial-video-player")) {
  class TestimonialVideoPlayer extends HTMLElement {
    // Static property to track the currently playing video instance
    static currentlyPlaying = null;

    constructor() {
      super();
      this.playVideo = this.playVideo.bind(this);
      this.handleVideoEnd = this.handleVideoEnd.bind(this);
    }

    connectedCallback() {
      this.trigger = this.querySelector("[data-video-trigger]");
      this.inlineVideo = this.querySelector("[data-inline-video] video");

      if (!this.trigger || !this.inlineVideo) return;

      this.trigger.addEventListener("click", this.playVideo);
      this.inlineVideo.addEventListener("ended", this.handleVideoEnd);
    }

    disconnectedCallback() {
      this.trigger?.removeEventListener("click", this.playVideo);
      this.inlineVideo?.removeEventListener("ended", this.handleVideoEnd);
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

    handleVideoEnd() {
      this.resetVideo();
    }

    resetVideo() {
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

      // Resume autoplay
      const playPromise = this.inlineVideo.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    }
  }

  customElements.define("testimonial-video-player", TestimonialVideoPlayer);
}
