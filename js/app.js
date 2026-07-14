/**
 * app.js
 * The core controller orchestrating state, local storage synchronization,
 * input debouncing, events delegation, and API integration.
 */

// Application Master State
const state = {
  allProducts: [], // Source of truth: set exactly once on load
  filters: {
    search: '',
    category: 'all',
    maxPrice: 150
  },
  sortBy: 'name-asc'
};

// Storage Keys Constants
const STORAGE_KEYS = {
  FILTERS: 'productexplorer_filters',
  SORT: 'productexplorer_sort'
};

/**
 * Debounce helper for high-frequency input search
 * @param {Function} func 
 * @param {number} delay 
 * @returns {Function}
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Orchestrates filtering, sorting, insights updating, and layout rendering.
 */
function updateAppView() {
  // 1. Filter products using pure filter manager (Demonstrates: filter, includes)
  const filtered = filterManager.filterProducts(state.allProducts, state.filters);

  // 2. Sort filtered products (Demonstrates: sort)
  const sortedAndFiltered = filterManager.sortProducts(filtered, state.sortBy);

  // 3. Compute real-time inventory insights (Demonstrates: reduce, every, some, find, map)
  const insights = filterManager.computeInsights(sortedAndFiltered, state.filters.maxPrice);

  // 4. Render product card layouts
  ui.renderProducts(sortedAndFiltered);

  // 5. Update stats display panel
  ui.updateInsightsPanel(insights);

  // 6. Draw active filter chips
  ui.renderActiveFilterChips(state.filters, handleRemoveFilterChip);

  // 7. Save settings to LocalStorage for session persistence
  saveStateToStorage();
}

/**
 * Saves current filter state to browser local storage
 */
function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(state.filters));
    localStorage.setItem(STORAGE_KEYS.SORT, state.sortBy);
  } catch (e) {
    console.error('Could not save state to localStorage:', e);
  }
}

/**
 * Loads last selected criteria from browser local storage on initialization
 */
function loadStateFromStorage() {
  // Always start fresh so stale filters never hide products on load
  try {
    localStorage.removeItem(STORAGE_KEYS.FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SORT);
  } catch (e) {
    // ignore
  }
  // State stays at its defaults (all products visible)
}

/**
 * Updates UI input element values to match current state (e.g. on loading from storage or clearing)
 */
function syncUIWithState() {
  ui.elements.searchInput.value = state.filters.search;
  ui.toggleSearchClearBtn(state.filters.search);
  
  ui.elements.sortSelect.value = state.sortBy;
  
  ui.updatePriceSliderValue(state.filters.maxPrice);
  
  ui.highlightActiveCategory(state.filters.category);
}

/**
 * Clears search criteria
 */
function clearSearch() {
  state.filters.search = '';
  ui.elements.searchInput.value = '';
  ui.toggleSearchClearBtn('');
  updateAppView();
}

/**
 * Resets all active search, category, and budget criteria to default
 */
function resetAllFilters() {
  state.filters = {
    search: '',
    category: 'all',
    maxPrice: 150
  };
  state.sortBy = 'name-asc';
  
  syncUIWithState();
  updateAppView();
}

/**
 * Handles action of clicking close button on individual active filter chips
 * @param {string} filterType 'search' | 'category' | 'maxPrice'
 */
function handleRemoveFilterChip(filterType) {
  if (filterType === 'search') {
    state.filters.search = '';
    ui.elements.searchInput.value = '';
    ui.toggleSearchClearBtn('');
  } else if (filterType === 'category') {
    state.filters.category = 'all';
    ui.highlightActiveCategory('all');
  } else if (filterType === 'maxPrice') {
    state.filters.maxPrice = 150;
    ui.updatePriceSliderValue(150);
  }
  updateAppView();
}

/**
 * Sets up all event listeners for interaction controls
 */
function setupEventListeners() {
  // 1. Live Search Input (with debounced callback)
  const debouncedSearch = debounce((query) => {
    state.filters.search = query;
    updateAppView();
  }, 250);

  ui.elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    ui.toggleSearchClearBtn(val);
    debouncedSearch(val);
  });

  // Search input clear button click
  ui.elements.btnClearSearch.addEventListener('click', clearSearch);

  // 2. Navbar Category navigation clicks (event delegation)
  ui.elements.navMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      e.preventDefault();
      const categorySelected = e.target.getAttribute('data-category');
      state.filters.category = categorySelected;
      ui.highlightActiveCategory(categorySelected);
      updateAppView();
    }
  });

  // 3. Sidebar Category selection clicks (event delegation)
  ui.elements.sidebarCategoryList.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-btn')) {
      e.preventDefault();
      const categorySelected = e.target.getAttribute('data-category');
      state.filters.category = categorySelected;
      ui.highlightActiveCategory(categorySelected);
      updateAppView();
    }
  });

  // 4. Price slider changes (both real-time updates and change event saves)
  ui.elements.priceSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    ui.elements.priceSliderValue.textContent = `$${val}`;
    state.filters.maxPrice = val;
    updateAppView();
  });

  // 5. Sorting choice selection
  ui.elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    updateAppView();
  });

  // 6. Sidebar Clear filters button
  ui.elements.btnClearFiltersSide.addEventListener('click', resetAllFilters);

  // 7. Empty state reset button
  ui.elements.btnResetEmpty.addEventListener('click', resetAllFilters);
}

/**
 * Bootstrap function triggering layout, loading cached state, and fetching from API once.
 */
async function initApp() {
  // 1. Setup UI generic triggers
  ui.init();

  // 2. Load settings from storage
  loadStateFromStorage();

  // 3. Sync UI inputs with starting state parameters
  syncUIWithState();

  // 4. Set up interactive listeners
  setupEventListeners();

  // 5. Run API request and update products
  ui.toggleLoading(true);
  try {
    // Fetch products ONCE when application loads
    const items = await api.fetchRecipes();
    state.allProducts = items;
    
    ui.toggleLoading(false);
    updateAppView();
  } catch (error) {
    ui.toggleLoading(false);
    ui.elements.productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1.5px solid var(--border-color);">
        <h3 style="color: var(--danger); margin-bottom: 0.5rem; font-size: 1.4rem;">Connection Error</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">We encountered an error loading the gourmet recipes database. Please check your internet connection and try again.</p>
        <button class="btn btn-primary" onclick="window.location.reload();">Retry Loading</button>
      </div>
    `;
    console.error('Error starting up app:', error);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
