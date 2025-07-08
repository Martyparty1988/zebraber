// app.js
const storage = {
  get: (key, def) => JSON.parse(localStorage.getItem(key)) || def,
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

let pricePer100g = storage.get('pricePer100g', 100);
let calculations = storage.get('calculations', []);
let shifts = storage.get('shifts', []);
let currentShift = storage.get('currentShift', null);
let theme = storage.get('theme', 'dark');

// Elements
const weightInput = document.getElementById('weight');
const basePriceEl = document.getElementById('base-price');
const finalPriceEl = document.getElementById('final-price');
const profitEl = document.getElementById('profit');
const shiftBtn = document.getElementById('shift-btn');
const shiftInfo = document.getElementById('shift-info');
const shiftProfit = document.getElementById('shift-profit');
const shiftSales = document.getElementById('shift-sales');
const calcHistory = document.getElementById('calc-history');
const shiftHistory = document.getElementById('shift-history');
const clearCalcBtn = document.getElementById('clear-calc-history');
const clearShiftBtn = document.getElementById('clear-shift-history');
const priceInput = document.getElementById('price-per-100g');
const themeToggle = document.getElementById('theme-toggle');
const resetBtn = document.getElementById('reset-app');
const navButtons = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');
const markupButtons = document.querySelectorAll('.markup-btn');

// Kalkulace ceny
function calculatePrice(weight, markup) {
  const basePrice = (weight / 100) * pricePer100g;
  const finalPrice = basePrice * (1 + markup / 100);
  const profit = finalPrice - basePrice;
  return { basePrice, finalPrice, profit };
}

// Aktualizace UI kalkulačky
function updateCalculator() {
  const weight = parseFloat(weightInput.value) || 0;
  const markup = parseFloat(document.querySelector('.markup-btn.active')?.dataset.markup) || 0;
  const { basePrice, finalPrice, profit } = calculatePrice(weight, markup);
  basePriceEl.textContent = `${basePrice.toFixed(2)} Kč`;
  finalPriceEl.textContent = `${finalPrice.toFixed(2)} Kč`;
  profitEl.textContent = `${profit.toFixed(2)} Kč`;

  if (weight && markup) {
    const calc = { date: new Date(), weight, markup, basePrice, finalPrice, profit };
    calculations.unshift(calc);
    if (calculations.length > 50) calculations.pop();
    storage.set('calculations', calculations);
    if (currentShift) {
      currentShift.profit += profit;
      currentShift.sales += 1;
      storage.set('currentShift', currentShift);
      updateShiftInfo();
    }
    updateHistory();
  }
}

// Aktualizace směny
function updateShiftInfo() {
  if (currentShift) {
    shiftInfo.classList.remove('hidden');
    shiftProfit.textContent = `${currentShift.profit.toFixed(2)} Kč`;
    shiftSales.textContent = currentShift.sales;
    shiftBtn.textContent = 'Ukončit směnu';
  } else {
    shiftInfo.classList.add('hidden');
    shiftBtn.textContent = 'Začít směnu';
  }
}

// Aktualizace historie
function updateHistory() {
  calcHistory.innerHTML = calculations.map(c => `
    <div class="history-card">
      <p>${new Date(c.date).toLocaleString('cs')}</p>
      <p>Váha: <b>${c.weight}g</b>, Přirážka: <b>${c.markup}%</b></p>
      <p>Základ: <b>${c.basePrice.toFixed(2)} Kč</b>, Finální: <b>${c.finalPrice.toFixed(2)} Kč</b>, Výdělek: <b>${c.profit.toFixed(2)} Kč</b></p>
    </div>
  `).join('');
  shiftHistory.innerHTML = shifts.map(s => `
    <div class="history-card">
      <p>${new Date(s.date).toLocaleString('cs')}</p>
      <p>Výdělek: <b>${s.profit.toFixed(2)} Kč</b>, Prodejů: <b>${s.sales}</b></p>
    </div>
  `).join('');

  // Grafy pouze pokud sekce aktivní!
  const historySection = document.getElementById('history');
  if (historySection && historySection.classList.contains('active')) {
    const profitChart = document.getElementById('profit-chart');
    if (profitChart) {
      profitChart.width = profitChart.clientWidth; // Fix for Chart.js resize bug
      new Chart(profitChart, {
        type: 'line',
        data: {
          labels: calculations.slice(0, 10).reverse().map(c => new Date(c.date).toLocaleDateString('cs')),
          datasets: [{
            label: 'Zisk z výpočtů',
            data: calculations.slice(0, 10).reverse().map(c => c.profit),
            borderColor: '#4facfe',
            backgroundColor: 'rgba(79, 172, 254, 0.2)',
            fill: true,
            tension: 0.38,
            pointRadius: 3
          }],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } },
      });
    }
    const shiftChart = document.getElementById('shift-chart');
    if (shiftChart) {
      shiftChart.width = shiftChart.clientWidth;
      new Chart(shiftChart, {
        type: 'bar',
        data: {
          labels: shifts.slice(0, 10).reverse().map(s => new Date(s.date).toLocaleDateString('cs')),
          datasets: [{
            label: 'Zisk ze směn',
            data: shifts.slice(0, 10).reverse().map(s => s.profit),
            backgroundColor: '#ff6b6b',
          }],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } },
      });
    }
  }
}

// Navigace
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.page).classList.add('active');
    if (btn.dataset.page === "history") updateHistory();
  });
});

markupButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    markupButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateCalculator();
  });
});
weightInput.addEventListener('input', updateCalculator);

shiftBtn.addEventListener('click', () => {
  if (currentShift) {
    shifts.unshift({ date: new Date(), profit: currentShift.profit, sales: currentShift.sales });
    storage.set('shifts', shifts);
    currentShift = null;
    storage.set('currentShift', null);
  } else {
    currentShift = { profit: 0, sales: 0, start: new Date() };
    storage.set('currentShift', currentShift);
  }
  updateShiftInfo();
  updateHistory();
});
priceInput.addEventListener('change', () => {
  pricePer100g = parseFloat(priceInput.value) || 100;
  storage.set('pricePer100g', pricePer100g);
  updateCalculator();
});
themeToggle.addEventListener('change', () => {
  theme = themeToggle.checked ? 'dark' : 'light';
  document.body.classList.toggle('light', theme === 'light');
  storage.set('theme', theme);
});
resetBtn.addEventListener('click', () => {
  localStorage.clear();
  calculations = [];
  shifts = [];
  currentShift = null;
  pricePer100g = 100;
  theme = 'dark';
  storage.set('pricePer100g', pricePer100g);
  storage.set('theme', theme);
  window.location.reload();
});
clearCalcBtn.addEventListener('click', () => {
  calculations = [];
  storage.set('calculations', calculations);
  updateHistory();
});
clearShiftBtn.addEventListener('click', () => {
  shifts = [];
  storage.set('shifts', shifts);
  updateHistory();
});

// Inicializace
document.body.classList.toggle('light', theme === 'light');
themeToggle.checked = theme === 'dark';
priceInput.value = pricePer100g;
updateShiftInfo();
updateHistory();
