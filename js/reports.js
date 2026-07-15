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

function getSelectedMonth() {
  const input = document.getElementById('monthInput');
  if (!input || !input.value) {
    return null;
  }
  return input.value; // YYYY-MM
}

async function loadSalesForMonth(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const res = await fetch(`/api/sales${query}`);
  if (!res.ok) {
    throw new Error('Failed to load sales.');
  }
  return await res.json();
}

function aggregateSales(sales) {
  const totals = {
    totalOrders: sales.length,
    totalSales: 0,
    perItem: {}
  };

  sales.forEach((sale) => {
    const amount = Number(sale.totalAmount) || 0;
    totals.totalSales += amount;
    (sale.items || []).forEach((item) => {
      const key = item.name || item.itemId || 'Unknown';
      const quantity = Number(item.quantity) || 0;
      const revenue = Number(item.lineTotal) || quantity * (Number(item.unitPrice) || 0);
      if (!totals.perItem[key]) {
        totals.perItem[key] = { quantity: 0, revenue: 0 };
      }
      totals.perItem[key].quantity += quantity;
      totals.perItem[key].revenue += revenue;
    });
  });

  return totals;
}

function renderSummary(totals) {
  const totalOrdersEl = document.getElementById('totalOrders');
  const totalSalesEl = document.getElementById('totalSales');

  if (totalOrdersEl) totalOrdersEl.textContent = String(totals.totalOrders);
  if (totalSalesEl) totalSalesEl.textContent = formatCurrency(totals.totalSales);
}

function renderItemBreakdown(perItem) {
  const body = document.getElementById('itemBreakdownBody');
  if (!body) return;

  body.innerHTML = '';

  const entries = Object.entries(perItem);
  if (!entries.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'No sales for this period.';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  entries
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .forEach(([name, info]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${name}</td>
        <td class="text-center">${info.quantity}</td>
        <td class="text-right">${formatCurrency(info.revenue)}</td>
      `;
      body.appendChild(tr);
    });
}

async function loadReport() {
  const messages = document.getElementById('reportsMessages');
  const month = getSelectedMonth();
  if (!month) {
    showMessage(messages, 'Please choose a month first.', 'error');
    return;
  }

  showMessage(messages, 'Loading report...', 'success');

  try {
    const sales = await loadSalesForMonth(month);
    const totals = aggregateSales(sales);
    renderSummary(totals);
    renderItemBreakdown(totals.perItem);
    if (!sales.length) {
      showMessage(messages, 'No sales recorded for this month.', 'error');
    } else {
      showMessage(messages, `Report loaded for ${month}.`, 'success');
    }
  } catch (err) {
    console.error(err);
    showMessage(messages, err.message || 'Failed to load report.', 'error');
  }
}

function initMonthInput() {
  const input = document.getElementById('monthInput');
  if (!input) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  input.value = `${year}-${month}`;
}

function initReportsPage() {
  setYearInFooter();
  initMonthInput();

  const loadBtn = document.getElementById('loadReportBtn');
  const monthInput = document.getElementById('monthInput');

  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      loadReport();
    });
  }

  if (monthInput) {
    monthInput.addEventListener('change', () => {
      loadReport();
    });
  }

  // Initial load for current month
  loadReport();
}

document.addEventListener('DOMContentLoaded', () => {
  initReportsPage();
});

