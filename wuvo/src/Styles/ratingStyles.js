import { StyleSheet } from 'react-native';

const ratingStyles = StyleSheet.create({
  ratingContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  ratingQuestion: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    width: 100,
    marginRight: 10,
    textAlign: 'center',
  },
});

export default ratingStyles;