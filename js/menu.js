const TAX_RATE = 0.05;
const CART_STORAGE_KEY = 'spice-garden-cart';

let menuItems = [];
let cart = [];

function loadCartFromStorage() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cart = parsed;
    }
  } catch (err) {
    console.error('Failed to load cart from storage', err);
  }
}

function saveCartToStorage() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error('Failed to save cart to storage', err);
  }
}

function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

function renderMenu() {
  const grid = document.getElementById('menuGrid');
  const empty = document.getElementById('menuEmptyMessage');

  if (!grid) return;

  grid.innerHTML = '';

  if (!menuItems.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  menuItems.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'menu-card';

    const disabled = !item.isAvailable;

    card.innerHTML = `
      <div class="menu-card-main">
        <img src="${item.imageUrl || 'images/placeholder.svg'}" alt="${item.name}" />
        <div class="menu-info">
          <div class="menu-name">${item.name}</div>
          <div class="menu-category">${item.category || ''}</div>
          <div class="menu-price">${formatCurrency(Number(item.price) || 0)}</div>
        </div>
      </div>
      <div class="menu-card-footer">
        <span class="availability-pill ${disabled ? 'unavailable' : ''}">
          ${disabled ? 'Unavailable' : 'Available'}
        </span>
        <button class="btn btn-primary btn-small" data-id="${item.id}" ${disabled ? 'disabled' : ''}>
          Add to Cart
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  grid.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('button[data-id]')) {
      const id = target.getAttribute('data-id');
      if (!id) return;
      addToCart(id);
    }
  });
}

function renderCart() {
  const body = document.getElementById('cartBody');
  const empty = document.getElementById('cartEmptyMessage');
  const subtotalEl = document.getElementById('subtotalAmount');
  const taxEl = document.getElementById('taxAmount');
  const grandEl = document.getElementById('grandTotalAmount');

  if (!body) return;

  body.innerHTML = '';

  if (!cart.length) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
  }

  let subtotal = 0;

  cart.forEach((entry) => {
    const lineTotal = entry.quantity * entry.unitPrice;
    subtotal += lineTotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.name}</td>
      <td class="text-center">
        <div class="qty-controls">
          <button class="btn btn-outline btn-small" data-action="dec" data-id="${entry.itemId}">-</button>
          <span>${entry.quantity}</span>
          <button class="btn btn-outline btn-small" data-action="inc" data-id="${entry.itemId}">+</button>
        </div>
      </td>
      <td class="text-right">${formatCurrency(entry.unitPrice)}</td>
      <td class="text-right">${formatCurrency(lineTotal)}</td>
      <td class="text-right">
        <button class="btn btn-outline btn-small" data-action="remove" data-id="${entry.itemId}">
          ✕
        </button>
      </td>
    `;
    body.appendChild(tr);
  });

  const tax = subtotal * TAX_RATE;
  const grand = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (taxEl) taxEl.textContent = formatCurrency(tax);
  if (grandEl) grandEl.textContent = formatCurrency(grand);
}

function addToCart(itemId) {
  const item = menuItems.find((m) => m.id === itemId);
  if (!item) return;

  const existing = cart.find((entry) => entry.itemId === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      itemId: item.id,
      name: item.name,
      unitPrice: Number(item.price) || 0,
      quantity: 1
    });
  }

  saveCartToStorage();
  renderCart();
}

function updateCartItemQuantity(itemId, delta) {
  const entry = cart.find((c) => c.itemId === itemId);
  if (!entry) return;
  entry.quantity += delta;
  if (entry.quantity <= 0) {
    cart = cart.filter((c) => c.itemId !== itemId);
  }
  saveCartToStorage();
  renderCart();
}

function removeCartItem(itemId) {
  cart = cart.filter((c) => c.itemId !== itemId);
  saveCartToStorage();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCartToStorage();
  renderCart();
}

async function payNow() {
  if (!cart.length) {
    window.alert('Your cart is empty. Add some items before paying.');
    return;
  }

  const subtotal = cart.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const grand = subtotal + tax;

  try {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: cart.map((entry) => ({
          itemId: entry.itemId,
          name: entry.name,
          unitPrice: entry.unitPrice,
          quantity: entry.quantity
        })),
        totalAmount: grand
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save order.');
    }

    const sale = await response.json();
    window.alert(`Order saved! Total: ${formatCurrency(sale.totalAmount)}.`);
    clearCart();
  } catch (err) {
    console.error(err);
    window.alert('Could not complete payment. Please try again.');
  }
}

function initCartInteractions() {
  const body = document.getElementById('cartBody');
  const clearBtn = document.getElementById('clearCartBtn');
  const printBtn = document.getElementById('printBillBtn');
  const payBtn = document.getElementById('payNowBtn');

  if (body) {
    body.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');
      if (!action || !id) return;

      if (action === 'inc') updateCartItemQuantity(id, 1);
      if (action === 'dec') updateCartItemQuantity(id, -1);
      if (action === 'remove') removeCartItem(id);
    });
  }

  if (clearBtn) clearBtn.addEventListener('click', () => clearCart());
  if (printBtn) printBtn.addEventListener('click', () => window.print());
  if (payBtn) payBtn.addEventListener('click', () => payNow());
}

async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) {
      throw new Error('Failed to load menu.');
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      menuItems = data;
    } else {
      menuItems = [];
    }
    renderMenu();
  } catch (err) {
    console.error(err);
    menuItems = [];
    renderMenu();
  }
}

function setYearInFooter() {
  const span = document.getElementById('yearSpan');
  if (span) {
    span.textContent = String(new Date().getFullYear());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setYearInFooter();
  loadCartFromStorage();
  renderCart();
  initCartInteractions();
  loadMenu();
});

