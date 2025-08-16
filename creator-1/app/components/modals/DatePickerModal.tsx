import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMonth: string;
  selectedDay: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onDayChange: (day: string) => void;
  onYearChange: (year: string) => void;
  getDaysInMonth: (month: number, year: number) => number;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedMonth,
  selectedDay,
  selectedYear,
  onMonthChange,
  onDayChange,
  onYearChange,
  getDaysInMonth
}) => {
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  
  const days = Array.from(
    { length: getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear)) },
    (_, i) => (i + 1).toString()
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="rounded-t-3xl p-4" style={{ backgroundColor: '#FFFFFF' }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-black text-xl font-bold">Select Birth Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={30} color="#FD6F3E" />
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-between">
            {/* Month Picker */}
            <View className="flex-1">
              <Text className="text-black text-center mb-2">Month</Text>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value) => {
                  onMonthChange(value);
                  // Reset day if it's invalid for the new month
                  const daysInMonth = getDaysInMonth(parseInt(value), parseInt(selectedYear));
                  if (parseInt(selectedDay) > daysInMonth) {
                    onDayChange(daysInMonth.toString());
                  }
                }}
                style={{ color: 'black' }}
                itemStyle={{ color: 'black' }}
              >
                {months.map((month) => (
                  <Picker.Item key={month} label={month} value={month} color="black" />
                ))}
              </Picker>
            </View>

            {/* Day Picker */}
            <View className="flex-1">
              <Text className="text-black text-center mb-2">Day</Text>
              <Picker
                selectedValue={selectedDay}
                onValueChange={onDayChange}
                style={{ color: 'black' }}
                itemStyle={{ color: 'black' }}
              >
                {days.map((day) => (
                  <Picker.Item key={day} label={day} value={day} color="black" />
                ))}
              </Picker>
            </View>

            {/* Year Picker */}
            <View className="flex-1">
              <Text className="text-black text-center mb-2">Year</Text>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => {
                  onYearChange(value);
                  // Reset day if it's invalid for the new year
                  const daysInMonth = getDaysInMonth(parseInt(selectedMonth), parseInt(value));
                  if (parseInt(selectedDay) > daysInMonth) {
                    onDayChange(daysInMonth.toString());
                  }
                }}
                style={{ color: 'black' }}
                itemStyle={{ color: 'black' }}
              >
                {years.map((year) => (
                  <Picker.Item key={year} label={year} value={year} color="black" />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};