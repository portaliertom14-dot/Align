import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions, TextInput, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Button from '../../components/Button';
import GradientText from '../../components/GradientText';
import { saveUserProfile } from '../../lib/userProfile';
import { getCurrentUser } from '../../services/auth';
import { isOnboardingCompleted } from '../../services/userService';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');
const starIcon = require('../../../assets/icons/star.png');

/**
 * Écran Onboarding Align - Version exacte selon spécifications
 * 6 écrans + écran final
 * PROTECTION : Si l'onboarding est déjà complété, redirige immédiatement vers Main
 */
export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [projectAnswer, setProjectAnswer] = useState(null);
  const [discoveryAnswer, setDiscoveryAnswer] = useState(null);
  const [similarAppsAnswer, setSimilarAppsAnswer] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [showStarAnimation, setShowStarAnimation] = useState(false);
  const starRotation = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef(null);

  // PROTECTION : Vérifier si l'onboarding est déjà complété au montage
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const completed = await isOnboardingCompleted(user.id);
          if (completed) {
            // L'onboarding est déjà complété, rediriger vers Main immédiatement
            navigation.replace('Main');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'onboarding:', error);
        // En cas d'erreur, continuer normalement
      }
    };
    checkOnboardingStatus();
  }, [navigation]);

  // Démarrer l'animation de l'étoile (écran 5)
  const startStarAnimation = () => {
    starRotation.setValue(0);
    Animated.timing(starRotation, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = async () => {
    if (currentScreen === 4) {
      // Écran 5 : Sauvegarder le profil utilisateur avant de continuer
      try {
        await saveUserProfile({
          firstName,
          lastName,
          username,
          projectAnswer,
          discoveryAnswer,
          similarAppsAnswer,
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error);
      }

      // Lancer l'animation puis passer à l'écran 6
      setShowStarAnimation(true);
      startStarAnimation();
      setTimeout(() => {
        setShowStarAnimation(false);
        setCurrentScreen(5);
        scrollViewRef.current?.scrollTo({
          x: 5 * width,
          animated: true,
        });
      }, 1500); // Animation de 1.5s avant transition
    } else if (currentScreen === 5) {
      // Écran 6 : Passer à l'écran final
      setCurrentScreen(6);
      scrollViewRef.current?.scrollTo({
        x: 6 * width,
        animated: true,
      });
    } else if (currentScreen === 6) {
      // Écran final : Ne rien faire, transition automatique via useEffect
      // Le bouton ne devrait pas être visible sur l'écran final
    } else {
      setCurrentScreen(currentScreen + 1);
      scrollViewRef.current?.scrollTo({
        x: (currentScreen + 1) * width,
        animated: true,
      });
    }
  };

  const canContinue = () => {
    switch (currentScreen) {
      case 1: // Écran 2 : Projet professionnel
        return projectAnswer !== null;
      case 2: // Écran 3 : Découverte Align
        return discoveryAnswer !== null;
      case 3: // Écran 4 : Apps similaires
        return similarAppsAnswer !== null;
      case 4: // Écran 5 : Profil utilisateur
        return firstName.trim() !== '' && lastName.trim() !== '' && username.trim() !== '';
      default:
        return true;
    }
  };

  const starRotationInterpolate = starRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Transition automatique vers le quiz après l'écran final
  useEffect(() => {
    if (currentScreen === 6) {
      const timer = setTimeout(() => {
        // Naviguer directement vers Quiz (qui est en dehors du MainLayout)
        navigation.replace('Quiz');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, navigation]);

  // Rendu de l'écran 1 - Intro
  const renderScreen1 = () => (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screen}
    >
      {/* Étoile jaune en arrière-plan */}
      <View style={styles.starBackground}>
        <Image source={starIcon} style={styles.starIconImage} resizeMode="contain" />
      </View>
      
      <View style={styles.screen1Content}>
        <Text style={styles.screen1Text}>
          Trouvez la voie qui vous correspond vraiment
        </Text>
      </View>
    </LinearGradient>
  );

  // Rendu de l'écran 2 - Projet professionnel
  const renderScreen2 = () => {
    const options = [
      'Oui je sais déjà',
      'J\'ai une vague idée',
      'Non mais j\'ai une idée de secteur',
      'Non pas encore',
    ];

    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.screen}
      >
        <View style={styles.screenContent}>
          <Text style={styles.questionText}>
            As-tu une idée de projet professionnel ?
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  projectAnswer === option && styles.optionButtonSelected,
                ]}
                onPress={() => setProjectAnswer(option)}
              >
                <Text style={[
                  styles.optionText,
                  projectAnswer === option && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    );
  };

  // Rendu de l'écran 3 - Découverte Align
  const renderScreen3 = () => {
    const options = [
      { text: 'Ami ou famille', icon: '👥' },
      { text: 'X (anciennement Twitter)', icon: '𝕏' },
      { text: 'TV', icon: '📺' },
      { text: 'Facebook', icon: '📘' },
      { text: 'TikTok', icon: '🎵' },
      { text: 'LinkedIn', icon: '💼' },
      { text: 'Instagram', icon: '📷' },
    ];

    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.screen}
      >
        <View style={styles.screenContent}>
          <Text style={styles.questionText}>
            Comment as-tu entendu parler de nous ?
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButtonWithIcon,
                  discoveryAnswer === option.text && styles.optionButtonSelected,
                ]}
                onPress={() => setDiscoveryAnswer(option.text)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={[
                  styles.optionText,
                  discoveryAnswer === option.text && styles.optionTextSelected,
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    );
  };

  // Rendu de l'écran 4 - Apps similaires
  const renderScreen4 = () => {
    const options = ['Oui', 'Non'];

    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.screen}
      >
        <View style={styles.screenContent}>
          <Text style={styles.questionText}>
            As-tu déjà essayé d'autres applications similaires ?
          </Text>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  similarAppsAnswer === option && styles.optionButtonSelected,
                ]}
                onPress={() => setSimilarAppsAnswer(option)}
              >
                <Text style={[
                  styles.optionText,
                  similarAppsAnswer === option && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    );
  };

  // Rendu de l'écran 5 - Profil utilisateur
  const renderScreen5 = () => (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screen}
    >
      <View style={styles.screenContent}>
        <Text style={styles.questionText}>
          Remplis ton nom, prénom et saisis un nom d'utilisateur
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nom"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        {/* Animation étoile qui tourne (affichée seulement au clic sur Continuer) */}
        {showStarAnimation && (
          <View style={styles.starAnimationContainer}>
            <Animated.View
              style={[
                styles.starAnimation,
                { transform: [{ rotate: starRotationInterpolate }] },
              ]}
            >
              <Image source={starIcon} style={styles.starAnimationIconImage} resizeMode="contain" />
            </Animated.View>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  // Rendu de l'écran 6 - Bienvenue
  const renderScreen6 = () => (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screen}
    >
      <View style={styles.screenContent}>
        <Text style={styles.welcomeText}>
          Bienvenue sur Align{' '}
          <GradientText
            colors={['#FFD93F', '#FF7B2B']}
            style={styles.welcomeNameGradient}
          >
            {firstName}
          </GradientText>
          {' '}!{'\n'}
          Il est temps de commencer à t'accompagner vers ton avenir !
        </Text>
      </View>
    </LinearGradient>
  );

  // Rendu de l'écran final - QUIZ SECTEUR
  const renderScreenFinal = () => (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screen}
    >
      <View style={styles.finalScreenContent}>
        {/* QUIZ avec dégradé dans la typographie */}
        <GradientText
          colors={['#FFD93F', '#FF7B2B']}
          style={styles.quizTextGradient}
        >
          QUIZ
        </GradientText>
        <Text style={styles.secteurText}>SECTEUR</Text>
      </View>
    </LinearGradient>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 0:
        return renderScreen1();
      case 1:
        return renderScreen2();
      case 2:
        return renderScreen3();
      case 3:
        return renderScreen4();
      case 4:
        return renderScreen5();
      case 5:
        return renderScreen6();
      case 6:
        return renderScreenFinal();
      default:
        return renderScreen1();
    }
  };

  const getButtonText = () => {
    switch (currentScreen) {
      case 0:
        return 'Commencer';
      case 5:
        return 'C\'est parti !';
      case 6:
        return ''; // Pas de bouton sur l'écran final
      default:
        return 'Continuer';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index} style={styles.screenWrapper}>
            {index === 0 && renderScreen1()}
            {index === 1 && renderScreen2()}
            {index === 2 && renderScreen3()}
            {index === 3 && renderScreen4()}
            {index === 4 && renderScreen5()}
            {index === 5 && renderScreen6()}
            {index === 6 && renderScreenFinal()}
          </View>
        ))}
      </ScrollView>

      {/* Bouton en bas - Pas de bouton sur l'écran final */}
      {currentScreen !== 6 && (
        <View style={styles.buttonContainer}>
          <Button
            title={getButtonText()}
            onPress={handleNext}
            disabled={!canContinue()}
            style={styles.ctaButton}
          />
        </View>
      )}

      {/* Sur l'écran final, transition automatique vers le quiz après 2s */}
      {currentScreen === 6 && (
        <View style={styles.finalScreenOverlay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  screenWrapper: {
    width: width,
    flex: 1,
  },
  screen: {
    flex: 1,
    width: width,
  },
  // Écran 1 - Intro
  starBackground: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: [{ translateX: -50 }],
    opacity: 0.3,
  },
  starIconImage: {
    width: 200,
    height: 200,
  },
  screen1Content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  screen1Text: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  // Écrans communs
  screenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  questionText: {
    fontSize: 24,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#FFFFFF',
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'sans-serif',
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionButtonWithIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    fontSize: 24,
  },
  // Écran 5 - Profil
  formContainer: {
    marginTop: 40,
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 25,
    padding: 16,
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  starAnimationContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  starAnimation: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starAnimationIconImage: {
    width: 80,
    height: 80,
  },
  // Écran 6 - Bienvenue
  welcomeText: {
    fontSize: 28,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 40,
  },
  welcomeNameGradient: {
    fontFamily: theme.fonts.title,
    fontSize: 28,
    letterSpacing: 1,
  },
  // Écran final - QUIZ SECTEUR
  finalScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizTextGradient: {
    fontSize: 80,
    fontFamily: theme.fonts.title, // Bowlby One SC
    letterSpacing: 4,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  secteurText: {
    fontSize: 24,
    fontFamily: 'sans-serif',
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  // Bouton
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  ctaButton: {
    width: '100%',
  },
  finalScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
