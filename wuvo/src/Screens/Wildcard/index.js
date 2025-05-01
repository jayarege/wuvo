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
const MIN_VOTE_COUNT = 500; // Minimum number of votes required
const MIN_SCORE = 7.0; // Minimum score threshold
const STORAGE_KEY = 'wuvo_compared_movies';
const BASELINE_COMPLETE_KEY = 'wuvo_baseline_complete';

function WildcardScreen({ seen, setSeen, unseen, onAddToSeen, onAddToUnseen, genres, isDarkMode }) {
  // Movie data state
  const [seenMovie, setSeenMovie] = useState(null);
  const [newMovie, setNewMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [comparedMovies, setComparedMovies] = useState([]);
  const [baselineComplete, setBaselineComplete] = useState(false);
  const [showBaselineCompleteModal, setShowBaselineCompleteModal] = useState(false);
  
  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);
  
  // Local filter state for modal
  const [tempGenre, setTempGenre] = useState(null);
  
  // Ref to prevent multiple concurrent API calls
  const isLoadingRef = useRef(false);
  
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
  
  // =========== BASELINE MOVIES ===========
// =========== BASELINE MOVIES ===========
// THIS IS WHERE YOUR MOVIES GO
// List of 250 baseline movies with their TMDB IDs
const baselineMovies = [
  // Top classics from your list
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
  { id: 510, title: "One Flew Over the Cuckoo's Nest" },
  { id: 539, title: "Psycho" },
  { id: 5915, title: "Modern Times" },
  { id: 122, title: "The Lord of the Rings: The Return of the King" },
  { id: 769, title: "GoodFellas" },
  { id: 567, title: "Rear Window" },
  { id: 155, title: "The Dark Knight" },
  { id: 1585, title: "It's a Wonderful Life" },
  { id: 496243, title: "Parasite" },
  { id: 980, title: "Children of Paradise" },
  { id: 28, title: "Apocalypse Now" },
  { id: 950, title: "Sunset Boulevard" },
  { id: 289, title: "Casablanca" },
  { id: 18148, title: "Tokyo Story" },
  { id: 872, title: "Singin' in the Rain" },
  { id: 26553, title: "Sherlock Jr." },
  { id: 935, title: "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb" },
  { id: 975, title: "Paths of Glory" },
  { id: 1891, title: "Star Wars: The Empire Strikes Back" },
  { id: 12493, title: "High and Low" },
  { id: 705, title: "All About Eve" },
  { id: 1267, title: "Metropolis" },
  { id: 120, title: "The Lord of the Rings: The Fellowship of the Ring" },
  { id: 56078, title: "Le Trou" },
  { id: 914, title: "The Great Dictator" },
  { id: 335, title: "Once Upon a Time in the West" },
  { id: 274, title: "The Silence of the Lambs" },
  { id: 550, title: "Vertigo" },
  { id: 11324, title: "Once Upon a Time in America" },
  { id: 548, title: "Rashomon" },
  { id: 4060, title: "Ran" },
  { id: 17252, title: "Woman in the Dunes" },
  { id: 25237, title: "Come and See" },
  { id: 996, title: "Double Indemnity" },
  { id: 121, title: "The Lord of the Rings: The Two Towers" },
  { id: 15, title: "Citizen Kane" },
  { id: 12445, title: "Fanny and Alexander" },
  { id: 598, title: "City of God" },
  { id: 4546, title: "The Apartment" },
  { id: 38, title: "Satantango" },
  { id: 8195, title: "Andrei Rublev" },
  { id: 348, title: "Alien" },
  { id: 398, title: "M" },
  { id: 239, title: "Some Like It Hot" },
  { id: 10098, title: "The Kid" },
  { id: 5156, title: "Bicycle Thieves" },
  { id: 103, title: "Taxi Driver" },
  { id: 61279, title: "Stalker" },
  { id: 31474, title: "The Passion of Joan of Arc" },
  { id: 947, title: "Lawrence of Arabia" },
  { id: 797, title: "Persona" },
  { id: 15508, title: "Pather Panchali" },
  { id: 423, title: "The Pianist" },
  { id: 16043, title: "The World of Apu" },
  { id: 21749, title: "Sansho the Bailiff" },
  { id: 11, title: "Star Wars" },
  { id: 213, title: "North by Northwest" },
  { id: 1139, title: "A Brighter Summer Day" },
  { id: 10681, title: "WALL-E" },
  { id: 844, title: "Sunrise: A Song of Two Humans" },
  { id: 582, title: "The Lives of Others" },
  { id: 3090, title: "The Treasure of the Sierra Madre" },
  { id: 18491, title: "Witness for the Prosecution" },
  { id: 963, title: "The General" },
  { id: 105, title: "Back to the Future" },
  
  // Modern blockbusters and popular films
  { id: 299534, title: "Avengers: Endgame" },
  { id: 76600, title: "Avatar" },
  { id: 634649, title: "Spider-Man: No Way Home" },
  { id: 140607, title: "Star Wars: The Force Awakens" },
  { id: 299536, title: "Avengers: Infinity War" },
  { id: 24428, title: "The Avengers" },
  { id: 99861, title: "Avengers: Age of Ultron" },
  { id: 10193, title: "Toy Story 3" },
  { id: 49026, title: "The Dark Knight Rises" },
  { id: 475557, title: "Joker" },
  { id: 284054, title: "Black Panther" },
  { id: 27205, title: "Inception" },
  { id: 157336, title: "Interstellar" },
  { id: 324857, title: "Spider-Man: Into the Spider-Verse" },
  { id: 37799, title: "The Social Network" },
  { id: 118340, title: "Guardians of the Galaxy" },
  { id: 263115, title: "Logan" },
  { id: 376867, title: "Moonlight" },
  { id: 76203, title: "12 Years a Slave" },
  { id: 419430, title: "Get Out" },
  { id: 11324, title: "Shutter Island" },
  { id: 1422, title: "The Departed" },
  { id: 1124, title: "The Prestige" },
  { id: 152601, title: "Her" },
  { id: 244786, title: "Whiplash" },
  { id: 194662, title: "Birdman" },
  { id: 45269, title: "The King's Speech" },
  { id: 24, title: "Kill Bill: Volume 1" },
  { id: 393, title: "Kill Bill: Volume 2" },
  { id: 4552, title: "Crouching Tiger, Hidden Dragon" },
  { id: 1417, title: "Pan's Labyrinth" },
  { id: 142, title: "Brokeback Mountain" },
  { id: 453, title: "A Beautiful Mind" },
  { id: 68730, title: "Argo" },
  { id: 313369, title: "La La Land" },
  { id: 194, title: "Amélie" },
  { id: 4348, title: "Atonement" },
  { id: 314365, title: "Spotlight" },
  { id: 12162, title: "The Hurt Locker" },
  { id: 44214, title: "Black Swan" },
  { id: 14160, title: "Up" },
  { id: 545611, title: "Everything Everywhere All at Once" },
  { id: 361743, title: "Top Gun: Maverick" },
  { id: 567093, title: "All Quiet on the Western Front" },
  { id: 583557, title: "West Side Story" },
  { id: 583406, title: "Nomadland" },
  { id: 615643, title: "Minari" },
  { id: 530915, title: "1917" },
  { id: 398978, title: "The Irishman" },
  { id: 546554, title: "Knives Out" },
  { id: 627912, title: "Sound of Metal" },
  { id: 331482, title: "Little Women" },
  { id: 419704, title: "Ad Astra" },
  { id: 381284, title: "Hereditary" },
  { id: 353081, title: "Mission: Impossible – Fallout" },
  { id: 300668, title: "Annihilation" },
  { id: 335984, title: "Blade Runner 2049" },
  { id: 181808, title: "Star Wars: The Last Jedi" },
  { id: 374720, title: "Dunkirk" },
  { id: 398818, title: "Call Me by Your Name" },
  { id: 346364, title: "It" },
  { id: 359940, title: "Three Billboards Outside Ebbing, Missouri" },
  { id: 297762, title: "Wonder Woman" },
  { id: 324552, title: "John Wick: Chapter 2" },
  { id: 330459, title: "Rogue One: A Star Wars Story" },
  { id: 324786, title: "Hacksaw Ridge" },
  { id: 329865, title: "Arrival" },
  { id: 334543, title: "Lion" },
  { id: 269149, title: "Zootopia" },
  { id: 334533, title: "Manchester by the Sea" },
  { id: 293660, title: "Deadpool" },
  { id: 76341, title: "Mad Max: Fury Road" },
  { id: 286217, title: "The Martian" },
  { id: 281957, title: "The Revenant" },
  { id: 273481, title: "Sicario" },
  { id: 318846, title: "The Big Short" },
  { id: 120467, title: "The Grand Budapest Hotel" },
  { id: 242582, title: "Nightcrawler" },
  { id: 116154, title: "Edge of Tomorrow" },
  { id: 100402, title: "Captain America: The Winter Soldier" },
  { id: 226206, title: "Boyhood" },
  { id: 146233, title: "Selma" },
  { id: 245891, title: "John Wick" },
  { id: 49047, title: "Gravity" },
  { id: 109445, title: "Frozen" },
  { id: 152532, title: "Dallas Buyers Club" },
  { id: 58803, title: "Snowpiercer" },
  { id: 168672, title: "American Hustle" },
  { id: 75150, title: "Under the Skin" },
  { id: 68718, title: "Django Unchained" },
  { id: 84892, title: "The Master" },
  { id: 72976, title: "Lincoln" },
  { id: 37724, title: "Skyfall" },
  { id: 59967, title: "Looper" },
  { id: 12526, title: "Zero Dark Thirty" },
  { id: 87827, title: "Life of Pi" },
  { id: 70981, title: "Prometheus" },
  { id: 74643, title: "The Artist" },
  { id: 56292, title: "Mission: Impossible – Ghost Protocol" },
  { id: 55721, title: "Bridesmaids" },
  { id: 16869, title: "Inglourious Basterds" },
  { id: 13475, title: "Star Trek" },
  { id: 10537, title: "Moon" },
  { id: 8321, title: "In Bruges" },
  { id: 1726, title: "Iron Man" },
  { id: 6977, title: "No Country for Old Men" },
  { id: 3, title: "Persepolis" },
  { id: 7491, title: "There Will Be Blood" },
  { id: 10020, title: "Juno" },
  { id: 2505, title: "The Bourne Ultimatum" },
  { id: 1645, title: "Children of Men" },
  { id: 1371, title: "The Queen" },
  { id: 773, title: "Little Miss Sunshine" },
  { id: 714, title: "Casino Royale" },
  { id: 58, title: "Pirates of the Caribbean: Dead Man's Chest" },
  { id: 752, title: "V for Vendetta" },
  { id: 1584, title: "The Pursuit of Happyness" },
  { id: 254, title: "King Kong" },
  { id: 38, title: "Eternal Sunshine of the Spotless Mind" },
  { id: 70, title: "Million Dollar Baby" },
  { id: 2567, title: "The Aviator" },
  { id: 9806, title: "The Incredibles" },
  { id: 1954, title: "Before Sunset" },
  { id: 673, title: "Harry Potter and the Prisoner of Azkaban" },
  { id: 7879, title: "Ray" },
  { id: 10625, title: "Mean Girls" },
  { id: 8699, title: "Anchorman: The Legend of Ron Burgundy" },
  { id: 1932, title: "Lost in Translation" },
  { id: 12, title: "Finding Nemo" },
  { id: 11423, title: "Memories of Murder" },
  { id: 1411, title: "Gangs of New York" },
  { id: 161, title: "Ocean's Eleven" },
  { id: 9428, title: "The Royal Tenenbaums" },
  { id: 98, title: "Gladiator" },
  { id: 641, title: "Requiem for a Dream" },
  { id: 1359, title: "American Psycho" },
  { id: 8392, title: "Battle Royale" },
  { id: 26265, title: "Remember the Titans" },
  { id: 77, title: "Memento" },
  { id: 180, title: "Minority Report" },
  { id: 9286, title: "Borat" },
  { id: 1934, title: "Training Day" },
  { id: 2501, title: "The Bourne Identity" },
  { id: 2503, title: "The Bourne Supremacy" },
  { id: 129, title: "Spirited Away" },
  { id: 12477, title: "Grave of the Fireflies" },
  { id: 372058, title: "Your Name" }
];
  
  // Get a movie from the baseline that hasn't been compared yet
  const getNextBaselineMovie = useCallback(() => {
    const remainingMovies = baselineMovies.filter(
      m => !comparedMovies.includes(m.id)
    );
    
    if (remainingMovies.length === 0) {
      // All baseline movies have been compared
      if (!baselineComplete) {
        setBaselineComplete(true);
        setShowBaselineCompleteModal(true);
      }
      return null;
    }
    
    // Return a random movie from the remaining baseline movies
    return remainingMovies[Math.floor(Math.random() * remainingMovies.length)];
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
    
    console.log('Recommendation API URL:', apiUrl);
    
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
      
      // Decide whether to use baseline or recommendation
      let newMovieData = null;
      
      if (!baselineComplete) {
        // Get next movie from baseline
        const nextBaselineMovie = getNextBaselineMovie();
        
        if (nextBaselineMovie) {
          console.log('Using baseline movie:', nextBaselineMovie.title);
          // Fetch full details for the baseline movie
          newMovieData = await getMovieDetails(nextBaselineMovie.id);
        } else {
          // All baseline movies have been compared, switch to recommendations
          console.log('All baseline movies compared, switching to recommendations');
          newMovieData = await getSimilarMovie();
        }
      } else {
        // Baseline is complete, use recommendations
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
    getNextBaselineMovie, 
    getMovieDetails, 
    getSimilarMovie
  ]);

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
  }, [newMovie, onAddToUnseen, fetchRandomMovie, markMovieAsCompared]);

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
          <Text style={[stateStyles.errorText, { color: isDarkMode ?'#FFD700' : '#4B0082' }]}>
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
