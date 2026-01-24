import React from 'react';
import { View, StyleSheet, ScrollView, Text, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import { theme } from '../../styles/theme';

/**
 * Page Politique de confidentialité
 * Dernière mise à jour : 21/01/2026
 */
export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  const handleEmailPress = () => {
    Linking.openURL('mailto:align.app.contact@gmail.com');
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Politique de confidentialité – Align</Text>
        <Text style={styles.lastUpdate}>Dernière mise à jour : 21/01/2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Align accorde une importance particulière à la protection des données personnelles de ses utilisateurs.
          </Text>
          <Text style={styles.paragraph}>
            Cette politique de confidentialité a pour objectif d'expliquer :
          </Text>
          <Text style={styles.bulletPoint}>• quelles données sont collectées,</Text>
          <Text style={styles.bulletPoint}>• pourquoi elles sont collectées,</Text>
          <Text style={styles.bulletPoint}>• comment elles sont utilisées,</Text>
          <Text style={styles.bulletPoint}>• et quels sont vos droits.</Text>
          <Text style={styles.paragraph}>
            En utilisant Align, vous acceptez cette politique de confidentialité.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Données collectées</Text>
          
          <Text style={styles.subsectionTitle}>2.1 Données fournies par l'utilisateur</Text>
          <Text style={styles.bulletPoint}>• Prénom</Text>
          <Text style={styles.bulletPoint}>• Nom</Text>
          <Text style={styles.bulletPoint}>• Nom d'utilisateur</Text>
          <Text style={styles.bulletPoint}>• Adresse e-mail</Text>
          <Text style={styles.bulletPoint}>• Date de naissance</Text>
          <Text style={styles.bulletPoint}>• Réponses aux quiz (secteur, métier, modules)</Text>
          <Text style={styles.bulletPoint}>• Choix et préférences liés à l'orientation</Text>

          <Text style={styles.subsectionTitle}>2.2 Données techniques</Text>
          <Text style={styles.bulletPoint}>• Type d'appareil</Text>
          <Text style={styles.bulletPoint}>• Système d'exploitation</Text>
          <Text style={styles.bulletPoint}>• Données de connexion anonymes (sécurité & performance)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Utilisation des données</Text>
          <Text style={styles.paragraph}>
            Les données collectées sont utilisées pour :
          </Text>
          <Text style={styles.bulletPoint}>• Créer et gérer le compte utilisateur</Text>
          <Text style={styles.bulletPoint}>• Personnaliser l'expérience</Text>
          <Text style={styles.bulletPoint}>• Analyser les réponses afin de proposer :</Text>
          <Text style={styles.bulletPoint}>  - un secteur</Text>
          <Text style={styles.bulletPoint}>  - un métier</Text>
          <Text style={styles.bulletPoint}>  - des contenus adaptés</Text>
          <Text style={styles.bulletPoint}>• Améliorer l'application</Text>
          <Text style={styles.bulletPoint}>• Assurer la sécurité du service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Envoi d'e-mails</Text>
          <Text style={styles.paragraph}>
            Align utilise l'adresse e-mail pour :
          </Text>
          <Text style={styles.bulletPoint}>• Email de bienvenue</Text>
          <Text style={styles.bulletPoint}>• Notifications importantes</Text>
          <Text style={styles.bulletPoint}>• Informations de compte</Text>
          <Text style={styles.bulletPoint}>• Mises à jour importantes</Text>
          <Text style={styles.paragraph}>
            Align n'envoie pas de spam.
          </Text>
          <Text style={styles.paragraph}>
            Les e-mails sont strictement liés à l'utilisation de l'application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Partage des données</Text>
          <Text style={styles.paragraph}>
            Les données ne sont jamais vendues.
          </Text>
          <Text style={styles.paragraph}>
            Elles peuvent être traitées uniquement par des services nécessaires :
          </Text>
          <Text style={styles.bulletPoint}>• hébergement</Text>
          <Text style={styles.bulletPoint}>• authentification</Text>
          <Text style={styles.bulletPoint}>• envoi d'e-mails</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Sécurité des données</Text>
          <Text style={styles.paragraph}>
            Mise en place de mesures techniques et organisationnelles pour protéger les données contre :
          </Text>
          <Text style={styles.bulletPoint}>• accès non autorisé</Text>
          <Text style={styles.bulletPoint}>• perte</Text>
          <Text style={styles.bulletPoint}>• modification</Text>
          <Text style={styles.bulletPoint}>• divulgation</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Durée de conservation</Text>
          <Text style={styles.bulletPoint}>• Tant que le compte est actif</Text>
          <Text style={styles.bulletPoint}>• Ou aussi longtemps que nécessaire au bon fonctionnement</Text>
          <Text style={styles.paragraph}>
            Suppression possible sur demande.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Droits des utilisateurs (RGPD)</Text>
          <Text style={styles.bulletPoint}>• Accès</Text>
          <Text style={styles.bulletPoint}>• Rectification</Text>
          <Text style={styles.bulletPoint}>• Suppression</Text>
          <Text style={styles.bulletPoint}>• Opposition</Text>
          <Text style={styles.bulletPoint}>• Portabilité</Text>
          <Text style={styles.paragraph}>
            Contact :{' '}
            <Text style={styles.emailLink} onPress={handleEmailPress}>
              📩 align.app.contact@gmail.com
            </Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Utilisation par des mineurs</Text>
          <Text style={styles.paragraph}>
            Align s'adresse principalement aux lycéens.
          </Text>
          <Text style={styles.paragraph}>
            Suppression possible à la demande d'un parent ou représentant légal.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Modifications</Text>
          <Text style={styles.paragraph}>
            La politique peut être mise à jour à tout moment.
          </Text>
          <Text style={styles.paragraph}>
            Les utilisateurs seront informés en cas de changement important.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.emailLink} onPress={handleEmailPress}>
              📩 align.app.contact@gmail.com
            </Text>
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
    fontSize: 28,
    fontFamily: theme.fonts.button, // Bowlby One SC
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
  },
  lastUpdate: {
    fontSize: 14,
    fontFamily: theme.fonts.body, // Nunito Black
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.button, // Bowlby One SC
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 1,
  },
  subsectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button, // Bowlby One SC
    color: '#FF7B2B',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
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
  emailLink: {
    color: '#FF7B2B',
    textDecorationLine: 'underline',
  },
});
