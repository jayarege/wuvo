import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
  Easing
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LoadingScreen = ({ onFinishLoading, isDarkMode = true }) => {
  // Animation values
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current; // Start smaller for more dramatic scale
  const logoRotate = useRef(new Animated.Value(0)).current; // Add rotation animation
  
  // Spotlight animations
  const spotlight1 = useRef(new Animated.Value(0)).current;
  const spotlight2 = useRef(new Animated.Value(0)).current;
  const spotlight3 = useRef(new Animated.Value(0)).current;
  
  // Text animations
  const taglineFade = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current; // Slide up animation
  
  // Pulse animation for logo
  const logoPulse = useRef(new Animated.Value(1)).current;
  
  // Run pulse animation in loop with proper dependency
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  }, [logoPulse]); // Added logoPulse dependency

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // 1. Initial subtle rotation and fade in logo
      Animated.parallel([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.back()),
          useNativeDriver: true
        })
      ]),
      
      // 2. Fade in tagline with slide up effect
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true
        })
      ]),
      
      // 3. Start spotlight animations in sequence
      Animated.stagger(250, [
        // First spotlight
        Animated.timing(spotlight1, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        }),
        // Second spotlight
        Animated.timing(spotlight2, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        }),
        // Third spotlight
        Animated.timing(spotlight3, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        }),
      ]),
      
      // 4. Hold for a moment to appreciate the full animation
      Animated.delay(1500),
      
      // 5. Fade everything out with staggered timing
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(spotlight1, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(spotlight2, {
          toValue: 0,
          duration: 700,
          delay: 100,
          useNativeDriver: true
        }),
        Animated.timing(spotlight3, {
          toValue: 0,
          duration: 700,
          delay: 200,
          useNativeDriver: true
        }),
        Animated.timing(logoFade, {
          toValue: 0,
          duration: 900,
          delay: 300,
          useNativeDriver: true
        }),
      ])
    ]).start(() => {
      // Animation complete, move to main screen
      if (onFinishLoading) {
        onFinishLoading();
      }
    });
  }, [
    logoFade, 
    logoRotate, 
    logoScale, 
    spotlight1, 
    spotlight2, 
    spotlight3, 
    taglineFade, 
    taglineSlide, 
    onFinishLoading
  ]); // Added all dependencies
  
  // Spotlight positions and rotations with improved animation paths
  const spotlight1Style = {
    opacity: spotlight1,
    transform: [
      { rotate: '45deg' },
      { translateX: spotlight1.interpolate({
        inputRange: [0, 1],
        outputRange: [-width*1.2, width/2]
      })},
      { translateY: spotlight1.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -50, 0]
      })}
    ]
  };
  
  const spotlight2Style = {
    opacity: spotlight2,
    transform: [
      { rotate: '-30deg' },
      { translateX: spotlight2.interpolate({
        inputRange: [0, 1],
        outputRange: [width*1.2, -width/4]
      })},
      { translateY: spotlight2.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 60, 0]
      })}
    ]
  };
  
  const spotlight3Style = {
    opacity: spotlight3,
    transform: [
      { rotate: '15deg' },
      { translateY: spotlight3.interpolate({
        inputRange: [0, 1],
        outputRange: [height/1.5, -height/3]
      })},
      { translateX: spotlight3.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -40, 0]
      })}
    ]
  };

  // Calculate logo rotation
  const spinValue = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121619' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Background elements */}
      <View style={styles.backgroundContainer}>
        {/* Animated Spotlights with improved colors and opacity */}
        <Animated.View 
          style={[
            styles.spotlight, 
            spotlight1Style,
            { backgroundColor: isDarkMode ? 'rgba(138, 43, 226, 0.25)' : 'rgba(75, 0, 130, 0.18)' }
          ]} 
        />
        <Animated.View 
          style={[
            styles.spotlight, 
            spotlight2Style,
            { backgroundColor: isDarkMode ? 'rgba(255, 215, 0, 0.22)' : 'rgba(255, 215, 0, 0.18)' }
          ]} 
        />
        <Animated.View 
          style={[
            styles.spotlight, 
            spotlight3Style,
            { backgroundColor: isDarkMode ? 'rgba(0, 191, 255, 0.20)' : 'rgba(75, 0, 130, 0.12)' }
          ]} 
        />
      </View>
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Logo - No longer in a white circle */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: logoFade,
              transform: [
                { scale: Animated.multiply(logoScale, logoPulse) },
                { rotate: spinValue }
              ]
            }
          ]}
        >
          <Image 
            source={require('../../assets/wuvo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* Tagline with improved animation */}
        <Animated.Text 
          style={[
            styles.tagline,
            { 
              opacity: taglineFade,
              transform: [{ translateY: taglineSlide }],
              color: isDarkMode ? '#F0F0F0' : '#444'
            }
          ]}
        >
          Movies you'll love, ranked your way
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  spotlight: {
    position: 'absolute',
    width: width * 2,
    height: height,
    borderRadius: 300,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 40, // Increased spacing
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 220, // Larger logo size
    height: 220, // Larger logo size
    // No white circle background - displaying the logo directly
  },
  tagline: {
    fontSize: 20, // Slightly larger font
    fontWeight: '500', // Medium weight
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 0.5, // Slightly improved letter spacing
  }
});

export default LoadingScreen;