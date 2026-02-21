# Réponses pour obtenir Communication & Médias en TOP1

Ces 50 réponses (Q1–Q50) sont cohérentes avec un profil « Communication & Médias » et déclenchent la garantie reachability en prod lorsque Q41–Q50 correspondent au profil validé.

## Format une ligne (pour copier-coller)

```
Q1=B, Q2=B, Q3=B, Q4=B, Q5=C, Q6=C, Q7=B, Q8=B, Q9=B, Q10=C, Q11=B, Q12=C, Q13=B, Q14=B, Q15=C, Q16=B, Q17=B, Q18=C, Q19=C, Q20=B, Q21=B, Q22=B, Q23=B, Q24=B, Q25=B, Q26=B, Q27=B, Q28=B, Q29=B, Q30=B, Q31=C, Q32=B, Q33=B, Q34=B, Q35=B, Q36=B, Q37=C, Q38=B, Q39=B, Q40=B, Q41=C, Q42=A, Q43=C, Q44=A, Q45=A, Q46=B, Q47=C, Q48=A, Q49=B, Q50=B
```

## Format payload (secteur_1 … secteur_50, value A/B/C)

Pour envoyer à l’API ou au quiz :

| Question | Réponse | Question | Réponse | Question | Réponse |
|----------|---------|----------|---------|----------|---------|
| secteur_1  | B | secteur_18 | C | secteur_35 | B |
| secteur_2  | B | secteur_19 | C | secteur_36 | B |
| secteur_3  | B | secteur_20 | B | secteur_37 | C |
| secteur_4  | B | secteur_21 | B | secteur_38 | B |
| secteur_5  | C | secteur_22 | B | secteur_39 | B |
| secteur_6  | C | secteur_23 | B | secteur_40 | B |
| secteur_7  | B | secteur_24 | B | secteur_41 | **C** |
| secteur_8  | B | secteur_25 | B | secteur_42 | **A** |
| secteur_9  | B | secteur_26 | B | secteur_43 | **C** |
| secteur_10 | C | secteur_27 | B | secteur_44 | **A** |
| secteur_11 | B | secteur_28 | B | secteur_45 | **A** |
| secteur_12 | C | secteur_29 | B | secteur_46 | **B** |
| secteur_13 | B | secteur_30 | B | secteur_47 | **C** |
| secteur_14 | B | secteur_31 | C | secteur_48 | **A** |
| secteur_15 | C | secteur_32 | B | secteur_49 | **B** |
| secteur_16 | B | secteur_33 | B | secteur_50 | **B** |
| secteur_17 | B | secteur_34 | B |  |  |

**Important :** Q41–Q50 (en gras) doivent être exactement celles-ci pour que la garantie reachability s’applique (base min 0,28 si l’IA met communication_media à 0).

## Garantie en prod

Dans `analyze-sector`, une logique **profil exact ou très proche** s’applique :

- **Condition** : Q41–Q50 **exactement** comme ci-dessus, et **au plus 2 réponses différentes** sur Q1–Q40 par rapport au profil de référence (tableau ci‑dessus).
- **Effet** : si, après scoring, `communication_media` est **derrière** `environnement_agri`, on le remonte **juste au‑dessus** d’environnement_agri (nudge de 0,01). Aucun autre secteur n’est modifié : on ne dépasse pas business, santé, éducation, etc.
- **Environnement & Agri** reste **atteignable** : on ne baisse jamais son score, on ne fait que remonter communication_media quand il est en dessous.

Formule inchangée : `finalScore = base×1 + domain×2 + micro×4`.
