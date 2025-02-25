// overviewChart.js - Improved implementation
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
  if (window.transactions && window.transactions.length > 0) {
    renderChart(currentDataType, currentChartType);
  } else {
    // Wait for transactions data to be loaded
    console.log('Waiting for transaction data to be available...');
    setTimeout(() => {
      if (window.transactions && window.transactions.length > 0) {
        renderChart(currentDataType, currentChartType);
      } else {
        showEmptyChart(currentDataType);
      }
    }, 1000); // Give some time for transactions to load
  }
}

// Show empty chart placeholder
function showEmptyChart(dataType) {
  const chartContainer = document.getElementById('chart-container');
  chartContainer.innerHTML = `
    <div class="chart-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
      <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem; color: #ccc;"></i>
      <p style="color: #888;">No ${dataType} data available</p>
    </div>
  `;
}

// Chart rendering function
function renderChart(dataType, chartType) {
  console.log(`Rendering ${chartType} chart for ${dataType} data`);
  console.log('Available transactions:', window.transactions ? window.transactions.length : 0);
  
  const chartContainer = document.getElementById('chart-container');
  
  // Check if we have transactions
  if (!window.transactions || window.transactions.length === 0) {
    console.log('No transactions available');
    showEmptyChart(dataType);
    return;
  }
  
  // Filter transactions by type
  const filteredTransactions = window.transactions.filter(t => t.type === dataType);
  console.log(`Found ${filteredTransactions.length} transactions of type ${dataType}`);
  
  if (filteredTransactions.length === 0) {
    console.log(`No data available for ${dataType}`);
    showEmptyChart(dataType);
    return;
  }
  
  // Process data for the chart
  const chartData = processChartData(filteredTransactions, dataType, chartType);
  
  if (!chartData) {
    console.log('Failed to process chart data');
    showEmptyChart(dataType);
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
          },
          boxWidth: 15,
          padding: 10
        }
      }
    }
  };
  
  try {
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
  } catch (error) {
    console.error('Error rendering chart:', error);
    chartContainer.innerHTML = `
      <div class="chart-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem; color: #e74c3c;"></i>
        <p style="color: #e74c3c;">Error rendering chart</p>
      </div>
    `;
  }
}

// Process transaction data into chart format
function processChartData(filteredTransactions, dataType, chartType) {
  // Define color palettes
  const colorPalettes = {
    income: ['#25a244', '#2ecc71', '#27ae60', '#1abc9c', '#16a085', '#2ed573', '#7bed9f', '#3cb371'],
    expense: ['#e74c3c', '#c0392b', '#f72585', '#e84393', '#d63031', '#ff4757', '#ff6b81', '#eb2f06']
  };
  
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
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: '#fff'
      }]
    };
  } else if (chartType === 'bar') {
    // Group by date
    const dateData = {};
    
    filteredTransactions.forEach(transaction => {
      const dateObj = new Date(transaction.date);
      // Format date as MM/DD for consistent sorting
      const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      
      if (!dateData[formattedDate]) {
        dateData[formattedDate] = 0;
      }
      dateData[formattedDate] += parseFloat(transaction.amount);
    });
    
    // Sort dates chronologically
    const sortedDates = Object.keys(dateData).sort((a, b) => {
      const [aMonth, aDay] = a.split('/').map(Number);
      const [bMonth, bDay] = b.split('/').map(Number);
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    });
    
    // Use primary color
    const barColor = dataType === 'income' ? '#4cc9f0' : '#f72585';
    
    return {
      labels: sortedDates,
      datasets: [{
        label: dataType === 'income' ? 'Income' : 'Expense',
        data: sortedDates.map(date => dateData[date]),
        backgroundColor: barColor,
        borderWidth: 0,
        borderRadius: 4
      }]
    };
  }
  
  return null;
}