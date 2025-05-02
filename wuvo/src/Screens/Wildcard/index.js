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
import AsyncStorage from '@react-native-async-storage/async-storage';
import layoutStyles from '../../Styles/layoutStyles';
import headerStyles from '../../Styles/headerStyles';
import compareStyles from '../../Styles/compareStyles';
import stateStyles from '../../Styles/StateStyles';
import movieCardStyles from '../../Styles/movieCardStyles';
import buttonStyles from '../../Styles/buttonStyles';
import modalStyles from '../../Styles/modalStyles';

const API_KEY = 'b401be0ea16515055d8d0bde16f80069';
const MIN_VOTE_COUNT = 500;
const MIN_SCORE = 7.0;
const STORAGE_KEY = 'wuvo_compared_movies';
const BASELINE_COMPLETE_KEY = 'wuvo_baseline_complete';

function WildcardScreen({ seen, setSeen, unseen, onAddToSeen, onAddToUnseen, genres, isDarkMode }) {
  const [seenMovie, setSeenMovie] = useState(null);
  const [newMovie, setNewMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [comparedMovies, setComparedMovies] = useState([]);
  const [baselineComplete, setBaselineComplete] = useState(false);
  const [showBaselineCompleteModal, setShowBaselineCompleteModal] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [tempGenre, setTempGenre] = useState(null);
  const isLoadingRef = useRef(false);

  // The full baseline movies list (abbreviated for brevity)
  const baselineMovies = [
    { id: 238, title: "The Godfather" },
    { id: 278, title: "The Shawshank Redemption" },
    { id: 240, title: "The Godfather Part II" },
    { id: 389, title: "12 Angry Men" },
    { id: 346, title: "Seven Samurai" },
    { id: 424, title: "Schindler's List" },
    { id: 680, title: "Pulp Fiction" },
    { id: 429, title: "The Good, the Bad and the Ugly" },
    { id: 914, title: "City Lights" },
    { id: 14537, title: "Harakiri" },
    // Include all the movies from the original list here
  ];

  // Load compared movies from storage on initial load
  useEffect(() => {
    const loadComparedMovies = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          setComparedMovies(JSON.parse(jsonValue));
        }
        
        const baselineCompleteValue = await AsyncStorage.getItem(BASELINE_COMPLETE_KEY);
        const isBaselineComplete = baselineCompleteValue === 'true';
        setBaselineComplete(isBaselineComplete);
        
        console.log(`Loaded ${JSON.parse(jsonValue || '[]').length} compared movies`);
        console.log(`Baseline complete: ${isBaselineComplete}`);
      } catch (e) {
        console.error('Failed to load compared movies', e);
      }
    };
    
    loadComparedMovies();
  }, []);

  // Save compared movies to storage whenever they change
  useEffect(() => {
    const saveComparedMovies = async () => {
      try {
        const jsonValue = JSON.stringify(comparedMovies);
        await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
      } catch (e) {
        console.error('Failed to save compared movies', e);
      }
    };
    
    if (comparedMovies.length > 0) {
      saveComparedMovies();
    }
  }, [comparedMovies]);

  // Save baseline complete status
  useEffect(() => {
    const saveBaselineComplete = async () => {
      try {
        await AsyncStorage.setItem(BASELINE_COMPLETE_KEY, baselineComplete.toString());
      } catch (e) {
        console.error('Failed to save baseline complete status', e);
      }
    };
    
    saveBaselineComplete();
  }, [baselineComplete]);

  // Get next baseline movie to compare
  const getNextBaselineMovie = useCallback(() => {
    // Find remaining baseline movies (not yet compared)
    const remainingBaselineMovies = baselineMovies.filter(
      m => !comparedMovies.includes(m.id)
    );
    
    if (remainingBaselineMovies.length === 0) {
      // No more baseline movies, set baseline complete
      if (!baselineComplete) {
        setBaselineComplete(true);
        setShowBaselineCompleteModal(true);
      }
      return null;
    }
    
    // Get a random movie from the remaining ones
    return remainingBaselineMovies[Math.floor(Math.random() * remainingBaselineMovies.length)];
  }, [comparedMovies, baselineComplete]);

  // Add a movie to the compared list
  const markMovieAsCompared = useCallback((movieId) => {
    if (!comparedMovies.includes(movieId)) {
      setComparedMovies(prev => [...prev, movieId]);
    }
  }, [comparedMovies]);

  // Get movie details from TMDB API
  const getMovieDetails = useCallback(async (movieId) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=en-US`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch movie details');
      }
      
      const data = await response.json();
      
      return {
        id: data.id,
        title: data.title,
        score: data.vote_average,
        voteCount: data.vote_count,
        poster: data.poster_path,
        overview: data.overview,
        release_date: data.release_date || 'Unknown',
        genre_ids: data.genres.map(g => g.id).slice(0, 3),
        release_year: new Date(data.release_date).getFullYear(),
        // Use TMDB score directly as the starting rating
        eloRating: data.vote_average * 10, // Convert to 0-100 scale
        userRating: data.vote_average
      };
    } catch (error) {
      console.error(`Error fetching details for movie ${movieId}:`, error);
      throw error;
    }
  }, []);

  // Get similar movies based on user's top rated movies
  const getSimilarMovie = useCallback(async () => {
    if (seen.length === 0) {
      throw new Error('Not enough rated movies to generate recommendations');
    }
    
    // Get user's top 10 movies (or fewer if they haven't rated 10 yet)
    const topMovies = [...seen]
      .sort((a, b) => b.userRating - a.userRating)
      .slice(0, Math.min(10, seen.length));
    
    // Extract relevant features from top movies
    const favoriteGenres = {};
    let totalYears = 0;
    
    topMovies.forEach(movie => {
      // Collect genre preferences
      if (movie.genre_ids) {
        movie.genre_ids.forEach(genreId => {
          favoriteGenres[genreId] = (favoriteGenres[genreId] || 0) + movie.userRating;
        });
      }
      
      // Collect year preferences if available
      if (movie.release_date) {
        const year = new Date(movie.release_date).getFullYear();
        if (!isNaN(year)) {
          totalYears += year * (movie.userRating / 10); // Weight by rating
        }
      }
    });
    
    // Calculate average preferred year (weighted by rating)
    const totalRatings = topMovies.reduce((sum, movie) => sum + movie.userRating, 0);
    const avgYear = Math.round(totalYears / totalRatings);
    
    // Find preferred genre (highest total rating)
    let preferredGenreId = null;
    let highestGenreScore = 0;
    
    Object.entries(favoriteGenres).forEach(([genreId, score]) => {
      if (score > highestGenreScore) {
        highestGenreScore = score;
        preferredGenreId = genreId;
      }
    });
    
    // Build API query based on user preferences
    let apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=vote_average.desc&vote_count.gte=${MIN_VOTE_COUNT}`;
    
    // Add year filter if we have year data
    if (!isNaN(avgYear)) {
      // Create a window of +/- 10 years around the average preferred year
      const startYear = Math.max(1900, avgYear - 10);
      const endYear = Math.min(new Date().getFullYear(), avgYear + 10);
      apiUrl += `&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31`;
    }
    
    // Add genre filter if we have genre preference and it matches the selected filter
    if (preferredGenreId && (!selectedGenre || selectedGenre === preferredGenreId)) {
      apiUrl += `&with_genres=${preferredGenreId}`;
    } else if (selectedGenre) {
      apiUrl += `&with_genres=${selectedGenre}`;
    }
    
    // Add random page (1-5) to get more variety
    const page = Math.floor(Math.random() * 5) + 1;
    apiUrl += `&page=${page}`;
    
    // Fetch similar movies
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch similar movies');
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('No similar movies found');
    }
    
    // Filter out movies already seen or in watchlist
    const filteredResults = data.results.filter(
      m =>
        m.poster_path &&
        m.vote_average >= MIN_SCORE &&
        !seen.some(sm => sm.id === m.id) &&
        !unseen.some(um => um.id === m.id) &&
        !comparedMovies.includes(m.id)
    );
    
    if (filteredResults.length === 0) {
      throw new Error('No new similar movies found');
    }
    
    // Pick a random movie from the filtered results
    const randomMovie = filteredResults[Math.floor(Math.random() * filteredResults.length)];
    
    // Format the movie data
    return {
      id: randomMovie.id,
      title: randomMovie.title,
      score: randomMovie.vote_average,
      voteCount: randomMovie.vote_count,
      poster: randomMovie.poster_path,
      overview: randomMovie.overview,
      release_date: randomMovie.release_date || 'Unknown',
      genre_ids: randomMovie.genre_ids.slice(0, 3),
      release_year: new Date(randomMovie.release_date).getFullYear(),
      // Use TMDB score directly as the starting rating
      eloRating: randomMovie.vote_average * 10, // Convert to 0-100 scale
      userRating: randomMovie.vote_average
    };
  }, [seen, unseen, selectedGenre, comparedMovies]);

  // Fetch random movie from baseline or recommendations
  const fetchRandomMovie = useCallback(async () => {
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

    try {
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
      
      let newMovieData = null;

      // Determine whether to use baseline or recommendation algorithm
      if (!baselineComplete) {
        // Try to get next baseline movie first
        const nextBaselineMovie = getNextBaselineMovie();
        
        if (nextBaselineMovie) {
          console.log('Using baseline movie:', nextBaselineMovie.title);
          newMovieData = await getMovieDetails(nextBaselineMovie.id);
          
          // Check if this is the last baseline movie
          const remainingCount = baselineMovies.filter(m => !comparedMovies.includes(m.id)).length;
          if (remainingCount === 1) {
            // This is the last baseline movie, prepare to show completion notice
            setTimeout(() => {
              setBaselineComplete(true);
              setShowBaselineCompleteModal(true);
            }, 1000);
          }
        } else {
          // No more baseline movies, switch to recommendations
          console.log('All baseline movies compared, switching to recommendations');
          setBaselineComplete(true);
          newMovieData = await getSimilarMovie();
        }
      } else {
        // Already completed baseline, use recommendation algorithm
        console.log('Using recommendation algorithm');
        newMovieData = await getSimilarMovie();
      }
      
      setNewMovie(newMovieData);
      setLoading(false);
      isLoadingRef.current = false;
    } catch (err) {
      console.error('Error fetching movie:', err);
      setError(`Failed to load movie: ${err.message}`);
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [
    seen, 
    unseen, 
    selectedGenre, 
    genres, 
    baselineComplete,
    comparedMovies,
    getNextBaselineMovie,
    getMovieDetails, 
    getSimilarMovie
  ]);

  // Initial fetch on component mount
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
    
    // Mark the movie as compared
    markMovieAsCompared(newMovie.id);
    
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
  }, [seenMovie, newMovie, seen, setSeen, adjustRating, fetchRandomMovie, markMovieAsCompared]);

  // Handle user choosing the new movie as better
  const handleNewWin = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Mark the movie as compared
    markMovieAsCompared(newMovie.id);
    
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
  }, [seenMovie, newMovie, seen, setSeen, adjustRating, fetchRandomMovie, markMovieAsCompared]);

  // Handle user hasn't seen the new movie
  const handleUnseen = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Mark the movie as compared
    markMovieAsCompared(newMovie.id);
    
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
  }, [newMovie, onAddToUnseen, fetchRandomMovie, markMovieAsCompared, seenMovie]);

  // Handle user skipping this comparison
  const handleSkip = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Mark the movie as compared
    markMovieAsCompared(newMovie.id);
    
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
  }, [seenMovie, newMovie, fetchRandomMovie, markMovieAsCompared]);

  // Handle tough choice
  const handleToughChoice = useCallback(() => {
    if (isLoadingRef.current || !seenMovie || !newMovie) {
      console.log('Ignoring click while loading or missing movies');
      return;
    }
    
    // Mark the movie as compared
    markMovieAsCompared(newMovie.id);
    
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
  }, [seenMovie, newMovie, seen, setSeen, fetchRandomMovie, markMovieAsCompared]);

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
        
        // Remove from compared movies
        setComparedMovies(prev => prev.filter(id => id !== lastAction.newMovie.id));
        
        // Restore the movies for a new comparison
        setSeenMovie(lastAction.seenMovie);
        setNewMovie(lastAction.newMovie);
        setLoading(false);
        break;
        
      case 'unseen':
        // Remove the movie from unseen/watchlist
        filteredUnseen = unseen.filter(m => m.id !== lastAction.movie.id);
        onAddToUnseen(filteredUnseen);
        
        // Remove from compared movies
        setComparedMovies(prev => prev.filter(id => id !== lastAction.movie.id));
        
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
        
        // Remove from compared movies
        setComparedMovies(prev => prev.filter(id => id !== lastAction.newMovie.id));
        
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
  
  // Handle baseline complete acknowledgment
  const handleBaselineCompleteAcknowledge = useCallback(() => {
    setShowBaselineCompleteModal(false);
  }, []);

  const getPosterUrl = path => `https://image.tmdb.org/t/p/w342${path}`;

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[layoutStyles.safeArea, { backgroundColor: isDarkMode ? '#1C2526' : '#FFFFFF' }]}>
        <View style={stateStyles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#FFD700' : '#4B0082'} />
          <Text style={[stateStyles.loadingText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>
            {baselineComplete ? 'Finding movies tailored to your taste...' : 'Loading baseline movies...'}
          </Text>
          <Text style={[styles.progressText, { color: isDarkMode ? '#FFD700' : '#4B0082' }]}>
            {!baselineComplete ? 
              `Progress: ${comparedMovies.length}/${baselineMovies.length} movies` :
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
          <Text style={[stateStyles.errorSubText, { color: isDarkMode ? '#D3D3D3' : '#666' }]}>v
            {seen.length < 3 ? 'Go to the Add Movie tab to rate more movies.' : 'This may be temporary. Try again or select a different genre.'}
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
         {baselineComplete ? 'Movie Recommendations' : 'Baseline Movies'}
       </Text>
       <View style={styles.actionRow}>
         {!baselineComplete && (
           <View style={styles.progressBadge}>
             <Text style={styles.progressBadgeText}>
               {comparedMovies.length}/{baselineMovies.length}
             </Text>
           </View>
         )}
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
             style={[
               compareStyles.toughButton, 
               { 
                 backgroundColor: isDarkMode ? '#4B0082' : '#F5F5F5', 
                 borderColor: isDarkMode ? '#8A2BE2' : '#4B0082' 
               }
             ]}
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
     
     {/* Filter Modal */}
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
             Filter Movies
           </Text>
           
           {/* Feature Description */}
           <View style={styles.infoSection}>
             <Text style={[
               styles.infoText,
               { color: isDarkMode ? '#FFD700' : '#4B0082', fontWeight: 'bold' }
             ]}>
               {baselineComplete ? 'Personalized Recommendations' : 'Baseline Movie Collection'}
             </Text>
             <Text style={[
               styles.infoSubtext,
               { color: isDarkMode ? '#D3D3D3' : '#666' }
             ]}>
               {baselineComplete 
                 ? 'Movies shown are recommended based on your taste and preferences from previous ratings.'
                 : `You've rated ${comparedMovies.length} out of ${baselineMovies.length} baseline movies. After completing the baseline, recommendations will be tailored to your taste.`
               }
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
     
     {/* Baseline Complete Modal */}
     <Modal
       visible={showBaselineCompleteModal}
       transparent
       animationType="fade"
       onRequestClose={handleBaselineCompleteAcknowledge}
     >
       <View style={[modalStyles.modalOverlay, styles.modalOverlay]}>
         <View style={[
           modalStyles.modalContent,
           styles.modalContent,
           { backgroundColor: isDarkMode ? '#4B0082' : '#FFFFFF' }
         ]}>
           <Ionicons 
             name="checkmark-circle" 
             size={64} 
             color={isDarkMode ? '#FFD700' : '#4B0082'} 
             style={styles.successIcon}
           />
           
           <Text style={[
             modalStyles.modalTitle,
             { color: isDarkMode ? '#FFD700' : '#4B0082', fontSize: 24 }
           ]}>
             Baseline Complete!
           </Text>
           
           <Text style={[
             styles.completionText,
             { color: isDarkMode ? '#F5F5F5' : '#333' }
           ]}>
             You've rated all 250 baseline movies. Congratulations!
           </Text>
           
           <Text style={[
             styles.completionSubtext,
             { color: isDarkMode ? '#D3D3D3' : '#666' }
           ]}>
             From now on, movies will be recommended based on your personal preferences. The more movies you rate, the better your recommendations will become.
           </Text>
           
           <TouchableOpacity
             style={[
               styles.continueButton,
               { backgroundColor: isDarkMode ? '#FFD700' : '#4B0082' }
             ]}
             onPress={handleBaselineCompleteAcknowledge}
           >
             <Text style={[
               styles.continueButtonText,
               { color: isDarkMode ? '#4B0082' : '#FFFFFF' }
             ]}>
               Continue to Recommendations
             </Text>
           </TouchableOpacity>
         </View>
       </View>
     </Modal>
   </SafeAreaView>
 );
}

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
   zIndex: 1000,
 },
 modalContent: {
   width: '90%',
   maxHeight: '80%',
   elevation: 10,
   shadowOpacity: 0.5,
   zIndex: 1001,
 },
 infoSection: {
   backgroundColor: 'rgba(255,255,255,0.08)',
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
 },
 // Progress indicator styles
 progressText: {
   marginTop: 12,
   fontSize: 14,
   fontWeight: '500',
 },
 progressBadge: {
   backgroundColor: '#FFD700',
   borderRadius: 12,
   paddingHorizontal: 8,
   paddingVertical: 2,
   marginRight: 10,
 },
 progressBadgeText: {
   color: '#4B0082',
   fontWeight: 'bold',
   fontSize: 12,
 },
 // Completion modal styles
 successIcon: {
   alignSelf: 'center',
   marginBottom: 16,
 },
 completionText: {
   fontSize: 18,
   textAlign: 'center',
   marginBottom: 16,
 },
 completionSubtext: {
   fontSize: 16,
   textAlign: 'center',
   lineHeight: 22,
   marginBottom: 24,
 },
 continueButton: {
   width: '100%',
   paddingVertical: 14,
   borderRadius: 8,
   alignItems: 'center',
   marginTop: 8,
 },
 continueButtonText: {
   fontWeight: '600',
   fontSize: 16,
 },
});

export default WildcardScreen;
