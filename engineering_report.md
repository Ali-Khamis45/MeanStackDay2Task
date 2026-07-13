# Engineering Report: Gourmet Product Explorer Architecture & Design

**Author**: Ali khamis 
**Date**: July 13, 2026  
**Project**: Product Explorer (Vanilla Search, Filter & Sort)  
**Repository**: [https://github.com/Ali-Khamis45/MeanStackDay2Task](https://github.com/Ali-Khamis45/MeanStackDay2Task)

---

## 1. Executive Summary

This report details the architectural blueprint, technology choices, and data-processing pipelines implemented in the **Product Explorer** application. The project constraints mandated building a fully responsive, performant, and premium product catalog using **Vanilla JavaScript (ES6+), HTML5, and CSS3 exclusively**, forbidding modern rendering frameworks (e.g., React, Angular) or styling libraries (e.g., Bootstrap, Tailwind).

To deliver a production-grade codebase under these constraints, the application is designed around three core software engineering principles:
1.  **Separation of Concerns (SoC)**: Modular files divide the application into API/Data Fetching, Pure State Filtering, DOM Management, and Controller/Orchestrator layers.
2.  **Unidirectional Data Flow**: Application state acts as the single source of truth. User actions update the state, which triggers a complete, non-mutative filtering/sorting pipeline, ending in DOM reconciliation.
3.  **Strict Caching and Single Fetch**: Network requests occur exactly once during application bootstrap. All subsequent operations (search, filter, sort, aggregation) are performed client-side on the in-memory master array.

---

## 2. Architectural Overview & Component Map

The application divides responsibilities across four distinct modules loaded sequentially via deferred scripts:

```
                  ┌──────────────────────────────────────────┐
                  │                 index.html               │
                  │   Defines UI layout and cached DOM nodes  │
                  └────────────────────┬─────────────────────┘
                                       │ Load
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │                 api.js                   │
                  │   Fetches raw data, maps, normalizes   │
                  │    and applies deterministic heuristics   │
                  └────────────────────┬─────────────────────┘
                                       │ Return Array
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │                 app.js                   │
                  │   Manages Master State, LocalStorage,    │
                  │   debounces search input, delegates events │
                  └──────────────┬───────────────────┬───────┘
                                 │                   │
                     Run Queries │                   │ Draw Views
                                 ▼                   ▼
     ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
     │              filter.js                 │ │                 ui.js                  │
     │   Pure functions executing advanced    │ │   Mutates DOM, renders cards, chips,   │
     │    ES6 array filters & aggregations    │ │    statistics, and skeleton screens    │
     └────────────────────────────────────────┘ └────────────────────────────────────────┘
```

*   **`index.html`**: Defines semantic scaffolding (`header`, `main`, `aside`, `section`, `footer`). It contains elements for the live filter controls, search bars, price range input, loading skeletons, and the target cards grid.
*   **`js/api.js`**: Connects to the public Forkify API. It maps raw recipes to product models, applies category corrections, generates prices, and filters placeholders.
*   **`js/filter.js`**: Contains pure, deterministic utility functions for query filters. It does not touch the DOM or mutate state.
*   **`js/ui.js`**: Translates state and computed values into visual layout modifications.
*   **`js/app.js`**: The central orchestrator/controller. It maintains application state, registers events, debounces keystrokes, and synchronizes data with `localStorage`.

---

## 3. Sourcing and Merging Multi-Query Datasets

### The Challenge of Incorrect Categorization
Originally, pulling data from a single query (`search?q=pizza`) and attempting to tag items as Pizza, Pasta, Salad, Beef, or Dough resulted in false categorizations, since all recipes returned were fundamentally pizza variants.

### The Solution: Parallel Sourcing and Union Merging
To provide high-fidelity product data, the API layer was rewritten in [js/api.js](file:///d:/NTI/MeanStackDay2Task/js/api.js#L14-L83) to fetch category-specific query results:
1.  **Pizza**: Sourced from `search?q=pizza`
2.  **Salad**: Sourced from `search?q=salad`
3.  **Pasta**: Sourced from `search?q=pasta`
4.  **Beef**: Sourced from `search?q=beef`
5.  **Dough**: Sourced from `search?q=croissant` (since `dough` or `bread` are unsupported by the API, `croissant` serves as a perfect bakery/dough alternative).

### Concurrency Design Choice
Rather than fetching these queries sequentially (which would block the UI thread and introduce substantial latency), we leverage **`Promise.all`**:
```javascript
const fetchPromises = categoriesToFetch.map(async ({ query, category }) => { ... });
const results = await Promise.all(fetchPromises);
```
This launches 5 HTTP queries concurrently, minimizing boot time. The arrays are flat-merged using `results.flat()`, resulting in a final master cache of **136 unique products**.

### Overlapping ID Resolution
A recipe can occasionally appear across multiple search queries (e.g. a "pasta salad" appearing under both pasta and salad). To prevent duplicate ID conflicts in the DOM, each recipe ID is pre-tagged with its category during mapping:
```javascript
id: `${category.toLowerCase()}_${recipe.recipe_id}`
```
This guarantees unique identifiers for DOM keying and lookup utilities.

---

## 4. Normalization and Self-Correction Systems

### A. Seeded Deterministic Knuth-Fisher-Yates Price Shuffle
To verify the price slider visually, we require a wide, realistic, and evenly-distributed price range (**$10 to $150**). 
To make this happen deterministically (ensuring that reloading the page always yields the exact same price for a given product), we use a linear interpolation formula combined with a seeded Pseudo-Random Number Generator (PRNG):

1.  **Linear Range Splicing**:
    We divide the $10-$150 range ($140 span) into `totalCount` steps:
    $$\text{Price}_i = 10 + \text{Math.round}\left(\frac{i}{\text{totalCount} - 1} \times 140\right)$$
    This generates a list of perfectly unique integers from $10 to $150.
2.  **Knuth-Fisher-Yates Shuffle**:
    We shuffle the array of prices deterministically using a fixed-seed PRNG:
    ```javascript
    let seed = 98765;
    for (let i = prices.length - 1; i > 0; i--) {
      const x = Math.sin(seed++) * 10000;
      const randomValue = x - Math.floor(x);
      const j = Math.floor(randomValue * (i + 1));
      // Swap elements
    }
    ```
    Shuffling breaks the linear relationship between ranking index and price, distributing low, medium, and premium prices organically across all categories.

### B. Title-Based Category Refinement Sifter
Although queries are separated, API queries can return misclassified recipes (e.g., the Forkify `salad` search query returns *Angel Chicken Pasta*).
To enforce data integrity, the sifter function `refineCategory` in `api.js` scans the recipe title for category-specific keywords and overrides the category tag:
```javascript
refineCategory(title, currentCategory) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('pasta') || lowerTitle.includes('spaghetti') || ...) {
    return 'Pasta';
  }
  ...
}
```
This places *Angel Chicken Pasta* correctly in **Pasta**, correcting the API indexing errors.

### C. Placeholder Interception and Graceful Fallback
*   **API Level**: Epicurious recipes in Forkify commonly point to a generic green "epi" logo placeholder. The mapping pipeline in `api.js` checks if the image URL contains keywords like `epicurious`, `logo`, or `placeholder` and automatically swaps it for a high-quality stock photo corresponding to its category.
*   **DOM Level**: In `ui.js`, product card images are rendered with an `onerror` fallback callback:
    ```html
    onerror="this.onerror=null; this.src='${fallbackForCat}';"
    ```
    If any recipe image fails to load or experiences connection dropouts, it falls back to a high-quality photo representing that card's exact category (e.g., steak photo for beef cards, bread photo for dough cards).

---

## 5. Advanced ES6+ JavaScript Array Operations

To demonstrate advanced JS architecture, we avoided standard `for` and `while` loops, instead using declarative array methods to manipulate the cache:

| Method | Application in Project | Architectural Rationale |
| :--- | :--- | :--- |
| **`map()`** | Sourcing mapping in [api.js](file:///d:/NTI/MeanStackDay2Task/js/api.js#L56-L84) | Transforms raw API recipes into normalized product structures immutably. |
| **`filter()`** | Query filtering in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L15-L34) | Compiles subsets based on live search keywords, price limits, and active categories. |
| **`sort()`** | Card ordering in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L41-L57) | Sorts numerical prices and alphabetical text. Copied via the spread operator `[...products]` to prevent in-place mutations. |
| **`reduce()`** | Insights computing in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L79-L80) | Accumulates prices to calculate the live average price of the filtered selection. |
| **`every()`** | Insights computing in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L83) | Assesses whether *every* visible card is strictly within the selected price budget. |
| **`some()`** | Insights computing in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L86) | Checks if at least one premium option ($\ge \$60$) exists in the current filtered results. |
| **`find()`** | Insights computing in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L92) | Scans the visible items to identify the product card containing the cheapest price. |
| **`findIndex()`** | Index lookups in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L112) | Resolves item offsets for state changes or cart toggles. |
| **`forEach()`** | Card rendering in [ui.js](file:///d:/NTI/MeanStackDay2Task/js/ui.js#L73-L98) | Loops through the active product array to create and append card nodes to the DOM. |
| **`includes()`** | Search filter matching in [filter.js](file:///d:/NTI/MeanStackDay2Task/js/filter.js#L21-L22) | Checks if search keywords match the product title or category name. |

---

## 6. State Management & Performance Optimization

### A. Master State Structure
We declare a central state store to coordinate all search and filter views:
```javascript
const state = {
  allProducts: [],  // Set exactly once on application boot
  filters: {
    search: '',     // Real-time keyword filter
    category: 'all',// 'all' | 'Pizza' | 'Salad' | 'Pasta' | 'Dough' | 'Beef'
    maxPrice: 150   // Upper price ceiling ($10 - $150)
  },
  sortBy: 'name-asc' // 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
};
```

### B. High-Frequency Input Debouncing
Typing search queries in real-time re-filters and re-renders 136 items. If a user types quickly, triggering a DOM re-render on every keystroke causes frame drops. 
To optimize this, we implement a **debounce helper**:
```javascript
function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
```
This wraps the search event listener, delaying layout recalculations until the user has stopped typing for 250 milliseconds.

### C. LocalStorage Session Persistence
To ensure a premium UX, the user's category, price ceiling, and sorting choice are saved on change:
```javascript
localStorage.setItem('productexplorer_filters', JSON.stringify(state.filters));
localStorage.setItem('productexplorer_sort', state.sortBy);
```
On page initialization, these keys are read, the controls are synchronized, and the products are immediately filtered to match the user's previous session.

---

## 7. Conclusions & Recommendations

The architecture of **Product Explorer** provides a solid, modular framework for client-side search and filtering. The code organization isolates logic into discrete modules, allowing for easy updates and maintenance.

### Recommendations for Future Expansion
1.  **Virtual Scrolling**: For catalogs exceeding 500 items, rendering all cards to the DOM can degrade paint performance. Implementing virtual scrolling (rendering only visible elements) would ensure 60fps performance regardless of catalog size.
2.  **Service Workers**: Implementing a service worker to cache Forkify API search responses would allow the application to load instantly on subsequent visits and function offline.
3.  **JSON Schema Validation**: Adding validation layers to raw API responses would make the mapping pipeline more resilient to upstream API shifts.
