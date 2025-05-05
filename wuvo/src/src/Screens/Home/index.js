import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import homeStyles from '../../Styles/homeStyles';
import ratingStyles from '../../Styles/ratingStyles';
import modalStyles from '../../Styles/modalStyles';

const { width } = Dimensions.get('window');
const MOVIE_CARD_WIDTH = (width - 48) / 2.5; // Wider cards for better visibility
const CAROUSEL_ITEM_WIDTH = MOVIE_CARD_WIDTH + 20; // Include margin

function HomeScreen({ seen, unseen, genres, newReleases, isDarkMode, toggleTheme, onAddToSeen }) {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingInput, setRatingInput] = useState('');
  
  // Animation values
  const scrollX = useRef(new Animated.Value(0)).current;
  const position = useRef(new Animated.ValueXY()).current;
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll animation
  const autoScrollAnimation = useRef(null);
  
  // Start auto-scrolling animation (wrapped in useCallback)
  const startAutoScroll = useCallback(() => {
  if (autoScrollAnimation.current) {
    autoScrollAnimation.current.stop();
  }
  
  autoScrollAnimation.current = Animated.loop(
    Animated.timing(position.x, {
      toValue: -CAROUSEL_ITEM_WIDTH * 3, // Scroll through 3 items
      duration: 15000, // 15 seconds for the loop
      useNativeDriver: true,
    })
  );
  
  autoScrollAnimation.current.start();
}, [position.x]); // Removed CAROUSEL_ITEM_WIDTH from dependency array
  
  // Setup auto-scrolling for recommendations
  useEffect(() => {
    if (activeTab === 'recommendations' && recommendations.length > 0) {
      startAutoScroll();
    }
    
    return () => {
      if (autoScrollAnimation.current) {
        autoScrollAnimation.current.stop();
      }
    };
  }, [activeTab, recommendations, startAutoScroll]);
  
  // Pan responder for manual scrolling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Stop auto-scroll when user touches
        if (autoScrollAnimation.current) {
          autoScrollAnimation.current.stop();
        }
        
        position.setOffset({
          x: position.x._value,
          y: position.y._value,
        });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, { dx, vx }) => {
        position.flattenOffset();
        
        // Determine if we should snap to the next item
        const newIndex = Math.max(
          0,
          Math.min(
            recommendations.length - 1,
            currentIndex - Math.sign(dx)
          )
        );
        
        setCurrentIndex(newIndex);
        
        Animated.spring(position, {
          toValue: { x: -newIndex * CAROUSEL_ITEM_WIDTH, y: 0 },
          useNativeDriver: true,
        }).start(() => {
          // Restart auto-scroll after a delay
          setTimeout(startAutoScroll, 3000);
        });
      },
    })
  ).current;

  // Enhanced recommendation algorithm to ensure images
  const getRecommendations = () => {
    if (seen.length === 0) return [];
    
    // Calculate genre scores based on user ratings
    const genreScores = {};
    seen.forEach(movie => {
      if (movie.genre_ids) {
        const rating = movie.eloRating / 100;
        movie.genre_ids.forEach(genreId => {
          genreScores[genreId] = (genreScores[genreId] || 0) + rating;
        });
      }
    });

    // Calculate average release year preference
    let totalYears = 0;
    let totalRatings = 0;
    
    seen.forEach(movie => {
      if (movie.release_date) {
        const year = new Date(movie.release_date).getFullYear();
        if (!isNaN(year)) {
          totalYears += year * (movie.eloRating / 100);
          totalRatings += movie.eloRating / 100;
        }
      }
    });
    
    const avgPreferredYear = totalRatings > 0 ? Math.round(totalYears / totalRatings) : new Date().getFullYear() - 10;
    
    // Filter unseen movies that HAVE posters and are not in seen list
    // Also prioritize movies within user's preferred time period
    const suggestions = [...unseen]
      .filter(movie => movie.poster && movie.poster_path) // Ensure it has a poster
      .map(movie => {
        // Calculate year proximity score (0-1, higher is closer to preferred year)
        let yearProximity = 0;
        if (movie.release_date) {
          const movieYear = new Date(movie.release_date).getFullYear();
          const yearDiff = Math.abs(movieYear - avgPreferredYear);
          yearProximity = Math.max(0, 1 - (yearDiff / 50)); // Max 50 years difference
        }
        
        // Calculate genre match score
        const genreMatchScore = movie.genre_ids
          ? movie.genre_ids.reduce((sum, genreId) => sum + (genreScores[genreId] || 0), 0)
          : 0;
            
        return {
          ...movie,
          recommendationScore: (genreMatchScore * 0.7) + (yearProximity * 0.3), // Weighted score
          hasBeenSeen: false
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 20); // Get more recommendations for carousel

    return suggestions;
  };

  // Calculate top genres by average rating
  const getTopGenres = () => {
    const genreScores = {};
    seen.forEach(movie => {
      if (movie.genre_ids) {
        const rating = movie.eloRating / 100;
        movie.genre_ids.forEach(genreId => {
          if (!genreScores[genreId]) {
            genreScores[genreId] = { score: 0, count: 0 };
          }
          genreScores[genreId].score += rating;
          genreScores[genreId].count += 1;
        });
      }
    });

    return Object.entries(genreScores)
      .map(([genreId, data]) => ({
        name: genres[genreId] || 'Unknown',
        averageScore: data.score / data.count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  };

  // Prepare movie data for display - ensure all have images
  const prepareNewReleases = () => {
    if (!newReleases || newReleases.length === 0) return [];

    // Filter movies that have poster images
    const withPosters = newReleases.filter(movie => movie.poster_path);
    
    if (withPosters.length === 0) return [];
    
    // Sort by popularity (vote_count) for the top row
    const byPopularity = [...withPosters]
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 3);
    
    // Sort remaining by release date (newest first)
    const byReleaseDate = [...withPosters]
      .filter(movie => !byPopularity.find(m => m.id === movie.id))
      .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    
    return [...byPopularity, ...byReleaseDate];
  };

  // Handle selection to rate a movie
  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    setRatingInput('');
    setRatingModalVisible(true);
  };
  
  // Handle rating submission
  const submitRating = () => {
    const rating = parseFloat(ratingInput);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      alert('Please enter a valid rating between 1 and 10');
      return;
    }
    
    // Add to seen list with the rating
    const ratedMovie = {
      ...selectedMovie,
      userRating: rating,
      eloRating: rating * 100,
      comparisonHistory: [],
      comparisonWins: 0,
    };
    
    onAddToSeen(ratedMovie);
    
    // Close modal
    setRatingModalVisible(false);
    setSelectedMovie(null);
  };

  const recommendations = getRecommendations();
  const topGenres = getTopGenres();
  const sortedNewReleases = prepareNewReleases();

  // Determine card scale based on position
  const getCardScale = (index) => {
    const inputRange = [
      (index - 1) * CAROUSEL_ITEM_WIDTH,
      index * CAROUSEL_ITEM_WIDTH,
      (index + 1) * CAROUSEL_ITEM_WIDTH,
    ];
    
    // Scale decreases as cards move away from center
    return scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });
  };
  
  // Determine card rotation for diagonal effect
  const getCardRotation = (index) => {
    const inputRange = [
      (index - 1) * CAROUSEL_ITEM_WIDTH,
      index * CAROUSEL_ITEM_WIDTH,
      (index + 1) * CAROUSEL_ITEM_WIDTH,
    ];
    
    // Rotation creates diagonal flow
    return scrollX.interpolate({
      inputRange,
      outputRange: ['5deg', '0deg', '-5deg'],
      extrapolate: 'clamp',
    });
  };

  // Render a movie card with animation for carousel
  const renderCarouselItem = ({ item, index }) => {
    // Combine animation values
    const cardScale = getCardScale(index);
    const cardRotation = getCardRotation(index);
    
    return (
      <Animated.View
        style={[
          styles.carouselItem,
          {
            transform: [
              { scale: cardScale },
              { rotate: cardRotation },
              { translateX: position.x },
              { translateY: Animated.multiply(position.x, 0.1) }, // Diagonal movement
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.movieCard, 
            { backgroundColor: isDarkMode ? '#2A3132' : '#F5F5F5' }
          ]}
          activeOpacity={0.7}
          onPress={() => handleMovieSelect(item)}
        >
          <Image 
            source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }} 
            style={styles.moviePoster}
            resizeMode="cover"
          />
          <View style={styles.cardContent}>
            <Text 
              style={[
                styles.movieTitle, 
                { color: isDarkMode ? '#FFFFFF' : '#333333' }
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            <Text 
              style={[
                styles.movieInfo,
                { color: isDarkMode ? '#D3D3D3' : '#666666' }
              ]}
            >
              {item.release_date ? new Date(item.release_date).getFullYear() : 'Unknown'} • {
                item.genre_ids?.map(id => genres[id] || '').filter(Boolean).join(', ')
              }
            </Text>
            <TouchableOpacity
              style={[
                styles.rateButton,
                { backgroundColor: isDarkMode ? '#8A2BE2' : '#4B0082' }
              ]}
              onPress={() => handleMovieSelect(item)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Rate This</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render a movie card for regular sections
  const renderMovieCard = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.movieCard, 
        { backgroundColor: isDarkMode ? '#2A3132' : '#F5F5F5' }
      ]}
      activeOpacity={0.7}
      onPress={() => handleMovieSelect(item)}
    >
      <Image 
        source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }} 
        style={styles.moviePoster}
        resizeMode="cover"
      />
      <Text 
        style={[
          styles.movieTitle, 
          { color: isDarkMode ? '#FFFFFF' : '#333333' }
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.title}
      </Text>
      <TouchableOpacity
        style={[
          styles.quickRateButton,
          { backgroundColor: isDarkMode ? '#8A2BE2' : '#4B0082' }
        ]}
        onPress={() => handleMovieSelect(item)}
      >
        <Ionicons name="star" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render a section specifically for the most popular movies
  const renderPopularSection = () => {
    const popularMovies = sortedNewReleases.slice(0, 3); // Top 3 most popular
    
    if (popularMovies.length === 0) return null;
    
    return (
      <View style={styles.popularSection}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
          Most Popular
        </Text>
        <View style={styles.movieRow}>
          {popularMovies.map(movie => renderMovieCard({ item: movie, index: movie.id }))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
      <View
        style={[
          headerStyles.screenHeader,
          { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0' },
        ]}
      >
        <Text style={[headerStyles.screenTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
          Movie Ranker
        </Text>
        <TouchableOpacity
          style={headerStyles.themeToggle}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={24}
            color={isDarkMode ? '#FFD700' : '#4B0082'}
          />
        </TouchableOpacity>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'new' ? 
              { borderBottomColor: isDarkMode ? '#8A2BE2' : '#4B0082', borderBottomWidth: 2 } : 
              {}
          ]}
          onPress={() => setActiveTab('new')}
        >
          <Text 
            style={[
              styles.tabText, 
              { 
                color: activeTab === 'new' ? 
                  (isDarkMode ? '#8A2BE2' : '#4B0082') : 
                  (isDarkMode ? '#A0A0A0' : '#666666')
              }
            ]}
          >
            New Releases
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'recommendations' ? 
              { borderBottomColor: isDarkMode ? '#8A2BE2' : '#4B0082', borderBottomWidth: 2 } : 
              {}
          ]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Text 
            style={[
              styles.tabText, 
              { 
                color: activeTab === 'recommendations' ? 
                  (isDarkMode ? '#8A2BE2' : '#4B0082') : 
                  (isDarkMode ? '#A0A0A0' : '#666666')
              }
            ]}
          >
            Movies For You
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* New Releases Tab */}
      {activeTab === 'new' && (
        <View style={homeStyles.homeContainer}>
          {renderPopularSection()}
          
          <View style={styles.newReleasesSection}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
              New Releases
            </Text>
            <FlatList
              data={sortedNewReleases.slice(3)} // Skip the popular ones already shown
              renderItem={renderMovieCard}
              keyExtractor={item => item.id.toString()}
              numColumns={3}
              columnWrapperStyle={styles.movieRow}
            />
          </View>
        </View>
      )}
      
      {/* Movies For You Tab */}
      {activeTab === 'recommendations' && (
        <View style={homeStyles.homeContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
              Your Favorite Genres
            </Text>
            {topGenres.length > 0 ? (
              topGenres.map((genre, index) => (
                <View
                  key={index}
                  style={[styles.genreItem, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}
                >
                  <Text style={[styles.genreName, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
                    {genre.name}
                  </Text>
                  <Text style={[styles.genreScore, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
                    {genre.averageScore.toFixed(1)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', marginTop: 10 }}>
                Rate more movies to see your favorite genres
              </Text>
            )}
          </View>
          
          <View style={styles.recommendationsSection}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
              Recommended For You
            </Text>
            
            {recommendations.length > 0 ? (
              <View style={styles.carouselContainer} {...panResponder.panHandlers}>
                <Animated.FlatList
                  ref={scrollRef}
                  data={recommendations}
                  renderItem={renderCarouselItem}
                  keyExtractor={item => item.id.toString()}
                  horizontal
                  contentContainerStyle={styles.carousel}
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CAROUSEL_ITEM_WIDTH}
                  decelerationRate="fast"
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  scrollEventThrottle={16}
                />
                <Text style={[styles.swipeInstruction, { color: isDarkMode ? '#A0A0A0' : '#666666' }]}>
                  Swipe to explore more recommendations
                </Text>
              </View>
            ) : (
              <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', marginTop: 10 }}>
                Rate more movies to get personalized recommendations
              </Text>
            )}
          </View>
          
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
              Your Stats
            </Text>
            <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', marginTop: 5 }}>
              Movies Rated: {seen.length}
            </Text>
            <Text style={{ color: isDarkMode ? '#D3D3D3' : '#666', marginTop: 5 }}>
              Watchlist Size: {unseen.length}
            </Text>
          </View>
        </View>
      )}
      
      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={[
            modalStyles.modalContent,
            { backgroundColor: isDarkMode ? '#4B0082' : '#FFFFFF' }
          ]}>
            <Text style={[
              modalStyles.modalTitle,
              { color: isDarkMode ? '#F5F5F5' : '#333' }
            ]}>
              {selectedMovie ? `Rate "${selectedMovie.title}"` : 'Rate This Movie'}
            </Text>
            
            <TextInput
              style={[
                ratingStyles.ratingInput,
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
              placeholderTextColor={isDarkMode ? '#A0A0A0' : '#999999'}
              maxLength={3}
            />
            
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }
                ]}
                onPress={submitRating}
              >
                <Text style={[
                  modalStyles.modalButtonText,
                  { color: isDarkMode ? '#1C2526' : '#FFFFFF' }
                ]}>
                  Save Rating
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  modalStyles.cancelButton,
                  { borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }
                ]}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={[
                  modalStyles.modalButtonText,
                  { color: isDarkMode ? '#D3D3D3' : '#666' }
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  popularSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  newReleasesSection: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  recommendationsSection: {
    marginVertical: 16,
  },
  statsSection: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  movieRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  movieCard: {
    width: MOVIE_CARD_WIDTH,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  moviePoster: {
    width: '100%',
    height: MOVIE_CARD_WIDTH * 1.5, // 3:2 aspect ratio
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 8,
    textAlign: 'center',
  },
  genreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  genreName: {
    fontSize: 16,
    fontWeight: '500',
  },
  genreScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New carousel styles
  carouselContainer: {
    height: MOVIE_CARD_WIDTH * 1.8,
    marginBottom: 16,
  },
  carousel: {
    paddingLeft: 16,
    paddingRight: width - CAROUSEL_ITEM_WIDTH,
    alignItems: 'center',
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  cardContent: {
    padding: 8,
  },
  movieInfo: {
    fontSize: 12,
    marginBottom: 8,
  },
  rateButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  quickRateButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  swipeInstruction: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default HomeScreen;