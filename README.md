# Travaux à la maison

Des révisions sur téléphone, que les élèves font chez eux, et dont l'enseignant suit
l'avancée dans l'Atelier informatique (`travail-maison.html`).

**Le lien à donner aux élèves, le même toute l'année :**

```
https://gregoirelecossois.github.io/travaux-maison/?c=CODE
```

`CODE` est le code de l'établissement : la page de suivi enseignant affiche le lien
complet, avec un bouton « Copier ». L'ancienne adresse
(`atelier-informatique/maison.html?c=CODE`) renvoie ici.

## Ce que voit l'élève

1. **Qui es-tu ?** Son prénom et sa classe, une seule fois sur ce téléphone.
2. **Es-tu bien Léa M. ?** Si un compte de l'Atelier porte ce prénom dans cette classe.
   Oui : son travail est rangé sous son compte, et il le retrouve sur un autre téléphone.
   Non, ou personne : il continue sous son prénom, l'enseignant le reliera dans le suivi.
3. **Ses devoirs**, rangés en « À faire » et « Déjà fait ». Tout est fait : « Bravo, tu es
   à jour », et il peut quand même rouvrir un travail pour le refaire.

Pas de mot de passe : à la maison, un mot de passe oublié est un devoir non fait.

## Ce qu'il y a ici

| Fichier | Rôle |
|---|---|
| `index.html` | la page d'entrée des élèves |
| `catalogue.js` | la liste des travaux — lue aussi par la page de suivi de l'Atelier |
| `config.js` | l'adresse du serveur de l'Atelier |
| `commun/maison.js` | ce que toute page de travail partage : lire l'élève, garder et envoyer l'avancée |
| `commun/maison.css`, `commun/fonts/` | l'allure commune, polices servies en local |
| `commun/jeux.js`, `commun/jeux.css` | le moteur des travaux : missions, leçons, mini-jeux, étoiles |
| `<id>/` | un travail : `pc-peripheriques`, `pc-fichiers` (5e, 3e), `ia-1`, `lumiere-1` (4e), `nerveux-1` (3e) |
| `_modele/` | une page de travail à copier pour en créer une nouvelle (non publiée) |
| `outils/essai.mjs` | serveur d'essai local avec une fausse API (non publié) |
| `outils/robot.js`, `outils/images.js` | tester une page en jouant au hasard ; préparer les images (non publiés) |

Les pages de travaux vivent ici, un dossier par travail — sauf celles qui prolongent une
application : « Le PC à la maison » (`pc-1`) est publiée par le dépôt `le-pc`.

## Ajouter un travail

Voir `CLAUDE.md` : la marche à suivre pas à pas, et la compétence Claude
`.claude/skills/devoir-maison/` pour fabriquer le contenu à partir des séances. En bref : écrire la page (à partir de
`_modele/`), l'ajouter à `catalogue.js`, essayer avec `node outils/essai.mjs`, publier.
Rien à changer sur le serveur. Les classes à qui va le travail se choisissent ensuite
d'un clic dans la page de suivi.

## Le serveur

Celui de l'Atelier informatique : voir `api/README.md` § 4 bis dans le dépôt
`atelier-informatique` (routes `/api/devoir/*`, données enregistrées, durées de
conservation, RGPD).
