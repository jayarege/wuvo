import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Modal,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import compareStyles from '../../Styles/compareStyles';
import stateStyles from '../../Styles/StateStyles';
import movieCardStyles from '../../Styles/movieCardStyles';
import buttonStyles from '../../Styles/buttonStyles';
import modalStyles from '../../Styles/modalStyles';

const API_KEY = 'b401be0ea16515055d8d0bde16f80069';
const MIN_VOTE_COUNT = 500; // Minimum number of votes required
const MIN_SCORE = 7.0; // Minimum score threshold

function WildcardScreen({ seen, setSeen, unseen, onAddToSeen, onAddToUnseen, genres, isDarkMode }) {
  // Movie data state
  const [seenMovie, setSeenMovie] = useState(null);
  const [newMovie, setNewMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  
  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);
  
  // Local filter state for modal
  const [tempGenre, setTempGenre] = useState(null);
  
  // Ref to prevent multiple concurrent API calls
  const isLoadingRef = useRef(false);
  
  // Fetch random movie from TMDB with filters
  const fetchRandomMovie = useCallback(() => {
    // Guard against concurrent API calls
    if (isLoadingRef.current) {
      console.log('Already loading, skipping new fetch');
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    
    // Check if we have enough rated movies
    if (seen.length < 3) {
      setError('You must have at least 3 movies ranked to use Wildcard mode.');
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Select a random movie from those you've seen
    // If genre filter is active, only select from movies in that genre
    let eligibleSeenMovies = seen;
    
    if (selectedGenre) {
      eligibleSeenMovies = seen.filter(movie => 
        movie.genre_ids && movie.genre_ids.includes(parseInt(selectedGenre))
      );
      
      if (eligibleSeenMovies.length < 2) {
        setError(`Not enough movies in the "${genres[selectedGenre]}" genre. Please rate more movies in this genre or select a different genre.`);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
    }
    
    const randomSeenMovie = eligibleSeenMovies[Math.floor(Math.random() * eligibleSeenMovies.length)];
    setSeenMovie(randomSeenMovie);

    // For fetching top-rated movies, use the /discover endpoint instead of /popular
    // This allows us to filter by vote_count to get only well-reviewed movies
    let apiUrl = '';
    
    if (selectedGenre) {
      // With genre filter
      apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=vote_average.desc&vote_count.gte=${MIN_VOTE_COUNT}&with_genres=${selectedGenre}`;
    } else {
      // No genre filter - get top rated with vote count filter
      apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=vote_average.desc&vote_count.gte=${MIN_VOTE_COUNT}`;
    }
    
    // Random page between 1-25 (TMDB limits to 500 results over 25 pages)
    const pageNumber = Math.floor(Math.random() * 25) + 1;
    apiUrl = `${apiUrl}&page=${pageNumber}`;
    
    console.log('Fetching from API: ', apiUrl);
    
    // Fetch a movie from TMDB
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch movies');
        return res.json();
      })
      .then(data => {
        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid API response format');
        }
        
        console.log(`Found ${data.results.length} movies on page ${pageNumber}`);
        
        // Filter out movies you've already seen or are in your watchlist
        const filteredMovies = data.results.filter(
          m =>
            m.poster_path &&
            m.vote_average >= MIN_SCORE &&
            !seen.some(sm => sm.id === m.id) &&
            !unseen.some(um => um.id === m.id)
        );
        
        console.log(`After filtering: ${filteredMovies.length} movies remain`);
        
        if (filteredMovies.length === 0) {
          // We'll try a different approach if we can't find any movies
          // Instead of recursively calling fetchRandomMovie (which can cause the spazzing)
          setError(`Couldn't find new movies matching your criteria. Try a different genre or check back later.`);
          setLoading(false);
          isLoadingRef.current = false;
          return;
        }
        
        // Pick a random movie from the filtered results
        const randomMovie = filteredMovies[Math.floor(Math.random() * filteredMovies.length)];
        
        // Format the movie data
        const formattedMovie = {
          id: randomMovie.id,
          title: randomMovie.title,
          score: randomMovie.vote_average,
          voteCount: randomMovie.vote_count,
          poster: randomMovie.poster_path,
          overview: randomMovie.overview,
          release_date: randomMovie.release_date || 'Unknown',
          genre_ids: randomMovie.genre_ids.slice(0, 3),
          // Use TMDB score directly as the starting rating
          eloRating: randomMovie.vote_average * 10, // Convert to 0-100 scale
          userRating: randomMovie.vote_average
        };
        
        setNewMovie(formattedMovie);
        setLoading(false);
        isLoadingRef.current = false;
      })
      .catch(err => {
        console.error('Error fetching movie:', err);
        setError(`Failed to load movie: ${err.message}`);
        setLoading(false);
        isLoadingRef.current = false;
      });
  }, [seen, unseen, selectedGenre, genres]);

  // Initial fetch on component mount - with error handling
  useEffect(() => {
    try {
      fetchRandomMovie();
    } catch (err) {
      console.error('Error in initial movie fetch:', err);
      setError('Something went wrong while loading. Please try again.');
      setLoading(false);
      isLoadingRef.current = false;
    }
    
    // Cleanup function
    return () => {
      // Set flag to prevent any ongoing fetches from completing
      isLoadingRef.current = true;
    };
  }, [fetchRandomMovie]);
  
  // Save current filter settings before showing modal
  const openFilterModal = useCallback(() => {
    // Initialize temp values with current settings
    setTempGenre(selectedGenre);
    setFilterModalVisible(true);
  }, [selectedGenre]);
  
  // Apply filter changes and fetch new movies
  const applyFilters = useCallback(() => {
    // First hide the modal
    setFilterModalVisible(false);
    
    // Only reload if settings changed
    const settingsChanged = selectedGenre !== tempGenre;
    
    // Apply temp values to actual state
    setSelectedGenre(tempGenre);
    
    // Only fetch new movie if settings actually changed
    if (settingsChanged) {
      // Use setTimeout to ensure the modal is completely gone before changing UI state
      setTimeout(() => {
        setNewMovie(null);
        setSeenMovie(null);
        setLoading(true);
        try {
          fetchRandomMovie();
        } catch (err) {
          console.error('Error after filter change:', err);
          setError('Something went wrong while loading. Please try again.');
          setLoading(false);
          isLoadingRef.current = false;
        }
      }, 300);
    }
  }, [selectedGenre, tempGenre, fetchRandomMovie]);
  
  // Cancel filter changes
  const cancelFilters = useCallback(() => {
    // Just close modal without applying changes
    setFilterModalVisible(false);
  }, []);

  // Simple rating adjustment based on comparison result
  const adjustRating = useCallback((winner, loser, winnerIsSeenMovie) => {
    // Calculate rating difference factor (smaller adjustment for big gaps)
    const ratingDiff = Math.abs(winner.userRating - loser.userRating);
    const adjustmentFactor = Math.max(0.2, 1 - (ratingDiff / 10));
    
    // Base adjustment amounts
    const winnerAdjustment = 0.2 * adjustmentFactor;
    const loserAdjustment = 0.2 * adjustmentFactor;
    
    // Winning against a higher-rated movie gives a bigger boost
    const winnerBoost = winner.userRating < loser.userRating ? 0.2 : 0;
    
    // Apply adjustments (capped at maximum change)
    const MAX_RATING_CHANGE = 0.5;
    const winnerIncrease = Math.min(MAX_RATING_CHANGE, winnerAdjustment + winnerBoost);
    const loserDecrease = Math.min(MAX_RATING_CHANGE, loserAdjustment);
    
    // Calculate new ratings (clamped between 1-10)
    const newWinnerRating = Math.min(10, Math.max(1, winner.userRating + winnerIncrease));
    const newLoserRating = Math.min(10, Math.max(1, loser.userRating - loserDecrease));
    
    // Return updated movie objects
    const updatedWinner = {
      ...winner,
      userRating: newWinnerRating,
      eloRating: newWinnerRating * 10
    };
    
    const updatedLoser = {
      ...loser,
      userRating: newLoserRating,
      eloRating: newLoserRating * 10
    };
    
    // Save the action for potential undo
    setLastAction({
      type: 'comparison',
      seenMovie: {...seenMovie},
      newMovie: {...newMovie},
      winnerIsSeenMovie
    });
    
    return winnerIsSeenMovie 
      ? { updatedSeenMovie: updatedWinner, updatedNewMovie: updatedLoser } 
      : { updatedSeenMovie: updatedLoser, updatedNewMovie: updatedWinner };
  }, [seenMovie, newMovie]);

  // Handle user choosing the seen movie as better
  const handleSeenWin = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Update ratings
    const { updatedSeenMovie, updatedNewMovie } = adjustRating(seenMovie, newMovie, true);
    
    // Update existing movie rating
    const updatedSeen = seen.map(m => 
      m.id === seenMovie.id ? updatedSeenMovie : m
    );
    
    // Add new movie to seen list
    setSeen([...updatedSeen, updatedNewMovie]);
    
    // Fetch the next comparison
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [seenMovie, newMovie, seen, setSeen, adjustRating, fetchRandomMovie]);

  // Handle user choosing the new movie as better
  const handleNewWin = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Update ratings
    const { updatedSeenMovie, updatedNewMovie } = adjustRating(newMovie, seenMovie, false);
    
    // Update existing movie rating
    const updatedSeen = seen.map(m => 
      m.id === seenMovie.id ? updatedSeenMovie : m
    );
    
    // Add new movie to seen list
    setSeen([...updatedSeen, updatedNewMovie]);
    
    // Fetch the next comparison
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [seenMovie, newMovie, seen, setSeen, adjustRating, fetchRandomMovie]);

  // Handle user hasn't seen the new movie
  const handleUnseen = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Add to watchlist
    onAddToUnseen(newMovie);
    
    // Save action for undo
    setLastAction({
      type: 'unseen',
      movie: {...newMovie}
    });
    
    // Fetch the next comparison
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [newMovie, onAddToUnseen, fetchRandomMovie]);

  // Handle user skipping this comparison
  const handleSkip = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Save action for undo
    setLastAction({
      type: 'skip',
      seenMovie: {...seenMovie},
      newMovie: {...newMovie}
    });
    
    // Just fetch a new comparison
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [seenMovie, newMovie, fetchRandomMovie]);

  // Handle tough choice
  const handleToughChoice = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Determine which movie has the lower rating
    const lowerRatedMovie = seenMovie.userRating <= newMovie.score ? seenMovie : newMovie;
    const higherRatedMovie = lowerRatedMovie === seenMovie ? newMovie : seenMovie;
    
    // Small boost for the lower-rated movie (up to 0.2 points)
    const ratingDiff = Math.abs(seenMovie.userRating - newMovie.score);
    const boostFactor = Math.min(0.2, ratingDiff * 0.1); // Smaller boost for smaller differences
    
    let updatedSeenMovie, updatedNewMovie;
    
    if (lowerRatedMovie === seenMovie) {
      // Seen movie gets a small boost as the lower-rated one
      const newSeenRating = Math.min(10, Math.max(1, seenMovie.userRating + boostFactor));
      
      updatedSeenMovie = {
        ...seenMovie,
        userRating: newSeenRating,
        eloRating: newSeenRating * 10
      };
      
      // New movie gets added with a rating just below the seen movie's adjusted rating
      const newRating = Math.max(1, Math.min(10, newSeenRating - 0.1));
      
      updatedNewMovie = {
        ...newMovie,
        userRating: newRating,
        eloRating: newRating * 10
      };
    } else {
      // New movie is lower-rated, so it gets a boost and is rated slightly higher than it would be
      const basedOnSeenRating = Math.max(1, Math.min(10, seenMovie.userRating - 0.1));
      const boostedRating = Math.min(10, Math.max(1, newMovie.score + boostFactor));
      const finalNewRating = Math.max(basedOnSeenRating, boostedRating);
      
      updatedNewMovie = {
        ...newMovie,
        userRating: finalNewRating,
        eloRating: finalNewRating * 10
      };
      
      // Seen movie stays the same
      updatedSeenMovie = { ...seenMovie };
    }
    
    // Save action for undo
    setLastAction({
      type: 'tough',
      seenMovie: {...seenMovie},
      newMovie: {...newMovie}
    });
    
    // Update seen movie in the list
    const updatedSeen = seen.map(m => 
      m.id === seenMovie.id ? updatedSeenMovie : m
    );
    
    // Add new movie to seen list
    setSeen([...updatedSeen, updatedNewMovie]);
    
    // Fetch the next comparison
    setNewMovie(null);
    setSeenMovie(null);
    setLoading(true);
    fetchRandomMovie();
  }, [seenMovie, newMovie, seen, setSeen, fetchRandomMovie]);

  // Handle undo last action
  const handleUndo = useCallback(() => {
    if (!lastAction || isLoadingRef.current) return;
    
    let filteredSeen;
    let restoredSeen;
    let filteredUnseen;
    
    switch (lastAction.type) {
      case 'comparison':
        // Remove the new movie from the seen list
        filteredSeen = seen.filter(m => m.id !== lastAction.newMovie.id);
        
        // Restore the rating of the seen movie
        restoredSeen = filteredSeen.map(m => 
          m.id === lastAction.seenMovie.id ? lastAction.seenMovie : m
        );
        
        setSeen(restoredSeen);
        
        // Restore the movies for a new comparison
        setSeenMovie(lastAction.seenMovie);
        setNewMovie(lastAction.newMovie);
        setLoading(false);
        break;
        
      case 'unseen':
        // Remove the movie from unseen/watchlist
        filteredUnseen = unseen.filter(m => m.id !== lastAction.movie.id);
        onAddToUnseen(filteredUnseen);
        
        // Restore the movie for comparison
        setNewMovie(lastAction.movie);
        setLoading(false);
        break;
        
      case 'skip':
      case 'tough':
        if (lastAction.type === 'tough') {
          // For tough choice, remove the movie from seen
          filteredSeen = seen.filter(m => m.id !== lastAction.newMovie.id);
          setSeen(filteredSeen);
        }
        
        // Restore the movies for comparison
        setSeenMovie(lastAction.seenMovie);
        setNewMovie(lastAction.newMovie);
        setLoading(false);
        break;
      
      default:
        break;
    }
    
    // Clear the last action
    setLastAction(null);
  }, [lastAction, seen, unseen, setSeen, onAddToUnseen]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setNewMovie(null);
    setSeenMovie(null);
    isLoadingRef.current = false;
    fetchRandomMovie();
  }, [fetchRandomMovie]);

  const getPosterUrl = path => `https://image.tmdb.org/t/p/w342${path}`;

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={stateStyles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#FFD700' : '#4B0082'} />
          <Text style={[stateStyles.loadingText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
            Loading top-rated movies...
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
          <Text style={[stateStyles.errorSubText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
            {seen.length < 3 ? 'Go to the Add Movie tab to rate more movies.' : 'This may be temporary. Try again or select a different genre.'}
          </Text>
          <TouchableOpacity
            style={[buttonStyles.retryButton, { borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
            onPress={handleRetry}
            activeOpacity={0.7}
          >
            <Text style={[buttonStyles.retryButtonText, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!seenMovie || !newMovie) return null;

  // Main UI
  return (
    <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
      <View
        style={[
          headerStyles.screenHeader,
          { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', borderBottomColor: isDarkMode ? '#8A2BE2' : '#E0E0E0' },
        ]}
      >
        <Text style={[headerStyles.screenTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
          Top 500 Comparison
        </Text>
        <View style={styles.actionRow}>
          {lastAction && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUndo}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo" size={24} color={isDarkMode ? '#FFD700' : '#4B0082'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={openFilterModal}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={24} color={isDarkMode ? '#FFD700' : '#4B0082'} />
            {selectedGenre && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={[compareStyles.compareContainer, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={compareStyles.compareContent}>
          <Text style={[compareStyles.compareTitle, { color: isDarkMode ? '#F5F5F5' : '#333' }]}>
            Which movie was better?
          </Text>
          <View style={compareStyles.compareMovies}>
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
                  numberOfLines={2}
                >
                  {seenMovie.title}
                </Text>
                <Text style={[compareStyles.ratingTag, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
                  Your rating: {seenMovie.userRating.toFixed(1)}
                </Text>
                <Text style={[movieCardStyles.genresText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                  {seenMovie.genre_ids.map(id => genres[id] || 'Unknown').join(', ')}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={compareStyles.vsContainer}>
              <Text style={[compareStyles.vsText, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
              VS
            </Text>
          </View>
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
                numberOfLines={2}
              >
                {newMovie.title}
              </Text>
              <Text style={[compareStyles.ratingTag, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
                TMDb: {newMovie.score.toFixed(1)} ({newMovie.voteCount} votes)
              </Text>
              <Text style={[movieCardStyles.genresText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
                {newMovie.genre_ids.map(id => genres[id] || 'Unknown').join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={compareStyles.actionButtons}>
          <TouchableOpacity
            style={[compareStyles.toughButton, { backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
            onPress={handleToughChoice}
            activeOpacity={0.7}
          >
            <Text style={[compareStyles.toughButtonText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
              Too tough to decide
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[compareStyles.unseenButton, { backgroundColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
            onPress={handleUnseen}
            activeOpacity={0.7}
          >
            <Text style={[compareStyles.unseenButtonText, { color: isDarkMode ? '#F5F5F5' : '#FFFFFF' }]}>
              Add to watchlist
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[buttonStyles.skipButton, { borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }]}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[buttonStyles.skipButtonText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    
    {/* Filter Modal - Fixed version with proper closing tags */}
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="fade"
      onRequestClose={cancelFilters}
    >
      <View style={[modalStyles.modalOverlay, styles.modalOverlay]}>
        <View style={[
          modalStyles.modalContent,
          styles.modalContent,
          { backgroundColor: isDarkMode ? '#4B0082' : '#FFFFFF' }
        ]}>
          <Text style={[
            modalStyles.modalTitle,
            { color: isDarkMode ? '#F5F5F5' : '#333' }
          ]}>
            Filter Top-Rated Movies
          </Text>
          
          {/* Feature Description */}
          <View style={styles.infoSection}>
            <Text style={[
              styles.infoText,
              { color: isDarkMode ? '#FFD700' : '#4B0082', fontWeight: 'bold' }
            ]}>
              Comparing the best movies
            </Text>
            <Text style={[
              styles.infoSubtext,
              { color: isDarkMode ? '#D3D3D3' : '#666' }
            ]}>
              All movies shown have at least {MIN_VOTE_COUNT} votes and a minimum score of {MIN_SCORE.toFixed(1)}/10, ensuring you only compare quality films from the top 500.
            </Text>
          </View>
          
          {/* Genre Filter */}
          <View style={styles.filterSection}>
            <Text style={[
              styles.sectionTitle,
              { color: isDarkMode ? '#F5F5F5' : '#333' }
            ]}>
              Filter by Genre
            </Text>
            
            <TouchableOpacity
              style={[
                styles.genreButton,
                { 
                  backgroundColor: tempGenre === null 
                    ? (isDarkMode ? '#8A2BE2' : '#4B0082') 
                    : 'transparent',
                  borderColor: isDarkMode ? '#8A2BE2' : '#4B0082'
                }
              ]}
              onPress={() => setTempGenre(null)}
            >
              <Text style={[
                styles.genreButtonText,
                { 
                  color: tempGenre === null 
                    ? '#FFFFFF' 
                    : (isDarkMode ? '#D3D3D3' : '#666')
                }
              ]}>
                All Genres
              </Text>
            </TouchableOpacity>
            
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genreScrollContent}
            >
              {Object.entries(genres)
                .filter(([id, name]) => name) // Filter out undefined genres
                .map(([id, name]) => (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.genreButton,
                      { 
                        backgroundColor: tempGenre === id 
                          ? (isDarkMode ? '#8A2BE2' : '#4B0082') 
                          : 'transparent',
                        borderColor: isDarkMode ? '#8A2BE2' : '#4B0082'
                      }
                    ]}
                    onPress={() => setTempGenre(id)}
                  >
                    <Text style={[
                      styles.genreButtonText,
                      { 
                        color: tempGenre === id 
                          ? '#FFFFFF' 
                          : (isDarkMode ? '#D3D3D3' : '#666')
                      }
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[
                styles.applyButton,
                { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }
              ]}
              onPress={applyFilters}
            >
              <Text style={[
                styles.applyButtonText,
                { color: isDarkMode ? '#4B0082' : '#FFFFFF' }
              ]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' }
              ]}
              onPress={cancelFilters}
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
      </View>
    </Modal>
  </SafeAreaView>
);
}

// Additional styles for the new components
const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
  modalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    // Higher z-index to prevent background interaction
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    elevation: 10, // Higher elevation for Android
    shadowOpacity: 0.5, // Stronger shadow for iOS
    // Ensure modal is above all other content
    zIndex: 1001,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.08)', // Will be overridden by isDarkMode
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  genreScrollContent: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  genreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  genreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  applyButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 16,
  }
});

export default WildcardScreen;
