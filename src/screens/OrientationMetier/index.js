import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';

/**
 * Page SEO texte /orientation-metier
 * - Simple, sans dépendre du design Align existant
 * - Uniquement du texte pour le SEO, aucun impact sur l'app principale
 */
export default function OrientationMetierScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.inner}>
        {/* h1 */}
        <Text style={styles.h1}>Quel métier est fait pour toi ?</Text>

        {/* h2 */}
        <Text style={styles.h2}>Comment trouver un métier qui te correspond</Text>
        <Text style={styles.p}>
          Beaucoup de personnes se posent la même question&nbsp;: «&nbsp;quel métier me correspond vraiment&nbsp;?&nbsp;». Entre les
          conseils contradictoires, les listes de métiers infinies et les tests d’orientation superficiels, il est très facile de se perdre.
          Pourtant, trouver son métier n’est pas une question de hasard mais une démarche structurée qui repose sur trois piliers&nbsp;:
          mieux se connaître, découvrir les réalités du terrain et tester des directions de manière progressive.
        </Text>
        <Text style={styles.p}>
          La première étape pour une bonne orientation métier consiste à clarifier qui tu es vraiment&nbsp;: tes forces, tes envies, ton niveau
          d’énergie, ta façon d’apprendre et ce que tu veux éviter à tout prix. Sans cette base, tu risques de choisir un métier uniquement
          parce qu’il «&nbsp;sonne bien&nbsp;» ou parce qu’il est à la mode, sans vérifier s’il te correspond en profondeur. C’est exactement là
          que beaucoup d’orientations ratées commencent.
        </Text>
        <Text style={styles.p}>
          Ensuite, il faut confronter cette connaissance de toi à la réalité des métiers. Un intitulé de poste ne dit presque rien&nbsp;: derrière
          «&nbsp;marketing&nbsp;», «&nbsp;ingénieur&nbsp;» ou «&nbsp;designer&nbsp;», il existe des dizaines de façons de travailler, de contextes possibles et de styles de
          journée. Une bonne orientation métier doit te montrer le concret&nbsp;: à quoi ressemble une journée type, quels sont les défis, le rythme,
          le type de collaboration et le niveau de responsabilité.
        </Text>

        {/* h2 */}
        <Text style={styles.h2}>Faire un test d’orientation fiable</Text>
        <Text style={styles.p}>
          Face à ces enjeux, beaucoup de lycéens et d’étudiants se tournent vers un test orientation gratuit trouvé au hasard sur Internet.
          Le problème, c’est que la plupart de ces tests ne vont pas assez loin&nbsp;: quelques questions vagues, un résultat générique et très peu
          d’indications concrètes pour passer à l’action. Un bon test d’orientation ne doit pas simplement te dire «&nbsp;tu es créatif&nbsp;» ou
          «&nbsp;tu es logique&nbsp;», mais t’aider à relier ces traits de personnalité à des pistes métiers réalistes.
        </Text>
        <Text style={styles.p}>
          Un test d’orientation fiable doit aussi rester simple d’accès. Il doit être possible de commencer gratuitement, de comprendre
          rapidement la logique du test et de voir comment les résultats sont construits. Quand tu cherches un métier fait pour toi, tu as
          besoin de transparence, pas d’un résultat magique tombé de nulle part. Tu dois pouvoir te reconnaître dans ce que le test te
          renvoie, quitte à ajuster ensuite en fonction de tes ressentis et de ton niveau d’engagement.
        </Text>
        <Text style={styles.p}>
          Enfin, le rôle d’un bon test d’orientation n’est pas de décider à ta place, mais de t’aider à poser les bonnes questions. Plutôt que
          de te dire «&nbsp;voici LE métier parfait pour toi&nbsp;», il devrait t’aider à répondre toi-même à «&nbsp;quel métier me correspond vraiment&nbsp;?&nbsp;» en te
          montrant plusieurs options cohérentes avec ton profil et en t’expliquant pourquoi elles sont pertinentes.
        </Text>

        {/* h2 */}
        <Text style={styles.h2}>Découvrir ton métier idéal avec Align</Text>
        <Text style={styles.p}>
          Align a été conçu pour répondre précisément à ces enjeux d’orientation métier. Plutôt qu’un simple questionnaire théorique,
          Align combine un test orientation structuré et une expérience interactive qui te permet de te projeter dans des situations proches
          de la réalité. L’objectif est simple&nbsp;: t’aider à trouver un métier qui te correspond vraiment, sans te perdre dans des centaines
          d’options abstraites.
        </Text>
        <Text style={styles.p}>
          Le parcours commence par un test rapide qui explore ta façon de réfléchir, ton rapport aux autres, ton niveau de curiosité et ton
          appétence pour différents environnements de travail. Grâce à ces informations, Align prépare un premier profil d’orientation métier
          et te propose une direction claire plutôt qu’une liste interminable de métiers potentiels. Tu ne vois pas simplement un résultat
          figé, mais une base pour affiner ta réflexion.
        </Text>
        <Text style={styles.p}>
          Ensuite, Align te permet d’explorer cette orientation à travers des mini-situations concrètes. Tu peux tester comment tu réagis à
          certains défis typiques du domaine, voir si le rythme et le type de tâches te conviennent, et affiner ton ressenti. C’est en
          confrontant ton profil aux scénarios proposés que tu peux vraiment sentir si ce métier est fait pour toi ou non.
        </Text>
        <Text style={styles.p}>
          Tout au long de ce parcours, l’objectif reste le même&nbsp;: t’aider à répondre honnêtement à la question «&nbsp;quel métier me correspond&nbsp;?&nbsp;».
          Plutôt que de te coller une étiquette définitive, Align t’accompagne pas à pas pour éclairer tes choix. Tu peux ainsi utiliser le
          test orientation gratuit comme point de départ, puis aller plus loin si tu veux consolider ton projet et préparer concrètement la
          suite (formations, étapes clés, compétences à développer, etc.).
        </Text>
        <Text style={styles.p}>
          Si tu te demandes aujourd’hui «&nbsp;quel métier est fait pour moi&nbsp;?&nbsp;», l’essentiel est de ne pas rester seul avec la question. Une démarche
          guidée, progressive et centrée sur ta réalité t’aidera bien plus qu’un simple quiz aléatoire. C’est exactement la promesse
          d’Align&nbsp;: transformer une question floue en un chemin clair, actionnable et aligné avec qui tu es vraiment.
        </Text>

        <View style={styles.ctaContainer}>
          <Text
            accessibilityRole={Platform.OS === 'web' ? 'link' : undefined}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.location.href = '/';
              }
            }}
            style={styles.cta}
          >
            Commencer le test gratuitement
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  inner: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  p: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  ctaContainer: {
    marginTop: 32,
    marginBottom: 16,
  },
  cta: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});

