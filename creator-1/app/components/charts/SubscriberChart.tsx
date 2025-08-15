import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface SubscriberChartProps {
  dailySubscribersStats: { [date: string]: { monthly: number; yearly: number; cancelledMonthly: number; cancelledYearly: number } };
  timeframe: 'weekly' | 'monthly' | 'yearly';
}

const SubscriberChart: React.FC<SubscriberChartProps> = ({ dailySubscribersStats, timeframe }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 80; // Account for card padding

  // Prepare data based on timeframe
  const prepareChartData = () => {
    const today = new Date();
    const labels: string[] = [];
    const gainedData: number[] = [];
    const lostData: number[] = [];
    
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
        
        // Calculate totals for this month
        let monthGained = 0;
        let monthLost = 0;
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
          const dateStr = dayDate.toISOString().split('T')[0];
          if (dailySubscribersStats[dateStr]) {
            const dayStats = dailySubscribersStats[dateStr];
            monthGained += (dayStats.monthly || 0) + (dayStats.yearly || 0);
            monthLost += (dayStats.cancelledMonthly || 0) + (dayStats.cancelledYearly || 0);
          }
        }
        
        labels.push(labelFormat(date));
        gainedData.push(monthGained);
        lostData.push(monthLost);
      }
    } else {
      // For weekly and monthly, show daily data
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayStats = dailySubscribersStats[dateStr];
        const gained = dayStats ? (dayStats.monthly || 0) + (dayStats.yearly || 0) : 0;
        const lost = dayStats ? (dayStats.cancelledMonthly || 0) + (dayStats.cancelledYearly || 0) : 0;
        
        labels.push(labelFormat(date));
        gainedData.push(gained);
        lostData.push(lost);
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
          data: gainedData,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green for gained
          strokeWidth: 3,
        },
        {
          data: lostData,
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red for lost
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
    useShadowColorFromDataset: true,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
    },
    propsForBackgroundLines: {
      strokeWidth: 0.5,
      stroke: '#E8E8E8',
      strokeDasharray: '0'
    },
    propsForLabels: {
      fontSize: 11,
      fontFamily: 'MuseoModerno-Regular'
    },
    formatYLabel: (yValue: string) => {
      const num = parseFloat(yValue);
      return num.toFixed(0);
    }
  };

  // Calculate max value for better scaling
  const maxGained = Math.max(...chartData.datasets[0].data);
  const maxLost = Math.max(...chartData.datasets[1].data);
  const maxValue = Math.max(maxGained, maxLost);

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
        fontFamily: 'MuseoModerno-Regular',
        color: '#666666',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        {timeframe === 'weekly' && 'Daily Subscribers - Last 7 Days'}
        {timeframe === 'monthly' && 'Daily Subscribers - Last 30 Days'}
        {timeframe === 'yearly' && 'Monthly Subscribers - Last 12 Months'}
      </Text>

      {/* Legend */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 12,
            height: 3,
            backgroundColor: '#4CAF50',
            marginRight: 4,
            borderRadius: 2,
          }} />
          <Text style={{
            fontSize: 10,
            fontFamily: 'MuseoModerno-Regular',
            color: '#666666',
          }}>
            Gained
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 12,
            height: 3,
            backgroundColor: '#F44336',
            marginRight: 4,
            borderRadius: 2,
          }} />
          <Text style={{
            fontSize: 10,
            fontFamily: 'MuseoModerno-Regular',
            color: '#666666',
          }}>
            Lost
          </Text>
        </View>
      </View>
      
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
        segments={4} // Number of horizontal grid lines
      />
    </View>
  );
};

export default SubscriberChart;