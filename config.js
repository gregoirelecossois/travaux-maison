/* L'adresse du serveur de l'Atelier — la même que dans atelier-informatique/scripts/config.js.
 * Aucun secret ici : l'adresse est publique, c'est le serveur qui décide.
 *
 *   api : ''   → mode ENTRAÎNEMENT : les pages marchent, rien n'est envoyé au professeur.
 *
 * Ouvert en file:// (double-clic), rien ne part non plus : le navigateur refuse. */
window.ATELIER_CONFIG = {
  api: 'https://progression-informatique.alwaysdata.net'
};
