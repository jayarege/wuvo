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
    // No need to specify colors here, they are set in the component
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
    color: '#FFFFFF', // Always white for better contrast on both themes
  },
  // Adding styles for suggestions here
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 10,
    maxHeight: 180,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Background color will be set in the component based on theme
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    // Border color will be set in the component
  },
  suggestionText: {
    fontSize: 14,
    // Text color will be set in the component
  }
});

export default searchStyles;