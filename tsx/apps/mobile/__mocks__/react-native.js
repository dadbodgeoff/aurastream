/**
 * Mock for react-native
 */

const React = require('react');

const View = ({ children, style, testID, accessible, accessibilityRole, accessibilityLabel, accessibilityHint, ...props }) => {
  return React.createElement('View', { 
    style, 
    testID, 
    accessible, 
    accessibilityRole, 
    accessibilityLabel,
    accessibilityHint,
    ...props 
  }, children);
};

const Text = ({ children, style, numberOfLines, selectable, ...props }) => {
  return React.createElement('Text', { style, numberOfLines, selectable, ...props }, children);
};

const TouchableOpacity = ({ children, onPress, onLongPress, delayLongPress, style, accessible, accessibilityRole, accessibilityLabel, accessibilityHint, accessibilityState, disabled, activeOpacity, ...props }) => {
  return React.createElement('TouchableOpacity', { 
    onPress, 
    onLongPress,
    delayLongPress,
    style, 
    accessible, 
    accessibilityRole, 
    accessibilityLabel,
    accessibilityHint,
    accessibilityState,
    disabled,
    activeOpacity,
    ...props 
  }, children);
};

const FlatList = ({ data, renderItem, keyExtractor, contentContainerStyle, showsVerticalScrollIndicator, refreshControl, ItemSeparatorComponent, ...props }) => {
  const items = data ? data.map((item, index) => {
    const key = keyExtractor ? keyExtractor(item, index) : index.toString();
    return React.createElement('View', { key }, renderItem({ item, index }));
  }) : [];
  
  return React.createElement('RCTScrollView', { 
    contentContainerStyle, 
    refreshControl,
    ...props 
  }, items);
};

const ScrollView = ({ children, style, contentContainerStyle, showsVerticalScrollIndicator, keyboardShouldPersistTaps, ...props }) => {
  return React.createElement('RCTScrollView', { 
    style,
    contentContainerStyle, 
    showsVerticalScrollIndicator,
    keyboardShouldPersistTaps,
    ...props 
  }, children);
};

const TextInput = ({ value, onChangeText, placeholder, placeholderTextColor, style, editable, multiline, maxLength, textAlignVertical, onFocus, onBlur, ...props }) => {
  return React.createElement('TextInput', { 
    value, 
    onChangeText, 
    placeholder, 
    placeholderTextColor, 
    style, 
    editable, 
    multiline, 
    maxLength,
    textAlignVertical,
    onFocus,
    onBlur,
    ...props 
  });
};

const ActivityIndicator = ({ size, color, ...props }) => {
  return React.createElement('ActivityIndicator', { size, color, ...props });
};

const RefreshControl = ({ refreshing, onRefresh, tintColor, colors, ...props }) => {
  return { refreshing, onRefresh, tintColor, colors, props };
};

const KeyboardAvoidingView = ({ children, style, behavior, keyboardVerticalOffset, ...props }) => {
  return React.createElement('View', { style, ...props }, children);
};

const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
};

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
};

const Platform = {
  OS: 'ios',
  select: (obj) => obj.ios || obj.default,
};

const Alert = {
  alert: jest.fn(),
};

const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const Animated = {
  View: View,
  Text: Text,
  Value: class AnimatedValue {
    constructor(value) {
      this._value = value;
    }
    setValue(value) {
      this._value = value;
    }
    interpolate(config) {
      return this;
    }
  },
  timing: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
  })),
  parallel: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
  })),
  sequence: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
  })),
  loop: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
};

module.exports = {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  Platform,
  Alert,
  Dimensions,
  Animated,
};
