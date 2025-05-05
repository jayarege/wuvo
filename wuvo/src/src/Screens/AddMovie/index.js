import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  SafeAreaView,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import searchStyles from '../../Styles/searchStyles';
import movieCardStyles from '../../Styles/movieCardStyles';
import buttonStyles from '../../Styles/buttonStyles';
import stateStyles from '../../Styles/StateStyles';
import modalStyles from '../../Styles/modalStyles';

const API_KEY = 'b401be0ea16515055d8d0bde16f80069';

// Advanced movie search engine
class MovieSearcher {
  constructor(options = {}) {
    this.options = {
      maxResults: options.maxResults || 10,
      apiKey: options.apiKey || '',
      similarityThreshold: options.similarityThreshold || 0.3,
      // Weight factors for scoring
      weights: {
        titleSimilarity: options.weights?.titleSimilarity || 0.4,
        userPreference: options.weights?.userPreference || 0.3,
        popularity: options.weights?.popularity || 0.3,
      }
    };
    
    // Similarity algorithm
    this.similarityAlgorithm = options.similarityAlgorithm || this.levenshteinSimilarity;
  }
  
  // Default similarity algorithm - Levenshtein distance based similarity
  levenshteinSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Convert to lowercase for case-insensitive comparison
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Early returns for common cases
    if (s1 === s2) return 1; // Exact match
    if (s1.includes(s2) || s2.includes(s1)) return 0.9; // One is substring of the other
    
    // Get individual words
    const words1 = s1.split(/\s+/).filter(w => w.length > 1);
    const words2 = s2.split(/\s+/).filter(w => w.length > 1);
    
    // Check for word matches
    const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    if (commonWords.length > 0) {
      return 0.5 + (0.4 * commonWords.length / Math.max(words1.length, words2.length));
    }
    
    // Calculate Levenshtein distance
    const track = Array(s2.length + 1).fill(null).map(() => 
      Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= s2.length; j++) track[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    // Convert distance to similarity (0-1 scale)
    const maxLen = Math.max(s1.length, s2.length);
    const distance = track[s2.length][s1.length];
    return 1 - (distance / maxLen);
  }
  
  // Calculate user preference score based on user history
  calculateUserPreferenceScore(movie, userHistory) {
    if (!userHistory || userHistory.length === 0) return 0.5; // Neutral score
    
    // Start with base score
    let score = 0.5;
    
    // Check if user has rated similar genres
    const userGenreScores = this._aggregateGenreScores(userHistory);
    const genreBoost = movie.genre_ids?.reduce((sum, genreId) => {
      return sum + (userGenreScores[genreId] || 0);
    }, 0) || 0;
    
    // Normalize genre boost (0-0.3 range)
    const normalizedGenreBoost = Math.min(0.3, genreBoost / 10);
    
    // Check for directors/actors the user likes (simplified)
    const directorBoost = 0; // Placeholder for director preference
    
    // Check release year preference
    const yearPreference = this._calculateYearPreference(movie, userHistory);
    
    // Combine all factors
    score += normalizedGenreBoost + directorBoost + yearPreference;
    
    // Clamp the score to 0-1 range
    return Math.max(0, Math.min(1, score));
  }
  
  // Helper for aggregating genre scores from user history
  _aggregateGenreScores(userHistory) {
    const genreScores = {};
    
    userHistory.forEach(historyItem => {
      const userRating = historyItem.userRating || historyItem.eloRating / 100;
      // Convert rating to -1 to +1 scale (5 is neutral)
      const ratingFactor = (userRating - 5) / 5;
      
      historyItem.genre_ids?.forEach(genreId => {
        if (!genreScores[genreId]) genreScores[genreId] = 0;
        genreScores[genreId] += ratingFactor;
      });
    });
    
    return genreScores;
  }
  
  // Helper for calculating year preference
  _calculateYearPreference(movie, userHistory) {
    if (!movie.release_date || userHistory.length === 0) return 0;
    
    const movieYear = new Date(movie.release_date).getFullYear();
    if (isNaN(movieYear)) return 0;
    
    // Calculate weighted average of years from user's highly rated movies
    let totalWeight = 0;
    let weightedYearSum = 0;
    
    userHistory.forEach(historyItem => {
      if (!historyItem.release_date) return;
      
      const historyYear = new Date(historyItem.release_date).getFullYear();
      if (isNaN(historyYear)) return;
      
      const rating = historyItem.userRating || historyItem.eloRating / 100;
      if (rating >= 7) { // Only consider highly rated movies
        const weight = (rating - 7) * 3; // Weight by how much they liked it
        totalWeight += weight;
        weightedYearSum += historyYear * weight;
      }
    });
    
    if (totalWeight === 0) return 0;
    
    const preferredYear = weightedYearSum / totalWeight;
    const yearDiff = Math.abs(movieYear - preferredYear);
    
    // Convert to a score (closer to preferred year = higher score)
    // Maximum of 0.1 boost/penalty based on year
    return 0.1 - (Math.min(yearDiff, 30) / 300);
  }
  
  // Search implementation
  async searchMovies(query, userHistory = []) {
    if (!query || query.length < 2) return [];
    
    try {
      // Fetch initial results from TMDb
      const results = await this._fetchFromTMDb(query);
      
      if (!results || results.length === 0) return [];
      
      // Enrich and score results
      const scoredResults = this._scoreResults(results, query, userHistory);
      
      // Return top N results based on maxResults setting
      return scoredResults.slice(0, this.options.maxResults);
    } catch (error) {
      console.error('Error searching movies:', error);
      return [];
    }
  }
  
  // TMDb API integration
  async _fetchFromTMDb(query) {
    const apiKey = this.options.apiKey;
    if (!apiKey) {
      console.error('No API key provided for TMDb');
      return [];
    }
    
    // First, try an exact search
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodedQuery}&page=1&include_adult=false`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search for movies');
    }
    
    const data = await response.json();
    let results = data.results || [];
    
    // If we have few results, try a more permissive search
    if (results.length < 3 && query.includes(' ')) {
      // Try with the first significant word
      const firstWord = query.split(' ')[0];
      if (firstWord.length > 2) {
        const backupResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
            firstWord
          )}&page=1&include_adult=false`
        );
        
        if (backupResponse.ok) {
          const backupData = await backupResponse.json();
          
          if (backupData.results && Array.isArray(backupData.results)) {
            // Only add new results that don't duplicate what we already have
            const existingIds = new Set(results.map(m => m.id));
            
            backupData.results.forEach(movie => {
              if (!existingIds.has(movie.id)) {
                results.push(movie);
              }
            });
          }
        }
      }
    }
    
    return results;
  }
  
  // Score and rank the results based on multiple factors
  _scoreResults(results, query, userHistory) {
    const { weights, similarityThreshold } = this.options;
    
    // Process each result
    const scoredResults = results.map(movie => {
      // Calculate title similarity score
      const titleSimilarity = this.similarityAlgorithm(movie.title, query);
      
      // Skip results with very low similarity unless it's a very short query
      if (titleSimilarity < similarityThreshold && query.length > 3) {
        return null;
      }
      
      // Calculate user preference score
      const userPreferenceScore = this.calculateUserPreferenceScore(movie, userHistory);
      
      // Calculate popularity score (normalized from TMDb data)
      const voteCount = movie.vote_count || 0;
      const voteAverage = movie.vote_average || 5;
      
      // Normalize vote count (log scale to handle very popular movies)
      const normalizedVoteCount = voteCount > 0 ? Math.min(1, Math.log10(voteCount) / 4) : 0;
      
      // Normalize vote average (1-10 scale to 0-1)
      const normalizedVoteAverage = (voteAverage - 1) / 9;
      
      // Combined popularity score
      const popularityScore = (normalizedVoteCount * 0.7) + (normalizedVoteAverage * 0.3);
      
      // Calculate final score using weights
      const finalScore = 
        (titleSimilarity * weights.titleSimilarity) +
        (userPreferenceScore * weights.userPreference) +
        (popularityScore * weights.popularity);
      
      // Special case for extremely short queries like "the"
      const isGenericQuery = query.length <= 3;
      
      // Return enhanced result with scores
      return {
        ...movie,
        titleSimilarity,
        userPreferenceScore,
        popularityScore,
        finalScore: isGenericQuery ? (popularityScore * 0.8) + (titleSimilarity * 0.2) : finalScore
      };
    })
    .filter(Boolean) // Remove null results
    .sort((a, b) => b.finalScore - a.finalScore); // Sort by final score
    
    return scoredResults;
  }
  
  // Process results into a UI-friendly format
  formatResults(results) {
    return results.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
      thumbnailPoster: movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : null,
      voteCount: movie.vote_count || 0,
      score: movie.vote_average || 0,
      overview: movie.overview || "No overview available",
      genre_ids: movie.genre_ids || [],
      release_date: movie.release_date || null,
      popularity: movie.popularity || 0,
      similarity: movie.titleSimilarity || 0,
      relevance: movie.finalScore || 0
    }));
  }
}

// Custom hook for search functionality
const useMovieSearch = (apiKey, options = {}) => {
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const searcherRef = useRef(null);
  
  // Initialize the searcher if needed
  if (!searcherRef.current) {
    searcherRef.current = new MovieSearcher({
      apiKey,
      ...options
    });
  }
  
  // Function to update suggestions as user types
  const updateSuggestions = useCallback(async (query, userHistory) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const results = await searcherRef.current.searchMovies(query, userHistory);
      const formattedResults = searcherRef.current.formatResults(results);
      setSuggestions(formattedResults);
    } catch (err) {
      console.error('Error getting suggestions:', err);
      setSuggestions([]);
    }
  }, []);
  
  // Main search function
  const searchMovies = useCallback(async (query, userHistory) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await searcherRef.current.searchMovies(query, userHistory);
      const formattedResults = searcherRef.current.formatResults(results);
      setResults(formattedResults);
    } catch (err) {
      console.error('Error searching movies:', err);
      setError('Failed to search for movies. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    results,
    suggestions,
    loading,
    error,
    updateSuggestions,
    searchMovies
  };
};

// Main AddMovieScreen Component
function AddMovieScreen({ seen, unseen, onAddToSeen, onAddToUnseen, genres, isDarkMode }) {
  // Initialize the movie search hook with user preferences
  const {
    results: searchResults,
    suggestions,
    loading,
    error: searchError,
    updateSuggestions,
    searchMovies
  } = useMovieSearch(API_KEY, {
    maxResults: 20,
    weights: {
      titleSimilarity: 0.35,
      userPreference: 0.35,
      popularity: 0.3
    }
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  
  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ratingInput, setRatingInput] = useState('');
  const [isRerating, setIsRerating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // For debouncing
  const timeoutRef = useRef(null);

  // Setup keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    // Clean up listeners
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Handle search query changes with debouncing
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // Only show suggestions if query is at least 2 characters
      if (text.length >= 2) {
        updateSuggestions(text, seen); // Pass user history (seen movies)
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce
  }, [updateSuggestions, seen]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion) => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    // Call the main search function
    searchMovies(suggestion.title, seen);
  }, [searchMovies, seen]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    setShowSuggestions(false);
    searchMovies(searchQuery, seen);
  }, [searchQuery, searchMovies, seen]);

  const getPosterUrl = useCallback(path => {
    if (!path) return 'https://via.placeholder.com/342x513?text=No+Poster';
    return path;
  }, []);

  // Open rating modal when user clicks "Seen It" or "Re-rate"
  const openRatingModal = useCallback((movie, isRerate = false) => {
    setSelectedMovie(movie);
    // Initialize with empty string to ensure the placeholder shows
    setRatingInput(isRerate ? movie.currentRating?.toString() : '');
    setIsRerating(isRerate);
    setRatingModalVisible(true);
  }, []);

  // Add to seen list with rating
  const addToSeenWithRating = useCallback(() => {
    if (!selectedMovie) return;

    const rating = parseFloat(ratingInput);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      alert('Please enter a valid rating between 1 and 10');
      return;
    }

    if (isRerating) {
      // Update existing movie rating
      const updatedSeen = seen.map(m => 
        m.id === selectedMovie.id 
          ? { ...m, userRating: rating, eloRating: rating * 100 }
          : m
      );
      const newSeenArray = [...updatedSeen];
      onAddToSeen(newSeenArray.find(m => m.id === selectedMovie.id));
      
      // Update search results - no need to do this with the new approach as we re-search
    } else {
      // Add new movie to seen list
      onAddToSeen({
        ...selectedMovie,
        userRating: rating,
        eloRating: rating * 100,
        comparisonHistory: [],
        comparisonWins: 0,
      });
    }

    // Close modal
    setRatingModalVisible(false);
    setSelectedMovie(null);
    setRatingInput('');
  }, [selectedMovie, ratingInput, isRerating, seen, onAddToSeen]);

  const addToUnseen = useCallback(movie => {
    onAddToUnseen(movie);
  }, [onAddToUnseen]);

  // Close modal on backdrop press
  const handleCloseModal = useCallback(() => {
    setRatingModalVisible(false);
    setSelectedMovie(null);
    setRatingInput('');
    Keyboard.dismiss();
  }, []);

  // Update local error state when search error changes
  useEffect(() => {
    if (searchError) {
      setError(searchError);
    }
  }, [searchError]);
  
  // Process search results to match the expected format for movie cards
  const processedResults = useCallback(() => {
    return searchResults.map(item => {
      // Check if movie is already in seen list or watchlist
      const existingMovie = seen.find(sm => sm.id === item.id);
      const inWatchlist = unseen.some(um => um.id === item.id);
      
      return {
        id: item.id,
        title: item.title,
        score: item.score || 0,
        voteCount: item.voteCount || 0,
        poster: item.poster, // Already has the full URL
        overview: item.overview || "No overview available",
        release_date: item.release_date || (item.year ? `${item.year}-01-01` : 'Unknown'),
        genre_ids: item.genre_ids || [],
        alreadyRated: !!existingMovie,
        currentRating: existingMovie?.userRating || null,
        inWatchlist: inWatchlist
      };
    });
  }, [searchResults, seen, unseen]);

  const renderedResults = processedResults();

  return (
    <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
      <View
        style={[
          headerStyles.screenHeader,
          { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0' },
        ]}
      >
        <Text style={[headerStyles.screenTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
          Add Movies
        </Text>
      </View>
      
      {/* Search bar with suggestions dropdown */}
      <View
        style={[
          searchStyles.searchContainer,
          { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF', borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0' },
        ]}
      >
        <View style={{ flex: 1, position: 'relative' }}>
          <TextInput
            style={[
              searchStyles.searchInput,
              {
                backgroundColor: isDarkMode ? '#4B0082' : '#F0F0F0',
                borderColor: isDarkMode ? '#8A2BE2' : '#E0E0E0',
                color: isDarkMode ? '#F5F5F5' : '#333',
              },
            ]}
            placeholder="Search for a movie..."
            placeholderTextColor={isDarkMode ? '#A9A9A9' : '#999'}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ScrollView
              style={[
                styles.suggestionsContainer,
                {
                  backgroundColor: isDarkMode 
                    ? 'rgba(75, 0, 130, 0.85)' // Semi-transparent dark purple
                    : 'rgba(245, 245, 245, 0.9)', // Semi-transparent light gray
                  borderColor: isDarkMode ? '#8A2BE2' : '#E0E0E0',
                }
              ]}
            >
              {suggestions.map(suggestion => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => selectSuggestion(suggestion)}
                >
                  {suggestion.thumbnailPoster && (
                    <Image 
                      source={{ uri: suggestion.thumbnailPoster }}
                      style={{ width: 40, height: 60, marginRight: 10, borderRadius: 4 }}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      color: isDarkMode ? '#FFFFFF' : '#333333',
                      fontSize: 14,
                      fontWeight: '500'
                    }}>
                      {suggestion.title} {suggestion.year ? `(${suggestion.year})` : ''}
                    </Text>
                    {suggestion.voteCount > 0 && (
                      <Text style={{ 
                        color: isDarkMode ? '#D3D3D3' : '#666',
                        fontSize: 12
                      }}>
                        {suggestion.voteCount.toLocaleString()} votes • Rating: {suggestion.score?.toFixed(1) || 'N/A'}
                      </Text>
                    )}
                  </View>
                  <View style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)', 
                    paddingHorizontal: 6, 
                    paddingVertical: 2, 
                    borderRadius: 4,
                    marginLeft: 4
                  }}>
                    <Text style={{ 
                      color: isDarkMode ? '#FFFFFF' : '#333333',
                      fontSize: 12
                    }}>
                      {Math.round(suggestion.similarity * 100)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        
        <TouchableOpacity
          style={[searchStyles.searchButton, { backgroundColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
          onPress={handleSearch}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={stateStyles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={isDarkMode ? '#FFD700' : '#4B0082'} />
          <Text style={{ color: isDarkMode ? '#FFD700' : '#4B0082', fontSize: 18, textAlign: 'center', marginTop: 10, fontWeight: '500' }}>
            {error}
          </Text>
        </View>
      ) : renderedResults.length === 0 && !loading ? (
        <View style={stateStyles.emptyStateContainer}>
          <Ionicons name="search" size={64} color={isDarkMode ? '#D3D3D3' : '#A9A9A9'} />
          <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', fontSize: 16, textAlign: 'center', marginTop: 16 }}>
            Search for movies to add to your lists
          </Text>
        </View>
      ) : (
        <FlatList
          data={renderedResults}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={[movieCardStyles.movieCard, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}>
              <Image
                source={{ uri: getPosterUrl(item.poster) }}
                style={movieCardStyles.moviePoster}
                resizeMode="cover"
              />
              <View style={movieCardStyles.movieInfo}>
                <Text
                  style={[movieCardStyles.movieTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={[movieCardStyles.releaseDate, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                  {item.release_date && item.release_date !== 'Unknown' 
                    ? new Date(item.release_date).getFullYear() 
                    : item.year || 'Unknown'}
                </Text>
                <Text
                  style={[movieCardStyles.movieOverview, { color: isDarkMode ? '#E0E0E0' : '#555' }]}
                  numberOfLines={3}
                >
                  {item.overview}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="star" size={14} color={isDarkMode ? '#FFD700' : '#FFA000'} />
                  <Text style={{ color: isDarkMode ? '#FFD700' : '#FFA000', marginLeft: 4 }}>
                    {item.score.toFixed(1)} ({item.voteCount.toLocaleString()} votes)
                  </Text>
                </View>
                <Text style={[movieCardStyles.genresText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                  Genres: {item.genre_ids.map(id => genres[id] || 'Unknown').join(', ')}
                </Text>
                
                {item.alreadyRated && (
                  <Text style={{ color: isDarkMode ? '#72B01D' : '#4CAF50', marginTop: 4, fontWeight: 'bold' }}>
                    Your rating: {item.currentRating.toFixed(1)}
                  </Text>
                )}
                
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity
                    style={[buttonStyles.rateButton, { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082', marginRight: 8 }]}
                    onPress={() => openRatingModal(item, item.alreadyRated)}
                    activeOpacity={0.7}
                  >
                    <Text style={[buttonStyles.rateButtonText, { color: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
                      {item.alreadyRated ? 'Re-rate' : 'Seen It'}
                    </Text>
                  </TouchableOpacity>
                  
                  {!item.alreadyRated && !item.inWatchlist && (
                    <TouchableOpacity
                      style={[buttonStyles.skipButton, { borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
                      onPress={() => addToUnseen(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[buttonStyles.skipButtonText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                        Add to Watchlist
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {item.inWatchlist && (
                    <View
                      style={[buttonStyles.skipButton, { 
                        borderColor: isDarkMode ? '#72B01D' : '#4CAF50',
                        backgroundColor: isDarkMode ? '#1C2526' : '#F5F5F5'
                      }]}
                    >
                      <Text style={{ color: isDarkMode ? '#72B01D' : '#4CAF50' }}>
                        In Watchlist
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}
      
      {/* Rating Modal - Improved for better keyboard handling */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade" // Changed from slide to fade for smoother appearance
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            style={{ width: '100%' }}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.modalContainer,
                {
                  // Position the modal toward the top when keyboard is visible
                  marginTop: keyboardHeight > 0 ? '10%' : '40%',
                }
              ]}
            >
              <View style={[
                styles.modalContent,
                { 
                  backgroundColor: isDarkMode ? '#4B0082' : '#FFFFFF',
                  // Remove maxHeight constraint to adapt to content
                }
              ]}>
                <Text style={[
                  styles.modalTitle,
                  { color: isDarkMode ? '#F5F5F5' : '#333' }
                ]}>
                  {isRerating ? 'Update your rating' : 'Rate this movie'}
                </Text>
                
                {selectedMovie && (
                  <Text style={[
                    styles.movieTitle,
                    { color: isDarkMode ? '#F5F5F5' : '#333' }
                  ]}>
                    {selectedMovie.title}
                  </Text>
                )}
                
                <TextInput
                  style={[
                    styles.ratingInput,
                    { 
                      backgroundColor: isDarkMode ? '#1C2526' : '#F0F0F0',
                      borderColor: isDarkMode ? '#8A2BE2' : '#E0E0E0',
                      color: isDarkMode ? '#F5F5F5' : '#333',
                    }
                  ]}
                  value={ratingInput}
                  onChangeText={setRatingInput}
                  keyboardType="decimal-pad"
                  placeholder="Enter rating (1-10)"
                  placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
                  maxLength={3}
                  autoFocus={true}
                  selectTextOnFocus={true}
                />
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }
                    ]}
                    onPress={addToSeenWithRating}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.saveButtonText,
                      { color: isDarkMode ? '#1C2526' : '#FFFFFF' }
                    ]}>
                      Save Rating
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      { 
                        borderColor: isDarkMode ? '#8A2BE2' : '#4B0082',
                      }
                    ]}
                    onPress={handleCloseModal}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.cancelButtonText,
                      { color: isDarkMode ? '#D3D3D3' : '#666' }
                    ]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Updated styles
const styles = StyleSheet.create({
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 10,
    maxHeight: 180, // Reduced height so it doesn't cover too much of the screen
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  movieTitle: {
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 16,
  },
  ratingInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  }
});

export default AddMovieScreen;