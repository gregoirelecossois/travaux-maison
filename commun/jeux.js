/* Le moteur des travaux à la maison : missions, petites leçons et mini-jeux.
 * À charger APRÈS ../config.js et ../commun/maison.js, avec ../commun/jeux.css :
 *
 *     <script src="../config.js"></script>
 *     <script src="../commun/maison.js"></script>
 *     <script src="../commun/jeux.js"></script>
 *     <script>
 *       Jeux.lancer({ devoir: 'sciences-eau-1', titre: 'L’eau', ic: '💧', duree: '12 min',
 *                     missions: [ … ] });
 *     </script>
 *
 * Jeux.lancer() appelle lui-même Maison.travail() avec le bon nombre d'étapes (une
 * mission = une étape du catalogue) et le bon score maximal : la page n'écrit que son
 * CONTENU. Le parcours est celui de « Le PC à la maison » (pc-1) :
 *     la carte des missions → pour chaque mission : 1 à 3 cartes « Je retiens »,
 *     puis ses jeux → ses étoiles. Chaque mission se rejoue ; on garde le meilleur score.
 *
 * UNE MISSION
 *   { nom: 'Entrée ou sortie ?', ic: '🔌', accroche: 'Une phrase.',
 *     lecon: [ { titre, texte, visuel } ],      // 0 à 3 cartes, texte COURT
 *     jeux:  [ { type: …, … }, … ] }            // joués à la suite
 *
 * UN VISUEL (partout où on peut montrer quelque chose)
 *   { img: 'img/ecran.webp', alt: 'Un écran' }   une image du dossier du travail
 *   { svg: '<svg …>…</svg>' }                    un schéma dessiné dans la page
 *   { ic: '🖥️' }                                 un gros emoji
 *   Ajouter  clair: true  pour poser l'image sur un fond blanc (schémas des séances).
 *
 * LES JEUX — chaque bonne réponse du PREMIER coup rapporte 1 point
 *   qcm      { q, visuel?, choix: ['…' | {txt, ic?, img?}], bon: 0, explication?, grille? }
 *   vf       { q, visuel?, vrai: true, explication? }
 *   eclair   { consigne, secondes: 8, items: [{ q, vrai, explication? }] }   vrai/faux chronométré
 *   tri      { consigne, bacs: [{ nom, ic?, couleur? }], cartes: [{ txt, ic?, img?, bac: 0, pourquoi? }] }
 *   ordre    { consigne, visuel?, items: ['premier', 'deuxième', …] }      dans le BON ordre
 *   paires   { consigne, paires: [[gauche, droite], …] }  gauche/droite : '…' ou {txt, ic?, img?}
 *   legende  { consigne, visuel, reperes: [{ x: 12, y: 40, bon: 'la rétine' }], leurres?: ['…'] }
 *            x, y en % de l'image ; on touche le nom du repère qui clignote.
 *            haut: true sur un repère : son nom s'affiche au-dessus (repères serrés)
 *   perso    { max: 3, rendre: function(zone, fin, outils){ … fin(points); } }
 *            un jeu propre au travail (temps de réaction, lampe à déplacer…)
 *
 * Écrire **comme ceci** met en gras. Un bouton 🔊 lit les cartes et les questions à voix
 * haute (synthèse vocale du téléphone) : utile aux élèves qui lisent lentement.
 *
 * Rien n'est saisi au clavier, rien ne part au serveur en dehors de ce que maison.js
 * envoie déjà (étapes faites et score) : pas de nouvelle donnée personnelle.
 */
(function(){
  'use strict';

  /* ------------------------------------------------------------ outils */

  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s){ return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* **gras** et retour à la ligne : tout le reste est échappé. */
  function fmt(s){ return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
  function brut(s){ return String(s == null ? '' : s).replace(/\*\*/g, ''); }
  function melanger(t){
    var a = t.slice();
    for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function choisir(t){ return t[Math.floor(Math.random() * t.length)]; }
  function texteDe(o){ return typeof o === 'string' ? o : (o && o.txt) || ''; }

  function visuel(v, classe){
    if(!v) return '';
    var c = 'visuel' + (v.clair ? ' clair' : '') + (classe ? ' ' + classe : '');
    if(v.img) return '<figure class="' + c + '"><img src="' + esc(v.img) + '" alt="' + esc(v.alt || '') + '" decoding="async"></figure>';
    if(v.svg) return '<figure class="' + c + '" role="img" aria-label="' + esc(v.alt || '') + '">' + v.svg + '</figure>';
    if(v.ic) return '<figure class="' + c + ' emoji" aria-hidden="true">' + esc(v.ic) + '</figure>';
    if(v.html) return '<figure class="' + c + '">' + v.html + '</figure>';
    return '';
  }
  /* Le contenu d'un bouton : emoji ou petite image, puis le texte. */
  function etiquette(o){
    if(typeof o === 'string') return '<span>' + fmt(o) + '</span>';
    return (o.img ? '<img class="mini" src="' + esc(o.img) + '" alt="">' : '') +
      (o.ic ? '<span class="ic" aria-hidden="true">' + esc(o.ic) + '</span>' : '') +
      (o.txt ? '<span>' + fmt(o.txt) + '</span>' : '');
  }

  /* ------------------------------------------------------------ son, voix, vibration */

  var son = (function(){
    var ctx = null, actif = true;
    function notes(liste, type, vol){
      if(!actif) return;
      try{
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if(ctx.state === 'suspended') ctx.resume();
        var t = ctx.currentTime;
        liste.forEach(function(n){
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = type || 'sine'; o.frequency.value = n[0];
          g.gain.setValueAtTime(0.0001, t + n[1]);
          g.gain.exponentialRampToValueAtTime(vol || 0.12, t + n[1] + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + n[2]);
          o.connect(g); g.connect(ctx.destination);
          o.start(t + n[1]); o.stop(t + n[1] + n[2] + 0.02);
        });
      }catch(e){}
    }
    return {
      bon: function(){ notes([[660, 0, .12], [990, .08, .18]]); },
      faux: function(){ notes([[220, 0, .22], [180, .1, .25]], 'triangle', .1);
        if(navigator.vibrate) try{ navigator.vibrate(90); }catch(e){} },
      clic: function(){ notes([[520, 0, .05]], 'sine', .05); },
      fin: function(){ notes([[523, 0, .14], [659, .12, .14], [784, .24, .14], [1047, .36, .3]]); },
      basculer: function(){ actif = !actif; return actif; },
      get actif(){ return actif; }
    };
  })();

  function parler(texte){
    if(!('speechSynthesis' in window) || !texte) return;
    try{
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(brut(texte));
      u.lang = 'fr-FR'; u.rate = 0.92;
      var voix = speechSynthesis.getVoices().filter(function(v){ return /^fr/i.test(v.lang); });
      if(voix.length) u.voice = voix.filter(function(v){ return v.localService; })[0] || voix[0];
      speechSynthesis.speak(u);
    }catch(e){}
  }
  function taire(){ try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){} }
  function boutonVoix(texte){
    if(!('speechSynthesis' in window)) return '';
    return '<button type="button" class="voix" data-voix="' + esc(brut(texte)) + '" aria-label="Écouter">🔊</button>';
  }
  document.addEventListener('click', function(ev){
    var b = ev.target.closest && ev.target.closest('[data-voix]');
    if(b) parler(b.getAttribute('data-voix'));
  });

  /* ------------------------------------------------------------ retours */

  var BRAVO = ['Bravo !', 'Super !', 'Exact !', 'Bien vu !', 'Oui !', 'Parfait !'];

  /* Le panneau du bas après une erreur : la bonne réponse, POURQUOI, puis on continue. */
  function feuille(bon, titre, texte, suite){
    var f = document.createElement('div');
    f.className = 'feuille ' + (bon ? 'bon' : 'faux');
    f.setAttribute('role', 'alertdialog');
    f.innerHTML = '<div class="feuille-in"><p class="feuille-titre">' + (bon ? '✅ ' : '💡 ') + fmt(titre) + '</p>' +
      (texte ? '<p class="feuille-texte">' + fmt(texte) + boutonVoix(texte) + '</p>' : '') +
      '<button type="button" class="btn primaire geant">Continuer →</button></div>';
    document.body.appendChild(f);
    requestAnimationFrame(function(){ f.classList.add('ouverte'); });
    var b = $('.btn', f); b.focus({ preventScroll: true });
    b.addEventListener('click', function(){ taire(); f.remove(); suite(); });
  }

  /* « 🔥 3 d'affilée ! » — la série se compte sur toute la mission. */
  var serie = 0;
  function compter(juste){
    if(!juste){ serie = 0; return; }
    serie++;
    if(serie === 3 || serie === 5 || serie === 8 || serie === 12){
      var t = document.createElement('div');
      t.className = 'toast'; t.textContent = '🔥 ' + serie + ' d’affilée !';
      document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 1600);
    }
  }

  function confettis(){
    if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var couleurs = ['#ffd166', '#4dd0e1', '#5fd47a', '#ff7f7f', '#a78bfa'];
    var c = document.createElement('div'); c.className = 'confettis'; c.setAttribute('aria-hidden', 'true');
    for(var i = 0; i < 60; i++){
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = choisir(couleurs);
      p.style.animationDelay = (Math.random() * .6) + 's';
      p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(function(){ c.remove(); }, 3600);
  }

  function secouer(el){ el.classList.remove('secoue'); void el.offsetWidth; el.classList.add('secoue'); }

  /* ------------------------------------------------------------ les jeux */

  var JEUX = {};

  /* Combien de points un jeu peut rapporter : connu AVANT de jouer (le maximum du
     travail est envoyé au serveur dès l'ouverture). */
  function maxDe(j){
    switch(j.type){
      case 'qcm': case 'vf': return 1;
      case 'eclair': return j.items.length;
      case 'tri': return j.cartes.length;
      case 'ordre': return j.items.length;
      case 'paires': return j.paires.length;
      case 'legende': return j.reperes.length;
      case 'perso': return Number(j.max) || 0;
    }
    return 0;
  }

  function enTete(q, v){
    return (v ? visuel(v) : '') + '<h2 class="question">' + fmt(q) + boutonVoix(q) + '</h2>';
  }

  /* --- Une question, des réponses --- */
  JEUX.qcm = function(zone, j, fin){
    var ordre = j.fixe ? j.choix.map(function(_, k){ return k; }) : melanger(j.choix.map(function(_, k){ return k; }));
    zone.innerHTML = enTete(j.q, j.visuel) +
      '<div class="choix' + (j.grille ? ' grille' : '') + '">' + ordre.map(function(k){
        return '<button type="button" class="btn rep" data-k="' + k + '">' + etiquette(j.choix[k]) + '</button>';
      }).join('') + '</div>';
    $$('.rep', zone).forEach(function(b){
      b.addEventListener('click', function(){
        var k = Number(b.getAttribute('data-k')), juste = k === j.bon;
        $$('.rep', zone).forEach(function(x){ x.disabled = true; });
        b.classList.add(juste ? 'bon' : 'faux');
        compter(juste);
        if(juste){
          son.bon();
          if(j.explication && j.toujours) setTimeout(function(){ feuille(true, choisir(BRAVO), j.explication, function(){ fin(1); }); }, 350);
          else setTimeout(function(){ fin(1); }, 750);
        } else {
          son.faux(); secouer(b);
          $('.rep[data-k="' + j.bon + '"]', zone).classList.add('bon');
          setTimeout(function(){
            feuille(false, 'La bonne réponse : ' + texteDe(j.choix[j.bon]), j.explication, function(){ fin(0); });
          }, 600);
        }
      });
    });
  };

  JEUX.vf = function(zone, j, fin){
    JEUX.qcm(zone, { q: j.q, visuel: j.visuel, fixe: true, grille: true, explication: j.explication, toujours: j.toujours,
      choix: [{ ic: '👍', txt: 'Vrai' }, { ic: '👎', txt: 'Faux' }], bon: j.vrai ? 0 : 1 }, fin);
    $('.choix', zone).classList.add('vraifaux');
  };

  /* --- Vrai ou faux, contre la montre --- */
  JEUX.eclair = function(zone, j, fin){
    var items = melanger(j.items), n = 0, pts = 0, duree = (j.secondes || 8) * 1000, minuteur = null;
    function suivant(){
      var it = items[n];
      if(!it){ fin(pts); return; }
      zone.innerHTML = '<p class="consigne">⚡ ' + fmt(j.consigne || 'Vrai ou faux ? Vite !') + ' <span class="compte">' + (n + 1) + ' / ' + items.length + '</span></p>' +
        '<div class="chrono"><i></i></div>' + enTete(it.q, it.visuel) +
        '<div class="choix grille vraifaux"><button type="button" class="btn rep" data-v="1"><span class="ic">👍</span><span>Vrai</span></button>' +
        '<button type="button" class="btn rep" data-v="0"><span class="ic">👎</span><span>Faux</span></button></div>';
      var barre = $('.chrono i', zone), t0 = performance.now(), fini = false;
      function tic(){
        if(fini) return;
        var r = 1 - (performance.now() - t0) / duree;
        barre.style.width = Math.max(0, r * 100) + '%';
        if(r <= 0) return repondre(null);
        minuteur = requestAnimationFrame(tic);
      }
      function repondre(v){
        if(fini) return; fini = true; cancelAnimationFrame(minuteur);
        $$('.rep', zone).forEach(function(x){ x.disabled = true; });
        var juste = v === it.vrai;
        compter(juste);
        var bonBtn = $('.rep[data-v="' + (it.vrai ? 1 : 0) + '"]', zone);
        if(juste){ pts++; son.bon(); bonBtn.classList.add('bon'); n++; setTimeout(suivant, 650); return; }
        son.faux(); bonBtn.classList.add('bon');
        if(v !== null) $('.rep[data-v="' + (v ? 1 : 0) + '"]', zone).classList.add('faux');
        setTimeout(function(){
          feuille(false, (v === null ? '⏰ Trop tard ! ' : '') + 'C’était ' + (it.vrai ? 'VRAI.' : 'FAUX.'), it.explication, function(){ n++; suivant(); });
        }, 500);
      }
      $$('.rep', zone).forEach(function(b){ b.addEventListener('click', function(){ repondre(b.getAttribute('data-v') === '1'); }); });
      minuteur = requestAnimationFrame(tic);
    }
    suivant();
  };

  /* --- Ranger des cartes dans des bacs : une carte à la fois, on touche le bac --- */
  JEUX.tri = function(zone, j, fin){
    var cartes = melanger(j.cartes), n = 0, pts = 0, comptes = j.bacs.map(function(){ return 0; });
    function suivant(){
      var c = cartes[n];
      if(!c){ fin(pts); return; }
      zone.innerHTML = '<p class="consigne">' + fmt(j.consigne) + ' <span class="compte">' + (n + 1) + ' / ' + cartes.length + '</span></p>' +
        '<div class="carte-tri">' + (c.img ? '<img src="' + esc(c.img) + '" alt="">' : '') +
        (c.ic ? '<span class="ic" aria-hidden="true">' + esc(c.ic) + '</span>' : '') +
        '<span class="txt">' + fmt(c.txt) + '</span>' + boutonVoix(c.txt) + '</div>' +
        '<div class="bacs b' + j.bacs.length + '">' + j.bacs.map(function(b, k){
          return '<button type="button" class="bac" data-b="' + k + '" style="--c:' + esc(b.couleur || 'var(--accent)') + '">' +
            (b.ic ? '<span class="ic" aria-hidden="true">' + esc(b.ic) + '</span>' : '') +
            '<span class="nom">' + fmt(b.nom) + '</span><span class="nb">' + comptes[k] + '</span></button>';
        }).join('') + '</div>';
      var fait = false;
      $$('.bac', zone).forEach(function(b){
        b.addEventListener('click', function(){
          if(fait) return; fait = true;
          var k = Number(b.getAttribute('data-b')), juste = k === c.bac;
          compter(juste);
          var carte = $('.carte-tri', zone);
          if(juste){
            pts++; son.bon(); b.classList.add('bon'); comptes[k]++;
            carte.classList.add('range');
            setTimeout(function(){ n++; suivant(); }, 600);
          } else {
            son.faux(); b.classList.add('faux'); secouer(carte);
            $('.bac[data-b="' + c.bac + '"]', zone).classList.add('bon');
            comptes[c.bac]++;
            setTimeout(function(){
              feuille(false, 'C’est : ' + brut(j.bacs[c.bac].nom), c.pourquoi, function(){ n++; suivant(); });
            }, 550);
          }
        });
      });
    }
    suivant();
  };

  /* --- Remettre dans l'ordre : on touche les étiquettes l'une après l'autre --- */
  JEUX.ordre = function(zone, j, fin){
    var n = j.items.length, place = 0, pts = 0, rate = false, erreurs = 0;
    var tas = melanger(j.items.map(function(it, k){ return { it: it, k: k }; }));
    zone.innerHTML = (j.visuel ? visuel(j.visuel) : '') +
      '<p class="consigne">' + fmt(j.consigne) + boutonVoix(j.consigne) + '</p>' +
      '<ol class="cases">' + j.items.map(function(_, k){ return '<li class="case" data-c="' + k + '"><span class="num">' + (k + 1) + '</span><span class="vide">…</span></li>'; }).join('') + '</ol>' +
      '<div class="tas">' + tas.map(function(t){ return '<button type="button" class="btn rep" data-k="' + t.k + '">' + etiquette(t.it) + '</button>'; }).join('') + '</div>';
    $$('.tas .rep', zone).forEach(function(b){
      b.addEventListener('click', function(){
        var k = Number(b.getAttribute('data-k'));
        if(k === place){
          son.bon(); compter(!rate); if(!rate) pts++;
          var c = $('.case[data-c="' + k + '"]', zone);
          c.classList.add('remplie', rate ? 'aide' : 'ok');
          $('.vide', c).outerHTML = '<span class="txt">' + etiquette(j.items[k]) + '</span>';
          b.remove(); place++; rate = false; erreurs = 0;
          if(place === n) setTimeout(function(){
            if(j.explication) feuille(true, pts === n ? 'Tout est dans l’ordre !' : 'C’est rangé.', j.explication, function(){ fin(pts); });
            else fin(pts);
          }, 600);
        } else {
          son.faux(); secouer(b); compter(false); rate = true; erreurs++;
          /* Deux erreurs sur la même case : on montre la bonne, pour ne pas bloquer. */
          if(erreurs >= 2){ var bonne = $('.tas .rep[data-k="' + place + '"]', zone); if(bonne) bonne.classList.add('indice'); }
        }
      });
    });
  };

  /* --- Relier deux à deux : on touche à gauche puis à droite --- */
  JEUX.paires = function(zone, j, fin){
    var n = j.paires.length, pts = 0, faites = 0, rates = {};
    var gauche = melanger(j.paires.map(function(p, k){ return { o: p[0], k: k }; }));
    var droite = melanger(j.paires.map(function(p, k){ return { o: p[1], k: k }; }));
    zone.innerHTML = '<p class="consigne">' + fmt(j.consigne || 'Relie ce qui va ensemble.') + boutonVoix(j.consigne) + '</p>' +
      '<div class="paires">' +
      '<div class="col">' + (j.titres ? '<p class="col-titre">' + fmt(j.titres[0]) + '</p>' : '') + gauche.map(function(g){ return '<button type="button" class="btn rep g" data-k="' + g.k + '">' + etiquette(g.o) + '</button>'; }).join('') + '</div>' +
      '<div class="col">' + (j.titres ? '<p class="col-titre">' + fmt(j.titres[1]) + '</p>' : '') + droite.map(function(d){ return '<button type="button" class="btn rep d" data-k="' + d.k + '">' + etiquette(d.o) + '</button>'; }).join('') + '</div>' +
      '</div>';
    var choixG = null, choixD = null;
    function essayer(){
      if(!choixG || !choixD) return;
      var a = choixG, b = choixD; choixG = choixD = null;
      var ka = a.getAttribute('data-k'), kb = b.getAttribute('data-k');
      if(ka === kb){
        son.bon(); compter(!rates[ka]); if(!rates[ka]) pts++;
        [a, b].forEach(function(x){ x.classList.remove('choisi'); x.classList.add('bon'); x.disabled = true; });
        faites++;
        if(faites === n) setTimeout(function(){ fin(pts); }, 650);
      } else {
        son.faux(); compter(false); rates[ka] = true;
        [a, b].forEach(function(x){ x.classList.remove('choisi'); x.classList.add('faux'); secouer(x); });
        setTimeout(function(){ [a, b].forEach(function(x){ x.classList.remove('faux'); }); }, 600);
      }
    }
    $$('.rep', zone).forEach(function(x){
      x.addEventListener('click', function(){
        son.clic();
        var g = x.classList.contains('g');
        $$(g ? '.rep.g' : '.rep.d', zone).forEach(function(y){ y.classList.remove('choisi'); });
        x.classList.add('choisi');
        if(g) choixG = x; else choixD = x;
        essayer();
      });
    });
  };

  /* --- Légender un schéma : le repère qui clignote, on touche son nom --- */
  JEUX.legende = function(zone, j, fin){
    var n = j.reperes.length, cur = 0, pts = 0, rate = false;
    var noms = melanger(j.reperes.map(function(r){ return r.bon; }).concat(j.leurres || []));
    zone.innerHTML = '<p class="consigne">' + fmt(j.consigne || 'Touche le nom du repère qui clignote.') + boutonVoix(j.consigne) + '</p>' +
      '<div class="schema">' + visuel(j.visuel) + j.reperes.map(function(r, k){
        return '<span class="repere' + (r.haut ? ' haut' : '') + '" data-r="' + k + '" style="left:' + r.x + '%;top:' + r.y + '%">' + (k + 1) + '</span>';
      }).join('') + '</div>' +
      '<div class="noms">' + noms.map(function(t){ return '<button type="button" class="btn rep" data-t="' + esc(t) + '">' + fmt(t) + '</button>'; }).join('') + '</div>';
    function montrer(){ $$('.repere', zone).forEach(function(r, k){ r.classList.toggle('actif', k === cur); }); }
    montrer();
    $$('.noms .rep', zone).forEach(function(b){
      b.addEventListener('click', function(){
        if(cur >= n) return;
        var r = j.reperes[cur];
        if(b.getAttribute('data-t') === r.bon){
          son.bon(); compter(!rate); if(!rate) pts++;
          var p = $('.repere[data-r="' + cur + '"]', zone);
          p.classList.remove('actif'); p.classList.add('trouve');
          p.innerHTML = '✓<span class="bulle">' + fmt(r.bon) + '</span>';
          b.disabled = true; b.classList.add('bon');
          cur++; rate = false;
          if(cur === n) setTimeout(function(){ fin(pts); }, 800); else montrer();
        } else {
          son.faux(); compter(false); rate = true; secouer(b);
          b.classList.add('faux'); setTimeout(function(){ b.classList.remove('faux'); }, 600);
        }
      });
    });
  };

  /* --- Un jeu propre au travail --- */
  JEUX.perso = function(zone, j, fin){
    j.rendre(zone, function(p){ fin(Math.max(0, Math.min(Number(j.max) || 0, Math.round(Number(p) || 0)))); }, OUTILS);
  };

  var OUTILS = { esc: esc, fmt: fmt, melanger: melanger, choisir: choisir, visuel: visuel, son: son,
    parler: parler, voix: boutonVoix, feuille: feuille, compter: compter, secouer: secouer, confettis: confettis, $: $, $$: $$ };

  /* ------------------------------------------------------------ le parcours */

  function etoiles(score, max){
    if(!(score >= 0)) return 0;
    if(score >= max) return 3;
    return score / max >= 0.6 ? 2 : 1;
  }
  function dessinEtoiles(n, grand){
    return '<span class="etoiles' + (grand ? ' grand' : '') + '" aria-label="' + n + ' étoile' + (n > 1 ? 's' : '') + ' sur 3">' +
      [1, 2, 3].map(function(i){ return '<span class="' + (i <= n ? 'on' : '') + '" style="animation-delay:' + (i * .18) + 's">★</span>'; }).join('') + '</span>';
  }

  function lancer(T){
    var M = T.missions;
    M.forEach(function(m){ m.max = m.jeux.reduce(function(s, j){ return s + maxDe(j); }, 0); });
    var MAX = M.reduce(function(s, m){ return s + m.max; }, 0);
    var suivi = Maison.travail({ devoir: T.devoir, etapes: M.length, max: MAX });
    var ecran = $('#ecran');
    document.title = T.titre;

    function haut(){ window.scrollTo(0, 0); }

    function accueil(){
      taire();
      if(!suivi.eleve){
        ecran.innerHTML = '<div class="carte"><h1>Passe d’abord par tes révisions</h1>' +
          '<p class="soustitre" style="margin:8px 0 14px">Cette page s’ouvre depuis la page « Mes révisions à la maison ».</p>' +
          '<a class="btn primaire geant" href="' + esc(suivi.entree) + '">Mes révisions →</a></div>';
        return;
      }
      var envoi = suivi.prof ? 'Mode professeur : rien n’est envoyé, rien n’est gardé.' : {
        entrainement: 'Mode entraînement : ton professeur ne verra pas ce travail.',
        attente: 'Ton travail partira vers ton professeur dès que le réseau sera là.',
        envoye: '✓ Ton professeur voit ton travail.',
        refuse: '⚠ Ce lien ne marche plus. Demande le nouveau lien à ton professeur.' }[suivi.envoi];
      var prochaine = -1;
      for(var i = 0; i < M.length; i++){ if(!(suivi.scores[i] >= 0)){ prochaine = i; break; } }
      var total = M.reduce(function(s, m, i){ return s + etoiles(suivi.scores[i], m.max); }, 0);
      ecran.innerHTML =
        '<header class="tete"><a class="retour" href="' + esc(suivi.entree) + '">‹ ' + (suivi.prof ? 'Le suivi' : 'Mes révisions') + '</a>' +
          '<button type="button" class="son-btn" aria-label="Couper ou remettre le son">' + (son.actif ? '🔈' : '🔇') + '</button></header>' +
        '<div class="titre-travail"><span class="ic" aria-hidden="true">' + esc(T.ic || '📘') + '</span><div><h1>' + esc(T.titre) + '</h1>' +
          '<p class="soustitre">' + esc(suivi.eleve.prenom) + ', ' + M.length + ' missions · ' + esc(T.duree || '15 min') + '</p></div></div>' +
        (envoi ? '<p class="avertir' + (suivi.envoi === 'refuse' ? ' ko' : '') + '">' + esc(envoi) + '</p>' : '') +
        '<p class="total">⭐ ' + total + ' / ' + (M.length * 3) + ' étoiles</p>' +
        '<ul class="missions">' + M.map(function(m, i){
          var s = suivi.scores[i], faite = s >= 0;
          return '<li><button type="button" class="mission' + (faite ? ' faite' : '') + (i === prochaine ? ' prochaine' : '') + '" data-m="' + i + '">' +
            '<span class="num" aria-hidden="true">' + esc(m.ic || (i + 1)) + '</span>' +
            '<span class="corps"><span class="nom">' + (i + 1) + '. ' + esc(m.nom) + '</span>' +
            (m.accroche ? '<span class="accroche">' + esc(m.accroche) + '</span>' : '') + '</span>' +
            (faite ? dessinEtoiles(etoiles(s, m.max)) : i === prochaine ? '<span class="go">À toi !</span>' : '') +
            '</button></li>';
        }).join('') + '</ul>' +
        (suivi.etapesFaites() === M.length
          ? '<div class="carte bravo"><h2>🎉 Tout est fait !</h2><p class="soustitre">Tu peux refaire une mission pour gagner plus d’étoiles.</p>' +
            '<a class="btn primaire" href="' + esc(suivi.entree) + '">Retour à mes révisions</a></div>' : '');
      $$('[data-m]', ecran).forEach(function(b){
        b.addEventListener('click', function(){ mission(Number(b.getAttribute('data-m'))); });
      });
      $('.son-btn', ecran).addEventListener('click', function(ev){ ev.currentTarget.textContent = son.basculer() ? '🔈' : '🔇'; });
    }

    function barreJeu(m, k, n, pts){
      return '<header class="jeu-tete"><button type="button" class="quitter" aria-label="Quitter la mission">✕</button>' +
        '<div class="progres" aria-hidden="true"><i style="width:' + Math.round(100 * k / n) + '%"></i></div>' +
        '<span class="pts">⭐ ' + pts + '</span></header>';
    }
    function brancherQuitter(){
      var q = $('.quitter', ecran);
      if(q) q.addEventListener('click', function(){ $$('.feuille').forEach(function(f){ f.remove(); }); accueil(); haut(); });
    }

    function mission(i){
      var m = M[i], cartes = m.lecon || [];
      serie = 0;
      if(cartes.length) lecon(0); else jouer();
      function lecon(c){
        var carte = cartes[c], derniere = c === cartes.length - 1;
        ecran.innerHTML = barreJeu(m, 0, 1, 0) +
          '<p class="etiquette-mission">' + esc(m.ic || '') + ' Mission ' + (i + 1) + ' · Je retiens</p>' +
          '<article class="carte lecon">' + visuel(carte.visuel) +
            (carte.titre ? '<h2>' + fmt(carte.titre) + '</h2>' : '') +
            '<p class="lecon-texte">' + fmt(carte.texte) + '</p>' + boutonVoix((carte.titre ? carte.titre + '. ' : '') + carte.texte) + '</article>' +
          '<div class="points-lecon" aria-hidden="true">' + cartes.map(function(_, k){ return '<i class="' + (k === c ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
          '<div class="bas"><button type="button" class="btn primaire geant suite">' + (derniere ? 'À moi de jouer ! 🎮' : 'Suivant →') + '</button>' +
          (c > 0 ? '<button type="button" class="lien-discret avant">‹ Carte précédente</button>' : '') + '</div>';
        brancherQuitter();
        $('.suite', ecran).addEventListener('click', function(){ taire(); son.clic(); if(derniere) jouer(); else lecon(c + 1); haut(); });
        var av = $('.avant', ecran); if(av) av.addEventListener('click', function(){ taire(); lecon(c - 1); haut(); });
      }
      function jouer(){
        var k = 0, pts = 0;
        function suivant(){
          taire();
          var j = m.jeux[k];
          if(!j) return fin(pts);
          ecran.innerHTML = barreJeu(m, k, m.jeux.length, pts) + '<section class="zone-jeu"></section>';
          brancherQuitter(); haut();
          JEUX[j.type]($('.zone-jeu', ecran), j, function(p){ pts += p; k++; suivant(); });
        }
        suivant();
      }
      function fin(pts){
        var avant = suivi.scores[i];
        suivi.terminer(i, pts);
        var n = etoiles(pts, m.max), record = avant >= 0 && pts > avant;
        son.fin(); if(n === 3) confettis();
        var reste = M.filter(function(_, x){ return !(suivi.scores[x] >= 0); }).length;
        ecran.innerHTML = '<div class="fin-mission">' +
          '<p class="etiquette-mission">' + esc(m.ic || '') + ' Mission ' + (i + 1) + ' terminée</p>' +
          dessinEtoiles(n, true) +
          '<h1>' + (n === 3 ? 'Parfait !' : n === 2 ? 'Bien joué !' : 'Mission terminée !') + '</h1>' +
          '<p class="score-fin">' + pts + ' / ' + m.max + ' bonnes réponses du premier coup' + (record ? ' — nouveau record !' : '') + '</p>' +
          (n < 3 ? '<button type="button" class="btn geant refaire">↻ Refaire pour 3 étoiles</button>' : '') +
          (i + 1 < M.length
            ? '<button type="button" class="btn primaire geant suite">Mission ' + (i + 2) + ' : ' + esc(M[i + 1].nom) + ' →</button>'
            : '') +
          '<button type="button" class="btn geant carte-btn">' + (reste ? 'Voir mes missions' : '🎉 Voir mon bilan') + '</button></div>';
        var r = $('.refaire', ecran); if(r) r.addEventListener('click', function(){ mission(i); haut(); });
        var s = $('.suite', ecran); if(s) s.addEventListener('click', function(){ mission(i + 1); haut(); });
        $('.carte-btn', ecran).addEventListener('click', function(){ accueil(); haut(); if(!reste) confettis(); });
        haut();
      }
    }

    suivi.surChangement(function(){ if($('.missions', ecran)) accueil(); });
    accueil();
    return suivi;
  }

  window.Jeux = { lancer: lancer, outils: OUTILS, maxDe: maxDe };
})();
