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
});

export default homeStyles;