import { StyleSheet } from 'react-native';

const buttonStyles = StyleSheet.create({
  rateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 16,
  },
});

export default buttonStyles;