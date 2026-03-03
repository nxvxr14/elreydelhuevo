# AGENTS.md - Coding Agent Guidelines

## Project Overview

**EL REY DEL HUEVO** - POS and Inventory Management System  
A Point of Sale (POS) system built with Node.js/Express backend and vanilla JavaScript frontend.

- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript, HTML, CSS (dark theme)
- **Database**: JSON files in `/database/` folder (no SQL database)
- **Currency**: Colombian Pesos ($) - NO decimals, use thousands separators (e.g., `$ 1.500.000`)

---

## Build/Run Commands

```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Start server (development) - same as production, no hot reload
npm run dev

# Server runs on http://localhost:3430 (or PORT env var)
```

**No test framework is configured.** If adding tests, use Jest or Mocha.

```bash
# Check JavaScript syntax
node --check <file.js>

# Example: Check pos.js syntax
node --check public/js/pos.js
```

---

## Project Structure

```
/
├── server.js                    # Express server entry point
├── package.json
├── AGENTS.md
├── docs/
├── database/                    # JSON database files
│   ├── users.json              # User credentials
│   ├── products.json           # Products catalog
│   ├── categories.json         # Product categories
│   ├── clients.json            # Customer data
│   ├── sales.json              # Sales records
│   ├── expenses.json           # Expense records
│   ├── inventory.json          # Inventory movements
│   ├── payments.json           # Payment records (abonos/créditos)
│   ├── warehouses.json         # Warehouses catalog
│   └── cashRegisters.json      # Cash register sessions
├── public/                      # Static frontend files
│   ├── css/styles.css          # Global styles (dark theme)
│   ├── js/
│   │   ├── utils.js            # Shared utilities (formatCurrency, etc.)
│   │   ├── auth.js             # Authentication handling
│   │   ├── pos.js              # POS page logic
│   │   ├── dashboard.js        # Dashboard logic
│   │   ├── products.js         # Products management
│   │   ├── periodFilter.js     # Shared period filtering logic
│   │   ├── warehouses.js       # Warehouses module
│   │   └── reports/            # Reports frontend modules
│   └── views/                  # HTML pages
│       ├── login.html
│       ├── dashboard.html
│       ├── pos.html
│       ├── inventory.html
│       ├── sales.html
│       ├── reports.html
│       └── ...
└── src/
    ├── middleware/auth.js       # Authentication middleware
    ├── utils/database.js        # JSON file read/write utilities
    ├── routes/                  # Express route definitions
    ├── controllers/             # Request handlers
    └── services/                # Business logic
```

---

## Code Style Guidelines

### JavaScript (Backend - Node.js)

1. **Imports**: Use CommonJS (`require`/`module.exports`)
   ```javascript
   const express = require('express');
   const ProductService = require('../services/productService');
   module.exports = ProductController;
   ```

2. **Naming Conventions**:
   - Files: `camelCase.js` (e.g., `productController.js`, `authRoutes.js`)
   - Controllers/Services: PascalCase objects with methods
   - Functions: camelCase
   - Constants: UPPER_SNAKE_CASE

3. **Controller Pattern**:
   ```javascript
   const Controller = {
       getAll(req, res) {
           const items = Service.getAll();
           return res.json({ success: true, items });
       },
       
       create(req, res) {
           const result = Service.create(req.body);
           if (!result.success) {
               return res.status(400).json(result);
           }
           return res.status(201).json(result);
       }
   };
   ```

4. **Service Pattern**:
   ```javascript
   const Service = {
       getAll() {
           const data = db.readJSON('items.json');
           return data ? data.items : [];
       },
       
       create(itemData) {
           // Validation
           if (!itemData.name) {
               return { success: false, message: 'Name is required' };
           }
           // ... business logic
           return { success: true, item: newItem };
       }
   };
   ```

5. **Error Handling**:
   - Return `{ success: false, message: 'Error description' }` for business errors
   - Use HTTP status codes: 400 (bad request), 404 (not found), 401 (unauthorized)
   - Global error handler catches unhandled errors

### JavaScript (Frontend)

1. **Global Utils Object**: Use `Utils.*` for common functions
   ```javascript
   Utils.formatCurrency(amount)    // Returns "$ 1.500.000"
   Utils.formatNumber(num)         // Returns "1.500.000" (no $ symbol)
   Utils.parseNumber(str)          // Converts "1.500.000" to 1500000
   Utils.escapeHtml(str)           // Prevents XSS
   Utils.showToast(msg, type)      // Shows notification
   Utils.fetch(url, options)       // Wrapper with error handling
   ```

2. **API Calls**: Always use `Utils.fetch()` wrapper
   ```javascript
   try {
       Utils.showLoading();
       const result = await Utils.fetch('/api/products', {
           method: 'POST',
           body: JSON.stringify(data)
       });
       Utils.showToast('Success', 'success');
   } catch (error) {
       Utils.showToast(error.message, 'danger');
   } finally {
       Utils.hideLoading();
   }
   ```

3. **DOM Manipulation**: Use vanilla JS, no jQuery
   ```javascript
   document.getElementById('elementId')
   element.innerHTML = `<div>...</div>`
   element.classList.add('active')
   ```

### CSS

1. **CSS Variables**: Use defined CSS variables from `styles.css`
   ```css
   var(--primary)         /* #f59e0b - amber/gold */
   var(--bg-dark)         /* #0f172a - dark background */
   var(--bg-card)         /* #1e293b - card background */
   var(--bg-input)        /* #334155 - input background */
   var(--text-primary)    /* #f8fafc - white text */
   var(--text-secondary)  /* #94a3b8 - gray text */
   var(--success)         /* #22c55e - green */
   var(--danger)          /* #ef4444 - red */
   var(--warning)         /* #f59e0b - amber */
   var(--border-color)    /* #334155 */
   ```

2. **Page-specific styles**: Add in `<style>` tag within the HTML file
3. **Use `!important` sparingly**: Only when overriding global styles

---

## Database (JSON Files)

- Located in `/database/` folder
- Use `src/utils/database.js` functions:
  ```javascript
  db.readJSON('products.json')   // Returns parsed JSON or null
  db.writeJSON('filename', data) // Returns true/false
  db.generateReference('V')      // Generates unique ID like "V17098234561234"
  db.getCurrentDate()            // Returns "YYYY-MM-DD"
  db.getCurrentDateTime()        // Returns ISO string
  ```

---

## Authentication

- **Login credentials**: `admin` / `huevos`
- **Global password for edit/delete**: `961114`
- Session-based auth using `express-session`
- Protected routes use `isAuthenticated` middleware

---

## Important Notes

1. **No TypeScript** - Pure JavaScript
2. **No build process** - Files served directly
3. **No decimals in currency** - Always use `Math.round()`
4. **Colombian locale** - Use `es-CO` for number formatting
5. **Dark theme** - All UI uses dark color scheme
6. **Mobile responsive** - CSS includes media queries
7. **Cantidad de producto** - Solo enteros o `,5` (ej: 3, 3,5)
