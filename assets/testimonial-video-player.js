if (!customElements.get("testimonial-video-player")) {
  class TestimonialVideoPlayer extends HTMLElement {
    // Static property to track the currently playing video instance
    static currentlyPlaying = null;

    constructor() {
      super();
      this.playVideo = this.playVideo.bind(this);
      this.handleVideoEnd = this.handleVideoEnd.bind(this);
      this.isPlayingWithSound = false;
    }

    connectedCallback() {
      this.trigger = this.querySelector("[data-video-trigger]");
      this.inlineVideo = this.querySelector("[data-inline-video] video");
      this.overlay = this.querySelector(".testimonial-video-player__overlay");

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
      
      // Hide the overlay
      if (this.overlay) {
        this.overlay.style.display = "none";
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

      // Show the overlay again
      if (this.overlay) {
        this.overlay.style.display = "";
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
  }

  customElements.define("testimonial-video-player", TestimonialVideoPlayer);
}


