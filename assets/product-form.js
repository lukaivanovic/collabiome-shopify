if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector("form");
        this.variantIdInput.disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart = document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector("span");

        if (document.querySelector("cart-drawer"))
          this.submitButton.setAttribute("aria-haspopup", "dialog");

        this.hideErrors = this.dataset.hideErrors === "true";

        // Initialize product data and variant selection
        this.initializeProductData();
        this.setupVariantSelection();
        this.setupCustomVariantSelects();
        this.setupQuantitySelection();
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;

        this.handleErrorMessage();

        this.submitButton.setAttribute("aria-disabled", true);
        this.submitButton.classList.add("loading");
        // this.querySelector(".loading__spinner").classList.remove("hidden");

        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: "product-form",
                productVariantId: formData.get("id"),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage =
                this.submitButton.querySelector(".sold-out-message");
              if (!soldOutMessage) return;
              this.submitButton.setAttribute("aria-disabled", true);
              this.submitButtonText.classList.add("hidden");
              soldOutMessage.classList.remove("hidden");
              this.error = true;

              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker(
              "add:wait-for-subscribers"
            );
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: "product-form",
                productVariantId: formData.get("id"),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker(
                  "add:wait-for-subscribers",
                  startMarker
                );
              });
            this.error = false;
            const quickAddModal = this.closest("quick-add-modal");
            if (quickAddModal) {
              document.body.addEventListener(
                "modalClosed",
                () => {
                  setTimeout(() => {
                    CartPerformance.measure(
                      "add:paint-updated-sections",
                      () => {
                        this.cart.renderContents(response);
                      }
                    );
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                console.log("renderContents", response);
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove("loading");
            if (this.cart && this.cart.classList.contains("is-empty"))
              this.cart.classList.remove("is-empty");
            if (!this.error) this.submitButton.removeAttribute("aria-disabled");
            // this.querySelector(".loading__spinner").classList.add("hidden");

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );

        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute("disabled", "disabled");
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute("disabled");
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector("[name=id]");
      }

      initializeProductData() {
        // Try to find product data script with specific product ID first
        let productDataScript = null;

        // Look for product data script with specific ID (for product cards)
        const productForm = this.closest("product-form");
        if (productForm) {
          const productId = productForm.dataset.productId;
          if (productId) {
            productDataScript = document.querySelector(
              `#product-data-${productId}`
            );
          }
        }

        // Fallback to generic product-data script (for product page)
        if (!productDataScript) {
          productDataScript = document.querySelector("#product-data");
        }

        if (productDataScript) {
          this.product = JSON.parse(productDataScript.textContent);
        } else {
          console.error("Product data script not found");
          this.product = null;
        }
      }

      setupCustomVariantSelects() {
        if (!this.form) return;

        const roots = this.form.querySelectorAll("[data-variant-select-root]");
        if (!roots.length) return;

        const closeAllPanels = (exceptRoot = null) => {
          this.form
            .querySelectorAll("[data-variant-select-root]")
            .forEach((root) => {
              if (exceptRoot && root === exceptRoot) return;
              const panel = root.querySelector("[data-variant-select-panel]");
              const button = root.querySelector("[data-variant-select-button]");
              if (panel && !panel.classList.contains("hidden")) {
                panel.classList.add("hidden");
              }
              if (button) {
                button.setAttribute("aria-expanded", "false");
              }
            });
        };

        roots.forEach((root) => {
          const button = root.querySelector("[data-variant-select-button]");
          const panel = root.querySelector("[data-variant-select-panel]");
          const select = root.querySelector(
            'select[name^="options["][data-variant-select-input]'
          );
          const label = root.querySelector("[data-variant-select-label]");

          if (!button || !panel || !select || !label) return;

          const optionButtons = panel.querySelectorAll(
            "[data-variant-select-option]"
          );

          const updateFromSelect = () => {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
              label.textContent = selectedOption.textContent.trim();
            }

            optionButtons.forEach((btn) => {
              const value = btn.dataset.value;
              const isSelected = value === select.value;
              btn.setAttribute("aria-selected", String(isSelected));
            });
          };

          const openPanel = () => {
            closeAllPanels(root);
            panel.classList.remove("hidden");
            button.setAttribute("aria-expanded", "true");
          };

          const closePanel = () => {
            panel.classList.add("hidden");
            button.setAttribute("aria-expanded", "false");
          };

          button.addEventListener("click", (event) => {
            event.stopPropagation();
            const isOpen = button.getAttribute("aria-expanded") === "true";
            if (isOpen) {
              closePanel();
            } else {
              openPanel();
            }
          });

          optionButtons.forEach((btn) => {
            btn.addEventListener("click", (event) => {
              event.stopPropagation();
              const value = btn.dataset.value;
              if (!value || value === select.value) {
                closePanel();
                return;
              }

              select.value = value;
              select.dispatchEvent(new Event("change", { bubbles: true }));
              updateFromSelect();
              closePanel();
            });
          });

          // Sync when select changes (e.g., via JS)
          select.addEventListener("change", updateFromSelect);

          // Initial state
          updateFromSelect();
        });

        // Close dropdowns when clicking outside this form
        document.addEventListener("click", (event) => {
          if (!this.contains(event.target)) {
            closeAllPanels();
          }
        });

        // Close on Escape
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            closeAllPanels();
          }
        });
      }

      setupVariantSelection() {
        if (!this.product || !this.product.variants) return;

        // Find all option inputs (radio buttons)
        const optionInputs = this.form.querySelectorAll(
          'input[name^="options["]'
        );

        optionInputs.forEach((input) => {
          input.addEventListener("change", () => {
            this.updateVariantSelection();
            this.updateOptionStyles();
          });
        });

        // Find all option selects (dropdowns)
        const optionSelects = this.form.querySelectorAll(
          'select[name^="options["]'
        );

        optionSelects.forEach((select) => {
          select.addEventListener("change", () => {
            this.updateVariantSelection();
            this.updateOptionStyles();
          });
        });

        // Add click handlers to labels to stop propagation to parent elements
        const optionLabels = this.form.querySelectorAll("[data-option-label]");
        optionLabels.forEach((label) => {
          label.addEventListener("click", (e) => {
            // Don't prevent default (let the radio input work)
            // Only stop propagation to prevent bubbling to parent elements
            e.stopPropagation();

            // Manually trigger the associated radio input
            const input = label.querySelector('input[type="radio"]');
            if (input && !input.checked) {
              input.checked = true;
              // Manually trigger change event
              input.dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
        });

        // Initial variant selection and styling
        this.updateVariantSelection();
        this.updateOptionStyles();

        // Show savings badges for all options
        this.updateSavingsBadges();
      }

      updateVariantSelection() {
        if (!this.product || !this.product.variants) return;

        // Get current selected options from radio buttons
        const selectedOptions = {};
        const optionInputs = this.form.querySelectorAll(
          'input[name^="options["]:checked'
        );

        optionInputs.forEach((input) => {
          const optionName = input.name.match(/options\[(.+)\]/)[1];
          selectedOptions[optionName] = input.value;
        });

        // Get current selected options from select dropdowns
        const optionSelects = this.form.querySelectorAll(
          'select[name^="options["]'
        );

        optionSelects.forEach((select) => {
          const optionName = select.name.match(/options\[(.+)\]/)[1];
          selectedOptions[optionName] = select.value;
        });

        // Find matching variant
        let matchingVariant = null;

        // Count total option selectors
        const totalOptionSelectors = optionInputs.length + optionSelects.length;

        // If there are no option inputs (product without variants), use the first available variant
        if (totalOptionSelectors === 0) {
          matchingVariant =
            this.product.variants.find((v) => v.available) ||
            this.product.variants[0];
        } else {
          // For products with variants, find the matching variant
          matchingVariant = this.product.variants.find((variant) => {
            return variant.options.every((option, index) => {
              const optionName = this.product.options[index];
              return selectedOptions[optionName] === option;
            });
          });
        }

        if (matchingVariant) {
          // Update hidden variant ID input
          this.variantIdInput.value = matchingVariant.id;
          this.variantIdInput.disabled = false;

          // Update button state
          this.updateSubmitButton(matchingVariant);

          // Publish variant change event
          publish(PUB_SUB_EVENTS.variantChange, {
            variant: matchingVariant,
            product: this.product,
          });

          // Update price display
          this.updatePriceDisplay(matchingVariant);

          // Update savings badges for all options
          this.updateSavingsBadges();
        } else {
          // No matching variant found
          this.variantIdInput.disabled = true;
          this.submitButton.disabled = true;
          this.dataset.variantState = "unavailable";
          this.submitButtonText.textContent =
            this.submitButton.dataset.textUnavailable || "Unavailable";
        }
      }

      getVariantState(variant) {
        if (!variant) return "unavailable";
        const checkInventory =
          variant.inventory_management === "shopify" &&
          variant.inventory_policy !== "continue";
        const minRule = variant.quantity_rule?.min || 0;
        const soldOutByRule =
          checkInventory && minRule > variant.inventory_quantity;
        if (!variant.available || soldOutByRule) return "soldout";
        return "available";
      }

      updateSubmitButton(variant) {
        const state = this.getVariantState(variant);

        // Update form data attributes (for CSS styling)
        this.dataset.variantState = state;
        this.dataset.variantId = variant?.id || "";
        this.dataset.variantPrice = variant?.price || "";

        // Update button disabled state
        this.submitButton.disabled = state !== "available";

        // Get localized text from data attributes (set by Liquid)
        const textMap = {
          unavailable:
            this.submitButton.dataset.textUnavailable || "Unavailable",
          soldout: this.submitButton.dataset.textSoldout || "Sold out",
          available: this.submitButton.dataset.textAvailable || "Add to cart",
        };

        const baseText = textMap[state];
        if (state === "available" && variant) {
          const formattedPrice = this.formatMoney(variant.price);
          this.submitButtonText.textContent = `${baseText} (${formattedPrice})`;
        } else {
          this.submitButtonText.textContent = baseText;
        }
      }

      formatMoney(cents) {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "EUR",
        }).format(cents / 100);
      }

      updatePriceDisplay(variant) {
        const priceElement = document.querySelector(".product-price");
        const priceWrapper = document.querySelector(".product-price-wrapper");

        if (!priceElement || !variant) return;

        const quantity =
          parseInt(this.form.querySelector('input[name="quantity"]').value) ||
          1;
        const totalPrice = variant.price * quantity;

        // Update price
        priceElement.textContent = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "EUR",
        }).format(totalPrice / 100);

        // Handle compare at price
        let compareElement = priceWrapper.querySelector(
          ".product-price-compare"
        );

        if (
          variant.compare_at_price &&
          variant.compare_at_price > variant.price
        ) {
          const compareAtPrice = variant.compare_at_price * quantity;
          if (!compareElement) {
            compareElement = document.createElement("span");
            compareElement.className =
              "product-price-compare text-lg text-gray-500 line-through";
            priceWrapper.insertBefore(compareElement, priceElement);
          }
          compareElement.textContent = new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "EUR",
          }).format(compareAtPrice / 100);
        } else if (compareElement) {
          compareElement.remove();
        }
      }

      setupQuantitySelection() {
        const quantityInput = this.form.querySelector('input[name="quantity"]');
        const minusButton = this.form.querySelector("[data-quantity-minus]");
        const plusButton = this.form.querySelector("[data-quantity-plus]");

        if (!quantityInput || !minusButton || !plusButton) return;

        // Quantity button handlers
        const updateQuantityButtons = () => {
          const quantity = parseInt(quantityInput.value) || 1;
          minusButton.disabled = quantity <= 1;
        };

        minusButton.addEventListener("click", () => {
          const currentValue = parseInt(quantityInput.value) || 1;
          if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
            this.handleQuantityChange();
            updateQuantityButtons();
          }
        });

        plusButton.addEventListener("click", () => {
          const currentValue = parseInt(quantityInput.value) || 1;
          quantityInput.value = currentValue + 1;
          this.handleQuantityChange();
          updateQuantityButtons();
        });

        quantityInput.addEventListener("change", () => {
          const value = parseInt(quantityInput.value);
          if (isNaN(value) || value < 1) {
            quantityInput.value = 1;
          }
          this.handleQuantityChange();
          updateQuantityButtons();
        });

        // Initial state
        updateQuantityButtons();
      }

      handleQuantityChange() {
        const variant = this.getCurrentVariant();
        if (variant) {
          this.updatePriceDisplay(variant);

          // Publish quantity update event
          publish(PUB_SUB_EVENTS.quantityUpdate, {
            quantity: parseInt(
              this.form.querySelector('input[name="quantity"]').value
            ),
            variant: variant,
          });
        }
      }

      getCurrentVariant() {
        const variantId = this.variantIdInput.value;
        if (!this.product || !variantId) return null;

        return this.product.variants.find((v) => v.id == variantId) || null;
      }

      updateOptionStyles() {
        const optionLabels = this.form.querySelectorAll("[data-option-label]");

        optionLabels.forEach((label) => {
          const input = label.querySelector('input[type="radio"]');
          label.setAttribute("data-selected", input && input.checked);
        });
      }

      calcSavingsPercent(compareAt, price) {
        if (!compareAt || compareAt <= price) return 0;
        return Math.round(((compareAt - price) / compareAt) * 100);
      }

      updateSavingsBadges() {
        if (!this.product || !this.product.variants) return;

        const currentVariant = this.getCurrentVariant();

        // Select badges: show current variant discount (for dropdown selectors)
        this.form
          .querySelectorAll("[data-variant-badge][data-option-position]")
          .forEach((badge) => {
            // Skip badges inside option labels (handled below)
            if (badge.closest("[data-option-label]")) return;

            const percent = currentVariant
              ? this.calcSavingsPercent(
                  currentVariant.compare_at_price,
                  currentVariant.price
                )
              : 0;
            badge.textContent = percent > 0 ? `-${percent}%` : "";
            badge.classList.toggle("hidden", percent <= 0);
          });

        // Get currently selected options (for building hypothetical selections)
        const currentSelectedOptions = {};

        // From radio buttons
        const currentCheckedInputs = this.form.querySelectorAll(
          'input[name^="options["]:checked'
        );
        currentCheckedInputs.forEach((input) => {
          const optionName = input.name.match(/options\[(.+)\]/)[1];
          currentSelectedOptions[optionName] = input.value;
        });

        // From select dropdowns
        const currentSelectInputs = this.form.querySelectorAll(
          'select[name^="options["]'
        );
        currentSelectInputs.forEach((select) => {
          const optionName = select.name.match(/options\[(.+)\]/)[1];
          currentSelectedOptions[optionName] = select.value;
        });

        // Get all option labels (radio buttons)
        const allOptionLabels = this.form.querySelectorAll(
          "[data-option-label]"
        );

        // Process each option label
        allOptionLabels.forEach((label) => {
          const badge = label.querySelector("[data-variant-badge]");
          if (!badge) return;

          // Get the option value for this label
          const input = label.querySelector('input[type="radio"]');
          if (!input) return;

          const optionName = input.name.match(/options\[(.+)\]/)[1];
          const optionValue = input.value;

          // Create a hypothetical selection: use this label's value + current selections for other options
          const hypotheticalOptions = { ...currentSelectedOptions };
          hypotheticalOptions[optionName] = optionValue;

          // Find the variant that matches this hypothetical selection
          const matchingVariant = this.product.variants.find((variant) => {
            return variant.options.every((option, index) => {
              const optionNameKey = this.product.options[index];
              return hypotheticalOptions[optionNameKey] === option;
            });
          });

          // Check if this variant has savings
          const savingsPercent = matchingVariant
            ? this.calcSavingsPercent(
                matchingVariant.compare_at_price,
                matchingVariant.price
              )
            : 0;

          badge.textContent =
            savingsPercent > 0 ? `${savingsPercent}% uštede` : "";
          badge.classList.toggle("hidden", savingsPercent <= 0);
        });
      }
    }
  );
}
