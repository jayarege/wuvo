import { StyleSheet, Platform, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

const modalStyles = StyleSheet.create({
  // Main modal container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // Position at bottom
    alignItems: 'center',
  },
  
  // Modal content container
  modalContent: {
    width: '100%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // Shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    // Safe bottom margin
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    // Max height to ensure it doesn't take too much space
    maxHeight: height * 0.8,
  },
  
  // Container for animation handling
  animatedContainer: {
    width: '100%',
    position: 'relative',
    alignSelf: 'center',
  },
  
  // Handle for pull-down dismissal
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CCCCCC',
    alignSelf: 'center',
    marginBottom: 15,
  },
  
  // Title styling
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  // Form fields container
  formContainer: {
    marginVertical: 10,
  },
  
  // Input field styles
  inputField: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginVertical: 8,
    textAlign: 'center',
  },
  
  // Button container
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  
  // Base button style
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Touch feedback
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  
  // Primary button style
  primaryButton: {
    // Colors will be set in the component based on theme
  },
  
  // Secondary/cancel button
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  
  // Button text
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Keyboard-aware fixes
  keyboardAvoiding: {
    flex: 1,
    width: '100%',
  },
  
  // Backdrop press area for dismissing modal
  backdropPressArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Error text
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default modalStyles;