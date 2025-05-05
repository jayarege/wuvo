import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  Modal, 
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import listStyles from '../../Styles/listStyles';
import scoreDisplayStyles from '../../Styles/scoreDisplayStyles';
import modalStyles from '../../Styles/modalStyles';
import ratingStyles from '../../Styles/ratingStyles';
import stateStyles from '../../Styles/StateStyles';
import movieCardStyles from '../../Styles/movieCardStyles';

function TopRatedScreen({ movies, onUpdateRating, genres, isDarkMode }) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [newRating, setNewRating] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const getPosterUrl = useCallback(path => `https://image.tmdb.org/t/p/w342${path}`, []);
  
  // Extract all unique genre IDs from movies for filter options
  const uniqueGenreIds = useMemo(() => {
    const genreSet = new Set();
    movies.forEach(movie => {
      if (movie.genre_ids && Array.isArray(movie.genre_ids)) {
        movie.genre_ids.forEach(id => genreSet.add(id));
      }
    });
    return Array.from(genreSet);
  }, [movies]);
  
  // Filter and sort movies by selected genre and rating
  const filteredAndRankedMovies = useMemo(() => {
    let filtered = [...movies];
    
    // Apply genre filter if selected
    if (selectedGenreId !== null) {
      filtered = filtered.filter(movie => 
        movie.genre_ids && movie.genre_ids.includes(selectedGenreId)
      );
    }
    
    // Sort by userRating or eloRating
    filtered = filtered.sort((a, b) => {
      // First try to sort by userRating if available
      if (a.userRating !== undefined && b.userRating !== undefined) {
        return b.userRating - a.userRating;
      }
      // Fall back to eloRating if userRating is not available
      return b.eloRating - a.eloRating;
    });
    
    // Take top 10 after filtering and sorting
    return filtered.slice(0, 10);
  }, [movies, selectedGenreId]);

  const openEditModal = useCallback((movie) => {
    setSelectedMovie(movie);
    // Use userRating if available, otherwise convert from eloRating
    const initialRating = movie.userRating !== undefined
      ? movie.userRating.toFixed(1)
      : (movie.eloRating / 100).toFixed(1);
    setNewRating(initialRating);
    setEditModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]); // Added slideAnim as dependency

  const closeEditModal = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setEditModalVisible(false);
      setSelectedMovie(null);
      setNewRating('');
    });
  }, [slideAnim]); // Added slideAnim as dependency

  const updateRating = useCallback(() => {
    const rating = parseFloat(newRating);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }
    onUpdateRating(selectedMovie.id, rating);
    closeEditModal();
  }, [newRating, selectedMovie, onUpdateRating, closeEditModal, slideAnim]); // Added slideAnim as dependency

  // Function to display rating correctly
  const displayRating = useCallback((movie) => {
    // Use userRating if available, otherwise convert from eloRating
    if (movie.userRating !== undefined) {
      return movie.userRating.toFixed(1);
    }
    return (movie.eloRating / 100).toFixed(1);
  }, []);
  
  // Handle genre selection
  const handleGenreSelect = useCallback((genreId) => {
    setSelectedGenreId(prev => prev === genreId ? null : genreId);
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedGenreId(null);
  }, []);

  // Render a genre filter button
  const renderGenreButton = useCallback(({ item }) => {
    const isSelected = item === selectedGenreId;
    const genreName = genres[item] || 'Unknown';
    
    return (
      <TouchableOpacity
        style={[
          styles.genreButton,
          isSelected && styles.selectedGenreButton,
          { 
            backgroundColor: isSelected 
              ? (isDarkMode ? '#FFD700' : '#4B0082') 
              : (isDarkMode ? '#33242F' : '#F0F0F0'),
            borderColor: isDarkMode ? '#8A2BE2' : '#4B0082'
          }
        ]}
        onPress={() => handleGenreSelect(item)}
        activeOpacity={0.7}
      >
        <Text 
          style={[
            styles.genreButtonText,
            { 
              color: isSelected 
                ? (isDarkMode ? '#1C2526' : '#FFFFFF') 
                : (isDarkMode ? '#D3D3D3' : '#666')
            }
          ]}
        >
          {genreName}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedGenreId, genres, isDarkMode, handleGenreSelect]);

  if (movies.length === 0) {
    return (
      <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={stateStyles.emptyStateContainer}>
          <Ionicons name="film-outline" size={64} color={isDarkMode ? '#D3D3D3' : '#A9A9A9'} />
          <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', fontSize: 16, textAlign: 'center', marginTop: 16 }}>
            You haven't ranked any movies yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
      <View
        style={[
          headerStyles.screenHeader,
          { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0' },
        ]}
      >
        <Text style={[headerStyles.screenTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
          Your Top Movies
        </Text>
      </View>
      
      {/* Genre Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
            Filter by Genre
          </Text>
          {selectedGenreId !== null && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={[styles.clearButtonText, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={uniqueGenreIds}
          renderItem={renderGenreButton}
          keyExtractor={(item) => item.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreList}
        />
        
        {selectedGenreId !== null && (
          <View style={styles.activeFilterIndicator}>
            <Text style={[styles.activeFilterText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
              Showing: {genres[selectedGenreId] || 'Unknown'} movies
            </Text>
          </View>
        )}
      </View>
      
      {/* Movie Rankings List */}
      {filteredAndRankedMovies.length > 0 ? (
        <ScrollView style={listStyles.rankingsList}>
          {filteredAndRankedMovies.map((movie, index) => (
            <View
              key={movie.id}
              style={[listStyles.rankingItem, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}
            >
              <View style={[listStyles.rankBadge, { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }]}>
                <Text style={[listStyles.rankNumber, { color: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
                  {index + 1}
                </Text>
              </View>
              <Image
                source={{ uri: getPosterUrl(movie.poster) }}
                style={listStyles.resultPoster}
                resizeMode="cover"
              />
              <View style={listStyles.movieDetails}>
                <Text
                  style={[listStyles.resultTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}
                  numberOfLines={2}
                >
                  {movie.title}
                </Text>
                <View style={scoreDisplayStyles.scoreContainer}>
                  <Text style={[scoreDisplayStyles.finalScore, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
                    {displayRating(movie)}
                  </Text>
                  <Text style={[movieCardStyles.genresText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                    Genres: {movie.genre_ids.map(id => genres[id] || 'Unknown').join(', ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(movie)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>
                    Edit Rating
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={stateStyles.emptyStateContainer}>
          <Ionicons name="search-outline" size={64} color={isDarkMode ? '#D3D3D3' : '#A9A9A9'} />
          <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', fontSize: 16, textAlign: 'center', marginTop: 16 }}>
            No movies found for this genre.
          </Text>
          <TouchableOpacity
            style={[styles.clearFiltersButton, { backgroundColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
            onPress={clearFilters}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
              Show All Movies
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Rating Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContent, 
                { 
                  transform: [{ translateY: slideAnim }], 
                  backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5',
                }
              ]}
            >
              <Text style={[modalStyles.modalTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
                Edit Rating for {selectedMovie?.title}
              </Text>
              <TextInput
                style={[
                  styles.ratingInput,
                  {
                    backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF',
                    borderColor: isDarkMode ? '#8A2BE2' : '#4B0082',
                    color: isDarkMode ? '#F5F5F5' : '#333',
                  },
                ]}
                value={newRating}
                onChangeText={setNewRating}
                keyboardType="decimal-pad"
                placeholder="7.5"
                maxLength={3}
                returnKeyType="done"
                placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
                autoFocus={true}
              />
              <View style={modalStyles.modalButtons}>
                <TouchableOpacity
                  style={[modalStyles.modalButton, { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }]}
                  onPress={updateRating}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: isDarkMode ? '#1C2526' : '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                    Save
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.modalButton, modalStyles.cancelButton, { borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
                  onPress={closeEditModal}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', fontSize: 16, fontWeight: '600' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Extended styles
const styles = StyleSheet.create({
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#8A2BE2',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
    width: '85%',
    maxHeight: '40%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ratingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    width: '100%',
    marginVertical: 16,
    textAlign: 'center',
  },
  // Genre Filter Styles
  filterSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4, 
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  genreList: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  genreButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  selectedGenreButton: {
    borderWidth: 1,
  },
  genreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterIndicator: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFilterText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});

export default TopRatedScreen;