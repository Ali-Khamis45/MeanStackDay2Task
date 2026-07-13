/**
 * api.js
 * Handles data fetching and parsing from the Forkify API.
 * Maps raw recipes into structured products deterministically.
 */

const api = {
  ENDPOINT: 'https://forkify-api.herokuapp.com/api/search?q=pizza',

  // High-quality category fallback images to replace unappealing placeholders/logos
  CATEGORY_FALLBACK_IMAGES: {
    Pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    Salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    Pasta: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    Beef: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    Dough: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
  },

  /**
   * Fetches recipes from Forkify API once and returns normalized products
   * Category queries are fetched separately and merged to ensure real data accuracy.
   * @returns {Promise<Array>} Normalized products list
   */
  async fetchRecipes() {
    const categoriesToFetch = [
      { query: 'pizza', category: 'Pizza' },
      { query: 'salad', category: 'Salad' },
      { query: 'pasta', category: 'Pasta' },
      { query: 'beef', category: 'Beef' },
      { query: 'croissant', category: 'Dough' }
    ];

    try {
      // Fetch all categories in parallel
      const fetchPromises = categoriesToFetch.map(async ({ query, category }) => {
        const url = `https://forkify-api.herokuapp.com/api/search?q=${query}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API network error fetching ${query}: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.recipes || !Array.isArray(data.recipes)) {
          throw new Error(`Invalid recipes response for ${query}`);
        }
        
        // Return recipes tagged with their actual category
        return data.recipes.map(recipe => ({
          ...recipe,
          assignedCategory: category
        }));
      });

      const results = await Promise.all(fetchPromises);
      
      // Merge all categorized products into a single array
      const mergedRecipes = results.flat();
      const totalCount = mergedRecipes.length;
      
      // Generate unique prices from $10 to $150 deterministically
      const uniquePrices = this.generateDeterministicPrices(totalCount);

      return mergedRecipes.map((recipe, index) => {
        const titleCleaned = this.cleanTitle(recipe.title);
        const category = this.refineCategory(titleCleaned, recipe.assignedCategory);
        const price = uniquePrices[index];
        
        let imageUrl = recipe.image_url;
        const lowerUrl = imageUrl.toLowerCase();
        
        // Filter out unappealing/generic publisher logos (like the Epicurious green "epi" logo)
        if (
          lowerUrl.includes('epicurious') || 
          lowerUrl.includes('placeholder') || 
          lowerUrl.includes('logo') || 
          lowerUrl.includes('default')
        ) {
          imageUrl = this.CATEGORY_FALLBACK_IMAGES[category] || this.CATEGORY_FALLBACK_IMAGES.Pizza;
        }

        // Synthesizing description using template literals
        const description = `Indulge in a premium, authentic ${category.toLowerCase()} dish created by ${recipe.publisher}. Made with clean ingredients and ranked with a ${Math.round(recipe.social_rank)}% popularity index.`;
        
        return {
          // Pre-tag ID with category to ensure absolute uniqueness in case of overlapping recipes
          id: `${category.toLowerCase()}_${recipe.recipe_id}`,
          name: titleCleaned,
          category: category,
          price: price,
          image: imageUrl,
          description: description,
          publisher: recipe.publisher,
          socialRank: recipe.social_rank
        };
      });

    } catch (error) {
      console.error('Failed to fetch recipes from API:', error);
      throw error;
    }
  },

  /**
   * Refines the category based on strong keyword signals in the recipe title
   * @param {string} title - Cleaned recipe title
   * @param {string} currentCategory - Category assigned by the search query
   * @returns {string} Refined category
   */
  refineCategory(title, currentCategory) {
    const lowerTitle = title.toLowerCase();
    
    // 1. Strong Pasta indicators
    if (
      lowerTitle.includes('pasta') || 
      lowerTitle.includes('spaghetti') || 
      lowerTitle.includes('macaroni') || 
      lowerTitle.includes('lasagna') || 
      lowerTitle.includes('penne') || 
      lowerTitle.includes('fettuccine') || 
      lowerTitle.includes('linguine') || 
      lowerTitle.includes('ravioli') || 
      lowerTitle.includes('tortellini')
    ) {
      return 'Pasta';
    }

    // 2. Strong Salad indicators
    if (
      lowerTitle.includes('salad') || 
      lowerTitle.includes('caprese') ||
      lowerTitle.includes('coleslaw')
    ) {
      return 'Salad';
    }

    // 3. Strong Beef indicators
    if (
      lowerTitle.includes('beef') || 
      lowerTitle.includes('steak') || 
      lowerTitle.includes('brisket') || 
      lowerTitle.includes('prime rib') ||
      lowerTitle.includes('hamburger') || 
      lowerTitle.includes('meatball')
    ) {
      return 'Beef';
    }

    // 4. Strong Dough indicators
    if (
      lowerTitle.includes('dough') || 
      lowerTitle.includes('croissant') || 
      lowerTitle.includes('bread') || 
      lowerTitle.includes('crust')
    ) {
      return 'Dough';
    }

    // 5. Strong Pizza indicators
    if (lowerTitle.includes('pizza')) {
      return 'Pizza';
    }

    // Fall back to the category assigned by the search query
    return currentCategory;
  },

  /**
   * Decodes HTML entities (e.g. &amp;, &quot;) from title strings
   * @param {string} title 
   * @returns {string} Clean title
   */
  cleanTitle(title) {
    const txt = document.createElement('textarea');
    txt.innerHTML = title;
    return txt.value;
  },

  /**
   * Categorizes recipes deterministically based on words in their title
   * Matches one of: Pizza, Salad, Pasta, Dough, Beef
   * @param {string} title 
   * @returns {string} Category
   */
  determineCategory(title) {
    const lowerTitle = title.toLowerCase();
    
    // Check for Dough/Crust related
    if (
      lowerTitle.includes('dough') || 
      lowerTitle.includes('crust') || 
      lowerTitle.includes('yeast') || 
      lowerTitle.includes('bread') || 
      lowerTitle.includes('base')
    ) {
      return 'Dough';
    }
    
    // Check for Salad/Veggie/Green related
    if (
      lowerTitle.includes('salad') || 
      lowerTitle.includes('spinach') || 
      lowerTitle.includes('arugula') || 
      lowerTitle.includes('veggie') || 
      lowerTitle.includes('vegetable') || 
      lowerTitle.includes('caprese') || 
      lowerTitle.includes('basil') || 
      lowerTitle.includes('pesto') || 
      lowerTitle.includes('goat') || 
      lowerTitle.includes('herb')
    ) {
      return 'Salad';
    }
    
    // Check for Pasta/Lasagna/Spaghetti related
    if (
      lowerTitle.includes('pasta') || 
      lowerTitle.includes('spaghetti') || 
      lowerTitle.includes('macaroni') || 
      lowerTitle.includes('lasagna') || 
      lowerTitle.includes('penne') || 
      lowerTitle.includes('noodle') || 
      lowerTitle.includes('tortellini')
    ) {
      return 'Pasta';
    }
    
    // Check for Beef/Meat/Chicken/Pork related
    if (
      lowerTitle.includes('beef') || 
      lowerTitle.includes('meat') || 
      lowerTitle.includes('sausage') || 
      lowerTitle.includes('pepperoni') || 
      lowerTitle.includes('chicken') || 
      lowerTitle.includes('bacon') || 
      lowerTitle.includes('ham') || 
      lowerTitle.includes('pork') || 
      lowerTitle.includes('prosciutto') || 
      lowerTitle.includes('salami') || 
      lowerTitle.includes('steak') || 
      lowerTitle.includes('bbq') || 
      lowerTitle.includes('pepper')
    ) {
      return 'Beef';
    }
    
    // Default fallback
    return 'Pizza';
  },

  /**
   * Generates a deterministically shuffled array of unique prices from $10 to $150
   * @param {number} totalCount 
   * @returns {Array<number>} Prices
   */
  generateDeterministicPrices(totalCount) {
    if (totalCount <= 0) return [];
    
    const prices = [];
    if (totalCount === 1) {
      return [10];
    }
    
    for (let i = 0; i < totalCount; i++) {
      // Linear interpolation from 10 to 150
      prices.push(10 + Math.round((i / (totalCount - 1)) * 140));
    }

    // Deterministic Knuth-Fisher-Yates Shuffle using a simple seeded PRNG
    let seed = 98765; // Fixed seed for reproducibility
    for (let i = prices.length - 1; i > 0; i--) {
      // Seeded random calculation
      const x = Math.sin(seed++) * 10000;
      const randomValue = x - Math.floor(x);
      const j = Math.floor(randomValue * (i + 1));
      
      // Swap
      const temp = prices[i];
      prices[i] = prices[j];
      prices[j] = temp;
    }
    return prices;
  }
};
