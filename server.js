const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

async function ensureDataFiles() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }

  const defaultMenu = [
    { id: 'idly', name: 'Idly', price: 25, category: 'Breakfast', imageUrl: 'images/idly.svg', isAvailable: true },
    { id: 'puttu', name: 'Puttu', price: 35, category: 'Breakfast', imageUrl: 'images/puttu.svg', isAvailable: true },
    { id: 'poori', name: 'Poori', price: 40, category: 'Breakfast', imageUrl: 'images/poori.svg', isAvailable: true },
    { id: 'coffee', name: 'Coffee', price: 20, category: 'Beverages', imageUrl: 'images/coffee.svg', isAvailable: true },
    { id: 'dosai', name: 'Dosai', price: 45, category: 'Breakfast', imageUrl: 'images/dosai.svg', isAvailable: true },
    { id: 'vada', name: 'Vada', price: 15, category: 'Snacks', imageUrl: 'images/vada.svg', isAvailable: true },
    { id: 'pazhampori', name: 'Pazhampori', price: 20, category: 'Snacks', imageUrl: 'images/pazhampori.svg', isAvailable: true }
  ];

  if (!fsSync.existsSync(MENU_FILE)) {
    await fs.writeFile(MENU_FILE, JSON.stringify(defaultMenu, null, 2), 'utf8');
  }

  if (!fsSync.existsSync(SALES_FILE)) {
    await fs.writeFile(SALES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Menu APIs
app.get('/api/menu', async (req, res) => {
  const menu = await readJson(MENU_FILE, []);
  res.json(menu);
});

app.post('/api/menu', async (req, res) => {
  const { name, price, category, imageUrl, isAvailable } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number.' });
  }

  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);

  const newItem = {
    id,
    name: name.trim(),
    price: numericPrice,
    category: category || 'Uncategorized',
    imageUrl: imageUrl || 'images/placeholder.svg',
    isAvailable: Boolean(isAvailable)
  };

  const menu = await readJson(MENU_FILE, []);
  menu.push(newItem);
  await writeJson(MENU_FILE, menu);

  res.status(201).json(newItem);
});

app.put('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, imageUrl, isAvailable } = req.body || {};

  const menu = await readJson(MENU_FILE, []);
  const index = menu.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found.' });
  }

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    menu[index].name = name.trim();
  }

  if (price !== undefined) {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }
    menu[index].price = numericPrice;
  }

  if (category !== undefined) {
    menu[index].category = category || 'Uncategorized';
  }

  if (imageUrl !== undefined) {
    menu[index].imageUrl = imageUrl || 'images/placeholder.svg';
  }

  if (isAvailable !== undefined) {
    menu[index].isAvailable = Boolean(isAvailable);
  }

  await writeJson(MENU_FILE, menu);
  res.json(menu[index]);
});

app.delete('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  const menu = await readJson(MENU_FILE, []);
  const index = menu.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found.' });
  }

  const [deleted] = menu.splice(index, 1);
  await writeJson(MENU_FILE, menu);
  res.json(deleted);
});

// Sales APIs
app.post('/api/sales', async (req, res) => {
  const { items, totalAmount } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  let computedTotal = 0;
  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineTotal = quantity * unitPrice;
    computedTotal += lineTotal;
    return {
      itemId: item.itemId,
      name: item.name,
      unitPrice,
      quantity,
      lineTotal
    };
  });

  if (computedTotal <= 0) {
    return res.status(400).json({ error: 'Total must be positive.' });
  }

  const saleRecord = {
    id: 'sale-' + Date.now().toString(36),
    items: normalizedItems,
    totalAmount: totalAmount && Number(totalAmount) > 0 ? Number(totalAmount) : computedTotal,
    createdAt: new Date().toISOString()
  };

  const sales = await readJson(SALES_FILE, []);
  sales.push(saleRecord);
  await writeJson(SALES_FILE, sales);

  res.status(201).json(saleRecord);
});

app.get('/api/sales', async (req, res) => {
  const { month } = req.query; // YYYY-MM
  const sales = await readJson(SALES_FILE, []);

  if (!month) {
    return res.json(sales);
  }

  const filtered = sales.filter((sale) => {
    if (!sale.createdAt) return false;
    return sale.createdAt.startsWith(month);
  });

  res.json(filtered);
});

ensureDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize data files:', err);
    process.exit(1);
  });

