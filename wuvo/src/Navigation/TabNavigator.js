import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screen components
import HomeScreen from '../Screens/Home';
import TopRatedScreen from '../Screens/TopRated';
import WatchlistScreen from '../Screens/Watchlist';
import AddMovieScreen from '../Screens/AddMovie';
import WildcardScreen from '../Screens/Wildcard';

const Tab = createBottomTabNavigator();

function TabNavigator({ seen, unseen, setSeen, setUnseen, genres, isDarkMode, toggleTheme }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'TopRated') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Watchlist') {
            iconName = focused ? 'eye-off' : 'eye-off-outline';
          } else if (route.name === 'AddMovie') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Wildcard') {
            iconName = focused ? 'star' : 'star-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDarkMode ? '#FFD700' : '#4B0082',
        tabBarInactiveTintColor: isDarkMode ? '#D3D3D3' : '#A9A9A9',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF',
          borderTopColor: isDarkMode ? '#4B0082' : '#E0E0E0',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" options={{ title: 'Home' }}>
        {props => (
          <HomeScreen
            {...props}
            seen={seen}
            unseen={unseen}
            onAddToSeen={(newMovie) => {
              console.log("Adding to seen from Home:", newMovie.title);
              setSeen([...seen, newMovie]);
            }}
            onAddToUnseen={(newMovie) => {
              console.log("Adding to watchlist from Home:", newMovie.title);
              setUnseen([...unseen, newMovie]);
            }}
            genres={genres}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            // Pass newReleases data - we'll simulate with recent highly-rated movies
            newReleases={seen.length > 5 ? seen.slice(0, 10).map(m => ({
              ...m,
              vote_count: Math.floor(Math.random() * 5000) + 500,
              release_date: m.release_date || new Date().toISOString().split('T')[0]
            })) : unseen.slice(0, 10).map(m => ({
              ...m,
              vote_count: Math.floor(Math.random() * 5000) + 500,
              release_date: m.release_date || new Date().toISOString().split('T')[0]
            }))}
          />
        )}
      </Tab.Screen>
      
      <Tab.Screen name="TopRated" options={{ title: 'Top 10' }}>
        {props => (
          <TopRatedScreen
            {...props}
            movies={seen}
            genres={genres}
            onUpdateRating={(movieId, newRating) => {
              const updatedSeen = seen.map(m =>
                m.id === movieId
                  ? { ...m, userRating: newRating, eloRating: newRating * 100 }
                  : m
              );
              setSeen(updatedSeen);
            }}
            isDarkMode={isDarkMode}
          />
        )}
      </Tab.Screen>
      
      <Tab.Screen name="Watchlist" options={{ title: 'Watchlist' }}>
        {props => (
          <WatchlistScreen
            {...props}
            movies={unseen}
            genres={genres}
            isDarkMode={isDarkMode}
          />
        )}
      </Tab.Screen>
      
      <Tab.Screen name="AddMovie" options={{ title: 'Add Movie' }}>
        {props => (
          <AddMovieScreen
            {...props}
            seen={seen}
            unseen={unseen}
            onAddToSeen={newMovie => {
              console.log("Adding to seen:", newMovie.title);
              setSeen([...seen, newMovie]);
            }}
            onAddToUnseen={newMovie => {
              console.log("Adding to watchlist:", newMovie.title);
              setUnseen([...unseen, newMovie]);
            }}
            genres={genres}
            isDarkMode={isDarkMode}
          />
        )}
      </Tab.Screen>
      
      <Tab.Screen name="Wildcard" options={{ title: 'Wildcard' }}>
        {props => (
          <WildcardScreen
            {...props}
            seen={seen}
            setSeen={setSeen}
            unseen={unseen}
            onAddToSeen={newMovie => {
              console.log("Adding to seen from wildcard:", newMovie.title);
              setSeen([...seen, newMovie]);
            }}
            onAddToUnseen={newMovie => {
              console.log("Adding to watchlist from wildcard:", newMovie.title);
              setUnseen([...unseen, newMovie]);
            }}
            genres={genres}
            isDarkMode={isDarkMode}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default TabNavigator;