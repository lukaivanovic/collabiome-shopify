/**
 * FacetFilterForm Web Component
 * Handles URL-based filtering for Shopify collections
 */

class FacetFilterForm extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector("form");
    this.debounceTimer = null;
    this.init();
  }

  init() {
    if (!this.form) return;

    // Handle checkbox changes for immediate filtering with debouncing
    this.form.addEventListener("change", this.handleChange.bind(this));

    // Handle facet-select change events
    this.addEventListener("facet-change", this.handleFacetChange.bind(this));

    // Update clear all button state
    this.updateClearAllButton();

    // Handle clear all button click
    this.form.addEventListener("click", (e) => {
      const target = e.target.closest('a');
      if (target && (target.textContent.trim().toLowerCase().includes("clear all") || target.textContent.trim().toLowerCase().includes("clear") || target.textContent.trim().toLowerCase().includes("očisti sve") || target.textContent.trim().toLowerCase().includes("očisti"))) {
        // Check if it's disabled
        if (target.hasAttribute('aria-disabled') || target.classList.contains('pointer-events-none')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        this.handleClearAll(e);
      }
    });
  }

  handleChange(event) {
    if (event.target.type === "checkbox" || event.target.type === "number") {
      this.updateClearAllButton();
      this.debounceApplyFilters();
    }
  }

  handleFacetChange(event) {
    // Close the dropdown when a change is made
    const facetSelect = event.detail.filter;
    if (facetSelect.close) {
      facetSelect.close();
    }
    this.updateClearAllButton();
    this.debounceApplyFilters();
  }

  debounceApplyFilters() {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }

  handleClearAll(event) {
    event.preventDefault();
    // Navigate to collection URL without any filters
    const collectionUrl = this.getCollectionUrl();
    window.location.href = collectionUrl;
  }

  applyFilters() {
    const formData = new FormData(this.form);
    const searchParams = new URLSearchParams();

    // Add all form data to search params
    for (const [key, value] of formData.entries()) {
      if (value && value.trim() !== "") {
        searchParams.append(key, value);
      }
    }

    // Build new URL with filters
    const collectionUrl = this.getCollectionUrl();
    const newUrl = searchParams.toString()
      ? `${collectionUrl}?${searchParams.toString()}`
      : collectionUrl;

    // Navigate to filtered URL
    window.location.href = newUrl;
  }

  getCollectionUrl() {
    // Extract collection URL from current path
    const pathParts = window.location.pathname.split("/");
    const collectionHandle = pathParts[pathParts.length - 1];

    // Build collection URL
    return `/collections/${collectionHandle}`;
  }

  // Method to update product count (called from outside if needed)
  updateProductCount(count) {
    const countElement = document.querySelector(".product-count");
    if (countElement) {
      countElement.textContent = `${count} ${this.getTranslation("general.products", "Products")}`;
    }
  }

  // Update clear all button state based on active filters
  updateClearAllButton() {
    const checkboxes = this.form.querySelectorAll('input[type="checkbox"]:checked');
    const numberInputs = this.form.querySelectorAll('input[type="number"]');
    let hasActiveFilters = checkboxes.length > 0;
    
    // Check if any number inputs have values
    if (!hasActiveFilters) {
      numberInputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
          hasActiveFilters = true;
        }
      });
    }

    // Find clear all button (look for link with "clear all" text)
    const clearAllButton = Array.from(this.form.querySelectorAll('a')).find(
      link => {
        const text = link.textContent.trim().toLowerCase();
        return text.includes('clear all') || text.includes('clear') || text.includes('očisti sve') || text.includes('očisti');
      }
    );

    if (clearAllButton) {
      if (hasActiveFilters) {
        clearAllButton.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        clearAllButton.removeAttribute('aria-disabled');
        clearAllButton.removeAttribute('tabindex');
      } else {
        clearAllButton.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        clearAllButton.setAttribute('aria-disabled', 'true');
        clearAllButton.setAttribute('tabindex', '-1');
      }
    }
  }

  // Simple translation helper
  getTranslation(key, fallback) {
    // This is a simplified version - in a real implementation,
    // you'd want to load translations from the theme
    const translations = {
      "general.products": "Proizvodi",
      "filters.no_products": "Nisu pronađeni proizvodi s odabranim filtrima.",
    };
    return translations[key] || fallback;
  }
}

// Register the custom element
customElements.define("facet-filter-form", FacetFilterForm);

// Export for potential external use
window.FacetFilterForm = FacetFilterForm;
