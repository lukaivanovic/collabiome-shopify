 (function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function pxPerSecondToDurationPx(speedPxPerSec, distancePx) {
    var s = Number(speedPxPerSec);
    if (!isFinite(s) || s <= 0) s = 60;
    var dist = Math.max(1, distancePx);
    return dist / s; // seconds
  }

  function setupTrack(track) {
    if (!track) return;

    var gapPx = Number(track.getAttribute("data-gap"));
    if (!isFinite(gapPx)) gapPx = 24;

    // Apply CSS var for gap
    track.style.setProperty("--rt-gap", gapPx + "px");

    // Find the initial segment
    var first = track.querySelector(".rotating-text__segment");
    if (!first) return;

    // Ensure the first segment is inline-block for width measurement
    first.style.display = "inline-block";

    // Duplicate content until total width covers at least 2x viewport width
    var viewport = track.parentElement;
    var targetWidth = (viewport ? viewport.clientWidth : window.innerWidth) * 2;

    // Measure and duplicate
    var total = 0;
    var clones = [];

    function measure() {
      total = 0;
      var children = track.querySelectorAll(".rotating-text__segment");
      for (var i = 0; i < children.length; i++) {
        total += children[i].getBoundingClientRect().width;
        if (i < children.length - 1) total += gapPx; // account for gap
      }
      return total;
    }

    // Start with existing content
    total = measure();
    var safeGuard = 0;
    while (total < targetWidth && safeGuard < 30) {
      var clone = first.cloneNode(true);
      clones.push(clone);
      track.appendChild(clone);
      total = measure();
      safeGuard++;
    }

    // Compute one cycle distance: one segment width plus gap
    var segWidth = first.getBoundingClientRect().width + gapPx;
    track.style.setProperty("--rt-segment-width", segWidth + "px");

    // Set animation duration based on speed (px/s)
    var speed = Number(track.getAttribute("data-speed"));
    var durationSec = pxPerSecondToDurationPx(speed, segWidth);
    track.style.setProperty("--rt-duration", durationSec + "s");

    // Recalculate on resize
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        // Remove clones
        for (var i = 0; i < clones.length; i++) {
          if (clones[i].parentNode === track) track.removeChild(clones[i]);
        }
        clones = [];
        // Re-run setup for cloning and duration
        setupTrack(track);
      }, 150);
    });
  }

  ready(function () {
    var tracks = document.querySelectorAll(".rotating-text__track");
    if (!tracks.length) return;
    tracks.forEach
      ? tracks.forEach(setupTrack)
      : Array.prototype.forEach.call(tracks, setupTrack);
  });
})();

