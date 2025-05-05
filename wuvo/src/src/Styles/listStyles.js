import { StyleSheet } from 'react-native';

const listStyles = StyleSheet.create({
  rankingsList: {
    flex: 1,
  },
  rankingItem: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultPoster: {
    width: 100,
    height: 150,
  },
  movieDetails: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
  },
  rankNumber: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default listStyles;