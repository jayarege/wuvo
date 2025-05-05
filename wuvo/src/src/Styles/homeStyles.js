import { StyleSheet } from 'react-native';

const homeStyles = StyleSheet.create({
  homeContainer: {
    flex: 1,
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  genreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genreName: {
    fontSize: 16,
    fontWeight: '600',
  },
  genreScore: {
    fontSize: 16,
  },
  // New carousel styles
  carouselContainer: {
    marginVertical: 12,
    height: 280,
  },
  carouselContent: {
    paddingLeft: 16,
  },
  carouselItem: {
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  // Rating UI styles
  ratingButtonContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 20,
    padding: 6,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  quickRateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Diagonal animation container
  diagonalContainer: {
    overflow: 'hidden',
    height: 320,
    marginVertical: 10,
  },
  swipeInstructions: {
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 16,
  },
  // Enhanced movie card styles
  enhancedCard: {
    borderRadius: 12,
    overflow: 'hidden', 
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  movieInfoBox: {
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  movieYear: {
    fontSize: 12,
    marginTop: 2,
  },
  genreTag: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default homeStyles;