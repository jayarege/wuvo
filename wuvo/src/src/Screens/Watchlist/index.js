import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import listStyles from '../../Styles/listStyles';
import scoreDisplayStyles from '../../Styles/scoreDisplayStyles';
import stateStyles from '../../Styles/StateStyles';
import movieCardStyles from '../../Styles/movieCardStyles';

function WatchlistScreen({ movies, genres, isDarkMode }) {
  const getPosterUrl = path => `https://image.tmdb.org/t/p/w342${path}`;
  const sortedMovies = [...movies].sort((a, b) => b.score - a.score);

  if (sortedMovies.length === 0) {
    return (
      <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={stateStyles.emptyStateContainer}>
          <Ionicons name="eye-off-outline" size={64} color={isDarkMode ? '#D3D3D3' : '#A9A9A9'} />
          <Text style={[stateStyles.emptyStateText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
            Your watchlist is empty.
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
          Top Rated You Haven't Seen
        </Text>
      </View>
      <ScrollView style={listStyles.rankingsList}>
        {sortedMovies.map((movie, index) => (
          <View
            key={movie.id}
            style={[listStyles.rankingItem, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5' }]}
          >
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
                <Text style={[scoreDisplayStyles.tmdbScore, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                  TMDb: {movie.score.toFixed(1)}
                </Text>
                <Text style={[scoreDisplayStyles.releaseYear, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                  {new Date(movie.release_date).getFullYear()}
                </Text>
                <Text style={[movieCardStyles.genresText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                  Genres: {movie.genre_ids.map(id => genres[id] || 'Unknown').join(', ')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default WatchlistScreen;