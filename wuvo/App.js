import React, { useState, useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LoadingScreen from './src/Screens/LoadingScreen';
import AuthScreen from './src/Screens/AuthScreen';
import TabNavigator from './src/Navigation/TabNavigator';

const Stack = createStackNavigator();

// User session key
const USER_SESSION_KEY = 'wuvo_user_session';

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
  const [userInfo, setUserInfo] = useState(null);
  
  // Movie data state
  const [seen, setSeen] = useState([]);
  const [unseen, setUnseen] = useState([]);
  const [genres, setGenres] = useState(initialGenres);

  // Check for existing session on app start
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const userSession = await AsyncStorage.getItem(USER_SESSION_KEY);
        
        if (userSession) {
          // User is logged in
          setUserInfo(JSON.parse(userSession));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to check user session:', error);
      } finally {
        // Wait a bit for the splash screen effect
        setTimeout(() => setIsLoading(false), 2000);
      }
    };
    
    checkUserSession();
  }, []);

  // Function to handle loading screen completion
  const handleFinishLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Function to handle successful authentication
  const handleAuthentication = useCallback(async (userData = {}) => {
    console.log("Authentication successful, navigating to main app");
    
    // Save minimal user data
    const userSession = {
      id: userData.id || 'temp-user-id',
      email: userData.email || 'user@example.com',
      name: userData.name || 'User',
      authenticated: true,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userSession));
      
      // Update state
      setUserInfo(userSession);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to save user session:', error);
      // Still authenticate for demo purposes
      setIsAuthenticated(true);
    }
  }, []);

  // Function to handle logout
  const handleLogout = useCallback(async () => {
    try {
      // Clear session from storage
      await AsyncStorage.removeItem(USER_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear user session:', error);
    } finally {
      // Update state regardless of AsyncStorage success
      setUserInfo(null);
      setIsAuthenticated(false);
    }
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
                  userInfo={userInfo}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}