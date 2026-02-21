# Deux profils 50 réponses — Droit (default) vs Droit + Défense (defense_track)

Format : **Q1=A** = première option, **Q1=B** = deuxième, **Q1=C** = troisième.  
Ces combinaisons sont conçues pour fonctionner **en conditions réelles** dans l’app (quiz secteur → analyse Edge → classement final).

---

## 1. Profil « Droit pur » — variant = **default** (pas de badge Défense)

**Objectif :** top1 = droit_justice_securite, top2 ≠ defense_securite_civile (ou defense en top2 mais avec gap > 1,2 ou defenseScore < 36), donc **aucun** badge « TRACK : DÉFENSE & SÉCURITÉ CIVILE ».

### Réponses complètes (Q1…Q50)

```
Q1=A   Q2=A   Q3=A   Q4=A   Q5=A   Q6=A   Q7=A   Q8=A   Q9=A   Q10=A
Q11=A  Q12=B  Q13=A  Q14=A  Q15=B  Q16=B  Q17=A  Q18=B  Q19=B  Q20=A
Q21=A  Q22=A  Q23=A  Q24=A  Q25=A  Q26=B  Q27=A  Q28=A  Q29=A  Q30=A
Q31=A  Q32=A  Q33=A  Q34=A  Q35=A  Q36=A  Q37=A  Q38=A  Q39=A  Q40=A
Q41=B  Q42=B  Q43=B  Q44=B  Q45=B  Q46=B  Q47=B  Q48=B  Q49=B  Q50=A
```

### Pourquoi ça donne « Droit » en #1 sans defense_track

- **Q43=B** (« Règles, logiques ou structures abstraites ») donne le **domaine** droit + data/tech ; **Q50=A** (« Protéger des personnes ») donne **micro** droit + défense + santé. Droit reste bien alimenté.
- **Q47=B**, **Q48=B**, **Q49=B** orientent le **micro** vers finance / business / création, **pas** vers défense. La Défense ne reçoit quasiment que via Q50 (partagé avec droit/santé), donc son score total reste en dessous du deuxième secteur (souvent business ou finance), qui dépasse défense grâce à Q44–Q46 et Q47–Q49.
- Résultat typique : **droit #1**, **business_entrepreneuriat ou finance_assurance #2**, défense #3 ou plus bas → **variant = default**, pas de badge Défense.

---

## 2. Profil « Droit + terrain » — variant = **defense_track** (badge Défense visible)

**Objectif :** top1 = droit_justice_securite, top2 = defense_securite_civile, avec **gap ≤ 0,5** OU **(gap ≤ 1,2 ET defenseScore ≥ 36)** pour activer le track « Défense & Sécurité civile ».

### Réponses complètes (Q1…Q50)

```
Q1=A   Q2=A   Q3=A   Q4=A   Q5=A   Q6=A   Q7=A   Q8=B   Q9=A   Q10=A
Q11=A  Q12=B  Q13=A  Q14=A  Q15=A  Q16=B  Q17=C  Q18=B  Q19=C  Q20=A
Q21=A  Q22=A  Q23=A  Q24=A  Q25=A  Q26=B  Q27=A  Q28=A  Q29=A  Q30=A
Q31=A  Q32=A  Q33=A  Q34=A  Q35=A  Q36=A  Q37=A  Q38=A  Q39=A  Q40=A
Q41=A  Q42=A  Q43=B  Q44=B  Q45=B  Q46=B  Q47=A  Q48=B  Q49=A  Q50=A
```

### Pourquoi ça donne « Droit » #1 + « Défense » #2 avec defense_track

- **Q43=B** garde le **domaine** orienté droit ; **Q47=A** (« Gérer des situations à risque réel ou d’urgence »), **Q49=A** (« Comprendre et faire respecter des règles ») et **Q50=A** (« Protéger des personnes ») alimentent **ensemble** droit et défense en **micro**, avec un poids fort. Les deux secteurs montent en tête.
- **Q41=A**, **Q42=A** (concret, construire solide) et **Q19=C** (« Être sur le terrain au contact direct »), **Q17=C** (« Intense par moments ») donnent un récit « terrain / urgence / action » en plus du cadre juridique, ce qui pousse l’IA (base) à garder défense très proche de droit. On obtient typiquement **droit #1**, **défense #2**, avec un écart faible et un score Défense ≥ 36.
- Les seuils (gap ≤ 0,5 ou gap ≤ 1,2 et defenseScore ≥ 36) sont alors remplis → **variant = defense_track** → le badge **« TRACK : DÉFENSE & SÉCURITÉ CIVILE »** s’affiche sur l’écran résultat métiers.

---

## Rappel des options par question (A/B/C)

Pour vérifier dans l’app :

- **Q41** : A = Objets/outils/matières, B = Systèmes/données/mécanismes, C = Personnes/comportements  
- **Q42** : A = Construire solide et durable, B = Efficacité/performance, C = Faire progresser une personne  
- **Q43** : A = Matière/concret, **B = Règles/logiques/structures abstraites**, C = Mouvement/intensité/performance  
- **Q44** : A = Visible et tangible, **B = Mesurable (chiffres/performances)**, C = Évolution humaine  
- **Q45** : A = Structure projet/objet, **B = Performance/rentabilité**, C = Développement d’une personne  
- **Q46** : A = Créer qui reste, **B = Objectifs mesurables et ambitieux**, C = Aider à devenir autonome  
- **Q47** : **A = Situations à risque/urgence**, **B = Risques calculés pour réussir**, C = Accompagner sans risque direct  
- **Q48** : A = Influencer/raconter, **B = Flux financiers/risques économiques**, C = Optimiser un système technique  
- **Q49** : **A = Comprendre et faire respecter des règles**, **B = Innover et sortir du cadre**, C = Analyser en profondeur  
- **Q50** : **A = Protéger des personnes**, B = Préserver écosystèmes/nature, C = Optimiser systèmes techniques  

---

## Validation en conditions réelles

1. **Droit pur** : Lancer le quiz secteur, saisir les réponses du profil 1 (ou les injecter si vous avez un mode test). À la fin, vérifier : secteur proposé = **Droit, Justice & Sécurité**, écran résultat métiers **sans** le badge « TRACK : DÉFENSE & SÉCURITÉ CIVILE ».
2. **Droit + terrain** : Même chose avec le profil 2. Vérifier : secteur = **Droit, Justice & Sécurité**, écran résultat métiers **avec** le badge « TRACK : DÉFENSE & SÉCURITÉ CIVILE ».

Les scores exacts (EDGE_FINAL_TOP2) peuvent varier légèrement selon la version du modèle IA ; les choix Q41–Q50 ci‑dessus sont calibrés pour que le comportement attendu soit stable en prod.
