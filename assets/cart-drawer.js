class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );
    this.querySelector("#CartDrawer-Overlay").addEventListener(
      "click",
      this.close.bind(this)
    );
    this.setHeaderCartIconAccessibility();

    // Subscribe to product form events
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for variant changes
    subscribe(PUB_SUB_EVENTS.variantChange, (data) => {
      console.log("Variant changed:", data);
      // Handle variant change if needed
    });

    // Listen for quantity updates
    subscribe(PUB_SUB_EVENTS.quantityUpdate, (data) => {
      console.log("Quantity updated:", data);
      // Handle quantity update if needed
    });

    // Listen for cart updates
    subscribe(PUB_SUB_EVENTS.cartUpdate, (data) => {
      console.log("Cart updated:", data);
      // Cart update is already handled in product-form.js
    });

    // Listen for cart errors
    subscribe(PUB_SUB_EVENTS.cartError, (data) => {
      console.error("Cart error:", data);
      // Handle cart errors if needed
    });
  }

  setHeaderCartIconAccessibility() {
    const cartLinks = document.querySelectorAll("#cart-icon-bubble");
    if (!cartLinks || cartLinks.length === 0) return;

    cartLinks.forEach((cartLink) => {
      cartLink.setAttribute("role", "button");
      cartLink.setAttribute("aria-haspopup", "dialog");
      cartLink.addEventListener("click", (event) => {
        event.preventDefault();
        this.open(cartLink);
      });
      cartLink.addEventListener("keydown", (event) => {
        if (event.code.toUpperCase() === "SPACE") {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute("role"))
      this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add("animate", "active");
    });

    this.addEventListener(
      "transitionend",
      () => {
        const containerToTrapFocusOn = this.classList.contains("is-empty")
          ? this.querySelector(".drawer__inner-empty")
          : document.getElementById("CartDrawer");
        const focusElement =
          this.querySelector(".drawer__inner") ||
          this.querySelector(".drawer__close");
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add("overflow-hidden");
  }

  close() {
    this.classList.remove("active");
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute("role", "button");
    cartDrawerNote.setAttribute("aria-expanded", "false");

    if (cartDrawerNote.nextElementSibling.getAttribute("id")) {
      cartDrawerNote.setAttribute(
        "aria-controls",
        cartDrawerNote.nextElementSibling.id
      );
    }

    cartDrawerNote.addEventListener("click", (event) => {
      event.currentTarget.setAttribute(
        "aria-expanded",
        !event.currentTarget.closest("details").hasAttribute("open")
      );
    });

    cartDrawerNote.parentElement.addEventListener("keyup", onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector(".drawer__inner").classList.contains("is-empty") &&
      this.querySelector(".drawer__inner").classList.remove("is-empty");
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
    });

    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay").addEventListener(
        "click",
        this.close.bind(this)
      );
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-drawer",
        selector: "#CartDrawer",
      },
    ];
  }

  getSectionDOM(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-drawer", CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: "CartDrawer",
        section: "cart-drawer",
        selector: ".drawer__inner",
      },
    ];
  }
}

customElements.define("cart-drawer-items", CartDrawerItems);

// Update cart count badge in header
function updateCartCountBadge(itemCount) {
  const cartBubbles = document.querySelectorAll("#cart-icon-bubble");
  
  cartBubbles.forEach((cartBubble) => {
    let badge = cartBubble.querySelector(".cart-count-badge");
    
    if (itemCount > 0) {
      if (!badge) {
        // Create badge if it doesn't exist
        badge = document.createElement("span");
        badge.className = "cart-count-badge absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-xs font-medium text-[var(--product-accent-foreground)] bg-[var(--product-accent)] rounded-full";
        badge.setAttribute("aria-label", `${itemCount} items in cart`);
        cartBubble.appendChild(badge);
      }
      badge.textContent = itemCount;
      badge.setAttribute("aria-label", `${itemCount} items in cart`);
      badge.style.display = "flex";
    } else {
      // Hide badge if cart is empty
      if (badge) {
        badge.style.display = "none";
      }
    }
  });
}

// Subscribe to cart updates to update the badge
if (typeof subscribe !== "undefined" && typeof PUB_SUB_EVENTS !== "undefined") {
  subscribe(PUB_SUB_EVENTS.cartUpdate, (data) => {
    if (data && data.cartData && typeof data.cartData.item_count !== "undefined") {
      updateCartCountBadge(data.cartData.item_count);
    }
  });
}
