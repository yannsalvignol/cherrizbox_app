import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface EarningsChartProps {
  dailyEarnings: { [date: string]: number };
  timeframe: 'weekly' | 'monthly' | 'yearly';
  currency: string;
}

const EarningsChart: React.FC<EarningsChartProps> = ({ dailyEarnings, timeframe, currency }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 80; // Account for card padding

  // Prepare data based on timeframe
  const prepareChartData = () => {
    const today = new Date();
    const labels: string[] = [];
    const data: number[] = [];
    
    let days = 7;
    let labelFormat = (date: Date) => {
      const day = date.getDate().toString();
      return day.length === 1 ? `0${day}` : day;
    };
    
    if (timeframe === 'monthly') {
      days = 30;
      labelFormat = (date: Date) => {
        const day = date.getDate().toString();
        return day.length === 1 ? `0${day}` : day;
      };
    } else if (timeframe === 'yearly') {
      days = 12; // Show 12 months for yearly view
      labelFormat = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[date.getMonth()];
      };
    }

    if (timeframe === 'yearly') {
      // For yearly, aggregate by month
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // First day of month
        
        // Calculate total for this month
        let monthTotal = 0;
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
          const dateStr = dayDate.toISOString().split('T')[0];
          if (dailyEarnings[dateStr]) {
            monthTotal += dailyEarnings[dateStr];
          }
        }
        
        labels.push(labelFormat(date));
        data.push(monthTotal / 100); // Convert from cents to dollars
      }
    } else {
      // For weekly and monthly, show daily data
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        labels.push(labelFormat(date));
        data.push((dailyEarnings[dateStr] || 0) / 100); // Convert from cents to dollars
      }
    }

    // For better visualization, show only every nth label
    const filteredLabels = labels.map((label, index) => {
      if (timeframe === 'weekly') return label;
      if (timeframe === 'monthly' && index % 5 === 0) return label;
      if (timeframe === 'yearly') return label;
      return '';
    });

    return {
      labels: filteredLabels,
      datasets: [
        {
          data,
          strokeWidth: 3,
        }
      ]
    };
  };

  const chartData = prepareChartData();

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: 'black',
      fill: 'white'
    },
    propsForBackgroundLines: {
      strokeWidth: 0.5,
      stroke: '#E8E8E8',
      strokeDasharray: '0'
    },
    propsForLabels: {
      fontSize: 11,
      fontFamily: 'Urbanist-Medium'
    },
    formatYLabel: (yValue: string) => {
      const num = parseFloat(yValue);
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k`;
      }
      return num.toFixed(0);
    }
  };

  // Calculate max value for better scaling
  const maxValue = Math.max(...chartData.datasets[0].data);
  const yAxisSuffix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

  return (
    <View style={{
      backgroundColor: '#FAFAFA',
      borderRadius: 8,
      padding: 8,
      marginVertical: 4,
    }}>
      {/* Chart Title */}
      <Text style={{
        fontSize: 12,
        fontFamily: 'Urbanist-Medium',
        color: '#666666',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        {timeframe === 'weekly' && 'Daily Earnings - Last 7 Days'}
        {timeframe === 'monthly' && 'Daily Earnings - Last 30 Days'}
        {timeframe === 'yearly' && 'Monthly Earnings - Last 12 Months'}
      </Text>
      
      <LineChart
        data={chartData}
        width={chartWidth}
        height={180}
        chartConfig={chartConfig}
        bezier // This makes the line curved and smooth
        style={{
          borderRadius: 8,
          backgroundColor: 'transparent',
        }}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        withDots={true}
        withShadow={false}
        fromZero={maxValue > 0}
        yAxisSuffix={yAxisSuffix}
        segments={4} // Number of horizontal grid lines
      />
    </View>
  );
};

export default EarningsChart;