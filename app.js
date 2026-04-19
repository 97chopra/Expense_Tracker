
//  CONSTANTS 
const BUDGETS = {
  'Food & Groceries': 1500,
  'Transport':        700,
  'Entertainment':    300,
  'Utilities':        500
};

const CAT_COLORS = {
  'Food & Groceries': '#7c5cbf',
  'Transport':        '#00d4ff',
  'Entertainment':    '#d45cbf',
  'Utilities':        '#ffb347',
  'Other':            '#55556a',
  'income':           '#00e676'
};

const CAT_ICONS = {
  'Food & Groceries': '🛒',
  'Transport':        '🚌',
  'Entertainment':    '🎬',
  'Utilities':        '💡',
  'Other':            '📦',
  'income':           '💰'
};

const STORAGE_KEY = 'expenseiq_txs';

//  STATE 
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let activeFilter = 'all';
let chart        = null;

//  SAVE TO LOCALSTORAGE 
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

//  INIT 
function init() {
  document.getElementById('navMonth').textContent =
    new Date().toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('qDate').value = today;
  document.getElementById('mDate').value = today;

  document.getElementById('filterBar').addEventListener('click', e => {
    const btn = e.target.closest('.f-btn');
    if (!btn) return;
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderTransactions();
  });

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  render();
}

//  RENDER ALL
function render() {
  renderSummary();
  renderChart();
  renderBudgets();
  renderTransactions();
}

//  SUMMARY CARDS 
function renderSummary() {
  const income  = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  document.getElementById('balDisplay').textContent =
    '$ ' + Math.abs(balance).toLocaleString('en-NZ', { minimumFractionDigits: 2 }) +
    (balance < 0 ? ' (-)' : '');

  document.getElementById('incDisplay').textContent =
    '$ ' + income.toLocaleString('en-NZ', { minimumFractionDigits: 2 });

  document.getElementById('expDisplay').textContent =
    '$ ' + expense.toLocaleString('en-NZ', { minimumFractionDigits: 2 });
}

//  DONUT CHART 
function renderChart() {
  const totals = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

  const cats   = Object.keys(totals);
  const vals   = cats.map(c => totals[c]);
  const colors = cats.map(c => CAT_COLORS[c] || '#7c5cbf');
  const total  = vals.reduce((s, v) => s + v, 0);

  document.getElementById('chartAmt').textContent =
    '$ ' + total.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const ctx = document.getElementById('donutChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats.length ? cats : ['No data'],
      datasets: [{
        data:            cats.length ? vals : [1],
        backgroundColor: cats.length ? colors : ['#1a1a2e'],
        borderWidth:     cats.length ? 3 : 0,
        borderColor:     '#12121e',
        hoverOffset:     6
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: cats.length > 0,
          callbacks: {
            label: ctx =>
              ` ${ctx.label}: $ ${ctx.raw.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`
          }
        }
      }
    }
  });

  // Update legend
  document.getElementById('legend').innerHTML = cats.length === 0
    ? '<li style="color:var(--t3);font-size:13px">No expenses yet</li>'
    : cats.map((c, i) => `
        <li>
          <span class="legend-name">
            <span class="legend-dot" style="background:${colors[i]}"></span>${c}
          </span>
          <span class="legend-val">
            $ ${vals[i].toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
          </span>
        </li>`).join('');
}

//  BUDGET GOALS 
function renderBudgets() {
  const spent = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    });

  document.getElementById('budgetList').innerHTML = Object.entries(BUDGETS)
    .map(([cat, limit]) => {
      const s   = spent[cat] || 0;
      const pct = Math.min((s / limit) * 100, 100);

      const barClass  = pct >= 100 ? 'danger' : pct >= 85 ? 'warn' : '';
      const textColor = pct >= 100
        ? 'var(--red)'
        : pct >= 85
        ? 'var(--amber)'
        : 'var(--t1)';

      return `
        <div class="budget-item">
          <div class="budget-row">
            <span class="budget-name">${cat}</span>
            <span class="budget-amt" style="color:${textColor}">
              $ ${s.toLocaleString('en-NZ', { minimumFractionDigits: 0 })} /
              $ ${limit.toLocaleString('en-NZ')}
            </span>
          </div>
          <div class="bar-bg">
            <div class="bar-fill ${barClass}" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
}

//  TRANSACTION LIST 
function renderTransactions() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase();

  let list = [...transactions].reverse();

  if (activeFilter === 'income') {
    list = list.filter(t => t.type === 'income');
  } else if (activeFilter === 'expense') {
    list = list.filter(t => t.type === 'expense');
  } else if (activeFilter !== 'all') {
    list = list.filter(t => t.category === activeFilter);
  }

  if (search) {
    list = list.filter(t =>
      t.desc.toLowerCase().includes(search) ||
      t.category.toLowerCase().includes(search)
    );
  }

  const el = document.getElementById('txList');

  if (list.length === 0) {
    el.innerHTML = '<li class="tx-empty">No transactions found. Add one above!</li>';
    return;
  }

  el.innerHTML = list.map(t => {
    const icon = t.type === 'income' ? '💰' : (CAT_ICONS[t.category] || '📦');
    const sign = t.type === 'income' ? '+' : '-';
    const cls  = t.type === 'income' ? 'pos' : 'neg';
    const date = new Date(t.date + 'T00:00:00')
      .toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });

    return `
      <li class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${icon}</div>
          <div>
            <div class="tx-name">${t.desc}</div>
            <div class="tx-cat">${t.category}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:4px">
          <div class="tx-right">
            <span class="tx-amount ${cls}">
              ${sign} $ ${t.amount.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
            </span>
            <span class="tx-date">${date}</span>
          </div>
          <button class="tx-del" onclick="deleteTx('${t.id}')" title="Delete">✕</button>
        </div>
      </li>`;
  }).join('');
}

//  ADD TRANSACTION 
function addTransaction(desc, amount, type, category, date) {
  if (!desc || !desc.trim()) {
    showToast('⚠️ Please enter a description'); return false;
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    showToast('⚠️ Please enter a valid amount'); return false;
  }
  if (!date) {
    showToast('⚠️ Please select a date'); return false;
  }

  const tx = {
    id:       Date.now().toString(),
    desc:     desc.trim(),
    amount:   parseFloat(amount),
    type:     type,
    category: type === 'income' ? 'income' : category,
    date:     date
  };

  transactions.push(tx);
  save();
  render();
  showToast(' Transaction added!');
  return true;
}

//  QUICK ADD 
function quickAdd() {
  const ok = addTransaction(
    document.getElementById('qDesc').value,
    document.getElementById('qAmt').value,
    document.getElementById('qType').value,
    document.getElementById('qCat').value,
    document.getElementById('qDate').value
  );

  if (ok) {
    document.getElementById('qDesc').value = '';
    document.getElementById('qAmt').value  = '';
  }
}

//  MODAL ADD 
function modalAdd() {
  const ok = addTransaction(
    document.getElementById('mDesc').value,
    document.getElementById('mAmt').value,
    document.getElementById('mType').value,
    document.getElementById('mCat').value,
    document.getElementById('mDate').value
  );

  if (ok) closeModal();
}

// DELETE TRANSACTION 
function deleteTx(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
  showToast('🗑️ Transaction deleted');
}

// MODAL OPEN / CLOSE 
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('mDesc').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('mDesc').value = '';
  document.getElementById('mAmt').value  = '';
}

//  EXPORT CSV 
function exportCSV() {
  if (!transactions.length) {
    showToast('⚠️ No transactions to export');
    return;
  }

  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount ($)'];
  const rows    = transactions.map(t => [
    t.date,
    `"${t.desc}"`,
    t.category,
    t.type,
    t.amount.toFixed(2)
  ]);

  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `expenseiq_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();

  URL.revokeObjectURL(url);
  showToast('📥 CSV exported successfully!');
}

//  TOAST NOTIFICATION 
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className   = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

//  START APP 
init();