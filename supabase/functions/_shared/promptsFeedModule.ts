/**
 * Prompts pour la génération des modules Feed (mini_simulation_metier, apprentissage_mindset, test_secteur).
 * Utilisés par generate-feed-module Edge Function.
 */

export type FeedModuleType = 'mini_simulation_metier' | 'apprentissage_mindset' | 'test_secteur';

export function getPromptsForFeedModule(
  moduleType: FeedModuleType,
  sectorId: string,
  metierId: string | null
): { systemPrompt: string; userPrompt: string } {
  const baseSystem = `Tu es way, l'intelligence artificielle d'Align.
PUBLIC : Adolescents 15-18 ans (niveau 3e).
RÈGLES OBLIGATOIRES :
1. Niveau de langage : élève de 3e.
2. Aucun jargon professionnel. Aucun mot technique.
3. Aucun concept abstrait (INTERDIT : stratégie, optimisation, performance, analyse, etc.).
4. Situation concrète, réaliste et simple. Une seule décision par item.
5. Maximum 3 choix par item. Chaque choix = phrase courte (max 12 mots).
6. Lecture totale par item < 10 secondes.
7. Format JSON strict.`;

  switch (moduleType) {
    case 'mini_simulation_metier': {
      const systemPrompt = `${baseSystem}
OBJECTIF : Tester l'intérêt naturel et l'énergie pour le métier. NE PAS tester les connaissances.
FORMAT JSON strict :
{
  "titre": "Mini-Simulations : [Nom du métier]",
  "objectif": "Découvre si ce métier te correspond via des situations du quotidien",
  "type": "mini_simulation_metier",
  "durée_estimée": 4,
  "items": [
    {
      "type": "mini_cas",
      "question": "Situation (2 phrases) + Question (1 phrase). < 10 secondes.",
      "options": ["choix A max 12 mots", "choix B max 12 mots", "choix C max 12 mots"],
      "reponse_correcte": 0,
      "explication": "1 phrase courte"
    }
  ],
  "feedback_final": { "badge": "...", "message": "...", "recompense": { "xp": 50, "etoiles": 2 } }
}`;
      const userPrompt = metierId
        ? `Génère un module "Mini-Simulations Métier" pour adolescents 15-18 ans.
- Métier : ${metierId}
- Secteur : ${sectorId}
RÈGLES : EXACTEMENT 12 items. Max 3 options par item. reponse_correcte = nombre (0, 1 ou 2). Situations du quotidien, pas de jargon.`
        : `Génère un module "Mini-Simulations Métier" pour secteur ${sectorId}. EXACTEMENT 12 items. Max 3 options. reponse_correcte = nombre.`;
      return { systemPrompt, userPrompt };
    }

    case 'apprentissage_mindset': {
      const systemPrompt = `${baseSystem}
OBJECTIF : Tester l'intérêt naturel et l'énergie pour apprendre. NE PAS tester les connaissances.
FORMAT JSON strict :
{
  "titre": "Apprentissage & Mindset",
  "objectif": "Découvre comment tu réagis face à l'apprentissage",
  "type": "apprentissage_mindset",
  "durée_estimée": 4,
  "items": [
    {
      "type": "cas_etudiant",
      "question": "Situation (2 phrases) + Question (1 phrase). < 10 secondes.",
      "options": ["choix A max 12 mots", "choix B max 12 mots", "choix C max 12 mots"],
      "reponse_correcte": 0,
      "explication": "1 phrase courte"
    }
  ],
  "feedback_final": { "message": "...", "recompense": { "xp": 50, "etoiles": 2 } }
}`;
      const userPrompt = `Génère un module "Apprentissage & Mindset" pour adolescents 15-18 ans.
RÈGLES : EXACTEMENT 12 items. Max 3 options par item. Situations du quotidien (cours, devoirs, projets, amis). reponse_correcte = nombre (0, 1 ou 2).`;
      return { systemPrompt, userPrompt };
    }

    case 'test_secteur': {
      const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.
PUBLIC : Adolescents 15-18 ans (niveau 3e).
OBJECTIF : Tester UNIQUEMENT des connaissances FACTUELLES sur le secteur ${sectorId} déjà déterminé.

RÈGLES OBLIGATOIRES :
1. Questions 100% factuelles : définitions, outils, rôles, concepts, contraintes, processus du secteur.
2. 1 seule bonne réponse objectivement vraie. Jamais "ça dépend", jamais "selon toi".
3. Niveau débutant. Si terme technique, inclure mini-déf entre parenthèses.
4. Format QCM : 4 choix (A/B/C/D). reponse_correcte = index 0, 1, 2 ou 3.
5. EXACTEMENT 12 items. Format JSON strict.

INTERDICTIONS (réponse invalide) : "que fais-tu", "tu préfères", "comment réagirais-tu", "selon toi", "tu aimes", questions comportementales.

VALIDATION : Chaque question = UNE réponse objectivement vraie. L'explication = fait objectif, pas "ça dépend/souvent/parfois/en général".

FORMAT JSON strict :
{
  "titre": "Test de Secteur : [Nom du secteur]",
  "objectif": "Teste tes connaissances factuelles sur le secteur",
  "type": "test_secteur",
  "durée_estimée": 4,
  "items": [
    {
      "type": "question_factuelle",
      "question": "Question factuelle (définition, outil, rôle, concept).",
      "options": ["choix A", "choix B", "choix C", "choix D"],
      "reponse_correcte": 0,
      "explication": "Fait objectif expliquant pourquoi cette réponse est vraie."
    }
  ],
  "feedback_final": { "badge": "...", "message": "...", "recompense": { "xp": 50, "etoiles": 2 } }
}`;
      const userPrompt = `Génère un module "Test de Secteur" 100% FACTUEL pour le secteur ${sectorId}.
EXACTEMENT 12 items. Chaque item = 4 options. reponse_correcte = index 0, 1, 2 ou 3.
Questions : définitions, outils, rôles, concepts. Jamais personnalité. Expliquation = fait objectif.`;
      return { systemPrompt, userPrompt };
    }

    default:
      throw new Error(`Unknown module type: ${moduleType}`);
  }
}
