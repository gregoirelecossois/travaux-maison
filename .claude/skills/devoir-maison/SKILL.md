---
name: devoir-maison
description: Créer ou modifier un devoir « travail à la maison » pour les élèves de Grégoire (SEGPA/EREA, sur téléphone) à partir de ce qui a été fait en classe — séances, leçons, exercices, schémas des dossiers sequences-technologie-erea et sequences-sciences-erea. À utiliser dès qu'il demande un devoir, un travail à la maison, des révisions, un rappel ou un quiz pour une classe (5e, 4e, 3e…), même sans dire « skill ».
---

# Devoir à la maison — la marche à suivre

Lire d'abord `CLAUDE.md` (règles du dépôt : identifiants, catalogue, RGPD, publication).
Cette compétence dit **comment fabriquer le contenu** d'un devoir.

## Les exigences de Grégoire (non négociables)

- **Court** : 15 minutes au plus par devoir, sauf s'il demande autre chose. Compter
  ~10 s par carte de tri ou question, ~30 s par carte de leçon. Viser 25 à 40 points.
- **Gamifié, ludique** : des missions, des étoiles, des séries 🔥, des jeux variés
  (pas deux fois le même type de jeu d'affilée), au moins un jeu « perso » quand le
  sujet s'y prête (une manip, une simulation, un défi chronométré).
- **Peu de texte** : phrases courtes, mots simples, une idée par carte, **gras** sur
  les mots de la leçon. Public : collège en enseignement adapté, lecteurs fragiles.
- **Smartphone** : tester à 375 px de large. Gros boutons, rien à saisir au clavier.
- **Fidèle aux séances** : reprendre le vocabulaire, les leçons (« Je retiens »), les
  exemples, les corrigés et **les schémas et visuels des séances** — c'est important
  pour lui. Internet en complément seulement.

## 1. Trouver ce qui a été fait

Les séquences sont dans `C:\Users\gleco\Documents\` (demander l'accès s'il manque) :

- `sequences-technologie-erea\<niveau>\<niveau> - Séquence N - <titre>\` : un dossier
  par séance (`S2 - …`) avec `S1_Seance_2_Slides.pptx` (ou `A projeter.pptx`),
  `…_Fiche_eleve.docx`, `…_Corrige.docx`, `…_Preparation.docx`, `…_Annexes.docx` ; à la
  racine : `S1_Fiche_de_progression.docx`, `S1_Fiche_vocabulaire_illustree.docx`,
  `S1_Fiche_de_revision.docx`, `S1_Annexes_enseignant.docx`.
- `sequences-sciences-erea\SCIENCES <niveau>\Séquence N - <titre>\` : dossiers
  `Séance N - …` (noms moins réguliers, parfois `Données pour progression\`), et pour
  certaines un dossier `illustrations\` (PNG + SVG sources faits pour la séquence).

Extraire le texte dans le dossier temporaire de la session (pandoc lit docx ET pptx) :

```bash
pandoc "fichier.pptx" -t plain --wrap=none -o "$SCRATCH/txt/nom.md"
```

Lire dans cet ordre : la **progression** (où en est la classe, objectifs par séance),
les **diapositives** (« Rappel », « Je retiens », leçon, vocabulaire, corrigés de mise
en commun), le **corrigé** de la fiche élève (exercices et réponses), les **annexes**
(cartes à trier, étapes à remettre en ordre : du contenu de jeu tout prêt).
Ne prendre que les séances **déjà faites** que Grégoire indique.

Extraire les images : `unzip -o -q -j fichier.pptx 'ppt/media/*' 'word/media/*' -d "$SCRATCH/media/x"`,
puis les regarder (outil Read) avant de choisir.

## 2. Les visuels : lesquels ont le droit d'être publiés

Les pages sont **publiques** (GitHub Pages). Avant de reprendre une image :

- ✅ schémas faits par/pour Grégoire (style sobre, couleurs unies, souvent générés par
  script : chaîne d'information, explorateur, arborescence, trajet muet, cône d'ombre),
  images générées pour ses séances, photos des modèles 3D du jeu « Le PC » ;
- ✅ œuvres du domaine public (gravures anciennes : lapin-canard…) ;
- ❌ documents de manuels (Lelivrescolaire, Hachette… : cadres « Doc. 1 », typo de
  manuel), banques d'images (iStock, Vecteezy, Shutterstock), photos de constructeurs.
  → **Redessiner en SVG** dans la page (simple, même idée) ou utiliser un emoji.

Un schéma large (paysage) est illisible sur téléphone : le **redessiner en colonne**
(SVG dans la page) ou le rendre **manipulable** (explorateur où l'on ouvre les dossiers,
lampe qu'on déplace…). Un schéma à légender : en faire une version **muette**
(`masquer`) pour le jeu `legende`.

Conversion (webp, < 200 Ko, souvent 10-50 Ko) avec `outils/images.js` — mode d'emploi
en tête du fichier : sources copiées dans `_images/` (ignoré), serveur d'essai lancé,
`Images.convertir(source, destination, { largeur, recadrer, masquer, rogner })` dans la
console du navigateur. Supprimer `_images/` à la fin.

## 3. Écrire la page

Copier `_modele/index.html` dans `<id>/index.html`. La page ne contient que du
contenu : `Jeux.lancer({ devoir, titre, ic, duree, missions: [...] })`. Le moteur
`commun/jeux.js` fait tout le reste (élève, envoi, mode prof, étoiles, voix 🔊).
**Lire l'en-tête de `commun/jeux.js`** : format des missions, des visuels et des jeux.

- 3 à 5 **missions** = les étapes du catalogue. Chacune : 1 à 3 cartes de leçon
  (reprises de « Je retiens »), puis 1 à 3 jeux.
- Jeux disponibles : `qcm`, `vf`, `eclair` (vrai/faux chronométré), `tri` (2 à 4 bacs),
  `ordre`, `paires`, `legende` (repères sur un schéma), `perso` (jeu sur mesure).
- Toujours une **explication** courte sur les erreurs (`explication`, `pourquoi`) :
  c'est là que l'élève apprend. `toujours: true` pour l'afficher même si c'est juste
  (pourcentages du LLM, illusions…).
- Pas de pronom qui trahit la réponse (« Il… » / « Elle… ») dans les choix.
- Commentaire en tête de page : séquence, séances, leçons couvertes, d'où viennent les
  visuels.
- Exemples à imiter : `pc-peripheriques/` (images du jeu Le PC), `pc-fichiers/`
  (explorateur manipulable), `lumiere-1/` (lampe et ombres, tache aveugle, schéma
  muet), `nerveux-1/` (temps de réaction, illusions), `ia-1/` (tri des cartes de
  l'annexe, « Sois le LLM »).

Nouveau type de jeu utile à plusieurs devoirs ? L'ajouter à `commun/jeux.js` (et
`jeux.css`) plutôt qu'en `perso`, et le documenter dans son en-tête.

## 4. Déclarer, essayer, publier

1. `catalogue.js` : en tête, `etapes` = noms des missions dans l'ordre (même nombre !).
   `niveaux` par défaut ; dans un même niveau, l'ordre du tableau est l'ordre des
   tuiles : mettre d'abord ce qui se fait d'abord.
2. Essayer avec le serveur d'essai (`travaux-maison-essai`, port 8790) :
   - `http://localhost:8790/<id>/?prof=1` en 375×812 ;
   - console : `await import('/outils/robot.js'); Robot.toutJouer()` puis
     `Robot.resultat` — chaque mission doit finir, sans erreur. Un jeu `perso` nouveau :
     apprendre au robot à y jouer (`Robot.perso` dans `outils/robot.js`) ;
   - regarder chaque type d'écran (`await Robot.jusqua(m, '.schema')`, capture) : repères
     bien placés, bulles qui ne se chevauchent pas, images lisibles ;
   - parcours élève réel : `http://localhost:8790/?c=essai123`, élève de test du
     serveur d'essai, puis `/__etat` : le passage est arrivé.
   - **Jamais** contre le vrai serveur, jamais en cliquant une tuile (elle mène au site réel).
3. Commit en français (« Travail à la maison : … »). Pousser seulement avec l'accord
   de Grégoire. Ajouter les nouveaux identifiants à la liste de `CLAUDE.md`.
4. Lui rendre compte : pour chaque devoir, les missions, la durée estimée, d'où vient
   le contenu, et ce qui pourrait être à vérifier (une réponse discutable, un visuel
   redessiné).
