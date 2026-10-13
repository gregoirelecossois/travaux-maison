/* Robot de test des pages de travail (commun/jeux.js) — NON publié (outils/ est exclu).
 *
 * Avec le serveur d'essai (node outils/essai.mjs), ouvrir une page en mode professeur,
 * par exemple http://localhost:8790/lumiere-1/?prof=1, puis dans la console :
 *
 *     await import('/outils/robot.js')
 *     Robot.toutJouer()          // joue TOUTES les missions au hasard, jusqu'au bout
 *     Robot.resultat             // … quelques secondes plus tard : scores, blocages, erreurs
 *     await Robot.jusqua(2, '.paires')   // mission 3, jusqu'au premier jeu « paires »
 *
 * Il répond au hasard : il vérifie que chaque mission se termine sans blocage ni erreur,
 * pas que les réponses sont justes (ça, c'est la relecture du contenu).
 * Un jeu « perso » nouveau ? Lui apprendre à jouer dans Robot.perso ci-dessous.
 */
(function(){
  'use strict';
  var dormir = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var erreurs = [];
  window.addEventListener('error', function(e){ erreurs.push(e.message); });

  /* Les jeux « perso » connus. Renvoie true s'il a joué un coup. */
  function perso(){
    if(document.querySelector('.feuille')) return false;
    /* La lampe et l'ombre (lumiere-1) */
    var v = document.querySelector('.labo') && document.querySelector('.valider');
    if(v){
      var r = document.querySelector('.curseur input');
      r.value = Math.random() < .5 ? Math.random() * 15 : 85 + Math.random() * 15;
      r.dispatchEvent(new Event('input')); v.click(); return true;
    }
    /* Le temps de réaction (nerveux-1) */
    var g = document.querySelector('.gros-rond');
    if(g){
      if(/TOUCHE|commencer/.test(g.textContent)) setTimeout(function(){ g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, 150);
      return true;
    }
    return false;
  }

  function unCoup(){
    var f = document.querySelector('.feuille .btn'); if(f){ f.click(); return; }
    var s = document.querySelector('.lecon') && document.querySelector('.suite'); if(s){ s.click(); return; }
    if(perso()) return;
    var c = Array.prototype.filter.call(document.querySelectorAll(
      '.zone-jeu .bac:not(:disabled), .zone-jeu .rep:not(:disabled), .explo-liste button:not(.rate), .explo-retour:not(:disabled), .zone-jeu [data-robot]'),
      function(b){ return !b.classList.contains('bon'); });
    if(c.length) c[Math.floor(Math.random() * c.length)].click();
  }

  async function versCarte(){
    if(document.querySelector('.missions')) return;
    var q = document.querySelector('.carte-btn, .quitter'); if(q) q.click();
    await dormir(200);
  }

  var Robot = {
    resultat: null,
    perso: perso,
    toutJouer: async function(){
      Robot.resultat = null;
      await versCarte();
      var res = [], n = document.querySelectorAll('[data-m]').length;
      for(var m = 0; m < n; m++){
        document.querySelectorAll('[data-m]')[m].click();
        var ok = false;
        for(var pas = 0; pas < 1200; pas++){
          await dormir(110);
          if(document.querySelector('.fin-mission')){ res.push((m + 1) + ' : ' + document.querySelector('.score-fin').textContent); ok = true; break; }
          unCoup();
        }
        if(!ok) res.push((m + 1) + ' : BLOQUÉ — ' + document.querySelector('#ecran').innerText.slice(0, 200));
        await versCarte();
      }
      Robot.resultat = { missions: res, erreurs: erreurs.slice(), total: (document.querySelector('.total') || {}).textContent };
      return Robot.resultat;
    },
    jusqua: async function(m, selecteur){
      await versCarte();
      document.querySelectorAll('[data-m]')[m].click();
      for(var i = 0; i < 400; i++){
        await dormir(120);
        if(document.querySelector(selecteur) && !document.querySelector('.feuille')) return 'ok';
        unCoup();
      }
      return 'pas trouvé';
    }
  };
  window.Robot = Robot;
})();
