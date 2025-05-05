import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.35; // Slightly smaller to ensure it fits on screen
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const movieCardStyles = StyleSheet.create({
  movieCard: {
    flexDirection: 'row',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 20,
    maxWidth: width - 32, // Ensure it stays within screen bounds
  },
  moviePoster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
  },
  movieInfo: {
    flex: 1,
    padding: 16,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  releaseDate: {
    fontSize: 14,
    marginBottom: 10,
  },
  movieOverview: {
    fontSize: 14,
    lineHeight: 20,
  },
  genresText: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default movieCardStyles;