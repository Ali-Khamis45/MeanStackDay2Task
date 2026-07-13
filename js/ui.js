/**
 * ui.js
 * Controls all DOM manipulations, rendering, event delegations, and state representation.
 */

const ui = {
  // DOM Cache
  elements: {
    productsGrid: document.getElementById('products-grid'),
    loadingGrid: document.getElementById('loading-grid'),
    emptyState: document.getElementById('empty-state'),
    btnResetEmpty: document.getElementById('btn-reset-empty'),
    
    // Filters & Controls
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    priceSlider: document.getElementById('price-slider'),
    priceSliderValue: document.getElementById('price-slider-value'),
    sortSelect: document.getElementById('sort-select'),
    btnClearFiltersSide: document.getElementById('btn-clear-filters-side'),
    activeChipsContainer: document.getElementById('active-chips-container'),
    resultsCountText: document.getElementById('results-count-text'),
    
    // Category Navigation
    navMenu: document.getElementById('nav-menu'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    sidebarCategoryList: document.getElementById('category-sidebar-list'),
    
    // Insights stats
    statVisibleCount: document.getElementById('stat-visible-count'),
    statAveragePrice: document.getElementById('stat-average-price'),
    statBudgetCheck: document.getElementById('stat-budget-check'),
    statPremiumCheck: document.getElementById('stat-premium-check')
  },

  // Fallback image url for recipes that might have broken images
  FALLBACK_IMAGE: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',

  CATEGORY_FALLBACK_IMAGES: {
    Pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    Salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    Pasta: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    Beef: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    Dough: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
  },

  /**
   * Initializes basic UI triggers (e.g. Hamburger menu toggle)
   */
  init() {
    this.elements.hamburgerBtn.addEventListener('click', () => {
      this.elements.navMenu.classList.toggle('open');
      this.elements.hamburgerBtn.classList.toggle('active');
    });

    // Close mobile nav on link click
    this.elements.navMenu.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-link')) {
        this.elements.navMenu.classList.remove('open');
        this.elements.hamburgerBtn.classList.remove('active');
      }
    });
  },

  /**
   * Renders product list cards in the grid.
   * Demonstrates: forEach()
   * @param {Array} products 
   */
  renderProducts(products) {
    this.elements.productsGrid.innerHTML = '';
    
    if (products.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();

    // Demonstration of forEach(): loop through products and render them to the DOM
    products.forEach(product => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.setAttribute('data-id', product.id);

      // Category-based fallback image url
      const fallbackForCat = this.CATEGORY_FALLBACK_IMAGES[product.category] || this.FALLBACK_IMAGE;

      card.innerHTML = `
        <div class="card-media">
          <span class="card-badge">${product.category}</span>
          <img class="product-img" 
               src="${product.image}" 
               alt="${product.name}" 
               loading="lazy" 
               onerror="this.onerror=null; this.src='${fallbackForCat}';">
        </div>
        <div class="card-body">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="card-footer">
            <div class="product-price"><span>$</span>${product.price}</div>
            <button class="btn-card-action" aria-label="Add ${product.name} to order" onclick="alert('Order added: ${product.name}!')">
              <svg viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      this.elements.productsGrid.appendChild(card);
    });
  },

  /**
   * Toggles the loading skeleton animation
   * @param {boolean} isLoading 
   */
  toggleLoading(isLoading) {
    if (isLoading) {
      this.elements.loadingGrid.innerHTML = Array(6).fill(0).map(() => `
        <div class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-text medium"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
      `).join('');
      
      this.elements.loadingGrid.style.display = 'grid';
      this.elements.productsGrid.classList.add('hidden');
      this.elements.emptyState.classList.add('hidden');
    } else {
      this.elements.loadingGrid.innerHTML = '';
      this.elements.loadingGrid.style.display = 'none';
      this.elements.productsGrid.classList.remove('hidden');
    }
  },

  /**
   * Displays the Empty State card
   */
  showEmptyState() {
    this.elements.emptyState.classList.remove('hidden');
    this.elements.productsGrid.classList.add('hidden');
  },

  /**
   * Hides the Empty State card
   */
  hideEmptyState() {
    this.elements.emptyState.classList.add('hidden');
    this.elements.productsGrid.classList.remove('hidden');
  },

  /**
   * Updates the insights statistics panel.
   * @param {Object} insights Computed insights
   */
  updateInsightsPanel(insights) {
    this.elements.statVisibleCount.textContent = insights.count;
    this.elements.statAveragePrice.textContent = `$${insights.averagePrice.toFixed(2)}`;

    // Budget check badge (every method output)
    const budgetBadge = this.elements.statBudgetCheck;
    if (insights.allUnderBudget && insights.count > 0) {
      budgetBadge.textContent = 'Yes';
      budgetBadge.className = 'badge yes';
    } else {
      budgetBadge.textContent = 'No';
      budgetBadge.className = 'badge no';
    }

    // Premium check badge (some method output)
    const premiumBadge = this.elements.statPremiumCheck;
    if (insights.hasPremium) {
      premiumBadge.textContent = 'Available';
      premiumBadge.className = 'badge yes';
    } else {
      premiumBadge.textContent = 'None';
      premiumBadge.className = 'badge no';
    }

    // Display counts in header
    this.elements.resultsCountText.textContent = `Found ${insights.count} item${insights.count !== 1 ? 's' : ''}`;
  },

  /**
   * Updates slider UI representation
   * @param {number} value 
   */
  updatePriceSliderValue(value) {
    this.elements.priceSlider.value = value;
    this.elements.priceSliderValue.textContent = `$${value}`;
  },

  /**
   * Synchronizes active highlighting across both Navbar and Sidebar
   * @param {string} category 
   */
  highlightActiveCategory(category) {
    // 1. Navbar Highlight
    const navLinks = this.elements.navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('data-category') === category) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // 2. Sidebar Highlight
    const sidebarButtons = this.elements.sidebarCategoryList.querySelectorAll('.category-btn');
    sidebarButtons.forEach(btn => {
      if (btn.getAttribute('data-category') === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  /**
   * Displays clear button for search input if query is active
   * @param {string} search 
   */
  toggleSearchClearBtn(search) {
    this.elements.btnClearSearch.style.display = search ? 'block' : 'none';
  },

  /**
   * Renders pill chips for active filters
   * @param {Object} filters Active state filters
   * @param {Function} onRemove callback invoked with type ('search'|'category'|'maxPrice')
   */
  renderActiveFilterChips(filters, onRemove) {
    this.elements.activeChipsContainer.innerHTML = '';
    
    // Add Search Chip
    if (filters.search) {
      this.createChip(`Search: "${filters.search}"`, () => onRemove('search'));
    }

    // Add Category Chip
    if (filters.category !== 'all') {
      this.createChip(`Category: ${filters.category}`, () => onRemove('category'));
    }

    // Add Price Chip (if price is below absolute max budget $150)
    if (filters.maxPrice < 150) {
      this.createChip(`Max Price: $${filters.maxPrice}`, () => onRemove('maxPrice'));
    }
  },

  /**
   * Helper to append a single chip
   */
  createChip(text, onDismiss) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      <span>${text}</span>
      <button aria-label="Remove filter">&times;</button>
    `;
    chip.querySelector('button').addEventListener('click', onDismiss);
    this.elements.activeChipsContainer.appendChild(chip);
  }
};
