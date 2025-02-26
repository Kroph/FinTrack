/**
 * Charts and data visualization for the dashboard
 */

// Global chart reference
let overviewChart = null;

// Initialize chart when transactions are loaded
window.addEventListener('transactionsUpdated', initializeCharts);

// Initialize chart
function initializeCharts() {
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '<canvas id="overview-chart"></canvas>';
    
    const ctx = document.getElementById('overview-chart').getContext('2d');
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(2);
                        }
                    }
                }
            }
        }
    });
    
    // Default to 30 days view
    updateChartWithTimePeriod('30days');
}

// Updated updateChartWithTimePeriod function for charts.js
function updateChartWithTimePeriod(period, transactionType) {
    if (!window.transactions || !overviewChart) {
        console.log('No transactions or chart available');
        return;
    }
    
    console.log('Updating chart with period:', period);
    
    // Get selected transaction type
    transactionType = transactionType || document.querySelector('.data-type-btn.active').dataset.type;
    console.log('Using transaction type:', transactionType);
    
    // Calculate date ranges
    const today = new Date();
    let startDate = new Date();
    
    switch(period) {
        case '7days':
            startDate.setDate(today.getDate() - 7);
            break;
        case '30days':
            startDate.setDate(today.getDate() - 30);
            break;
        case '90days':
            startDate.setDate(today.getDate() - 90);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
            break;
        case 'custom':
            // For custom, don't update the chart yet, just return
            // The apply button will handle this
            return;
        default:
            console.log('Unknown period:', period);
            startDate.setDate(today.getDate() - 30); // Default to 30 days
    }
    
    console.log('Date range:', startDate.toISOString(), 'to', today.toISOString());
    
    // Store the selected period in a data attribute for reference
    document.getElementById('time-period-selector').setAttribute('data-last-period', period);
    
    updateChart(startDate, today, transactionType);
}

function updateChartWithCustomRange(startDateStr, endDateStr, transactionType) {
    if (!window.transactions || !overviewChart) {
        console.log('No transactions or chart available');
        return;
    }
    
    console.log('Updating chart with custom range:', startDateStr, 'to', endDateStr);
    
    // Get selected transaction type
    transactionType = transactionType || document.querySelector('.data-type-btn.active').dataset.type;
    
    // Parse dates
    const startDate = new Date(startDateStr);
    let endDate = new Date(endDateStr);
    
    // Add one day to end date to include the end date in calculations
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(0, 0, 0, 0);
    
    console.log('Parsed date range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date range');
        
        // Fall back to the last selected period
        const lastPeriod = document.getElementById('time-period-selector').getAttribute('data-last-period') || '30days';
        updateChartWithTimePeriod(lastPeriod);
        return;
    }
    
    updateChart(startDate, endDate, transactionType);
}

// Improved updateChart function with better date handling
function updateChart(startDate, endDate, transactionType) {
    console.log('Raw transaction data:', window.transactions ? window.transactions.length : 0, 'transactions');
    
    if (!window.transactions || window.transactions.length === 0 || !overviewChart) {
        // Display a message when no data is available
        const chartContainer = document.getElementById('chart-container');
        chartContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>No transaction data available</h3>
                <p>Add some transactions to see your financial insights</p>
            </div>
        `;
        return;
    }
    
    // Ensure dates are Date objects
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    
    console.log('Filtering transactions by date range:', 
                startDate.toISOString().split('T')[0], 
                'to', 
                endDate.toISOString().split('T')[0]);
    
    // Debug log to see transaction dates
    console.log('Transaction dates:', window.transactions.map(t => t.date).join(', '));
    
    const filteredTransactions = window.transactions.filter(t => {
        // Parse the transaction date
        const transDate = new Date(t.date);
        
        // Set hours to 0 for proper date comparison
        transDate.setHours(0, 0, 0, 0);
        
        // Check if date is in range and type matches
        const inDateRange = transDate >= startDate && transDate < endDate;
        const typeMatches = t.type === transactionType;
        
        if (typeMatches && !inDateRange) {
            console.log('Transaction date out of range:', t.date, transDate.toISOString());
        }
        
        return inDateRange && typeMatches;
    });
    
    console.log('Filtered transactions:', filteredTransactions.length, 'of', window.transactions.length);
    
    // If no transactions match the criteria
    if (filteredTransactions.length === 0) {
        overviewChart.data.labels = [];
        overviewChart.data.datasets[0].data = [];
        overviewChart.update();
        
        const chartContainer = document.getElementById('chart-container');
        chartContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>No transactions match your criteria</h3>
                <p>Try adjusting your date range or transaction type</p>
            </div>
        `;
        return;
    }
    
    // Generate all dates in the range
    const dailyData = {};
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
        // Format the date as YYYY-MM-DD
        const dateString = currentDate.toISOString().split('T')[0];
        dailyData[dateString] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('Generated date range keys:', Object.keys(dailyData).join(', '));
    
    filteredTransactions.forEach(transaction => {
        const dateString = transaction.date;
        
        if (dailyData.hasOwnProperty(dateString)) {
            dailyData[dateString] += parseFloat(transaction.amount);
        } else {
            console.warn('Transaction date not in generated range:', dateString);
            dailyData[dateString] = parseFloat(transaction.amount);
        }
    });
    
    const chartLabels = Object.keys(dailyData).map(dateStr => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    const chartData = Object.values(dailyData);
    
    console.log('Chart data prepared:', chartLabels.length, 'data points');
    
    overviewChart.data.labels = chartLabels;
    overviewChart.data.datasets[0].data = chartData;
    
    const color = transactionType === 'income' ? '#4cc9f0' : '#f72585';
    const hoverColor = transactionType === 'income' ? '#3a9dc1' : '#d41e6e';
    
    overviewChart.data.datasets[0].backgroundColor = Array(chartLabels.length).fill(color);
    overviewChart.data.datasets[0].borderColor = Array(chartLabels.length).fill(hoverColor);
    
    const dateRangeText = formatDateRange(startDate, endDate);
    
    // Update chart title
    overviewChart.options.plugins.title = {
        display: true,
        text: `${transactionType === 'income' ? 'Income' : 'Expenses'} by Day (${dateRangeText})`,
        font: {
            size: 16
        }
    };
    
    // Clear any previous error messages
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '<canvas id="overview-chart"></canvas>';
    
    // Get the new canvas context
    const ctx = document.getElementById('overview-chart').getContext('2d');
    overviewChart.ctx = ctx;
    overviewChart.canvas = document.getElementById('overview-chart');
    
    // Update the chart
    overviewChart.update();
}

function initializeCharts() {
    const chartContainer = document.getElementById('chart-container');
    
    // Clear any previous content
    chartContainer.innerHTML = '<canvas id="overview-chart"></canvas>';
    
    // Check if transactions are available
    if (!window.transactions || window.transactions.length === 0) {
        chartContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>No transaction data available</h3>
                <p>Add some transactions to see your financial insights</p>
            </div>
        `;
        return;
    }
    
    const ctx = document.getElementById('overview-chart').getContext('2d');
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(2);
                        }
                    }
                }
            }
        }
    });
    
    // Default to 30 days view
    updateChartWithTimePeriod('30days');
}

// Ensure window.transactions is properly shared between dashboard.js and charts.js
window.addEventListener('transactionsUpdated', function() {
    console.log('Transaction update event received in charts.js');
    console.log('Transactions available:', window.transactions ? window.transactions.length : 0);
    initializeCharts();
});

// Improved formatDateRange function
function formatDateRange(startDate, endDate) {
    // Format the date range for display
    const options = { month: 'short', day: 'numeric' };
    
    // Adjust end date back by one day since we added a day for inclusive filtering
    const adjustedEnd = new Date(endDate);
    adjustedEnd.setDate(adjustedEnd.getDate() - 1);
    
    // Check if dates are the same year
    const sameYear = startDate.getFullYear() === adjustedEnd.getFullYear();
    
    if (sameYear) {
        return `${startDate.toLocaleDateString('en-US', options)} - ${adjustedEnd.toLocaleDateString('en-US', options)}`;
    } else {
        // Include year if dates span different years
        const optionsWithYear = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${startDate.toLocaleDateString('en-US', optionsWithYear)} - ${adjustedEnd.toLocaleDateString('en-US', optionsWithYear)}`;
    }
}

// Add this to initializeChartControls in dashboard.js
function initializeChartControls() {
    // ... existing code ...
    
    // Set default values for the date selectors on page load
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const chartDateTo = document.getElementById('chart-date-to');
    const chartDateFrom = document.getElementById('chart-date-from');
    
    if (chartDateTo && chartDateFrom) {
        // Format dates as YYYY-MM-DD for the input elements
        chartDateTo.valueAsDate = today;
        chartDateFrom.valueAsDate = thirtyDaysAgo;
        
        console.log('Date inputs initialized with values:', 
                    chartDateFrom.value, 'to', chartDateTo.value);
    }
    
    // ... existing code ...
}

// Function to directly update the chart when data changes (add to charts.js)
function refreshChart() {
    // Get current filter settings
    const periodSelector = document.getElementById('time-period-selector');
    const selectedPeriod = periodSelector.value;
    
    console.log('Refreshing chart with period:', selectedPeriod);
    
    if (selectedPeriod === 'custom') {
        const startDate = document.getElementById('chart-date-from').value;
        const endDate = document.getElementById('chart-date-to').value;
        
        if (startDate && endDate) {
            updateChartWithCustomRange(startDate, endDate);
        } else {
            // Fallback to 30 days if custom dates aren't set
            updateChartWithTimePeriod('30days');
        }
    } else {
        updateChartWithTimePeriod(selectedPeriod);
    }
}

// Add this event listener to ensure the chart refreshes when data changes
window.addEventListener('transactionsUpdated', function() {
    console.log('Transaction update event detected, refreshing chart');
    setTimeout(refreshChart, 200);
});

// Fix for the charts.js initial load
document.addEventListener('DOMContentLoaded', function() {
    // If transactions are already loaded, initialize the chart
    if (window.transactions && window.transactions.length > 0) {
        console.log('Transactions already available, initializing chart');
        initializeCharts();
    } else {
        console.log('Waiting for transactions to be loaded');
        // The transactionsUpdated event will handle this
    }
});