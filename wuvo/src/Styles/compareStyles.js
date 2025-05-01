import { StyleSheet } from 'react-native';

const compareStyles = StyleSheet.create({
  compareContainer: {
    flex: 1,
    padding: 16,
  },
  compareContent: {
    flex: 1,
    alignItems: 'center',
  },
  compareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  compareMovies: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  posterContainer: {
    width: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poster: {
    width: '100%',
    height: 200,
  },
  posterOverlay: {
    padding: 12,
  },
  ratingTag: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  vsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionButtons: {
    width: '100%',
    alignItems: 'center',
  },
  toughButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    width: '80%',
    alignItems: 'center',
  },
  toughButtonText: {
    fontSize: 16,
  },
  unseenButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    width: '80%',
    alignItems: 'center',
  },
  unseenButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default compareStyles;