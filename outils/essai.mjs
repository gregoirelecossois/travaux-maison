#!/usr/bin/env node
/* Serveur d'ESSAI local : les pages de ce dépôt + une fausse API, en mémoire.
 *
 *     node outils/essai.mjs            → http://localhost:8790/?c=essai123
 *
 * Pour voir une page sans toucher au vrai serveur ni aux vraies données d'élèves. Il
 * remplace config.js par une adresse vers lui-même, et répond aux quatre routes sans
 * connexion du travail à la maison comme le vrai (api/server.js de l'Atelier) — en plus
 * simple : pas de base, pas de rythme, tout s'oublie à l'arrêt.
 *
 * Les faux comptes (code du lien : essai123) :
 *   5e : Léa Martin, Léa Moreau (deux Léa : « Lequel es-tu ? »), Tom Durand
 *   3e : Inès Bernard        6e, 4e : personne
 * GET /__etat montre ce que la fausse API a reçu.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8790);
const RACINE = path.resolve(import.meta.dirname, '..');
const CODE = 'essai123';
const CLASSES = ['6e', '5e', '4e', '3e'];
const COMPTES = [
  { id: 1, prenom: 'Léa', nom: 'Martin', classe: '5e' },
  { id: 2, prenom: 'Léa', nom: 'Moreau', classe: '5e' },
  { id: 3, prenom: 'Tom', nom: 'Durand', classe: '5e' },
  { id: 4, prenom: 'Inès', nom: 'Bernard', classe: '3e' }
];
const passages = new Map();   /* id → ligne */

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };

const plat = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s'’-]+/g, ' ').trim();
const classeOk = (c) => CLASSES.find((x) => x.toLowerCase() === String(c || '').trim().toLowerCase());
const compteOk = (corps) => {
  const c = COMPTES.find((x) => x.id === Number(corps.compte));
  return c && c.classe === classeOk(corps.classe) && plat(c.prenom) === plat(corps.prenom) ? c : null;
};

function json(res, code, corps) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corps));
}
function corpsDe(req) {
  return new Promise((ok) => {
    let t = '';
    req.on('data', (m) => { t += m; });
    req.on('end', () => { try { ok(JSON.parse(t || '{}')); } catch { ok({}); } });
  });
}

async function api(req, res, url) {
  const corps = req.method === 'POST' ? await corpsDe(req) : {};
  const code = String(url.searchParams.get('c') || corps.c || '').toLowerCase();
  if (code !== CODE) return json(res, 404, { erreur: 'Lien inconnu.' });

  if (url.pathname === '/api/devoir/classes') return json(res, 200, { classes: CLASSES, attributions: {} });

  if (!classeOk(corps.classe)) return json(res, 400, { erreur: 'Classe inconnue.' });

  if (url.pathname === '/api/devoir/qui') {
    const trouves = COMPTES.filter((c) => c.classe === classeOk(corps.classe) && plat(c.prenom) === plat(corps.prenom));
    const noms = trouves.map((c) => c.nom);
    return json(res, 200, { eleves: trouves.map((c, i) => {
      let n = 1;
      while (n < c.nom.length && noms.some((x, j) => j !== i && x.slice(0, n).toLowerCase() === c.nom.slice(0, n).toLowerCase())) n++;
      return { compte: c.id, prenom: c.prenom, nom: c.prenom + ' ' + c.nom.charAt(0).toUpperCase() + c.nom.slice(1, n).toLowerCase() + '.' };
    }) });
  }
  if (url.pathname === '/api/devoir/avancees') {
    const c = compteOk(corps);
    if (!c) return json(res, 404, { erreur: 'Élève introuvable.' });
    const av = {};
    for (const p of passages.values()) {
      if (p.compte !== c.id) continue;
      const a = av[p.devoir] || { etape: 0, etapes: 0, termine: false };
      av[p.devoir] = { etape: Math.max(a.etape, p.etape), etapes: Math.max(a.etapes, p.etapes), termine: a.termine || p.etape >= p.etapes };
    }
    return json(res, 200, { avancees: av });
  }
  if (url.pathname === '/api/devoir/passage') {
    const avant = passages.get(corps.id) || {};
    const c = compteOk(corps);
    passages.set(corps.id, { ...avant, ...corps, etape: Math.max(avant.etape || 0, corps.etape || 0),
      score: Math.max(avant.score || 0, corps.score || 0), compte: c ? c.id : avant.compte || null });
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { erreur: 'Introuvable.' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  if (url.pathname === '/__etat') return json(res, 200, [...passages.values()]);
  if (url.pathname === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(`window.ATELIER_CONFIG = { api: 'http://localhost:${PORT}' };\n`);
  }
  let f = path.join(RACINE, decodeURIComponent(url.pathname));
  if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Essai : http://localhost:${PORT}/?c=${CODE}`));
