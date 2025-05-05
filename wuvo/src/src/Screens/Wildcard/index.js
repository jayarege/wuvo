import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import compareStyles from '../../Styles/compareStyles';
import stateStyles from '../../Styles/StateStyles';
import movieCardStyles from '../../Styles/movieCardStyles';
import buttonStyles from '../../Styles/buttonStyles';

const API_KEY = 'b401be0ea16515055d8d0bde16f80069';
const STORAGE_KEY = 'wuvo_compared_movies';
const BASELINE_COMPLETE_KEY = 'wuvo_baseline_complete';

// Simplified baseline movies list
const baselineMovies = [
  { id: 238, title: "The Godfather" },
  { id: 278, title: "The Shawshank Redemption" },
  { id: 240, title: "The Godfather Part II" },
  { id: 155, title: "The Dark Knight" },
  { id: 603, title: "The Matrix" }
];

function WildcardScreen({ seen, setSeen, unseen, onAddToSeen, onAddToUnseen, genres, isDarkMode }) {
  const [seenMovie, setSeenMovie] = useState(null);
  const [newMovie, setNewMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparedMovies, setComparedMovies] = useState([]);
  const [baselineComplete, setBaselineComplete] = useState(false);
  const isLoadingRef = useRef(false);

  // Simplified random movie fetcher
  const fetchRandomMovie = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      // For demo: use a random movie from user's seen list
      if (seen.length > 0) {
        const randomSeenIndex = Math.floor(Math.random() * seen.length);
        setSeenMovie(seen[randomSeenIndex]);
      } else {
        setError('Please rate some movies first in the Add Movies section.');
        isLoadingRef.current = false;
        setLoading(false);
        return;
      }
      
      // Get a demo "new" movie - in real app would call API
      // Just mock a movie for testing
      setNewMovie({
        id: 123456,
        title: "Example Movie",
        poster: "/nbrqj9q8WubD3QkYm7n3GhjN7kE.jpg", // Example poster path
        userRating: 7.5,
        score: 7.5,
        eloRating: 750,
        genre_ids: [28, 12, 14] // Action, Adventure, Fantasy
      });
      
      setLoading(false);
      isLoadingRef.current = false;
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError('Failed to load movies. Please try again.');
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [seen]);

  // Basic initialization effect - added fetchRandomMovie to dependencies
  useEffect(() => {
    const loadStoredState = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          setComparedMovies(JSON.parse(jsonValue));
        }
        
        const baselineCompleteValue = await AsyncStorage.getItem(BASELINE_COMPLETE_KEY);
        setBaselineComplete(baselineCompleteValue === 'true');
      } catch (e) {
        console.error('Failed to load stored state', e);
      }
    };
    
    loadStoredState();
    fetchRandomMovie();
  }, [fetchRandomMovie]); // Added fetchRandomMovie as dependency

  // Basic method to get poster URL
  const getPosterUrl = path => `https://image.tmdb.org/t/p/w342${path}`;

  // Simple handlers for the buttons
  const handleSeenWin = useCallback(() => {
    // Just refresh for demo
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [fetchRandomMovie]);

  const handleNewWin = useCallback(() => {
    // Just refresh for demo
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [fetchRandomMovie]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setNewMovie(null);
    setSeenMovie(null);
    isLoadingRef.current = false;
    fetchRandomMovie();
  }, [fetchRandomMovie]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={stateStyles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#FFD700' : '#4B0082'} />
          <Text style={[stateStyles.loadingText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
            Loading movies for comparison...
          </Text>
          {/* Only using defined style */}
          <Text style={{ color: isDarkMode ? '#FFD700' : '#4B0082', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
            {!baselineComplete ? 
              `Progress: ${Math.min(comparedMovies.length, baselineMovies.length)}/${baselineMovies.length} movies` :
              'Custom recommendations enabled'
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={[stateStyles.errorContainer, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}>
          <Ionicons name="information-circle-outline" size={48} color={isDarkMode ? '#FFD700' : '#4B0082'} />
          <Text style={[stateStyles.errorText, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[stateStyles.retryButton, { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }]}
            onPress={handleRetry}
            activeOpacity={0.7}
          >
            <Text style={[stateStyles.retryButtonText, { color: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!seenMovie || !newMovie) return null;

  // Simplified UI - just the core comparison
  return (
    <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
      <View
        style={[
          headerStyles.screenHeader,
          { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0' },
        ]}
      >
        <Text style={[headerStyles.screenTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
          Movie Comparisons
        </Text>
      </View>

      <View style={[compareStyles.compareContainer, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={compareStyles.compareContent}>
          <Text style={[compareStyles.compareTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
            Which movie was better?
          </Text>
          
          <View style={compareStyles.compareMovies}>
            {/* Movie 1 */}
            <TouchableOpacity
              style={[compareStyles.posterContainer, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}
              onPress={handleSeenWin}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: getPosterUrl(seenMovie.poster) }}
                style={compareStyles.poster}
                resizeMode="cover"
              />
              <View style={compareStyles.posterOverlay}>
                <Text
                  style={[movieCardStyles.movieTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}
                  numberOfLines={1}
                >
                  {seenMovie.title}
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={compareStyles.vsContainer}>
              <Text style={[compareStyles.vsText, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>VS</Text>
            </View>
            
            {/* Movie 2 */}
            <TouchableOpacity
              style={[compareStyles.posterContainer, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}
              onPress={handleNewWin}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: getPosterUrl(newMovie.poster) }}
                style={compareStyles.poster}
                resizeMode="cover"
              />
              <View style={compareStyles.posterOverlay}>
                <Text
                  style={[movieCardStyles.movieTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}
                  numberOfLines={1}
                >
                  {newMovie.title}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={compareStyles.actionButtons}>
            <TouchableOpacity
              style={[buttonStyles.rateButton, { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }]}
              onPress={handleRetry}
              activeOpacity={0.7}
            >
              <Text style={[buttonStyles.rateButtonText, { color: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
                Skip / New Comparison
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// No unused styles in the StyleSheet
const styles = StyleSheet.create({
  // Now empty since we're using inline styles
});

export default WildcardScreen;
