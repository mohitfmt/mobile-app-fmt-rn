import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import React, { useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Modal,
  TouchableOpacity,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";
import { SelectionModalProps } from "@/app/types/settings";

const screenWidth = Dimensions.get("window").width;

/**
 * SelectionModal Component
 *
 * Displays a **dropdown-style modal** with a list of selectable options.
 *
 * @param visible - Boolean controlling modal visibility.
 * @param onClose - Function to close the modal.
 * @param options - Array of selectable options.
 * @param selectedValue - The currently selected value.
 * @param onSelect - Function to handle option selection.
 * @param title - The title of the selection modal.
 */
const SelectionModal: React.FC<SelectionModalProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
}) => {
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Touchable overlay to close modal when tapped outside */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Tooltip-like container for options */}
        <View
          style={[
            styles.tooltip,
            { backgroundColor: theme.backgroundColor, right: 16 },
          ]}
        >
          {options.map((option) => {
            const isSelected = option === selectedValue;

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  isSelected && {
                    backgroundColor:
                      theme.backgroundColor === "#ffffff"
                        ? "#e4e4e4"
                        : "#646464",
                  },
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: theme.textColor,
                      fontSize: getArticleTextSize(16, textSize),
                    },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Component Styles
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 120,
    alignItems: "flex-end",
  },
  tooltip: {
    borderRadius: 8,
    width: screenWidth / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    paddingVertical: 8,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8,
    marginHorizontal: 16,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    fontWeight: "400",
  },
});

export default SelectionModal;
