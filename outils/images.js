/* Préparer les images d'un travail — NON publié (outils/ est exclu).
 *
 * Les images des séances (diaporamas, fiches) sont trop lourdes ou trop larges pour un
 * téléphone. Ce petit outil les convertit en webp léger, DANS le navigateur, et le
 * serveur d'essai les écrit dans le dépôt (route POST /__image, locale seulement).
 *
 * 1. Copier les images sources dans _images/ (dossier ignoré par git et non publié).
 *    Pour sortir les images d'un .docx ou d'un .pptx :  unzip -j fichier.pptx 'ppt/media/*' -d _images/x
 * 2. node outils/essai.mjs, ouvrir http://localhost:8790/ puis, dans la console :
 *
 *      await import('/outils/images.js')
 *      await Images.convertir('_images/oeil.png', 'lumiere-1/img/oeil.webp', { largeur: 900 })
 *      await Images.convertir('_images/fenetres.png', 'lumiere-1/img/vitre.webp', { recadrer: [0, 0, 612, 845], largeur: 420 })
 *      await Images.convertir('_images/oeil.png', 'lumiere-1/img/oeil-muet.webp', { largeur: 900, masquer: [[480, 84, 80, 34]] })
 *      await Images.convertir('_images/clavier.png', 'pc-x/img/clavier.webp', { rogner: true })
 *
 *    recadrer : [x, y, largeur, hauteur] dans l'image source
 *    masquer  : rectangles blancs posés APRÈS la mise à la largeur (pour faire un schéma muet)
 *    rogner   : enlève les marges unies autour de l'objet
 *    qualite  : 0,85 par défaut. Viser moins de 200 Ko par image (souvent 10 à 50 Ko).
 */
(function(){
  'use strict';
  async function charger(src){
    var img = new Image(); img.src = '/' + src.replace(/^\/+/, '') + '?' + Date.now();
    await img.decode(); return img;
  }
  function boiteUtile(img){
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0);
    var d = x.getImageData(0, 0, c.width, c.height).data, fond = [d[0], d[1], d[2]];
    var x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for(var y = 0; y < c.height; y++) for(var X = 0; X < c.width; X++){
      var i = (y * c.width + X) * 4;
      if(Math.abs(d[i] - fond[0]) + Math.abs(d[i + 1] - fond[1]) + Math.abs(d[i + 2] - fond[2]) > 24){
        if(X < x0) x0 = X; if(X > x1) x1 = X; if(y < y0) y0 = y; if(y > y1) y1 = y;
      }
    }
    var m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.08);
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(c.width - 1, x1 + m); y1 = Math.min(c.height - 1, y1 + m);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  }
  async function convertir(source, destination, o){
    o = o || {};
    var img = await charger(source);
    var r = o.recadrer || (o.rogner ? boiteUtile(img) : [0, 0, img.width, img.height]);
    var S = Math.min(1, (o.largeur || 900) / r[2]);
    var k = document.createElement('canvas'); k.width = Math.round(r[2] * S); k.height = Math.round(r[3] * S);
    var c = k.getContext('2d');
    c.fillStyle = o.fond || '#fff'; c.fillRect(0, 0, k.width, k.height);
    c.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, k.width, k.height);
    c.fillStyle = '#fff'; (o.masquer || []).forEach(function(m){ c.fillRect(m[0], m[1], m[2], m[3]); });
    var type = /\.png$/.test(destination) ? 'image/png' : /\.jpg$/.test(destination) ? 'image/jpeg' : 'image/webp';
    var rep = await fetch('/__image?vers=' + encodeURIComponent(destination), { method: 'POST', body: k.toDataURL(type, o.qualite || 0.85) });
    var j = await rep.json();
    return destination + ' : ' + k.width + '×' + k.height + ', ' + Math.round((j.octets || 0) / 1024) + ' Ko';
  }
  window.Images = { convertir: convertir };
})();
