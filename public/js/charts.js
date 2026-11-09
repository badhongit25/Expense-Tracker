/**
 * Chart.js controller for Expense Category Visualization
 */
const ChartController = {
  chartInstance: null,

  categoryColorMap: {
    'Metro Rail': { bg: '#10b981', border: '#059669', badgeClass: 'badge-metro' },
    'Uber': { bg: '#f59e0b', border: '#d97706', badgeClass: 'badge-uber' },
    'DIU Commute': { bg: '#0284c7', border: '#0369a1', badgeClass: 'badge-diu' },
    'Tuition Snacks': { bg: '#ec4899', border: '#db2777', badgeClass: 'badge-tuition' },
    'Gadgets': { bg: '#8b5cf6', border: '#7c3aed', badgeClass: 'badge-gadgets' },
    'Others': { bg: '#64748b', border: '#475569', badgeClass: 'badge-others' }
  },

  init() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Default empty chart
    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: '#0f172a',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 600
        },
        plugins: {
          legend: {
            display: false // Using custom sleek interactive legend HTML
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#38bdf8',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                const value = Number(context.raw) || 0;
                const total = context.chart._metasets[context.datasetIndex].total || 1;
                const percentage = ((value / total) * 100).toFixed(1);
                const currency = window.currentCurrencySymbol || '৳';
                return ` ${context.label}: ${currency}${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  },

  update(categoryBreakdown = [], totalAmount = 0) {
    if (!this.chartInstance) {
      this.init();
    }

    const currency = window.currentCurrencySymbol || '৳';
    const centerTotalEl = document.getElementById('chartCenterTotal');
    if (centerTotalEl) {
      centerTotalEl.textContent = `${currency}${Number(totalAmount).toFixed(2)}`;
    }

    const legendContainer = document.getElementById('categoryLegendContainer');

    if (!categoryBreakdown || categoryBreakdown.length === 0 || totalAmount === 0) {
      this.chartInstance.data.labels = ['No Expenses'];
      this.chartInstance.data.datasets[0].data = [1];
      this.chartInstance.data.datasets[0].backgroundColor = ['#1e293b'];
      this.chartInstance.update();

      if (legendContainer) {
        legendContainer.innerHTML = `
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
            <span class="text-xs text-slate-400 font-mono">No data for selected period</span>
          </div>
        `;
      }
      return;
    }

    const labels = [];
    const dataValues = [];
    const colors = [];
    let legendHtml = '';

    categoryBreakdown.forEach(item => {
      const config = this.categoryColorMap[item.category] || { bg: '#64748b', border: '#475569', badgeClass: 'badge-others' };
      labels.push(item.category);
      dataValues.push(Number(item.total));
      colors.push(config.bg);

      const percent = totalAmount > 0 ? ((Number(item.total) / totalAmount) * 100).toFixed(1) : 0;

      legendHtml += `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/70 hover:border-slate-700 transition">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${config.bg}"></span>
            <span class="text-xs font-medium text-slate-300">${item.category}</span>
          </div>
          <div class="flex items-center space-x-2 font-mono text-xs">
            <span class="text-slate-400">${currency}${Number(item.total).toFixed(0)}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">${percent}%</span>
          </div>
        </div>
      `;
    });

    this.chartInstance.data.labels = labels;
    this.chartInstance.data.datasets[0].data = dataValues;
    this.chartInstance.data.datasets[0].backgroundColor = colors;
    this.chartInstance.update();

    if (legendContainer) {
      legendContainer.innerHTML = legendHtml;
    }
  }
};
