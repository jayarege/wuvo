import { StyleSheet } from 'react-native';

const stateStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    margin: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  errorSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default stateStyles;