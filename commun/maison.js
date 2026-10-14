/* Le suivi d'un travail à la maison — à charger par CHAQUE page de travail de ce dépôt,
 * après ../config.js :
 *
 *     <script src="../config.js"></script>
 *     <script src="../commun/maison.js"></script>
 *     var suivi = Maison.travail({ devoir: 'sciences-1', etapes: 4, max: 40 });
 *
 *   devoir   l'identifiant du travail, LE MÊME que son `id` dans catalogue.js
 *   etapes   le nombre d'étapes — le même que la longueur de `etapes` dans catalogue.js
 *   max      le score maximal du travail entier (la somme des maxima des étapes)
 *
 * Ce que la page en reçoit :
 *   suivi.eleve        { prenom, classe, compte, nom } donné par la page d'entrée, ou null
 *                      si l'élève n'y est pas passé, ou s'il n'a pas de code (lien sans
 *                      « ?c=… ») : la page l'y renvoie (suivi.entree), qui lui dit de
 *                      demander le bon lien. Il n'y a pas de « mode entraînement ».
 *   suivi.actif        true : le professeur verra ce travail (dès qu'il y a un élève ;
 *                      jamais en mode professeur).
 *   suivi.entree       l'adresse de la page d'entrée, pour le bouton « Mes révisions ».
 *   suivi.scores       le meilleur score de chaque étape ; -1 = pas encore faite.
 *   suivi.terminer(i, score)   l'étape i (0, 1, 2…) est faite avec ce score. On garde le
 *                      MEILLEUR essai : refaire une étape ne fait jamais baisser le score.
 *   suivi.etapesFaites(), suivi.scoreTotal()
 *   suivi.envoi        'attente' | 'envoye' | 'refuse' ('entrainement' : seulement sans élève)
 *   suivi.prof         true : le professeur essaie la page (« ?prof=1 ») — voir plus bas.
 *   suivi.surChangement(fn)    rappelé à chaque changement de scores ou d'envoi.
 *
 * Ce que fait ce fichier, pour que chaque page n'ait pas à le refaire :
 *  - il relit l'élève rangé par la page d'entrée (maison_eleve_v1) ;
 *  - il garde l'avancée sur le téléphone (maison_travail_<devoir>_v1) pour reprendre là
 *    où l'élève s'était arrêté ;
 *  - il dit l'état COMPLET au serveur (POST /api/devoir/passage) à chaque étape. Un envoi
 *    perdu (tunnel, mode avion) n'a aucune conséquence : le suivant le remplace, et un
 *    envoi en attente repart dès que le réseau revient ou que l'élève rouvre la page ;
 *  - il écrit l'avancée dans maison_avancees_v1, pour la tuile de la page d'entrée.
 *
 * MODE PROFESSEUR (« ?prof=1 » dans l'adresse, posé par le bouton « Essayer » de la page
 * de suivi) : l'élève est « Prof », rien ne part au serveur et rien n'est gardé sur
 * l'appareil — ni l'élève éventuellement rangé là, ni son avancée ne sont touchés.
 * Recharger la page, c'est tout recommencer. suivi.entree ramène alors au suivi, sur la
 * fiche du travail.
 *
 * C'est la version sans outil de src/maison/suivi.ts du dépôt le-pc : les deux disent la
 * même chose au serveur, de la même façon.
 */
(function(){
  'use strict';

  var CLE_ELEVE = 'maison_eleve_v1';
  var CLE_AVANCEES = 'maison_avancees_v1';
  var PRENOM_OK = /^\p{L}[\p{L} '’-]{0,23}$/u;

  var cfg = window.ATELIER_CONFIG || {};
  var API = String(cfg.api || '').replace(/\/+$/, '');

  function lire(cle){ try{ return JSON.parse(localStorage.getItem(cle) || 'null'); }catch(e){ return null; } }
  function ecrire(cle, v){ try{ if(v == null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(v)); }catch(e){} }
  function memeOrigine(adresse){ try{ return new URL(adresse).origin === location.origin; }catch(e){ return false; } }
  function nouvelId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var o = new Uint8Array(16); crypto.getRandomValues(o);
    return Array.prototype.map.call(o, function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  /* ---- L'élève, tel que la page d'entrée l'a rangé ---- */
  var PROF = new URLSearchParams(location.search).has('prof');
  var e = PROF ? null : lire(CLE_ELEVE);
  var eleve = PROF ? { prenom: 'Prof', classe: '', compte: null, nom: '', appareil: '' }
    : e && typeof e.prenom === 'string' && PRENOM_OK.test(e.prenom) && typeof e.classe === 'string' && e.classe
    ? { prenom: e.prenom, classe: e.classe,
        compte: Number.isInteger(e.compte) && e.compte > 0 ? e.compte : null,
        nom: typeof e.nom === 'string' ? e.nom : '',
        appareil: /^[A-Za-z0-9-]{16,64}$/.test(String(e.appareil || '')) ? String(e.appareil) : '' }
    : null;
  var CODE = ((new URLSearchParams(location.search).get('c') || '').trim() || (e && e.code) || '').toLowerCase();
  var SUIVI = !PROF && !!API && /^[a-z0-9]{6,16}$/.test(CODE);
  /* Pas de code : pas d'élève, la page renvoie à l'entrée qui dit de demander le bon lien. */
  if(!PROF && !SUIVI) eleve = null;
  /* La page d'entrée : celle que l'élève a ouverte, sinon la racine de ce dépôt. */
  var SUIVI_PROF = 'https://gregoirelecossois.github.io/atelier-informatique/travail-maison.html';
  var ENTREE = e && memeOrigine(String(e.entree || '')) ? String(e.entree)
    : new URL('../', document.currentScript ? document.currentScript.src : location.href).href;
  if(CODE && ENTREE.indexOf('?') < 0) ENTREE += '?c=' + encodeURIComponent(CODE);

  /* « Léa » et « LÉA » : le même élève ; « Léa » puis « Tom » : un autre. */
  function memeEleve(a, b){
    return a.prenom.toLocaleLowerCase('fr') === b.prenom.toLocaleLowerCase('fr') && a.classe === b.classe;
  }

  function travail(o){
    var devoir = String(o.devoir), etapes = Number(o.etapes), max = Number(o.max) || 0;
    var cle = 'maison_travail_' + devoir + '_v1';
    var vide = function(){ var s = []; for(var i = 0; i < etapes; i++) s.push(-1); return s; };

    /* Si quelqu'un d'autre s'est déclaré sur la page d'entrée depuis (« Ce n'est pas
       toi ? »), l'avancée gardée ici n'est pas la sienne : il repart de zéro, et la
       ligne du précédent reste chez le professeur. */
    var g = PROF ? null : lire(cle), etat;
    if(eleve && g && typeof g.id === 'string' && Array.isArray(g.scores) && memeEleve(g, eleve)){
      etat = { id: g.id, scores: vide().map(function(_, i){ return Number.isFinite(g.scores[i]) ? Number(g.scores[i]) : -1; }) };
    } else {
      etat = { id: nouvelId(), scores: vide() };
    }

    var ecouteurs = [];
    var suivi = {
      eleve: eleve ? { prenom: eleve.prenom, classe: eleve.classe, compte: eleve.compte, nom: eleve.nom } : null,
      actif: SUIVI && !!eleve,
      prof: PROF,
      entree: PROF ? SUIVI_PROF + '#' + encodeURIComponent(devoir) : ENTREE,
      scores: etat.scores,
      envoi: SUIVI && eleve ? 'attente' : 'entrainement',
      etapesFaites: function(){ return etat.scores.filter(function(s){ return s >= 0; }).length; },
      scoreTotal: function(){ return etat.scores.reduce(function(n, s){ return n + Math.max(0, s); }, 0); },
      surChangement: function(fn){ ecouteurs.push(fn); },
      terminer: function(i, score){
        if(!(i >= 0 && i < etapes)) return;
        etat.scores[i] = Math.max(etat.scores[i], Math.max(0, Number(score) || 0));
        aEnvoyer = suivi.actif;
        persister(); changer(); envoyer();
      }
    };
    var aEnvoyer = suivi.actif, enCours = false, aRefaire = false;

    function changer(){ suivi.scores = etat.scores; ecouteurs.forEach(function(fn){ try{ fn(suivi); }catch(x){} }); }

    function persister(){
      if(!eleve || PROF) return;
      ecrire(cle, { id: etat.id, prenom: eleve.prenom, classe: eleve.classe, scores: etat.scores });
      /* Pour la tuile de la page d'entrée : où j'en suis, en quatre nombres. */
      var a = lire(CLE_AVANCEES) || {};
      a[devoir] = { etape: suivi.etapesFaites(), etapes: etapes, score: suivi.scoreTotal(), max: max };
      ecrire(CLE_AVANCEES, a);
    }

    function envoyer(){
      if(!suivi.actif || !aEnvoyer) return;
      if(enCours){ aRefaire = true; return; }   /* celui en cours sera suivi de l'état le plus récent */
      enCours = true;
      fetch(API + '/api/devoir/passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,   /* l'élève peut fermer l'onglet juste après sa dernière réponse */
        body: JSON.stringify({
          c: CODE, id: etat.id, appareil: eleve.appareil || undefined, compte: eleve.compte || undefined,
          devoir: devoir, prenom: eleve.prenom, classe: eleve.classe,
          etape: suivi.etapesFaites(), etapes: etapes, score: suivi.scoreTotal(), max: max
        })
      }).then(function(r){
        if(r.ok){ suivi.envoi = 'envoye'; aEnvoyer = false; }
        else if(r.status >= 500 || r.status === 429) suivi.envoi = 'attente';   /* le serveur peine : on réessaiera */
        else { suivi.envoi = 'refuse'; aEnvoyer = false; }                     /* lien périmé : réessayer n'y changera rien */
      }, function(){ suivi.envoi = 'attente'; })                                /* pas de réseau */
      .then(function(){
        enCours = false; changer();
        if(aRefaire){ aRefaire = false; envoyer(); }
      });
    }

    if(eleve){
      /* Dès l'ouverture : le professeur voit que l'élève a commencé, et la tuile de la
         page d'entrée passe de « Nouveau » à « 0 / 4 ». */
      persister();
      if(SUIVI){
        window.addEventListener('online', envoyer);
        document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') envoyer(); });
        setTimeout(envoyer, 300);
      }
    }
    return suivi;
  }

  window.Maison = { travail: travail };
})();
