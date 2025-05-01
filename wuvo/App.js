import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoadingScreen from './src/Screens/LoadingScreen';
import AuthScreen from './src/Screens/AuthScreen';
import TabNavigator from './src/Navigation/TabNavigator';

const Stack = createStackNavigator();

// Main App Component
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Function to handle loading screen completion
  const handleFinishLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Function to handle successful authentication
  const handleAuthentication = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  // Function to handle logout
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  // Function to toggle theme
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // First show loading screen
  if (isLoading) {
    return (
      <LoadingScreen 
        onFinishLoading={handleFinishLoading}
        isDarkMode={isDarkMode}
      />
    );
  }

  // After loading, navigate to Auth or Main based on authentication state
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // Auth flow
            <Stack.Screen name="Auth">
              {props => (
                <AuthScreen 
                  {...props} 
                  isDarkMode={isDarkMode} 
                  onAuthenticate={handleAuthentication}
                />
              )}
            </Stack.Screen>
          ) : (
            // Main app flow
            <Stack.Screen name="Main">
              {props => (
                <TabNavigator 
                  {...props}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}