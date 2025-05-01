import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import homeStyles from '../../Styles/homeStyles';

const { width } = Dimensions.get('window');
const MOVIE_CARD_WIDTH = (width - 48) / 3; // 3 movies per row with padding

function HomeScreen({ seen, unseen, genres, newReleases, isDarkMode, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'recommendations'

  // Enhanced recommendation algorithm with weighted scores
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

    // Score unseen movies based on genre preferences
    const recommendations = [...unseen]
      .map(movie => ({
        ...movie,
        recommendationScore: movie.genre_ids
          ? movie.genre_ids.reduce((sum, genreId) => sum + (genreScores[genreId] || 0), 0)
          : 0,
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 30); // Get more recommendations for grid view

    return recommendations;
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
      .slice(0, 5); // Show fewer genres to make room for movies
  };

  // Prepare movie data for display
  const prepareNewReleases = () => {
    if (!newReleases || newReleases.length === 0) return [];

    // Sort by popularity (vote_count) for the top row
    const byPopularity = [...newReleases].sort((a, b) => b.vote_count - a.vote_count).slice(0, 3);
    
    // Sort remaining by release date (newest first)
    const byReleaseDate = [...newReleases]
      .filter(movie => !byPopularity.find(m => m.id === movie.id))
      .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    
    return [...byPopularity, ...byReleaseDate];
  };

  const recommendations = getRecommendations();
  const topGenres = getTopGenres();
  const sortedNewReleases = prepareNewReleases();

  // Render a movie card
  const renderMovieCard = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.movieCard, 
        { backgroundColor: isDarkMode ? '#2A3132' : '#F5F5F5' }
      ]}
      activeOpacity={0.7}
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
      
      <ScrollView style={homeStyles.homeContainer}>
        {/* New Releases Tab */}
        {activeTab === 'new' && (
          <>
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
                scrollEnabled={false} // Parent ScrollView handles scrolling
                columnWrapperStyle={styles.movieRow}
              />
            </View>
          </>
        )}
        
        {/* Movies For You Tab */}
        {activeTab === 'recommendations' && (
          <>
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
              <FlatList
                data={recommendations}
                renderItem={renderMovieCard}
                keyExtractor={item => item.id.toString()}
                numColumns={3}
                scrollEnabled={false} // Parent ScrollView handles scrolling
                columnWrapperStyle={styles.movieRow}
              />
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
          </>
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
  popularSection: {
    marginBottom: 15,
  },
  newReleasesSection: {
    marginBottom: 20,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  movieRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  movieCard: {
    width: MOVIE_CARD_WIDTH,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moviePoster: {
    width: '100%',
    height: MOVIE_CARD_WIDTH * 1.5, // 3:2 aspect ratio
    borderRadius: 8,
  },
  movieTitle: {
    fontSize: 12,
    fontWeight: '500',
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
});

export default HomeScreen;