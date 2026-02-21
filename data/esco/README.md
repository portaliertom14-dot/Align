# Données ESCO — Align

Place ici les fichiers d'occupations ESCO pour l'ingestion.

## Format attendu

Fichier JSON : `occupations.json` (ou chemin passé en argument au script)

```json
{
  "groups": [
    { "id": "tech", "label_fr": "Technologies", "label_en": "Technology", "parent_id": null }
  ],
  "occupations": [
    {
      "id": "http://data.europa.eu/esco/occupation/xxxx",
      "code": "2512",
      "title_fr": "Développeur logiciel",
      "title_en": "Software developer",
      "description_fr": "Conçoit et développe des applications.",
      "description_en": "Designs and develops software applications.",
      "group_id": "tech"
    }
  ]
}
```

- `id` : identifiant stable (URI ESCO ou slug)
- `title_fr` : obligatoire
- `title_en` : optionnel (fallback si pas de FR)
- `description_fr` / `description_en` : optionnel
- `group_id` : optionnel, référence `esco_groups.id`

## Obtenir les données ESCO

1. **Export officiel** : https://ec.europa.eu/esco/api
2. **Téléchargement bulk** : https://esco.ec.europa.eu/en/use-esco/download
3. Convertir le CSV/XML ESCO vers le JSON ci-dessus (script ou outil custom)

## Fichier fourni

- `sample_occupations.json` : échantillon ~50 métiers pour tests
