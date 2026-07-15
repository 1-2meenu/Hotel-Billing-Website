function formatCurrency(amount) {
  return `₹${(Number(amount) || 0).toFixed(2)}`;
}

function setYearInFooter() {
  const span = document.getElementById('yearSpan');
  if (span) {
    span.textContent = String(new Date().getFullYear());
  }
}

function showMessage(container, text, type = 'success') {
  if (!container) return;
  if (!text) {
    container.innerHTML = '';
    return;
  }
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  container.innerHTML = '';
  container.appendChild(div);
}

async function fetchMenu() {
  const res = await fetch('/api/menu');
  if (!res.ok) throw new Error('Failed to load menu.');
  return await res.json();
}

function renderAdminMenu(menu) {
  const body = document.getElementById('adminMenuBody');
  if (!body) return;

  body.innerHTML = '';

  if (!Array.isArray(menu) || !menu.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No menu items yet. Add your first dish below.';
    body.appendChild(row);
    row.appendChild(cell);
    return;
  }

  menu.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category || ''}</td>
      <td class="text-right">${formatCurrency(item.price)}</td>
      <td>${item.isAvailable ? 'Yes' : 'No'}</td>
      <td>
        <img src="${item.imageUrl || 'images/placeholder.svg'}" alt="${item.name}" />
      </td>
      <td class="text-right">
        <button class="btn btn-outline btn-small" data-action="edit" data-id="${item.id}">Edit</button>
        <button class="btn btn-secondary btn-small" data-action="delete" data-id="${item.id}">Delete</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

function fillFormForEdit(item) {
  const editId = document.getElementById('editId');
  const nameInput = document.getElementById('nameInput');
  const priceInput = document.getElementById('priceInput');
  const categoryInput = document.getElementById('categoryInput');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const availableInput = document.getElementById('availableInput');
  const formTitle = document.getElementById('formTitle');
  const saveBtn = document.getElementById('saveBtn');

  if (!editId) return;

  editId.value = item.id;
  if (nameInput) nameInput.value = item.name || '';
  if (priceInput) priceInput.value = item.price != null ? String(item.price) : '';
  if (categoryInput) categoryInput.value = item.category || 'Other';
  if (imageUrlInput) imageUrlInput.value = item.imageUrl || '';
  if (availableInput) availableInput.checked = Boolean(item.isAvailable);
  if (formTitle) formTitle.textContent = 'Edit Item';
  if (saveBtn) saveBtn.textContent = 'Update Item';
}

function resetForm() {
  const form = document.getElementById('menuForm');
  const editId = document.getElementById('editId');
  const formTitle = document.getElementById('formTitle');
  const saveBtn = document.getElementById('saveBtn');
  if (form) form.reset();
  if (editId) editId.value = '';
  if (formTitle) formTitle.textContent = 'Add New Item';
  if (saveBtn) saveBtn.textContent = 'Save Item';
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const messages = document.getElementById('adminMessages');
  const editId = document.getElementById('editId');
  const nameInput = document.getElementById('nameInput');
  const priceInput = document.getElementById('priceInput');
  const categoryInput = document.getElementById('categoryInput');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const availableInput = document.getElementById('availableInput');

  const name = nameInput?.value.trim() || '';
  const price = Number(priceInput?.value || 0);
  const category = categoryInput?.value || 'Other';
  const imageUrl = imageUrlInput?.value.trim() || '';
  const isAvailable = Boolean(availableInput?.checked);

  if (!name || !Number.isFinite(price) || price <= 0) {
    showMessage(messages, 'Please enter a valid name and price.', 'error');
    return;
  }

  const isEditing = Boolean(editId?.value);
  const url = isEditing ? `/api/menu/${encodeURIComponent(editId.value)}` : '/api/menu';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, category, imageUrl, isAvailable })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save item.');
    }

    await fetchMenu()
      .then((menu) => renderAdminMenu(menu))
      .catch((err) => {
        console.error(err);
        showMessage(messages, 'Saved, but failed to refresh menu list.', 'error');
      });

    showMessage(messages, isEditing ? 'Item updated successfully.' : 'Item added successfully.', 'success');
    resetForm();
  } catch (err) {
    console.error(err);
    showMessage(messages, err.message || 'Failed to save item.', 'error');
  }
}

async function handleAdminTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute('data-action');
  const id = target.getAttribute('data-id');
  if (!action || !id) return;

  const messages = document.getElementById('adminMessages');

  if (action === 'edit') {
    try {
      const menu = await fetchMenu();
      const item = menu.find((m) => m.id === id);
      if (!item) {
        showMessage(messages, 'Item not found.', 'error');
        return;
      }
      fillFormForEdit(item);
    } catch (err) {
      console.error(err);
      showMessage(messages, 'Failed to load item for editing.', 'error');
    }
  }

  if (action === 'delete') {
    const confirmed = window.confirm('Delete this menu item? This cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/menu/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete item.');
      }
      const menu = await fetchMenu();
      renderAdminMenu(menu);
      showMessage(messages, 'Item deleted.', 'success');
    } catch (err) {
      console.error(err);
      showMessage(messages, err.message || 'Failed to delete item.', 'error');
    }
  }
}

async function initAdminPage() {
  setYearInFooter();
  const messages = document.getElementById('adminMessages');
  const body = document.getElementById('adminMenuBody');
  const form = document.getElementById('menuForm');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (body) {
    body.addEventListener('click', handleAdminTableClick);
  }

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetForm();
      showMessage(messages, '', 'success');
    });
  }

  try {
    const menu = await fetchMenu();
    renderAdminMenu(menu);
  } catch (err) {
    console.error(err);
    showMessage(messages, 'Failed to load menu. Please try again.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminPage();
});

