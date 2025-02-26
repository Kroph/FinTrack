let overviewChart = null;

// Initialize chart when transactions are loaded
window.addEventListener('transactionsUpdated', initializeCharts);

// Initialize chart
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
    
    try {
        const ctx = document.getElementById('overview-chart').getContext('2d');
        
        // Safety check for existing chart
        if (window.overviewChart) {
            window.overviewChart.destroy();
        }
        
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
        
        // Make the chart globally available
        window.overviewChart = overviewChart;
        
        // Default to 30 days view
        updateChartWithTimePeriod('30days');
    } catch (error) {
        console.error('Error initializing chart:', error);
        chartContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error initializing chart</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Update chart based on time period
function updateChartWithTimePeriod(period, transactionType) {
    if (!window.transactions || !overviewChart) {
        console.log('No transactions or chart available');
        return;
    }
    
    console.log('Updating chart with period:', period);
    
    // Get selected transaction type
    transactionType = transactionType || document.querySelector('.data-type-btn.active')?.dataset.type || 'expense';
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
    const periodSelector = document.getElementById('time-period-selector');
    if (periodSelector) {
        periodSelector.setAttribute('data-last-period', period);
    }
    
    // Call the main update chart function with explicit dates
    try {
        updateChart(startDate, today, transactionType);
    } catch (error) {
        console.error('Error in updateChartWithTimePeriod:', error);
        
        // Show error in chart container
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error updating chart</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

// Update chart with custom date range
function updateChartWithCustomRange(startDateStr, endDateStr, transactionType) {
    if (!window.transactions || !overviewChart) {
        console.log('No transactions or chart available');
        return;
    }
    
    console.log('Updating chart with custom range:', startDateStr, 'to', endDateStr);
    
    // Get selected transaction type
    transactionType = transactionType || document.querySelector('.data-type-btn.active')?.dataset.type || 'expense';
    
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

// The main chart update function
function updateChart(startDate, endDate, transactionType) {
    // Check if parameters are undefined
    if (startDate === undefined || endDate === undefined) {
        console.error('Error: startDate or endDate is undefined');
        
        // Default to last 30 days if dates are undefined
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        console.log('Using default date range:', 
                    startDate.toISOString().split('T')[0], 
                    'to', 
                    endDate.toISOString().split('T')[0]);
    }
    
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
    
    // Ensure dates are Date objects and set to midnight for proper comparison
    startDate = new Date(startDate);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(endDate);
    endDate.setHours(0, 0, 0, 0);
    
    console.log('Filtering transactions by date range:', 
                startDate.toISOString().split('T')[0], 
                'to', 
                endDate.toISOString().split('T')[0]);
    
    // Debug log to see transaction dates
    console.log('Transaction dates:', window.transactions.map(t => t.date).join(', '));
    
    const filteredTransactions = window.transactions.filter(t => {
        // Normalize transaction date to YYYY-MM-DD
        let transDateStr;
        
        if (t.date) {
            // Extract just the date part if it's an ISO string
            if (t.date.includes('T')) {
                transDateStr = t.date.split('T')[0]; 
            } else {
                transDateStr = t.date;
            }
        } else {
            console.warn('Transaction has no date:', t);
            return false;
        }
        
        // Parse the transaction date
        const transDate = new Date(transDateStr);
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
        // Clear existing chart data
        if (overviewChart) {
            overviewChart.data.labels = [];
            overviewChart.data.datasets[0].data = [];
            overviewChart.update();
        }
        
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
    
    // Generate all dates in the range for the x-axis
    const dailyData = {};
    const currentDate = new Date(startDate);
    
    // End date is exclusive, so we use < instead of <=
    while (currentDate < endDate) {
        // Format the date as YYYY-MM-DD
        const dateString = currentDate.toISOString().split('T')[0];
        dailyData[dateString] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('Generated date range keys:', Object.keys(dailyData).join(', '));
    
    // Sum transaction amounts by date
    filteredTransactions.forEach(transaction => {
        // Normalize the date to YYYY-MM-DD
        let dateString;
        
        if (transaction.date.includes('T')) {
            dateString = transaction.date.split('T')[0];
        } else {
            dateString = transaction.date;
        }
        
        if (dailyData.hasOwnProperty(dateString)) {
            dailyData[dateString] += parseFloat(transaction.amount);
        } else {
            console.warn('Transaction date not in generated range:', transaction.date);
            // Add it anyway to ensure data appears
            dailyData[dateString] = parseFloat(transaction.amount);
        }
    });
    
    // Generate chart data in order of dates
    const chartLabels = Object.keys(dailyData).sort().map(dateStr => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    const chartData = Object.keys(dailyData).sort().map(key => dailyData[key]);
    
    console.log('Chart data prepared:', chartLabels.length, 'data points');
    
    // Update chart with new data
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
    
    // Make sure canvas is visible before updating
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer.innerHTML.includes('empty-state')) {
        chartContainer.innerHTML = '<canvas id="overview-chart"></canvas>';
        
        // Get the new canvas context
        const ctx = document.getElementById('overview-chart').getContext('2d');
        overviewChart.ctx = ctx;
        overviewChart.canvas = document.getElementById('overview-chart');
    }
    
    // Update the chart
    overviewChart.update();
}

// Format date range for display
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

// Function to directly update the chart when data changes
function refreshChart() {
    // Get current filter settings
    const periodSelector = document.getElementById('time-period-selector');
    const selectedPeriod = periodSelector?.value || '30days';
    
    console.log('Refreshing chart with period:', selectedPeriod);
    
    if (selectedPeriod === 'custom') {
        const startDate = document.getElementById('chart-date-from')?.value;
        const endDate = document.getElementById('chart-date-to')?.value;
        
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

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // If transactions are already loaded, initialize the chart
    if (window.transactions && window.transactions.length > 0) {
        console.log('Transactions already available, initializing chart');
        initializeCharts();
    } else {
        console.log('Waiting for transactions to be loaded');
        // The transactionsUpdated event will handle this
    }
    
    // Initialize custom date UI if function exists
    if (typeof initCustomDateUI === 'function') {
        initCustomDateUI();
    }
});