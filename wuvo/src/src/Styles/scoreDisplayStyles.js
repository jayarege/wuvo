import { StyleSheet } from 'react-native';

const scoreDisplayStyles = StyleSheet.create({
  scoreContainer: {
    marginTop: 8,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tmdbScore: {
    fontSize: 14,
    marginBottom: 4,
  },
  releaseYear: {
    fontSize: 14,
  },
});

export default scoreDisplayStyles;