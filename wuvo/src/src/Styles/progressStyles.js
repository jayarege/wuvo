import { StyleSheet } from 'react-native';

const progressStyles = StyleSheet.create({
  progressContainer: {
    width: '100%',
    marginTop: 20,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
  },
});

export default progressStyles;