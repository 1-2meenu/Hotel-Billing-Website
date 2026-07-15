## Restaurant Website (Menu, Billing, Reports)

This project is a small multi-page restaurant site built with HTML, CSS, and vanilla JavaScript, backed by a minimal Node.js + Express server that persists data in JSON files.

### Features

- Customer-facing menu with images, cart, billing summary, QR pay section, and print-friendly bill.
- Admin panel to manage menu items (create, update, delete).
- Monthly sales report page with per-item breakdown and totals.

### Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the server**

   ```bash
   npm start
   ```

   The app will be available at `http://localhost:3000`.

### Project structure

- `index.html` – Customer menu and billing.
- `admin.html` – Admin page for menu CRUD.
- `reports.html` – Monthly sales report.
- `css/styles.css` – Shared styling, layout, and print styles.
- `js/menu.js` – Frontend logic for menu, cart, billing, Pay Now, and print.
- `js/admin.js` – Admin CRUD frontend logic.
- `js/reports.js` – Reports frontend logic.
- `server.js` – Express server with JSON persistence.
- `data/menu.json` – Menu items store.
- `data/sales.json` – Sales/orders store.
- `images/` – Food illustrations and payment QR SVG.

