import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoadingScreen from './src/Screens/LoadingScreen';
import AuthScreen from './src/Screens/AuthScreen';
import TabNavigator from './src/Navigation/TabNavigator';

const Stack = createStackNavigator();

// Sample data for initial state
const initialGenres = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// Main App Component
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  
  // Movie data state
  const [seen, setSeen] = useState([]);
  const [unseen, setUnseen] = useState([]);
  const [genres, setGenres] = useState(initialGenres);

  // Function to handle loading screen completion
  const handleFinishLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Function to handle successful authentication
  const handleAuthentication = useCallback(() => {
    console.log("Authentication successful, navigating to main app");
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
                  seen={seen}
                  unseen={unseen}
                  setSeen={setSeen}
                  setUnseen={setUnseen}
                  genres={genres}
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
