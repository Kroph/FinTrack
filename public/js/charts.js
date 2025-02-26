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

// Update chart based on time period
function updateChartWithTimePeriod(period, transactionType) {
    if (!window.transactions || !overviewChart) return;
    
    // Get selected transaction type
    transactionType = transactionType || document.querySelector('.data-type-btn.active').dataset.type;
    
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
    }
    
    updateChart(startDate, today, transactionType);
}

// Update chart with custom date range
function updateChartWithCustomRange(startDateStr, endDateStr, transactionType) {
    if (!window.transactions || !overviewChart) return;
    
    // Get selected transaction type
    transactionType = transactionType || document.querySelector('.data-type-btn.active').dataset.type;
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Add one day to end date to include the end date in calculations
    endDate.setDate(endDate.getDate() + 1);
    
    updateChart(startDate, endDate, transactionType);
}

function updateChart(startDate, endDate, transactionType) {
    const filteredTransactions = window.transactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && 
               transDate <= endDate && 
               t.type === transactionType;
    });
    
    const dailyData = {};
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        dailyData[dateString] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    filteredTransactions.forEach(transaction => {
        const dateString = transaction.date;
        if (dailyData.hasOwnProperty(dateString)) {
            dailyData[dateString] += parseFloat(transaction.amount);
        }
    });
    
    const chartLabels = Object.keys(dailyData).map(dateStr => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    overviewChart.data.labels = chartLabels;
    overviewChart.data.datasets[0].data = Object.values(dailyData);
    
    const color = transactionType === 'income' ? '#4cc9f0' : '#f72585';
    const hoverColor = transactionType === 'income' ? '#3a9dc1' : '#d41e6e';
    
    overviewChart.data.datasets[0].backgroundColor = Array(chartLabels.length).fill(color);
    overviewChart.data.datasets[0].borderColor = Array(chartLabels.length).fill(hoverColor);
    
    const dateRangeText = formatDateRange(startDate, endDate);
    
    overviewChart.options.plugins.title = {
        display: true,
        text: `${transactionType === 'income' ? 'Income' : 'Expenses'} by Day (${dateRangeText})`,
        font: {
            size: 16
        }
    };
    
    overviewChart.update();
}

function formatDateRange(start, end) {
    // Format the date range for display
    const options = { month: 'short', day: 'numeric' };
    
    // Adjust end date back by one day since we added a day for inclusive filtering
    const adjustedEnd = new Date(end);
    adjustedEnd.setDate(adjustedEnd.getDate() - 1);
    
    return `${start.toLocaleDateString('en-US', options)} - ${adjustedEnd.toLocaleDateString('en-US', options)}`;
}