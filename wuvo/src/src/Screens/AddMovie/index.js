// src/utils/MovieSearch.js - Fully optimized

import { useState, useCallback, useRef, useMemo } from 'react';

class MovieSearcher {
  constructor(options = {}) {
    this.options = {
      maxResults: options.maxResults || 10,
      apiKey: options.apiKey || '',
      similarityThreshold: options.similarityThreshold || 0.3,
      weights: {
        titleSimilarity: options.weights?.titleSimilarity || 0.4,
        userPreference: options.weights?.userPreference || 0.3,
        popularity: options.weights?.popularity || 0.3,
      }
    };
    
    this.similarityAlgorithm = options.similarityAlgorithm || this.levenshteinSimilarity;
    
    // Cache to avoid repeated calculations
    this._similarityCache = new Map();
    this._genreScoreCache = new Map();
    this._apiRequestCache = new Map();
    this._abortControllers = new Map();
  }
  
  // Optimized Levenshtein distance with early returns and caching
  levenshteinSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Cache key for bidirectional lookup
    const cacheKey = str1 <= str2 ? `${str1}|${str2}` : `${str2}|${str1}`;
    
    // Check cache first
    if (this._similarityCache.has(cacheKey)) {
      return this._similarityCache.get(cacheKey);
    }
    
    // Convert to lowercase for case-insensitive comparison
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Early returns for common cases
    if (s1 === s2) return 1; // Exact match
    if (s1.includes(s2) || s2.includes(s1)) {
      const similarity = 0.9;
      this._similarityCache.set(cacheKey, similarity);
      return similarity;
    }
    
    // Check for common word matches first (faster than Levenshtein)
    const words1 = s1.split(/\s+/).filter(w => w.length > 1);
    const words2 = s2.split(/\s+/).filter(w => w.length > 1);
    
    // Check for word matches
    const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    if (commonWords.length > 0) {
      const similarity = 0.5 + (0.4 * commonWords.length / Math.max(words1.length, words2.length));
      this._similarityCache.set(cacheKey, similarity);
      return similarity;
    }
    
    // For very different strings, use a faster approximation algorithm 
    // for long strings to improve performance
    if (Math.abs(s1.length - s2.length) > 10 && Math.max(s1.length, s2.length) > 20) {
      // If length difference is substantial, use character frequency comparison
      // instead of full Levenshtein (much faster for long strings)
      const charFreq1 = this._getCharFrequency(s1);
      const charFreq2 = this._getCharFrequency(s2);
      const similarity = this._compareCharFrequencies(charFreq1, charFreq2);
      this._similarityCache.set(cacheKey, similarity);
      return similarity;
    }
    
    // Use actual Levenshtein distance for shorter strings or more similar length strings
    // Faster iterative implementation with matrix reuse for better performance
    const track = this._getLevenshteinMatrix(s1, s2);
    
    // Convert distance to similarity (0-1 scale)
    const maxLen = Math.max(s1.length, s2.length);
    const distance = track[s2.length][s1.length];
    const similarity = 1 - (distance / maxLen);
    
    // Cache result
    this._similarityCache.set(cacheKey, similarity);
    return similarity;
  }
  
  // Helper method for character frequency
  _getCharFrequency(str) {
    const freq = {};
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      freq[char] = (freq[char] || 0) + 1;
    }
    return freq;
  }
  
  // Helper method to compare character frequencies
  _compareCharFrequencies(freq1, freq2) {
    const allChars = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
    let similarity = 0;
    let total = 0;
    
    allChars.forEach(char => {
      const count1 = freq1[char] || 0;
      const count2 = freq2[char] || 0;
      similarity += Math.min(count1, count2);
      total += Math.max(count1, count2);
    });
    
    return total > 0 ? similarity / total : 0;
  }
  
  // Optimized Levenshtein calculation
  _getLevenshteinMatrix(s1, s2) {
    // Create matrix efficiently
    const rows = s2.length + 1;
    const cols = s1.length + 1;
    const matrix = new Array(rows);
    
    // Initialize first row
    matrix[0] = new Array(cols);
    for (let i = 0; i < cols; i++) {
      matrix[0][i] = i;
    }
    
    // Fill the matrix
    for (let j = 1; j < rows; j++) {
      matrix[j] = new Array(cols);
      matrix[j][0] = j;
      
      for (let i = 1; i < cols; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // deletion
          matrix[j - 1][i] + 1,      // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }
    
    return matrix;
  }
  
  // Optimized user preference calculation with caching
  calculateUserPreferenceScore(movie, userHistory) {
    if (!userHistory || userHistory.length === 0) return 0.5; // Neutral score
    
    // Use a cache key based on movie ID and a hash of user history
    const historyHash = this._getUserHistoryHash(userHistory);
    const cacheKey = `${movie.id}|${historyHash}`;
    
    // Check cache first
    if (this._genreScoreCache.has(cacheKey)) {
      return this._genreScoreCache.get(cacheKey);
    }
    
    // Start with base score
    let score = 0.5;
    
    // Get user genre preferences (cached internally)
    const userGenreScores = this._getAggregatedGenreScores(userHistory);
    
    // Calculate genre boost
    const genreBoost = movie.genre_ids?.reduce((sum, genreId) => {
      return sum + (userGenreScores[genreId] || 0);
    }, 0) || 0;
    
    // Normalize genre boost (0-0.3 range)
    const normalizedGenreBoost = Math.min(0.3, genreBoost / 10);
    
    // Check release year preference
    const yearPreference = this._calculateYearPreference(movie, userHistory);
    
    // Combine factors
    score += normalizedGenreBoost + yearPreference;
    
    // Clamp score
    const finalScore = Math.max(0, Math.min(1, score));
    
    // Cache the result
    this._genreScoreCache.set(cacheKey, finalScore);
    
    return finalScore;
  }
  
  // Generate a simple hash for user history to detect changes
  _getUserHistoryHash(userHistory) {
    if (!userHistory || userHistory.length === 0) return '0';
    
    // Use last update time or IDs+ratings to detect changes
    return userHistory.reduce((hash, movie) => {
      return hash + `|${movie.id}:${movie.userRating || movie.eloRating/100}`;
    }, '');
  }
  
  // Optimized, cached genre score aggregation
  _getAggregatedGenreScores(userHistory) {
    const historyHash = this._getUserHistoryHash(userHistory);
    const cacheKey = `genres|${historyHash}`;
    
    if (this._genreScoreCache.has(cacheKey)) {
      return this._genreScoreCache.get(cacheKey);
    }
    
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
    
    this._genreScoreCache.set(cacheKey, genreScores);
    return genreScores;
  }
  
  // Optimized year preference calculation
  _calculateYearPreference(movie, userHistory) {
    if (!movie.release_date || userHistory.length === 0) return 0;
    
    const movieYear = new Date(movie.release_date).getFullYear();
    if (isNaN(movieYear)) return 0;
    
    // Get weighted average of preferred years (cached)
    const historyHash = this._getUserHistoryHash(userHistory);
    const cacheKey = `year|${historyHash}`;
    
    let preferredYear;
    if (this._genreScoreCache.has(cacheKey)) {
      preferredYear = this._genreScoreCache.get(cacheKey);
    } else {
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
      
      preferredYear = weightedYearSum / totalWeight;
      this._genreScoreCache.set(cacheKey, preferredYear);
    }
    
    const yearDiff = Math.abs(movieYear - preferredYear);
    
    // Convert to a score (closer to preferred year = higher score)
    // Maximum of 0.1 boost/penalty based on year
    return 0.1 - (Math.min(yearDiff, 30) / 300);
  }
  
  // Main search with optimized API calls and caching
  async searchMovies(query, userHistory = []) {
    if (!query || query.length < 2) return [];
    
    // Abort any previous ongoing search
    if (this._abortControllers.has(query)) {
      this._abortControllers.get(query).abort();
    }
    
    try {
      // Create abort controller for this request
      const controller = new AbortController();
      this._abortControllers.set(query, controller);
      
      // Check cache first (with TTL of 5 minutes)
      const cacheKey = `${query}|${this._getUserHistoryHash(userHistory)}`;
      const cachedResult = this._apiRequestCache.get(cacheKey);
      
      if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) {
        return cachedResult.data;
      }
      
      // Fetch results with timeout
      const results = await Promise.race([
        this._fetchFromTMDb(query, controller.signal),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timed out')), 5000)
        )
      ]);
      
      if (!results || results.length === 0) return [];
      
      // Score results
      const scoredResults = this._scoreResults(results, query, userHistory);
      
      // Cache results
      this._apiRequestCache.set(cacheKey, {
        data: scoredResults,
        timestamp: Date.now()
      });
      
      // Limit cache size
      if (this._apiRequestCache.size > 50) {
        // Remove oldest entry
        const oldestKey = Array.from(this._apiRequestCache.keys())[0];
        this._apiRequestCache.delete(oldestKey);
      }
      
      // Return top N results
      return scoredResults.slice(0, this.options.maxResults);
    } catch (error) {
      if (error.name === 'AbortError') {
        // User aborted the request, return empty
        return [];
      }
      console.error('Error searching movies:', error);
      return [];
    } finally {
      // Clean up
      this._abortControllers.delete(query);
    }
  }
  
  // Optimized TMDb API fetch
  async _fetchFromTMDb(query, signal) {
    const apiKey = this.options.apiKey;
    if (!apiKey) {
      console.error('No API key provided for TMDb');
      return [];
    }
    
    // Optimize query for better results
    const trimmedQuery = query.trim();
    const encodedQuery = encodeURIComponent(trimmedQuery);
    
    try {
      // First search - exact
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodedQuery}&page=1&include_adult=false`,
        { signal }
      );
      
      if (!response.ok) {
        throw new Error('Failed to search for movies');
      }
      
      const data = await response.json();
      let results = data.results || [];
      
      // If few results and query has spaces, do a second search but only if necessary
      if (results.length < 3 && trimmedQuery.includes(' ') && trimmedQuery.length > 4) {
        // Only the first word for better recall
        const firstWord = trimmedQuery.split(' ')[0];
        
        // Only do backup search if first word is meaningful (3+ chars)
        if (firstWord.length > 2) {
          const backupResponse = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
              firstWord
            )}&page=1&include_adult=false`,
            { signal }
          );
          
          if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            
            if (backupData.results && Array.isArray(backupData.results)) {
              // Use Set for faster duplicate checking
              const existingIds = new Set(results.map(m => m.id));
              
              // Add unique results
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
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error; // Propagate abort errors
      }
      console.error(`Error in TMDb fetch: ${error.message}`);
      return [];
    }
  }
  
  // Efficient scoring with early exit for low similarity
  _scoreResults(results, query, userHistory) {
    const { weights, similarityThreshold } = this.options;
    
    // Lazy similarity calculation with early returns
    return results
      .map(movie => {
        // Calculate title similarity first (fastest check)
        const titleSimilarity = this.similarityAlgorithm(movie.title, query);
        
        // Skip results with very low similarity unless it's a very short query
        if (titleSimilarity < similarityThreshold && query.length > 3) {
          return null;
        }
        
        // Only calculate other scores if similarity passes threshold
        const userPreferenceScore = this.calculateUserPreferenceScore(movie, userHistory);
        
        // Normalized popularity scores
        const voteCount = movie.vote_count || 0;
        const voteAverage = movie.vote_average || 5;
        
        const normalizedVoteCount = voteCount > 0 ? Math.min(1, Math.log10(voteCount) / 4) : 0;
        const normalizedVoteAverage = (voteAverage - 1) / 9;
        
        const popularityScore = (normalizedVoteCount * 0.7) + (normalizedVoteAverage * 0.3);
        
        // Calculate final score
        const isGenericQuery = query.length <= 3;
        const finalScore = isGenericQuery
          ? (popularityScore * 0.8) + (titleSimilarity * 0.2)
          : (titleSimilarity * weights.titleSimilarity) +
            (userPreferenceScore * weights.userPreference) +
            (popularityScore * weights.popularity);
        
        // Return enhanced result
        return {
          ...movie,
          titleSimilarity,
          userPreferenceScore,
          popularityScore,
          finalScore
        };
      })
      .filter(Boolean) // Remove null results
      .sort((a, b) => b.finalScore - a.finalScore); // Sort by score
  }
  
  // Format results for UI display
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
  
  // Cleanup method
  dispose() {
    // Abort any pending requests
    this._abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore errors
      }
    });
    
    // Clear caches
    this._similarityCache.clear();
    this._genreScoreCache.clear();
    this._apiRequestCache.clear();
    this._abortControllers.clear();
  }
}

// Custom hook with optimized state management
const useMovieSearch = (apiKey, options = {}) => {
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Persistent ref to avoid recreating searcher
  const searcherRef = useRef(null);
  
  // Throttle trackers
  const lastQueryTimeRef = useRef(0);
  const pendingQueryRef = useRef(null);
  
  // Initialize searcher once
  if (!searcherRef.current) {
    searcherRef.current = new MovieSearcher({
      apiKey,
      ...options
    });
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searcherRef.current) {
        searcherRef.current.dispose();
      }
    };
  }, []);
  
  // Throttled suggestion updater
  const updateSuggestions = useCallback((query, userHistory) => {
    // Skip empty queries
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    // Throttle to max 1 request per 300ms
    const now = Date.now();
    const timeSinceLastQuery = now - lastQueryTimeRef.current;
    
    if (timeSinceLastQuery < 300) {
      // Clear any pending query
      if (pendingQueryRef.current) {
        clearTimeout(pendingQueryRef.current);
      }
      
      // Schedule this query to run later
      pendingQueryRef.current = setTimeout(() => {
        updateSuggestions(query, userHistory);
      }, 300 - timeSinceLastQuery);
      
      return;
    }
    
    // Update timestamp
    lastQueryTimeRef.current = now;
    
    // Run the actual query
    (async () => {
      try {
        const results = await searcherRef.current.searchMovies(query, userHistory);
        const formattedResults = searcherRef.current.formatResults(results);
        
        // Only update if still relevant
        if (formattedResults.length > 0) {
          setSuggestions(formattedResults);
        }
      } catch (err) {
        console.error('Error getting suggestions:', err);
      }
    })();
  }, []);
  
  // Optimized search function
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
  
  // Return hook interface
  return {
    results,
    suggestions,
    loading,
    error,
    updateSuggestions,
    searchMovies
  };
};

export { MovieSearcher, useMovieSearch };