// overviewCharts.js - Complete implementation
document.addEventListener('DOMContentLoaded', function() {
  // Initialize when DOM is loaded
  initCharts();
  
  // Also listen for the transactionsUpdated event
  window.addEventListener('transactionsUpdated', function() {
    console.log('Transaction update detected, refreshing charts');
    initCharts();
  });
});

// Main initialization function
function initCharts() {
  console.log('Initializing charts');
  
  // Get DOM elements
  const chartContainer = document.getElementById('chart-container');
  const dataTypeButtons = document.querySelectorAll('.data-type-btn');
  const chartTypeButtons = document.querySelectorAll('.chart-type-btn');
  
  // Get current state from buttons
  let currentDataType = 'expense'; // Default
  let currentChartType = 'pie';    // Default
  
  // Check which buttons are active
  dataTypeButtons.forEach(btn => {
    if (btn.classList.contains('active')) {
      currentDataType = btn.dataset.type;
    }
    
    // Re-attach event listeners (safe even if already attached)
    btn.addEventListener('click', function() {
      dataTypeButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentDataType = this.dataset.type;
      renderChart(currentDataType, currentChartType);
    });
  });
  
  chartTypeButtons.forEach(btn => {
    if (btn.classList.contains('active')) {
      currentChartType = btn.dataset.type;
    }
    
    // Re-attach event listeners
    btn.addEventListener('click', function() {
      chartTypeButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentChartType = this.dataset.type;
      renderChart(currentDataType, currentChartType);
    });
  });
  
  // Initial render
  renderChart(currentDataType, currentChartType);
}

// Chart rendering function
function renderChart(dataType, chartType) {
  console.log(`Rendering ${chartType} chart for ${dataType} data`);
  
  const chartContainer = document.getElementById('chart-container');
  
  // Check if we have transactions
  if (!window.transactions || window.transactions.length === 0) {
    console.log('No transactions available');
    chartContainer.innerHTML = `
      <div class="chart-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem; color: #ccc;"></i>
        <p style="color: #888;">No ${dataType} data available</p>
      </div>
    `;
    return;
  }
  
  // Process data for the chart
  const chartData = processChartData(dataType, chartType);
  
  if (!chartData) {
    console.log(`No data available for ${dataType}`);
    chartContainer.innerHTML = `
      <div class="chart-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem; color: #ccc;"></i>
        <p style="color: #888;">No ${dataType} data available</p>
      </div>
    `;
    return;
  }
  
  // Clear any existing charts
  chartContainer.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'chart-canvas';
  chartContainer.appendChild(canvas);
  
  // Create new chart
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
            return `${label}: $${parseFloat(value).toFixed(2)}`;
          }
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          font: {
            size: 12
          }
        }
      }
    }
  };
  
  // Create the chart based on type
  if (chartType === 'pie') {
    new Chart(ctx, {
      type: 'pie',
      data: chartData,
      options: options
    });
  } else {
    new Chart(ctx, {
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
  
  console.log('Chart rendered successfully');
}

// Process transaction data into chart format
function processChartData(dataType, chartType) {
  // Define color palettes
  const colorPalettes = {
    income: ['#25a244', '#2ecc71', '#27ae60', '#1abc9c', '#16a085', '#2ed573', '#7bed9f', '#3cb371'],
    expense: ['#e74c3c', '#c0392b', '#f72585', '#e84393', '#d63031', '#ff4757', '#ff6b81', '#eb2f06']
  };
  
  // Filter transactions by type
  const filteredTransactions = window.transactions.filter(t => t.type === dataType);
  
  if (filteredTransactions.length === 0) {
    return null;
  }
  
  // Get colors for this data type
  const colorPalette = colorPalettes[dataType];
  
  // Process data differently based on chart type
  if (chartType === 'pie') {
    // Group by category
    const categoryData = {};
    
    filteredTransactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = 0;
      }
      categoryData[category] += parseFloat(transaction.amount);
    });
    
    // Create colors array
    const categories = Object.keys(categoryData);
    const colors = categories.map((_, i) => colorPalette[i % colorPalette.length]);
    
    return {
      labels: categories,
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: colors
      }]
    };
  } else if (chartType === 'bar') {
    // Group by date
    const dateData = {};
    
    filteredTransactions.forEach(transaction => {
      const dateObj = new Date(transaction.date);
      const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      if (!dateData[formattedDate]) {
        dateData[formattedDate] = 0;
      }
      dateData[formattedDate] += parseFloat(transaction.amount);
    });
    
    // Sort dates
    const sortedDates = Object.keys(dateData).sort((a, b) => new Date(a) - new Date(b));
    
    // Use primary color
    const barColor = dataType === 'income' ? '#2ecc71' : '#e74c3c';
    
    return {
      labels: sortedDates,
      datasets: [{
        label: dataType === 'income' ? 'Income' : 'Expense',
        data: sortedDates.map(date => dateData[date]),
        backgroundColor: barColor
      }]
    };
  }
  
  return null;
}