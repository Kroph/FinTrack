import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const OverviewChart = () => {
  const [transactions, setTransactions] = useState([]);
  const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'
  const [dataType, setDataType] = useState('expense'); // 'income' or 'expense'
  const [isLoading, setIsLoading] = useState(true);

  // Sample colors for the charts
  const COLORS = ['#4361ee', '#7209b7', '#3a0ca3', '#4cc9f0', '#f72585', '#7678ed', '#3d348b'];
  
  useEffect(() => {
    // In a real application, we would fetch from the API
    // For now, we'll use the data from localStorage or window.transactions if available
    const loadTransactions = () => {
      setIsLoading(true);
      
      // For demo purposes - normally would be from API
      try {
        // Attempt to get transactions from the window object (if defined in home.html)
        const data = window.transactions || [];
        setTransactions(data);
      } catch (error) {
        console.error("Error loading transactions:", error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTransactions();
    
    // Setup listener for transaction updates
    window.addEventListener('transactionsUpdated', loadTransactions);
    
    return () => {
      window.removeEventListener('transactionsUpdated', loadTransactions);
    };
  }, []);

  // Filter transactions by type (income or expense)
  const filteredTransactions = transactions.filter(t => t.type === dataType);

  // Process data for pie chart (by category)
  const getPieChartData = () => {
    if (filteredTransactions.length === 0) return [];
    
    // Group by category and sum amounts
    const categoryMap = {};
    
    filteredTransactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += parseFloat(transaction.amount);
    });
    
    // Convert to array format for PieChart
    return Object.keys(categoryMap).map(category => ({
      name: category,
      value: categoryMap[category]
    }));
  };

  // Process data for bar chart (by day)
  const getBarChartData = () => {
    if (filteredTransactions.length === 0) return [];
    
    // Group by date and sum amounts
    const dateMap = {};
    
    filteredTransactions.forEach(transaction => {
      // Format date for display (short version)
      const dateObj = new Date(transaction.date);
      const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      if (!dateMap[formattedDate]) {
        dateMap[formattedDate] = 0;
      }
      dateMap[formattedDate] += parseFloat(transaction.amount);
    });
    
    // Convert to array and sort by date
    return Object.keys(dateMap)
      .map(date => ({
        date,
        amount: dateMap[date]
      }))
      .sort((a, b) => {
        // Simple string comparison should work for MM/DD format
        return a.date.localeCompare(b.date);
      });
  };

  // Formatting for currency
  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  // Custom tooltip for PieChart
  const PieCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border border-gray-200 rounded shadow-sm">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-primary">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-gray-500">
            {Math.round((payload[0].value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  // Get data based on chart type
  const pieData = getPieChartData();
  const barData = getBarChartData();

  // Handler for chart type change
  const handleChartTypeChange = (type) => {
    setChartType(type);
  };

  // Handler for data type change
  const handleDataTypeChange = (type) => {
    setDataType(type);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center p-6">
        <div className="text-4xl mb-2 text-gray-300">
          <i className="fas fa-chart-line"></i>
        </div>
        <p className="text-gray-500">No transaction data available</p>
        <p className="text-sm text-gray-400 mt-2">Add transactions to see your financial insights</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between mb-4">
        <div className="flex space-x-1">
          <button
            className={`px-3 py-1 text-xs rounded-l-md ${dataType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleDataTypeChange('income')}
          >
            Income
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-r-md ${dataType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleDataTypeChange('expense')}
          >
            Expense
          </button>
        </div>
        
        <div className="flex space-x-1">
          <button
            className={`px-3 py-1 text-xs rounded-l-md ${chartType === 'pie' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleChartTypeChange('pie')}
          >
            <i className="fas fa-chart-pie mr-1"></i> Pie
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-r-md ${chartType === 'bar' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => handleChartTypeChange('bar')}
          >
            <i className="fas fa-chart-bar mr-1"></i> Bar
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip />} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={barData}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={value => `$${value}`} />
              <Tooltip formatter={(value) => [`${formatCurrency(value)}`, `${dataType === 'income' ? 'Earned' : 'Spent'}`]} />
              <Bar 
                dataKey="amount" 
                fill={dataType === 'income' ? '#4cc9f0' : '#f72585'} 
                name={dataType === 'income' ? 'Income' : 'Expense'} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="text-xs text-gray-500 text-center mt-2">
        {chartType === 'pie' ? 
          `Distribution by category (${dataType})` : 
          `Daily ${dataType} breakdown`
        }
      </div>
    </div>
  );
};

export default OverviewChart;