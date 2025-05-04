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

function AddMovieScreen({ seen, unseen, onAddToSeen, onAddToUnseen, genres, isDarkMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ratingInput, setRatingInput] = useState('');
  const [isRerating, setIsRerating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // Track keyboard height
  
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

  // Helper function to calculate relevance score between movie title and search query
  const calculateRelevance = (title, query) => {
    if (!title || !query) return 0;
    
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match gets highest score
    if (titleLower === queryLower) return 100;
    
    // Title starts with query gets high score
    if (titleLower.startsWith(queryLower)) return 90;
    
    // Title contains exact query gets medium-high score
    if (titleLower.includes(queryLower)) return 80;
    
    // Check if title contains all words in query
    const queryWords = queryLower.split(' ').filter(word => word.length > 1);
    if (queryWords.every(word => titleLower.includes(word))) return 70;
    
    // Calculate how many words from the query are in the title
    const matchingWords = queryWords.filter(word => titleLower.includes(word));
    const matchRatio = matchingWords.length / queryWords.length;
    
    // Return score based on percentage of matching words (up to 60)
    return Math.floor(matchRatio * 60);
  };

  // Fetch suggestions as user types with debouncing
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Use a more permissive search query
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
          query
        )}&page=1&include_adult=false`
      );

      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        // Filter results that might be relevant (more inclusive filtering)
        const topSuggestions = data.results
          .filter(m => {
            // Include movies even if they don't have a poster
            // Include movies that partially match the search query
            const lowerTitle = m.title.toLowerCase();
            const lowerQuery = query.toLowerCase();
            return lowerTitle.includes(lowerQuery);
          })
          // For common terms like "the", sort by vote_count
          .sort((a, b) => {
            // If query is very generic (like "the"), prioritize by votes
            if (query.toLowerCase() === "the" || 
                query.toLowerCase() === "a" ||
                query.length <= 3) {
              return (b.vote_count || 0) - (a.vote_count || 0);
            }
            
            // Otherwise, use relevance-based sorting
            const aRelevance = calculateRelevance(a.title, query);
            const bRelevance = calculateRelevance(b.title, query);
            if (bRelevance !== aRelevance) return bRelevance - aRelevance;
            
            // Break ties with vote count
            return (b.vote_count || 0) - (a.vote_count || 0);
          })
          .slice(0, 6) // Show more suggestions
          .map(m => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? new Date(m.release_date).getFullYear() : 'Unknown',
            votes: m.vote_count || 0
          }));
        
        setSuggestions(topSuggestions);
        setShowSuggestions(topSuggestions.length > 0);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
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
      fetchSuggestions(text);
    }, 400);
  }, [fetchSuggestions]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Search for movies with improved relevance and vote count prioritization
  const searchMovies = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setShowSuggestions(false);
    setError(null);
    
    try {
      // First try a direct search
      const directResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
          searchQuery
        )}&page=1&include_adult=false`
      );
      
      if (!directResponse.ok) {
        throw new Error('Failed to search for movies');
      }
      
      const directData = await directResponse.json();
      
      // If we have few results, try a more permissive search
      let results = directData.results || [];
      
      if (results.length < 3) {
        // Try with partial matching, searching for each word separately
        const words = searchQuery.split(' ').filter(word => word.length > 2);
        
        if (words.length > 1) {
          // Try with the first significant word
          const backupResponse = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
              words[0]
            )}&page=1&include_adult=false`
          );
          
          if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            
            if (backupData.results && Array.isArray(backupData.results)) {
              // Filter these results to find ones that might match our query
              const filteredBackupResults = backupData.results.filter(movie => {
                const movieTitle = movie.title.toLowerCase();
                const queryWords = searchQuery.toLowerCase().split(' ');
                // Check if the movie title contains most of the query words
                return queryWords.some(word => word.length > 2 && movieTitle.includes(word));
              });
              
              // Add these to our results, avoiding duplicates
              const existingIds = new Set(results.map(m => m.id));
              filteredBackupResults.forEach(movie => {
                if (!existingIds.has(movie.id)) {
                  results.push(movie);
                  existingIds.add(movie.id);
                }
              });
            }
          }
        }
      }
      
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('No movies found matching your search');
      }
      
      // Filter and process results
      const filteredResults = results
        // Prefer movies with posters but don't exclude those without
        .map(m => {
          // Check if movie is already in seen list
          const existingMovie = seen.find(sm => sm.id === m.id);
          // Check if movie is in watchlist
          const inWatchlist = unseen.some(um => um.id === m.id);
          
          return {
            id: m.id,
            title: m.title,
            score: m.vote_average,
            voteCount: m.vote_count || 0,
            poster: m.poster_path, // Can be null
            overview: m.overview || "No overview available",
            release_date: m.release_date || 'Unknown',
            genre_ids: m.genre_ids?.slice(0, 3) || [],
            alreadyRated: !!existingMovie,
            currentRating: existingMovie ? existingMovie.userRating : null,
            inWatchlist: inWatchlist,
            popularity: m.popularity || 0,
            relevance: calculateRelevance(m.title, searchQuery) // Add relevance score
          };
        })
        // For common search terms, prioritize by vote count
        .sort((a, b) => {
          // If query is very generic (like "the"), prioritize by votes
          if (searchQuery.toLowerCase() === "the" || 
              searchQuery.toLowerCase() === "a" ||
              searchQuery.length <= 3) {
            return b.voteCount - a.voteCount;
          }
          
          // Otherwise, sort by relevance first, then by votes
          if (b.relevance !== a.relevance) return b.relevance - a.relevance;
          return b.voteCount - a.voteCount;
        });
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching movies:', err);
      setError(`Failed to search for movies: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, seen, unseen]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion) => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    setTimeout(searchMovies, 100); // Search after updating the input
  }, [searchMovies]);

  const getPosterUrl = useCallback(path => {
    if (!path) return 'https://via.placeholder.com/342x513?text=No+Poster'; // Fallback image
    return `https://image.tmdb.org/t/p/w342${path}`;
  }, []);

  // Open rating modal when user clicks "Seen It" or "Re-rate"
  const openRatingModal = useCallback((movie, isRerate = false) => {
    setSelectedMovie(movie);
    // Initialize with empty string to ensure the placeholder shows
    setRatingInput(isRerate ? movie.currentRating.toString() : '');
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
      
      // Update search results
      setSearchResults(prev => prev.map(m => 
        m.id === selectedMovie.id 
          ? { ...m, alreadyRated: true, currentRating: rating }
          : m
      ));
    } else {
      // Add new movie to seen list
      onAddToSeen({
        ...selectedMovie,
        userRating: rating,
        eloRating: rating * 100,
        comparisonHistory: [],
        comparisonWins: 0,
      });
      
      // Update search results
      setSearchResults(prev => prev.map(m => 
        m.id === selectedMovie.id 
          ? { ...m, alreadyRated: true, currentRating: rating }
          : m
      ));
    }

    // Close modal
    setRatingModalVisible(false);
    setSelectedMovie(null);
    setRatingInput('');
  }, [selectedMovie, ratingInput, isRerating, seen, onAddToSeen]);

  const addToUnseen = useCallback(movie => {
    onAddToUnseen(movie);
    // Update search results
    setSearchResults(prev => prev.map(m => 
      m.id === movie.id 
        ? { ...m, inWatchlist: true }
        : m
    ));
  }, [onAddToUnseen]);

  // Close modal on backdrop press
  const handleCloseModal = useCallback(() => {
    setRatingModalVisible(false);
    setSelectedMovie(null);
    setRatingInput('');
    Keyboard.dismiss();
  }, []);

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
            onSubmitEditing={searchMovies}
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && (
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
                  }}
                  onPress={() => selectSuggestion(suggestion)}
                >
                  <Text style={{ 
                    color: isDarkMode ? '#FFFFFF' : '#333333',
                    fontSize: 14,
                    fontWeight: '500'
                  }}>
                    {suggestion.title} ({suggestion.year}) 
                    {suggestion.votes > 0 ? ` • ${suggestion.votes.toLocaleString()} votes` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        
        <TouchableOpacity
          style={[searchStyles.searchButton, { backgroundColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
          onPress={searchMovies}
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
      ) : searchResults.length === 0 && !loading ? (
        <View style={stateStyles.emptyStateContainer}>
          <Ionicons name="search" size={64} color={isDarkMode ? '#D3D3D3' : '#A9A9A9'} />
          <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', fontSize: 16, textAlign: 'center', marginTop: 16 }}>
            Search for movies to add to your lists
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
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
                  {item.release_date ? new Date(item.release_date).getFullYear() : 'Unknown'}
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
