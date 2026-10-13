# travaux-maison — consignes pour Claude

Ce dépôt est **l'espace de travail pour tout ce qui touche au travail à la maison** :
la page d'entrée des élèves, le catalogue des travaux, et les pages de travaux qui ne
prolongent aucune application. L'enseignant (Grégoire) ouvre une session ici chaque fois
qu'il veut ajouter ou modifier un travail. Il écrit en français ; réponds en français.

Publié sur GitHub Pages : `https://gregoirelecossois.github.io/travaux-maison/`.
Lien des élèves, le même toute l'année : `https://gregoirelecossois.github.io/travaux-maison/?c=CODE`
(le CODE de l'établissement s'affiche dans la page de suivi enseignant).

## Les trois dépôts en jeu

| Dépôt (dossier local voisin) | Ce qu'on y touche pour le travail à la maison |
|---|---|
| `travaux-maison` (ici) | `index.html` (entrée), `catalogue.js`, `commun/`, un dossier par travail |
| `../Atelier-informatique` | le serveur (`api/server.js`, `api/README.md` § 4 bis) et la page de suivi enseignant `travail-maison.html`. **On n'y touche pas pour ajouter un travail.** |
| `../Le-PC` | la page « Le PC à la maison » (`maison.html`, `src/maison/`), travail `pc-1` |

Les deux dépôts voisins sont déclarés dans `.claude/settings.local.json`
(`additionalDirectories`) : ils sont accessibles depuis cette session.

## Ajouter un travail — la marche à suivre

La compétence **`devoir-maison`** (`.claude/skills/devoir-maison/SKILL.md`) dit comment
fabriquer le contenu à partir des séances (dossiers `sequences-*-erea`), quels visuels
reprendre, et comment tester. La lire à chaque demande de devoir.

1. **Où va la page ?**
   - Sciences, Atelier informatique, ou tout travail autonome → **ici**, dans un dossier
     `<id>/index.html` (ex. `sciences-eau-1/index.html`). Partir de `_modele/index.html`.
   - Travail qui prolonge le jeu **Le PC** (réutilise ses modèles 3D, ses sons) → dans
     `../Le-PC`, sur le modèle de `src/maison/` (React + Vite, `npm run typecheck`).
2. **Choisir l'identifiant** `id` : `[a-z0-9-]`, 30 caractères au plus (`sciences-eau-1`).
   Il range les résultats sur le serveur : **ne jamais le renommer** une fois distribué.
3. **Écrire la page** (cas « ici ») :
   - charger `../config.js`, `../commun/maison.js` puis `../commun/jeux.js`, et
     `../commun/maison.css` + `../commun/jeux.css` ;
   - `Jeux.lancer({ devoir: '<id>', titre, ic, duree, missions: [...] })` : une mission
     = une étape du catalogue (même `id`, même nombre, même ordre). Le moteur appelle
     `Maison.travail()`, garde le meilleur score, renvoie vers l'entrée sans élève, met
     le lien « ‹ Mes révisions ». Format des missions et des jeux : en tête de
     `commun/jeux.js` ;
   - une page qui n'utilise pas le moteur doit faire tout cela elle-même avec
     `Maison.travail()` (voir l'en-tête de `commun/maison.js`).
   - Mode professeur (`?prof=1`, bouton « ▶ Essayer » de la page de suivi) : `maison.js`
     s'en charge (élève « Prof », rien d'envoyé ni de gardé, `suivi.entree` ramène au
     suivi). Ne rien verrouiller quand `suivi.prof`. L'enseignant n'a qu'une page : le suivi.
   - Public : élèves de collège en **enseignement adapté (SEGPA/EREA)**, sur **téléphone**.
     Phrases courtes, vocabulaire simple, gros boutons, une chose à la fois, 15-20 min en
     tout. Pas de saisie de texte libre (les données sont lues par le prof, RGPD).
   - Images : dans le dossier du travail, légères (webp/jpg, < 200 Ko chacune).
4. **Déclarer le travail dans `catalogue.js`** (en tête du tableau : le plus récent en
   premier) : `id, titre, ic, matiere, niveaux, duree, resume, url, etapes`. `url` absolue,
   sans `?c=` : `https://gregoirelecossois.github.io/travaux-maison/<id>/`.
5. **Essayer en local** (voir plus bas) : parcours complet, sur un écran de téléphone
   (375 px de large).
6. **Publier, dans cet ordre** : la page d'abord, l'entrée du catalogue ensuite — sinon
   la tuile apparaît chez les élèves et mène à une page introuvable. Si tout est dans ce
   dépôt, un seul commit suffit (les deux partent ensemble). Si la page est dans Le-PC :
   pousser Le-PC, attendre son déploiement (GitHub Actions), puis pousser le catalogue.

Rien à changer sur le serveur pour un nouveau travail : il range tout identifiant.
Les classes à qui va un travail se changent ensuite d'un clic dans la page de suivi
(« Pour quelles classes ? ») ; `niveaux` n'est que la valeur par défaut.

## Essayer sans toucher aux vraies données

```
node outils/essai.mjs        → http://localhost:8790/?c=essai123
```

Sert ce dépôt avec une **fausse API en mémoire** (faux élèves : Léa Martin, Léa Moreau,
Tom Durand en 5e ; Inès Bernard en 3e). `GET /__etat` montre ce que la page a envoyé.
Configuration de prévisualisation : `travaux-maison-essai` (dans `.claude/launch.json`
ici et dans celui du dossier parent `Applications-web`). **Ne jamais tester contre le
vrai serveur** : il contient de vraies données d'élèves.

- `outils/robot.js` : joue toutes les missions d'une page au hasard pour vérifier
  qu'aucune ne bloque (`await import('/outils/robot.js'); Robot.toutJouer()`).
- `outils/images.js` : convertit les images des séances en webp léger, écrites dans le
  dépôt par le serveur d'essai (route `POST /__image`, locale). Sources dans `_images/`
  (ignoré par git, non publié).

## Règles à ne pas casser

- **Clés `localStorage` partagées** entre toutes les pages du domaine
  `gregoirelecossois.github.io` : `maison_eleve_v1`, `maison_avancees_v1`,
  `maison_appareil_v1`, `maison_attributions_v1`. Ne pas en changer le format sans
  adapter `index.html`, `commun/maison.js` ET `../Le-PC/src/maison/suivi.ts`.
  Dans `maison_eleve_v1`, `prenom` reste celui que l'élève a tapé (les pages s'en servent
  pour le reconnaître) ; le compte confirmé est dans `compte`, « Léa M. » dans `nom`.
- **Pas de CDN, pas de Google Fonts** : polices servies en local (`commun/fonts/`), sinon
  l'adresse IP des élèves part chez un tiers.
- **Données personnelles** : n'envoyer au serveur que ce que la route `/api/devoir/passage`
  accepte déjà (prénom tapé, classe, étapes, score). Toute nouvelle donnée collectée doit
  être reportée dans les documents RGPD de l'établissement : le signaler à l'enseignant.
- `_modele/` et les fichiers listés dans `_config.yml` ne sont **pas publiés**.
- Les identifiants déjà distribués : `pc-1`, `pc-peripheriques`, `pc-fichiers`, `ia-1`,
  `lumiere-1`, `nerveux-1`.
- Images publiées : seulement des visuels faits pour les séances, des photos du jeu
  Le PC ou du domaine public — jamais des documents de manuels ni des banques d'images
  (les pages sont publiques). Sinon, redessiner en SVG.

## Git

Commits en français, à l'impératif présent comme dans l'historique des autres dépôts
(« Travail à la maison : … »). Ne pousser qu'avec l'accord de l'enseignant.
