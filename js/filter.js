/**
 * filter.js
 * Contains pure, reusable logic for filtering, sorting, and aggregating product data.
 * Directly demonstrates advanced JavaScript array methods.
 */

const filterManager = {
  /**
   * Filters the products array based on multiple active criteria.
   * Demonstrates: filter(), includes(), every()
   * @param {Array} products 
   * @param {Object} criteria { search, category, maxPrice }
   * @returns {Array} Filtered products
   */
  filterProducts(products, { search = '', category = 'all', maxPrice = 150 } = {}) {
    const searchClean = search.trim().toLowerCase();
    
    // Demonstration of filter(): returns a new array with elements that pass the conditions
    return products.filter(product => {
      // 1. Search filter: Matches product name or category (Demonstrates: includes())
      const nameMatch = product.name.toLowerCase().includes(searchClean);
      const categorySearchMatch = product.category.toLowerCase().includes(searchClean);
      const matchesSearch = !searchClean || nameMatch || categorySearchMatch;

      // 2. Category filter: Check if matching target or 'all'
      const matchesCategory = category === 'all' || product.category === category;

      // 3. Price filter: Check if less than or equal to selected maximum price
      const matchesPrice = product.price <= maxPrice;

      // Combine conditions
      return matchesSearch && matchesCategory && matchesPrice;
    });
  },

  /**
   * Sorts the products array in a non-destructive way.
   * Demonstrates: sort() (using spread operator to avoid mutating original array)
   * @param {Array} products 
   * @param {string} sortBy 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
   * @returns {Array} Sorted copy of products
   */
  sortProducts(products, sortBy) {
    // Return a shallow copy sorted, preventing in-place modification of the master products array
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  },

  /**
   * Evaluates statistics and insights dynamically using advanced array operations.
   * Demonstrates: reduce(), every(), some(), find(), findIndex()
   * @param {Array} filteredProducts - Currently filtered set of products
   * @param {number} maxPrice - Active price budget
   * @returns {Object} Computed insight statistics
   */
  computeInsights(filteredProducts, maxPrice) {
    if (filteredProducts.length === 0) {
      return {
        count: 0,
        averagePrice: 0,
        allUnderBudget: true,
        hasPremium: false,
        cheapestProduct: null
      };
    }

    // 1. Demonstration of reduce(): Calculate average price of current selection
    const totalPrice = filteredProducts.reduce((sum, product) => sum + product.price, 0);
    const averagePrice = Number((totalPrice / filteredProducts.length).toFixed(2));

    // 2. Demonstration of every(): Verifies if ALL products are indeed under the slider threshold
    const allUnderBudget = filteredProducts.every(product => product.price <= maxPrice);

    // 3. Demonstration of some(): Checks if AT LEAST ONE item falls into the premium price range (>= $60)
    const hasPremium = filteredProducts.some(product => product.price >= 60);

    // 4. Demonstration of find(): Locates the absolute cheapest item in this specific list
    // First, find the minimum price value
    const prices = filteredProducts.map(p => p.price); // Demonstrates map() for extracting prices
    const minPrice = Math.min(...prices);
    const cheapestProduct = filteredProducts.find(product => product.price === minPrice);

    return {
      count: filteredProducts.length,
      averagePrice,
      allUnderBudget,
      hasPremium,
      cheapestProduct
    };
  },

  /**
   * Helper function to find a product index by ID
   * Demonstrates: findIndex()
   * @param {Array} products 
   * @param {string} id 
   * @returns {number} Index of product or -1
   */
  findProductIndexById(products, id) {
    return products.findIndex(product => product.id === id);
  }
};
