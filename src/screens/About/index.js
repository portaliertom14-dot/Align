import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { theme } from '../../styles/theme';

/**
 * Page À propos d'Align
 */
export default function AboutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Header />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>À propos d'Align</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Align est une application d'orientation conçue pour aider les lycéens à mieux comprendre ce qui leur correspond vraiment.
          </Text>
          <Text style={styles.paragraph}>
            Grâce à des quiz intelligents, une approche progressive et une analyse personnalisée, Align aide chaque utilisateur à identifier :
          </Text>
          <Text style={styles.bulletPoint}>• un secteur qui lui correspond</Text>
          <Text style={styles.bulletPoint}>• des métiers alignés avec sa façon de penser et de travailler</Text>
          <Text style={styles.paragraph}>
            Align ne cherche pas à imposer une voie "idéale".
          </Text>
          <Text style={styles.paragraph}>
            L'objectif est d'aider l'utilisateur à trouver une direction qui lui parle vraiment.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pourquoi Align existe ?</Text>
          <Text style={styles.paragraph}>
            Parce que beaucoup de jeunes :
          </Text>
          <Text style={styles.bulletPoint}>• se sentent perdus</Text>
          <Text style={styles.bulletPoint}>• n'osent pas dire qu'ils ne savent pas</Text>
          <Text style={styles.bulletPoint}>• utilisent des outils trop scolaires ou inadaptés</Text>
          <Text style={styles.paragraph}>
            Align a été pensé pour être :
          </Text>
          <Text style={styles.bulletPoint}>• simple</Text>
          <Text style={styles.bulletPoint}>• fluide</Text>
          <Text style={styles.bulletPoint}>• engageant</Text>
          <Text style={styles.bulletPoint}>• utile</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ce qu'Align n'est pas</Text>
          <Text style={styles.bulletPoint}>• Pas un test magique</Text>
          <Text style={styles.bulletPoint}>• Pas un conseiller d'orientation classique</Text>
          <Text style={styles.bulletPoint}>• Pas une plateforme d'articles interminables</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Une application, mais surtout un chemin</Text>
          <Text style={styles.paragraph}>
            Align est un parcours progressif qui accompagne chaque utilisateur dans sa réflexion.
          </Text>
          <Text style={styles.paragraph}>
            Parce que trouver sa voie, ce n'est pas cocher une case.
          </Text>
          <Text style={styles.paragraph}>
            C'est s'aligner avec soi-même.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 32,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.button, // Bowlby One SC
    color: '#FFFFFF',
    marginBottom: 32,
    letterSpacing: 1,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.button, // Bowlby One SC
    color: '#FF7B2B',
    marginBottom: 16,
    letterSpacing: 1,
  },
  paragraph: {
    fontSize: 16,
    fontFamily: theme.fonts.body, // Nunito Black
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    fontFamily: theme.fonts.body, // Nunito Black
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
