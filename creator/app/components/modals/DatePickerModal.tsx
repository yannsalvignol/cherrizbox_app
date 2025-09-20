import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../lib/useTheme';

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
  const { theme } = useTheme();
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
      <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}>
        <View className="rounded-t-3xl p-4" style={{ backgroundColor: theme.modalBackground }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>Select Birth Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={30} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-between">
            {/* Month Picker */}
            <View className="flex-1">
              <Text style={{ color: theme.text, textAlign: 'center', marginBottom: 8 }}>Month</Text>
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
                style={{ color: theme.text }}
                itemStyle={{ color: theme.text }}
              >
                {months.map((month) => (
                  <Picker.Item key={month} label={month} value={month} color={theme.text} />
                ))}
              </Picker>
            </View>

            {/* Day Picker */}
            <View className="flex-1">
              <Text style={{ color: theme.text, textAlign: 'center', marginBottom: 8 }}>Day</Text>
              <Picker
                selectedValue={selectedDay}
                onValueChange={onDayChange}
                style={{ color: theme.text }}
                itemStyle={{ color: theme.text }}
              >
                {days.map((day) => (
                  <Picker.Item key={day} label={day} value={day} color={theme.text} />
                ))}
              </Picker>
            </View>

            {/* Year Picker */}
            <View className="flex-1">
              <Text style={{ color: theme.text, textAlign: 'center', marginBottom: 8 }}>Year</Text>
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
                style={{ color: theme.text }}
                itemStyle={{ color: theme.text }}
              >
                {years.map((year) => (
                  <Picker.Item key={year} label={year} value={year} color={theme.text} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};