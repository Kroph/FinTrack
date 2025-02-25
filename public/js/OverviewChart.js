// Create the overview charts functionality
const overviewCharts = {
  // Initialize the charts
  init: function() {
    this.chartContainer = document.getElementById('chart-container');
    this.chartCanvas = document.getElementById('chart-canvas');
    this.dataTypeButtons = document.querySelectorAll('.data-type-btn');
    this.chartTypeButtons = document.querySelectorAll('.chart-type-btn');
    
    // Set default states
    this.currentDataType = 'expense';
    this.currentChartType = 'pie';
    this.chart = null;
    
    // Define color palettes
    this.colorPalettes = {
      income: ['#25a244', '#2ecc71', '#27ae60', '#1abc9c', '#16a085', '#2ed573', '#7bed9f', '#3cb371'],
      expense: ['#e74c3c', '#c0392b', '#f72585', '#e84393', '#d63031', '#ff4757', '#ff6b81', '#eb2f06']
    };
    
    this.setupEventListeners();
    this.renderChart();
  },
  
  // Setup event listeners for buttons
  setupEventListeners: function() {
    // Data type toggle (Income/Expense)
    this.dataTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dataTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDataType = btn.dataset.type;
        this.renderChart();
      });
    });
    
    // Chart type toggle (Pie/Bar)
    this.chartTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.chartTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentChartType = btn.dataset.type;
        this.renderChart();
      });
    });
  },
  
  // Process data for chart
  processChartData: function() {
    // Filter transactions by type (income or expense)
    const filteredTransactions = window.transactions.filter(t => t.type === this.currentDataType);
    
    if (filteredTransactions.length === 0) {
      return null;
    }
    
    // Get the appropriate color palette based on data type
    const colorPalette = this.colorPalettes[this.currentDataType];
    
    // For pie charts - group by category
    if (this.currentChartType === 'pie') {
      const categoryData = {};
      
      filteredTransactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        if (!categoryData[category]) {
          categoryData[category] = 0;
        }
        categoryData[category] += parseFloat(transaction.amount);
      });
      
      // Create colors array with enough entries for all categories
      const categoryCount = Object.keys(categoryData).length;
      const colors = Array(categoryCount).fill().map((_, i) => {
        return colorPalette[i % colorPalette.length];
      });
      
      return {
        labels: Object.keys(categoryData),
        datasets: [{
          data: Object.values(categoryData),
          backgroundColor: colors
        }]
      };
    }
    
    // For bar charts - group by date
    if (this.currentChartType === 'bar') {
      const dateData = {};
      
      filteredTransactions.forEach(transaction => {
        // Format date for display (short version)
        const dateObj = new Date(transaction.date);
        const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        if (!dateData[formattedDate]) {
          dateData[formattedDate] = 0;
        }
        dateData[formattedDate] += parseFloat(transaction.amount);
      });
      
      // Sort dates
      const sortedDates = Object.keys(dateData).sort((a, b) => new Date(a) - new Date(b));
      
      // Use the primary color for the data type
      const barColor = this.currentDataType === 'income' ? '#2ecc71' : '#e74c3c';
      
      return {
        labels: sortedDates,
        datasets: [{
          label: this.currentDataType === 'income' ? 'Income' : 'Expense',
          data: sortedDates.map(date => dateData[date]),
          backgroundColor: barColor
        }]
      };
    }
  },
  
  // Render the chart
  renderChart: function() {
    const chartData = this.processChartData();
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    if (!chartData) {
      this.chartContainer.innerHTML = `
        <div class="chart-placeholder">
          <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
          <p>No ${this.currentDataType} data available</p>
        </div>
      `;
      return;
    }
    
    // Clear container and recreate canvas
    this.chartContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'chart-canvas';
    this.chartContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const label = context.label || '';
              return `${label}: $${value.toFixed(2)}`;
            }
          }
        },
        legend: {
          position: 'bottom'
        }
      }
    };
    
    // Create the chart based on type
    if (this.currentChartType === 'pie') {
      this.chart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: options
      });
    } else {
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
          ...options,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value;
                }
              }
            }
          }
        }
      });
    }
  },
  
  // Update chart when transactions change
  update: function() {
    this.renderChart();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Make sure Chart.js is loaded before initializing
  if (typeof Chart !== 'undefined' && window.transactions) {
    overviewCharts.init();
    
    // Listen for transaction updates
    window.addEventListener('transactionsUpdated', function() {
      overviewCharts.update();
    });
  }
});