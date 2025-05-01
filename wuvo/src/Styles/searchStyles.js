import { StyleSheet } from 'react-native';

const searchStyles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
  },
  searchButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});

export default searchStyles;