/**
 * Descriptions courtes et concrètes par métier (titres canoniques whitelist).
 * Utilisé par ResultJob pour afficher une vraie description au lieu de "Autres pistes".
 */

export interface JobDescription {
  summary: string;
  bullets?: string[];
}

/** Map titre canonique → description (summary + optionnel bullets). */
const JOB_DESCRIPTIONS: Record<string, JobDescription> = {
  // --- creation_design (30) ---
  'Designer graphique': {
    summary: 'Le designer graphique conçoit des visuels (logos, affiches, identités) pour la communication et la marque.',
    bullets: ['Crée des supports print et digital', 'Travaille avec la direction artistique et les briefs clients'],
  },
  'UX designer': {
    summary: "L'UX designer améliore l'expérience utilisateur des produits digitaux (sites, apps) via recherche et conception.",
    bullets: ['Mène des tests utilisateurs et des parcours', 'Prototype et itère sur les interfaces'],
  },
  'UI designer': {
    summary: "L'UI designer définit l'interface visuelle des applications et sites (couleurs, typo, composants).",
    bullets: ['Dessine écrans et composants', 'Assure cohérence et accessibilité visuelle'],
  },
  'Designer produit': {
    summary: 'Le designer produit conçoit des objets du quotidien ou industriels (forme, usage, matériaux).',
    bullets: ['De l’esquisse au prototype 3D', 'Collabore avec ingénierie et marketing'],
  },
  'Designer industriel': {
    summary: "Le designer industriel conçoit des produits manufacturés (électroménager, mobilier, packaging) en série.",
    bullets: ['Optimise forme, coût et process', 'Travaille avec les usines et la R&D'],
  },
  'Directeur artistique': {
    summary: 'Le directeur artistique pilote la vision visuelle d’une marque, d’un projet ou d’une agence.',
    bullets: ['Valide les créations et les chartes', 'Encadre une équipe de créatifs'],
  },
  'Illustrateur': {
    summary: "L'illustrateur crée des images sur commande pour l'édition, la presse, la pub ou le digital.",
    bullets: ['Dessin, peinture numérique, styles variés', 'Adapte le style au support et au public'],
  },
  'Motion designer': {
    summary: 'Le motion designer crée des animations et visuels en mouvement pour vidéos, pubs, réseaux ou interfaces.',
    bullets: ['Anime texte, logos et illustrations', 'Travaille avec After Effects et les briefs créatifs'],
  },
  'Photographe': {
    summary: 'Le photographe capture des images pour la presse, la pub, l’événementiel ou l’art.',
    bullets: ['Cadrage, lumière, post-production', 'Gère prises de vues en studio ou extérieur'],
  },
  'Vidéaste': {
    summary: 'Le vidéaste réalise des vidéos (court format, pub, documentaire, contenu web).',
    bullets: ['Tournage, montage et étalonnage', 'Adapte le format au canal de diffusion'],
  },
  'Réalisateur': {
    summary: 'Le réalisateur dirige la création d’un film, d’un clip ou d’une série (fiction ou documentaire).',
    bullets: ['Script, découpage, direction d’acteurs', 'Pilotage de la post-production'],
  },
  'Scénariste': {
    summary: 'Le scénariste écrit les histoires et dialogues pour le cinéma, la TV, le jeu vidéo ou la bande dessinée.',
    bullets: ['Structure narrative et personnages', 'Collaboration avec réalisateur et production'],
  },
  "Architecte d'intérieur": {
    summary: "L'architecte d'intérieur conçoit et aménage des espaces (bureaux, commerces, logements).",
    bullets: ['Plans, matériaux, lumière et mobilier', 'Suivi de chantier et des corps de métier'],
  },
  'Styliste': {
    summary: 'Le styliste crée des vêtements et des collections pour la mode (prêt-à-porter ou sur mesure).',
    bullets: ['Recherche matières et coupes', 'Défilés, lookbooks et direction artistique'],
  },
  'Créateur de marque': {
    summary: 'Le créateur de marque définit l’identité, le nom et le storytelling d’une marque ou d’un produit.',
    bullets: ['Stratégie de marque et positionnement', 'Charte graphique et ton de voix'],
  },
  'Designer packaging': {
    summary: 'Le designer packaging conçoit les emballages (forme, graphisme, matériau) pour les produits de grande consommation.',
    bullets: ['Contraintes logistique et coût', 'Impact visuel en linéaire'],
  },
  'Game designer': {
    summary: 'Le game designer conçoit les règles, les niveaux et l’expérience de jeu (vidéo ou plateau).',
    bullets: ['Gameplay, courbe de difficulté, narration', 'Tests et itérations avec l’équipe dev'],
  },
  'Sound designer': {
    summary: 'Le sound designer crée et intègre les sons et ambiances pour le jeu vidéo, le film ou l’installation.',
    bullets: ['Enregistrement, mixage, intégration', 'Collaboration avec image et game design'],
  },
  'Animateur 3D': {
    summary: "L'animateur 3D donne le mouvement aux personnages et objets dans les films d'animation, jeux ou visuels.",
    bullets: ['Rigging, keyframes, motion capture', 'Logiciels 3D (Maya, Blender, etc.)'],
  },
  'Web designer': {
    summary: 'Le web designer conçoit l’aspect visuel et l’ergonomie des sites et applications web.',
    bullets: ['Maquettes, responsive, design system', 'Collaboration avec dev front'],
  },
  'Designer textile': {
    summary: 'Le designer textile crée des motifs, matières et collections pour la mode, l’ameublement ou l’industrie.',
    bullets: ['Recherche couleurs et matières', 'Échantillons et suivi de production'],
  },
  'Directeur créatif': {
    summary: 'Le directeur créatif pilote la vision créative d’une agence ou d’une marque (campagnes, identité).',
    bullets: ['Briefs, validation des concepts', 'Management d’équipe créative'],
  },
  'Storyboarder': {
    summary: 'Le storyboarder dessine le découpage visuel d’un film, d’une pub ou d’un jeu (plans, cadrages).',
    bullets: ['Séquences et cadrages', 'Lien entre scénario et réalisation'],
  },
  'Concept artist': {
    summary: 'Le concept artist produit des visuels de préproduction pour définir l’univers (jeu vidéo, film, animation).',
    bullets: ['Environnements, personnages, ambiances', 'Exploration visuelle rapide'],
  },
  "Designer d'expérience": {
    summary: "Le designer d'expérience conçoit des parcours et expériences (physiques ou digitales) pour les utilisateurs.",
    bullets: ['Cartographie des parcours', 'Prototypage et tests'],
  },
  'Designer événementiel': {
    summary: "Le designer événementiel conçoit l'espace, la scénographie et l'identité visuelle d'événements.",
    bullets: ['Plans, décors, signalétique', 'Contraintes techniques et délais'],
  },
  'Designer mobilier': {
    summary: 'Le designer mobilier conçoit des meubles et objets pour l’habitat, le bureau ou l’espace public.',
    bullets: ['Forme, matériaux, assemblage', 'Prototypage et production'],
  },
  'Designer automobile': {
    summary: 'Le designer automobile définit les lignes, les volumes et l’habitabilité des véhicules.',
    bullets: ['Sketches, modélisation 3D, maquettes', 'Collaboration avec ingénierie'],
  },
  'Artiste digital': {
    summary: "L'artiste digital crée des œuvres ou visuels avec des outils numériques (2D, 3D, génératif).",
    bullets: ['Expositions, commandes, collaborations', 'Nouvelles technologies et supports'],
  },
  'Curateur artistique': {
    summary: 'Le curateur artistique conçoit des expositions et sélectionne les œuvres pour musées ou galeries.',
    bullets: ['Scénographie et discours', 'Relations artistes et institutions'],
  },
  // --- environnement_agri (30) ---
  'Ingénieur agronome': {
    summary: "L'ingénieur agronome travaille sur les systèmes de production agricole (cultures, sols, élevage) et l'innovation.",
    bullets: ['Conseil, R&D et expérimentation', 'Enjeux rendement et durabilité'],
  },
  'Agriculteur': {
    summary: "L'agriculteur gère une exploitation (grandes cultures, élevage, maraîchage) au quotidien.",
    bullets: ['Travaux des champs et suivi des cultures', 'Gestion économique et réglementaire'],
  },
  'Technicien environnement': {
    summary: 'Le technicien environnement réalise des mesures, des suivis et des actions sur le terrain (eau, déchets, biodiversité).',
    bullets: ['Prélèvements, analyses, reporting', 'Sensibilisation et mise en conformité'],
  },
  'Chargé de mission environnement': {
    summary: 'Le chargé de mission environnement pilote des projets (biodiversité, énergie, déchets) pour une collectivité ou une entreprise.',
    bullets: ['Animation de projets et partenariats', 'Conformité et reporting'],
  },
  'Écologue': {
    summary: "L'écologue étudie les écosystèmes et les espèces (inventaires, diagnostics) pour la conservation ou l'aménagement.",
    bullets: ['Études de terrain et analyses', 'Expertise pour maîtres d’ouvrage'],
  },
  "Gestionnaire d'espaces naturels": {
    summary: "Le gestionnaire d'espaces naturels assure la préservation et l'entretien d'un site (réserve, parc, ENS).",
    bullets: ['Suivi écologique et entretien', 'Accueil du public et pédagogie'],
  },
  'Animateur nature': {
    summary: "L'animateur nature fait découvrir la faune, la flore et les milieux au grand public (sorties, ateliers).",
    bullets: ['Animations et outils pédagogiques', 'Sensibilisation à l’environnement'],
  },
  'Ingénieur forestier': {
    summary: "L'ingénieur forestier gère les forêts (exploitation, renouvellement, biodiversité) pour des propriétaires ou l'État.",
    bullets: ['Plans de gestion et martelages', 'Suivi sanitaire et régénération'],
  },
  'Technicien forestier': {
    summary: 'Le technicien forestier assure les opérations de terrain en forêt (marquage, suivi, travaux).',
    bullets: ['Travaux forestiers et suivi des chantiers', 'Relation avec les entreprises et les usagers'],
  },
  'Ouvrier agricole': {
    summary: "L'ouvrier agricole participe aux travaux des champs (semis, récolte, entretien) sur une exploitation.",
    bullets: ['Conduite d’engins et travaux manuels', 'Respect des consignes et du calendrier'],
  },
  'Éleveur': {
    summary: "L'éleveur conduit un troupeau (bovins, ovins, caprins, etc.) et gère l'exploitation d'élevage.",
    bullets: ['Soins aux animaux et alimentation', 'Commercialisation et réglementation'],
  },
  'Viticulteur': {
    summary: 'Le viticulteur cultive la vigne et produit du raisin pour le vin ou le marché du frais.',
    bullets: ['Taille, travaux en vert, vendanges', 'Conduite du vignoble et qualité'],
  },
  'Maraîcher': {
    summary: 'Le maraîcher produit des légumes (plein champ ou sous serre) pour la vente directe ou les circuits courts.',
    bullets: ['Planification des cultures et récoltes', 'Techniques bio ou conventionnelles'],
  },
  'Conseiller agricole': {
    summary: 'Le conseiller agricole accompagne les agriculteurs (technique, économique, réglementaire) dans une chambre d’agriculture ou un organisme.',
    bullets: ['Diagnostics et plans d’action', 'Formation et veille réglementaire'],
  },
  "Ingénieur en dépollution": {
    summary: "L'ingénieur en dépollution conçoit et suit des chantiers de réhabilitation de sols ou d'eaux pollués.",
    bullets: ['Études et techniques de traitement', 'Pilotage de chantiers et sécurité'],
  },
  'Chargé HSE': {
    summary: 'Le chargé HSE (Hygiène, Sécurité, Environnement) met en œuvre la politique HSE d’une entreprise ou d’un site.',
    bullets: ['Audits, formations, conformité', 'Prévention des risques et incidents'],
  },
  'Auditeur environnement': {
    summary: "L'auditeur environnement réalise des audits (normes ISO, réglementation) pour des organismes ou des sites.",
    bullets: ['Contrôles et rapports d’audit', 'Préconisations et suivi des actions'],
  },
  'Responsable QHSE': {
    summary: 'Le responsable QHSE pilote la qualité, l’hygiène, la sécurité et l’environnement d’une organisation.',
    bullets: ['Politique QHSE et indicateurs', 'Management d’équipe et relations internes'],
  },
  'Technicien traitement des eaux': {
    summary: 'Le technicien traitement des eaux assure le fonctionnement des stations d’épuration ou de potabilisation.',
    bullets: ['Contrôles, réglages, maintenance', 'Respect des normes de rejet'],
  },
  "Ingénieur énergies renouvelables": {
    summary: "L'ingénieur énergies renouvelables conçoit ou exploite des installations (éolien, solaire, biomasse).",
    bullets: ['Études techniques et dimensionnement', 'Suivi de chantier ou d’exploitation'],
  },
  'Chargé de projet éolien': {
    summary: 'Le chargé de projet éolien pilote le développement de parcs éoliens (autorisations, études, construction).',
    bullets: ['Permis, concertation, appels d’offres', 'Coordination des prestataires'],
  },
  'Consultant RSE': {
    summary: 'Le consultant RSE accompagne les entreprises dans leur stratégie responsabilité sociétale et environnementale.',
    bullets: ['Bilan carbone, reporting, actions', 'Sensibilisation et formation'],
  },
  'Responsable biodiversité': {
    summary: 'Le responsable biodiversité définit et met en œuvre la stratégie biodiversité d’une entreprise ou d’un territoire.',
    bullets: ['Inventaires, mesures d’évitement et de compensation', 'Partenariats et sensibilisation'],
  },
  'Technicien rivière': {
    summary: 'Le technicien rivière entretient les cours d’eau et les berges (restauration, entretien, suivi).',
    bullets: ['Travaux de génie écologique', 'Suivi de la qualité et des espèces'],
  },
  'Gardien de refuge': {
    summary: 'Le gardien de refuge accueille les randonneurs en montagne et gère le refuge (hébergement, repas, sécurité).',
    bullets: ['Accueil et entretien du refuge', 'Sensibilisation à la montagne'],
  },
  'Paysagiste': {
    summary: 'Le paysagiste conçoit et réalise des aménagements d’espaces verts (parcs, jardins, espaces publics).',
    bullets: ['Études, plans et chantiers', 'Végétaux, minéral et eau'],
  },
  'Jardinier': {
    summary: 'Le jardinier entretient et aménage des espaces verts (parcs, jardins, bâti).',
    bullets: ['Plantations, taille, entretien', 'Utilisation d’engins et d’outils'],
  },
  'Ouvrier espaces verts': {
    summary: "L'ouvrier espaces verts réalise les travaux d'entretien et d'aménagement des espaces verts (collectivités, entreprises).",
    bullets: ['Tonte, désherbage, plantations', 'Respect des consignes et du calendrier'],
  },
  'Conseiller en agroécologie': {
    summary: 'Le conseiller en agroécologie accompagne les agriculteurs vers des pratiques plus durables (sol, biodiversité, autonomie).',
    bullets: ['Diagnostics et plans de transition', 'Formation et suivi des pratiques'],
  },
  'Technicien de la mer et du littoral': {
    summary: 'Le technicien de la mer et du littoral intervient sur la gestion du littoral, la pêche ou l’aquaculture.',
    bullets: ['Suivi des milieux et des espèces', 'Conseil et sensibilisation'],
  },
  // --- ingenierie_tech (30) ---
  'Ingénieur logiciel': {
    summary: "L'ingénieur logiciel conçoit et développe des applications et systèmes logiciels (web, mobile, embarqué).",
    bullets: ['Architecture, code et tests', 'Travail en équipe et méthodologies agiles'],
  },
  'Développeur backend': {
    summary: 'Le développeur backend bâtit la logique serveur, les API et les bases de données des applications.',
    bullets: ['Serveurs, bases de données, sécurité', 'Performance et scalabilité'],
  },
  'Développeur frontend': {
    summary: "Le développeur frontend réalise l'interface utilisateur des sites et applications (HTML, CSS, JavaScript).",
    bullets: ['Expérience utilisateur et accessibilité', 'Frameworks modernes (React, Vue, etc.)'],
  },
  'Développeur mobile': {
    summary: 'Le développeur mobile crée des applications pour smartphones et tablettes (iOS, Android, cross-platform).',
    bullets: ['Design adapté mobile', 'Publication et mises à jour'],
  },
  'Architecte logiciel': {
    summary: "L'architecte logiciel définit la structure technique des systèmes (choix technologiques, découpage des modules).",
    bullets: ['Évolutivité et maintenabilité', 'Encadrement technique'],
  },
  'DevOps engineer': {
    summary: "Le DevOps engineer assure le déploiement, l'exploitation et l'automatisation des infrastructures et pipelines.",
    bullets: ['CI/CD, conteneurs, cloud', 'Fiabilité et monitoring'],
  },
  'Ingénieur cloud': {
    summary: "L'ingénieur cloud conçoit et opère des infrastructures sur le cloud (AWS, GCP, Azure).",
    bullets: ['Scalabilité, coûts, sécurité', 'Migration et optimisation'],
  },
  'Ingénieur cybersécurité': {
    summary: "L'ingénieur cybersécurité protège les systèmes et données contre les intrusions et les menaces.",
    bullets: ['Audits, tests d’intrusion', 'Politiques de sécurité'],
  },
  'Ingénieur systèmes embarqués': {
    summary: "L'ingénieur systèmes embarqués développe le logiciel et l'électronique des objets connectés et véhicules.",
    bullets: ['Temps réel, contraintes matérielles', 'C, C++, drivers'],
  },
  'Ingénieur robotique': {
    summary: "L'ingénieur robotique conçoit et programme des robots (industrie, logistique, services).",
    bullets: ['Mécanique, capteurs, contrôle', 'Collaboration avec les opérateurs'],
  },
  'Ingénieur mécanique': {
    summary: "L'ingénieur mécanique conçoit des pièces et systèmes mécaniques (machines, véhicules, équipements).",
    bullets: ['CAO, simulation, prototypes', 'Résistance des matériaux'],
  },
  'Ingénieur électrique': {
    summary: "L'ingénieur électrique conçoit des systèmes électriques et électroniques (réseaux, automatismes, énergie).",
    bullets: ['Schémas, câblage, normes', 'Maintenance et évolution'],
  },
  'Ingénieur aéronautique': {
    summary: "L'ingénieur aéronautique travaille sur la conception et la maintenance des aéronefs et équipements.",
    bullets: ['Sécurité, réglementation', 'Bureau d’études et essais'],
  },
  'Ingénieur automobile': {
    summary: "L'ingénieur automobile conçoit ou valide des systèmes des véhicules (moteur, châssis, électronique).",
    bullets: ['Normes et homologation', 'Innovation et électrification'],
  },
  'Ingénieur industriel': {
    summary: "L'ingénieur industriel optimise les processus de production (qualité, coûts, délais).",
    bullets: ['Organisation, flux, maintenance', 'Amélioration continue'],
  },
  'Architecte IT': {
    summary: "L'architecte IT définit l'organisation des systèmes d'information et des infrastructures d'entreprise.",
    bullets: ['Urbanisation, intégration', 'Alignement métier et technique'],
  },
  'Responsable infrastructure': {
    summary: 'Le responsable infrastructure pilote les serveurs, réseaux et outils techniques d’une entreprise.',
    bullets: ['Disponibilité et performance', 'Équipe et budgets'],
  },
  'CTO': {
    summary: 'Le CTO (Chief Technology Officer) pilote la stratégie technique et l’équipe de développement.',
    bullets: ['Choix technologiques', 'Recrutement et vision produit'],
  },
  'Ingénieur QA': {
    summary: "L'ingénieur QA assure la qualité logicielle via les tests (automatisés, manuels, performance).",
    bullets: ['Plans de test, bugs', 'Intégration dans la chaîne de livraison'],
  },
  'Expert réseaux': {
    summary: "L'expert réseaux conçoit et administre les réseaux informatiques (LAN, WAN, sécurité).",
    bullets: ['Routage, firewall, VPN', 'Support et évolution'],
  },
  'Ingénieur R&D': {
    summary: "L'ingénieur R&D innove et développe de nouvelles solutions techniques ou produits.",
    bullets: ['Prototypage, brevets', 'Veille et partenariats'],
  },
  'Product engineer': {
    summary: 'Le product engineer assure le lien entre le produit, les utilisateurs et la technique (conception à la livraison).',
    bullets: ['Spécifications, suivi dev', 'Qualité et déploiement'],
  },
  'Responsable innovation tech': {
    summary: 'Le responsable innovation tech pilote les projets d’innovation et de transformation numérique.',
    bullets: ['Veille, POC, partenariats', 'Acculturation des équipes'],
  },
  'Lead developer': {
    summary: 'Le lead developer encadre une équipe de dev et assure la qualité technique du code et des livraisons.',
    bullets: ['Revues de code, bonnes pratiques', 'Mentorat et planification'],
  },
  'Responsable transformation digitale': {
    summary: 'Le responsable transformation digitale pilote la modernisation des processus et outils numériques.',
    bullets: ['Projets transverses', 'Change management'],
  },
  'Ingénieur hardware': {
    summary: "L'ingénieur hardware conçoit les cartes électroniques et composants (spécifications, schémas, tests).",
    bullets: ['Électronique, prototypes', 'Relations fournisseurs'],
  },
  'Intégrateur systèmes': {
    summary: "L'intégrateur systèmes assemble et déploie les briques logicielles et matérielles d'un projet.",
    bullets: ['Déploiement, recette', 'Documentation et formation'],
  },
  'Consultant tech': {
    summary: 'Le consultant tech accompagne les entreprises sur la stratégie technique, l’architecture ou l’organisation.',
    bullets: ['Audits, recommandations', 'Projets de mise en œuvre'],
  },
  'Responsable technique': {
    summary: 'Le responsable technique encadre les équipes de développement et garantit la cohérence technique des livraisons.',
    bullets: ['Roadmap technique', 'Recrutement et process'],
  },
  // --- data_ia (30) ---
  'Data scientist': {
    summary: 'Le data scientist analyse des données et construit des modèles (statistiques, machine learning) pour la décision.',
    bullets: ['Exploration, modélisation', 'Visualisation et recommandations'],
  },
  'Data engineer': {
    summary: 'Le data engineer conçoit et maintient les pipelines de données (collecte, transformation, stockage).',
    bullets: ['ETL, bases, APIs', 'Scalabilité et qualité des données'],
  },
  'Ingénieur machine learning': {
    summary: "L'ingénieur machine learning conçoit et déploie des modèles ML (entraînement, mise en production).",
    bullets: ['Algorithmes, features', 'Monitoring et évolution des modèles'],
  },
  'Analyste de données': {
    summary: "L'analyste de données exploite les données pour produire des tableaux de bord et des analyses métier.",
    bullets: ['Requêtes, agrégations', 'Reporting et visualisation'],
  },
  'Data analyst': {
    summary: 'Le data analyst transforme les données en indicateurs et insights pour orienter les décisions.',
    bullets: ['SQL, BI, statistiques', 'Présentation des résultats'],
  },
  'Architecte data': {
    summary: "L'architecte data définit l'organisation des flux et plateformes de données (sources, cibles, gouvernance).",
    bullets: ['Schémas, intégration', 'Sécurité et conformité'],
  },
  'Ingénieur ML ops': {
    summary: "L'ingénieur ML ops assure le déploiement et l'exploitation des modèles de ML en production.",
    bullets: ['Pipeline, monitoring', 'Versioning et re-entraînement'],
  },
  'Expert NLP': {
    summary: "L'expert NLP (traitement du langage naturel) conçoit des systèmes qui comprennent et génèrent du texte.",
    bullets: ['Modèles de langue', 'Applications (chatbots, traduction, etc.)'],
  },
  'Computer vision engineer': {
    summary: 'Le computer vision engineer développe des systèmes qui analysent images et vidéos (détection, reconnaissance).',
    bullets: ['Deep learning, caméras', 'Industrie, santé, retail'],
  },
  'Data steward': {
    summary: 'Le data steward assure la qualité, la cohérence et la gouvernance des données (définitions, règles).',
    bullets: ['Catalogage, conformité', 'Sensibilisation des métiers'],
  },
  'Chief data officer': {
    summary: 'Le chief data officer pilote la stratégie données (gouvernance, valorisation, conformité).',
    bullets: ['Vision data', 'Équipes et partenariats'],
  },
  'Analyste business intelligence': {
    summary: "L'analyste business intelligence conçoit des tableaux de bord et rapports pour le pilotage métier.",
    bullets: ['ETL, modèles dimensionnels', 'Outils BI (Power BI, Tableau, etc.)'],
  },
  'Développeur data': {
    summary: 'Le développeur data écrit le code des pipelines, traitements et APIs liés aux données.',
    bullets: ['Python, Spark, SQL', 'Tests et déploiement'],
  },
  'Ingénieur data pipeline': {
    summary: "L'ingénieur data pipeline conçoit les flux d'ingestion et de transformation des données.",
    bullets: ['Orchestration, temps réel', 'Fiabilité et rejeu'],
  },
  'Data quality manager': {
    summary: 'Le data quality manager définit et contrôle la qualité des données (règles, indicateurs, corrections).',
    bullets: ['Métriques, alertes', 'Remédiation et processus'],
  },
  'Statisticien data': {
    summary: 'Le statisticien data applique les méthodes statistiques pour l’analyse et la modélisation des données.',
    bullets: ['Échantillonnage, tests', 'Interprétation et communication'],
  },
  'Consultant data': {
    summary: 'Le consultant data accompagne les entreprises sur la stratégie données, l’analyse ou la mise en œuvre.',
    bullets: ['Audits, recommandations', 'Projets et formation'],
  },
  'Responsable data': {
    summary: 'Le responsable data pilote l’équipe data (scientists, engineers) et la roadmap données.',
    bullets: ['Priorisation, livrables', 'Recrutement et partenariats'],
  },
  'Ingénieur deep learning': {
    summary: "L'ingénieur deep learning conçoit et optimise des réseaux de neurones (vision, NLP, recommandation).",
    bullets: ['Frameworks (TensorFlow, PyTorch)', 'Optimisation et déploiement'],
  },
  'Data product manager': {
    summary: 'Le data product manager définit les produits et fonctionnalités basés sur la donnée (priorisation, roadmap).',
    bullets: ['Métriques produit', 'Lien data / métier'],
  },
  'Analyste décisionnel': {
    summary: "L'analyste décisionnel produit des analyses et rapports pour éclairer les décisions stratégiques et opérationnelles.",
    bullets: ['KPI, tableaux de bord', 'Présentation et recommandations'],
  },
  'Ingénieur feature store': {
    summary: "L'ingénieur feature store conçoit et opère le stockage des features pour l'entraînement et l'inférence ML.",
    bullets: ['Réutilisation des features', 'Versioning et performance'],
  },
  'Spécialiste data governance': {
    summary: 'Le spécialiste data governance définit les règles, rôles et processus pour une utilisation maîtrisée des données.',
    bullets: ['Politiques, conformité RGPD', 'Sensibilisation'],
  },
  'Data architect': {
    summary: 'Le data architect conçoit l’architecture des systèmes de données (modèles, flux, technologies).',
    bullets: ['Schémas, intégration', 'Évolutivité et coûts'],
  },
  'Ingénieur data platform': {
    summary: "L'ingénieur data platform construit et maintient la plateforme data (ingestion, stockage, services).",
    bullets: ['Cloud, open source', 'APIs et self-service'],
  },
  'Scientifique des données': {
    summary: 'Le scientifique des données combine statistiques, ML et domaine métier pour extraire de la valeur des données.',
    bullets: ['Expérimentations', 'Publication et transfert'],
  },
  'Ingénieur IA': {
    summary: "L'ingénieur IA conçoit et déploie des systèmes d'intelligence artificielle (modèles, APIs, intégration).",
    bullets: ['ML, NLP, vision', 'Mise en production'],
  },
  'Expert data visualization': {
    summary: "L'expert data visualization conçoit des visualisations et tableaux de bord pour rendre les données lisibles et actionnables.",
    bullets: ['Design, interactivité', 'Outils et bonnes pratiques'],
  },
  'Responsable analytics': {
    summary: 'Le responsable analytics pilote les analyses et la mesure (web, produit, marketing) pour la décision.',
    bullets: ['KPI, rapports', 'Équipe et outils'],
  },
  'Ingénieur data science': {
    summary: "L'ingénieur data science met en production les modèles et pipelines de data science (ML, statistiques).",
    bullets: ['Code, tests, déploiement', 'Collaboration avec les data scientists'],
  },
};

/** Noms de secteurs pour le fallback (aligné jobsBySector SECTOR_IDS). */
const SECTOR_DISPLAY_NAMES: Record<string, string> = {
  ingenierie_tech: 'Ingénierie & Tech',
  creation_design: 'Création & Design',
  business_entrepreneuriat: 'Business & Entrepreneuriat',
  sante_bien_etre: 'Santé & Bien-être',
  droit_justice_securite: 'Droit, Justice & Sécurité',
  defense_securite_civile: 'Défense & Sécurité civile',
  education_formation: 'Éducation & Formation',
  sciences_recherche: 'Sciences & Recherche',
  data_ia: 'Data & IA',
  industrie_artisanat: 'Industrie & Artisanat',
  environnement_agri: 'Environnement & Agri',
  communication_media: 'Communication & Médias',
  finance_assurance: 'Finance & Assurance',
  sport_evenementiel: 'Sport & Événementiel',
  social_humain: 'Social & Humain',
  culture_patrimoine: 'Culture & Patrimoine',
};

/**
 * Retourne la description (summary + bullets) pour un titre de métier canonique.
 * Si absent du dictionnaire, retourne null (ResultJob utilisera un fallback par secteur).
 */
export function getJobDescription(jobTitle: string): JobDescription | null {
  if (!jobTitle || typeof jobTitle !== 'string') return null;
  const key = jobTitle.trim();
  return JOB_DESCRIPTIONS[key] ?? null;
}

/**
 * Retourne le nom affiché du secteur pour les fallbacks.
 */
export function getSectorDisplayName(sectorId: string): string {
  return SECTOR_DISPLAY_NAMES[sectorId ?? ''] ?? sectorId ?? 'Secteur';
}
