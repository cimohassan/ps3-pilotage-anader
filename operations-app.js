/* =========================================================================
 * D2MG PILOTAGE — CHAMBRE « GESTION DES OPÉRATIONS (D2MG) »
 * Portage du prototype localStorage (s01…s20) vers Supabase : données
 * partagées entre tous les agents de la D2MG, authentification réelle,
 * droits d'usage individuels (ops.*), audit central (historique non
 * modifiable). Architecture calquée sur courriers-app.js / projets-app.js.
 *
 * Phase actuelle : Tableau de bord, Catalogue (lecture), Planifier,
 * Fiche d'activité (gestes complets), Mes activités, Suivi (kanban).
 * Écrans non encore portés (placeholders « en construction ») : Aujourd'hui,
 * Revue hebdomadaire, Revue mensuelle, Points d'attention, Registre général,
 * Rapports, Paramétrage, Annuaire, Sauvegarde/Restauration, Aide.
 * ========================================================================= */
(function () {
'use strict';

/* ============================================================ SUPABASE */
const SUPABASE_URL = 'https://tcirboephslicjmhokbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaXJib2VwaHNsaWNqbWhva2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjYxNjUsImV4cCI6MjEwMDg0MjE2NX0.e3f1B__NmDVL5G1Cze1p115ya2Rs-ErzzTUr25UCKEg';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================ DOM helpers */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ech = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nl2br = s => ech(s).replace(/\n/g, '<br>');
function tronque(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function toast(m, t) { const e = document.createElement('div'); e.className = 'toast ' + (t || ''); e.textContent = m; $('#toasts').appendChild(e); setTimeout(() => e.remove(), 4300); }

/* ================================================== constantes métier */
const STATUTS = {
  A_FAIRE:   { code: 'A_FAIRE',   libelle: 'À faire',   couleur: 'gris',   ordre: 1, ouvert: true },
  EN_COURS:  { code: 'EN_COURS',  libelle: 'En cours',  couleur: 'bleu',   ordre: 2, ouvert: true },
  BLOQUE:    { code: 'BLOQUE',    libelle: 'Bloqué',    couleur: 'rouge',  ordre: 3, ouvert: true },
  TERMINEE:  { code: 'TERMINEE',  libelle: 'Terminée',  couleur: 'vert',   ordre: 4, ouvert: false },
  SUSPENDUE: { code: 'SUSPENDUE', libelle: 'Suspendue', couleur: 'violet', ordre: 5, ouvert: false }
};
const ORDRE_STATUTS = ['A_FAIRE', 'EN_COURS', 'BLOQUE', 'TERMINEE', 'SUSPENDUE'];
/* Machine à états : transitions autorisées, portées à l'identique de s02_const.js */
const TRANSITIONS = {
  A_FAIRE:   ['EN_COURS', 'SUSPENDUE'],
  EN_COURS:  ['BLOQUE', 'TERMINEE', 'SUSPENDUE'],
  BLOQUE:    ['EN_COURS', 'TERMINEE', 'SUSPENDUE'],
  TERMINEE:  [],
  SUSPENDUE: ['A_FAIRE', 'EN_COURS']
};
const PRIORITES = {
  URGENT:     { code: 'URGENT',     libelle: 'Urgent',     facteur: 0.5, couleur: 'rouge', ordre: 1 },
  NORMAL:     { code: 'NORMAL',     libelle: 'Normal',     facteur: 1,   couleur: 'bleu',  ordre: 2 },
  NON_URGENT: { code: 'NON_URGENT', libelle: 'Non urgent', facteur: 1.5, couleur: 'gris',  ordre: 3 }
};
const FREQUENCES = {
  QUOTIDIENNE:   { code: 'QUOTIDIENNE',   libelle: 'Quotidienne',   court: 'J', ordre: 1, delaiBase: 1 },
  HEBDOMADAIRE:  { code: 'HEBDOMADAIRE',  libelle: 'Hebdomadaire',  court: 'S', ordre: 2, delaiBase: 3 },
  MENSUELLE:     { code: 'MENSUELLE',     libelle: 'Mensuelle',     court: 'M', ordre: 3, delaiBase: 5 },
  TRIMESTRIELLE: { code: 'TRIMESTRIELLE', libelle: 'Trimestrielle', court: 'T', ordre: 4, delaiBase: 10 },
  ANNUELLE:      { code: 'ANNUELLE',      libelle: 'Annuelle',      court: 'A', ordre: 5, delaiBase: 20 },
  A_LA_DEMANDE:  { code: 'A_LA_DEMANDE',  libelle: 'À la demande',  court: 'D', ordre: 6, delaiBase: 3 }
};
const STATUTS_ATT = {
  OUVERT:   { code: 'OUVERT',   libelle: 'Ouvert',        couleur: 'rouge' },
  EN_COURS: { code: 'EN_COURS', libelle: 'En traitement', couleur: 'orange' },
  RESOLU:   { code: 'RESOLU',   libelle: 'Résolu',        couleur: 'vert' }
};
const PERIODES = [
  { code: 'SEMAINE',   libelle: 'Semaine en cours' },
  { code: 'MOIS',      libelle: 'Mois en cours' },
  { code: 'MOIS_PREC', libelle: 'Mois précédent' },
  { code: 'TRIM',      libelle: 'Trimestre en cours' },
  { code: 'TRIM_PREC', libelle: 'Trimestre précédent' },
  { code: 'SEM1',      libelle: 'Semestre en cours' },
  { code: 'ANNEE',     libelle: 'Année en cours' }
];
/* Anciens codes de rôle du catalogue (operations_catalogue.roles) : purement
   d'affichage désormais — ne portent plus de droits (cf. plan §2/§3). */
const ROLES_LABELS = {
  ADMIN: 'Administrateur', DIRECTEUR: 'Directeur D2MG', CHEF_DIVISION: 'Chef de division',
  CHEF_CELLULE: 'Chef de cellule', AGENT: 'Agent', SECRETAIRE: 'Secrétariat de Direction',
  LECTEUR: 'Pilote qualité / Lecteur'
};

/* ============================================== moteur de jours ouvrés
 * Dates en chaînes AAAA-MM-JJ (jamais d'objet Date stocké) — évite les
 * décalages de fuseau. Porté à l'identique de s04_dates.js. */
function iso(d) { return d.toISOString().slice(0, 10); }
function auj() { return iso(new Date()); }
function dt(s) { return new Date(s + 'T00:00:00'); }

let feries = new Set();
async function chargerFeries() {
  const { data } = await sb.from('jours_feries').select('date_ferie');
  feries = new Set((data || []).map(f => f.date_ferie));
}
function estOuvre(s) {
  const j = dt(s).getDay();
  if (j === 0 || j === 6) return false;
  return !feries.has(s);
}
function ajoutOuvres(dateStr, n) {
  let d = dt(dateStr), c = 0, garde = 0;
  n = Math.max(1, Math.round(n));
  while (c < n && garde++ < 3650) { d.setDate(d.getDate() + 1); if (estOuvre(iso(d))) c++; }
  return iso(d);
}
function prochainOuvre(dateStr) {
  let d = dt(dateStr), garde = 0;
  while (!estOuvre(iso(d)) && garde++ < 3650) d.setDate(d.getDate() + 1);
  return iso(d);
}
function ecartOuvres(a, b) {
  if (!a || !b) return null;
  if (a === b) return 0;
  const sens = dt(b) > dt(a) ? 1 : -1;
  let d = sens > 0 ? dt(a) : dt(b);
  const fin = sens > 0 ? dt(b) : dt(a);
  let c = 0, garde = 0;
  while (d < fin && garde++ < 3650) { d.setDate(d.getDate() + 1); if (estOuvre(iso(d))) c++; }
  return c * sens;
}
function ajoutJours(dateStr, n) { const d = dt(dateStr); d.setDate(d.getDate() + n); return iso(d); }
function delaiEffectif(delaiBase, priorite) {
  const b = (typeof delaiBase === 'number' && delaiBase > 0) ? delaiBase : 3;
  const f = PRIORITES[priorite] ? PRIORITES[priorite].facteur : 1;
  return Math.max(1, Math.round(b * f));
}

const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function dateFr(s) { if (!s) return '—'; try { return dt(s).toLocaleDateString('fr-FR'); } catch (e) { return s; } }
function dateLongue(s) {
  if (!s) return '—';
  const d = dt(s);
  const JOURS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  return JOURS_FR[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS_FR[d.getMonth()] + ' ' + d.getFullYear();
}
function moisFr(s) { const d = dt(s); return MOIS_FR[d.getMonth()] + ' ' + d.getFullYear(); }
function lundiDe(dateStr) { const d = dt(dateStr), j = d.getDay(); d.setDate(d.getDate() - (j === 0 ? 6 : j - 1)); return iso(d); }
function debutMois(dateStr) { return dateStr.slice(0, 8) + '01'; }
function finMois(dateStr) { const d = dt(dateStr); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
function trimestreDe(dateStr) { return Math.floor(dt(dateStr).getMonth() / 3) + 1; }
function bornesPeriode(code, perso) {
  const a = auj(), d = dt(a), an = d.getFullYear();
  const mk = (deb, fin, lib) => ({ debut: deb, fin: fin, libelle: lib });
  let t, anT;
  switch (code) {
    case 'SEMAINE': { const lun = lundiDe(a); return mk(lun, ajoutJours(lun, 6), 'Semaine du ' + dateFr(lun) + ' au ' + dateFr(ajoutJours(lun, 6))); }
    case 'MOIS': return mk(debutMois(a), finMois(a), 'Mois de ' + moisFr(a));
    case 'MOIS_PREC': { const pm = iso(new Date(an, d.getMonth() - 1, 15)); return mk(debutMois(pm), finMois(pm), 'Mois de ' + moisFr(pm)); }
    case 'TRIM': t = trimestreDe(a); return mk(iso(new Date(an, (t - 1) * 3, 1)), iso(new Date(an, t * 3, 0)), t + 'ᵉ trimestre ' + an);
    case 'TRIM_PREC': t = trimestreDe(a) - 1; anT = an; if (t === 0) { t = 4; anT = an - 1; }
      return mk(iso(new Date(anT, (t - 1) * 3, 1)), iso(new Date(anT, t * 3, 0)), t + 'ᵉ trimestre ' + anT);
    case 'SEM1': { const s = d.getMonth() < 6 ? 1 : 2; return mk(iso(new Date(an, (s - 1) * 6, 1)), iso(new Date(an, s * 6, 0)), s + 'ᵉ semestre ' + an); }
    case 'ANNEE': return mk(an + '-01-01', an + '-12-31', 'Année ' + an);
    case 'PERSO': { const p = perso || {}; const deb = p.debut || debutMois(a), fin = p.fin || a; return mk(deb, fin, 'Du ' + dateFr(deb) + ' au ' + dateFr(fin)); }
    default: return mk(debutMois(a), finMois(a), 'Mois de ' + moisFr(a));
  }
}
function dansPeriode(dateStr, bornes) { return !!dateStr && dateStr >= bornes.debut && dateStr <= bornes.fin; }

/* ============================================================ état app */
const D = {
  moi: null, droits: {},
  divisions: [], catalogue: [], agents: [], activites: [], attentions: [], seances: [],
  parametres: { alerte_avant_jours: 2, wip_par_agent: 6, dormant_jours: 10, blocage_jours: 3, cible_respect_delai: 90, cible_realisation: 85, organisation: {} },
  vue: 'bord', etat: {}
};
const aDroit = c => D.droits[c] === true;

/* Visibilité : imposée côté serveur par RLS (voir plan §0/§4.2), rappelée
   ici pour la cohérence de l'affichage client. */
function visibles() {
  if (aDroit('ops.voir_tout')) return D.activites;
  if (aDroit('ops.voir_division'))
    return D.activites.filter(o => o.division_id === D.moi.division_operations_id || o.responsable_id === D.moi.id_acteur);
  return D.activites.filter(o => o.responsable_id === D.moi.id_acteur || o.created_by === D.moi.id_acteur);
}
function attentionsVisibles() {
  if (aDroit('ops.voir_tout') || aDroit('ops.attention')) return D.attentions;
  if (aDroit('ops.voir_division'))
    return D.attentions.filter(p => p.division_id === D.moi.division_operations_id || p.responsable_id === D.moi.id_acteur);
  return D.attentions.filter(p => p.responsable_id === D.moi.id_acteur || p.created_by === D.moi.id_acteur);
}

function nomAgent(id) { const a = D.agents.find(x => x.id_acteur === id); return a ? a.nom_prenoms : '—'; }
function nomDivision(id) { const d = D.divisions.find(x => x.id === id); return d ? d.court : '—'; }
function agentsDe(divisionId) { return D.agents.filter(a => a.division_operations_id === divisionId); }
function numCourt(n) { if (!n) return '—'; const m = String(n).split('/'); return m.length >= 2 ? m[m.length - 2] + '/' + m[m.length - 1] : n; }

/* --- états d'échéance / de statut ---------------------------------- */
function estOuvert(o) { return o.statut !== 'TERMINEE' && o.statut !== 'SUSPENDUE'; }
function estClos(o) { return !estOuvert(o); }
function etatEcheance(o) {
  if (estClos(o)) {
    if (o.statut === 'SUSPENDUE') return 'suspendu';
    if (o.date_echeance && o.date_fin) return ecartOuvres(o.date_fin, o.date_echeance) >= 0 ? 'closDelai' : 'closRetard';
    return 'clos';
  }
  if (!o.date_echeance) return 'sansEcheance';
  const r = ecartOuvres(auj(), o.date_echeance);
  if (r < 0) return 'retard';
  if (r === 0) return 'ceJour';
  if (r <= (D.parametres.alerte_avant_jours || 2)) return 'proche';
  return 'ok';
}
function joursRestants(o) { return o.date_echeance ? ecartOuvres(auj(), o.date_echeance) : 9999; }
function classeEcheance(o) {
  const e = etatEcheance(o);
  if (e === 'retard' || e === 'closRetard') return 'retard';
  if (e === 'proche' || e === 'ceJour') return 'proche';
  if (e === 'ok' || e === 'closDelai') return 'ok';
  return 'clos';
}
function badgeEcheance(o) {
  const e = etatEcheance(o);
  switch (e) {
    case 'retard': return `<span class="et rouge">Retard ${-ecartOuvres(auj(), o.date_echeance)} j</span>`;
    case 'ceJour': return '<span class="et orange">Échéance ce jour</span>';
    case 'proche': return `<span class="et orange">J−${ecartOuvres(auj(), o.date_echeance)}</span>`;
    case 'ok': return '<span class="et vert">Dans le délai</span>';
    case 'closDelai': return '<span class="et vert">Réalisée dans le délai</span>';
    case 'closRetard': return '<span class="et rouge">Réalisée hors délai</span>';
    case 'suspendu': return '<span class="et violet">Suspendue</span>';
    case 'sansEcheance': return '<span class="et gris">Sans échéance</span>';
    default: return '<span class="et gris">—</span>';
  }
}
function badgeStatut(code) { const s = STATUTS[code]; return s ? `<span class="et ${s.couleur}">${ech(s.libelle)}</span>` : '<span class="et gris">—</span>'; }
function badgePriorite(code) { const p = PRIORITES[code]; if (!p || code === 'NORMAL') return ''; return `<span class="et ${p.couleur}">${ech(p.libelle)}</span>`; }
function badgeStatutAtt(code) { const s = STATUTS_ATT[code]; return s ? `<span class="et ${s.couleur}">${ech(s.libelle)}</span>` : '<span class="et gris">—</span>'; }

function pct(v) { return v === null || v === undefined ? '—' : v + ' %'; }
function jrs(v) { return v === null || v === undefined ? '—' : v + ' j'; }
function barresHtml(paires) {
  if (!paires.length) return '<p class="gris">Aucune donnée sur la période.</p>';
  const max = Math.max(...paires.map(p => p[1])) || 1;
  return '<div class="barreG">' + paires.map(p =>
    `<div class="l"><span>${ech(p[0])}</span><span class="zn"><i style="width:${Math.max(2, p[1] / max * 100)}%"></i></span><span style="text-align:right"><b>${p[1]}</b></span></div>`
  ).join('') + '</div>';
}

/* ============================================================ indicateurs
 * Porté à l'identique de s09_stats.js, sur les colonnes snake_case. */
const Stats = {
  synthese(lot) {
    const termine = lot.filter(o => o.statut === 'TERMINEE');
    const suspendu = lot.filter(o => o.statut === 'SUSPENDUE');
    const ouvert = lot.filter(estOuvert);
    const retard = ouvert.filter(o => etatEcheance(o) === 'retard');
    const bloque = lot.filter(o => o.statut === 'BLOQUE');
    const nonAffecte = ouvert.filter(o => !o.responsable_id);
    const avecDelai = termine.filter(o => o.date_fin && o.date_echeance);
    const dansDelai = avecDelai.filter(o => ecartOuvres(o.date_fin, o.date_echeance) >= 0);
    const avecDuree = termine.filter(o => o.date_fin && o.date_planifiee);
    const somme = avecDuree.reduce((s, o) => s + ecartOuvres(o.date_planifiee, o.date_fin), 0);
    const aujourdhui = auj();
    /* Base du taux de réalisation : activités arrivées à échéance seulement
       (compter aussi celles pas encore dues ferait chuter l'indicateur en
       début de période sans raison). */
    const dues = lot.filter(o => {
      if (o.statut === 'SUSPENDUE') return false;
      if (o.statut === 'TERMINEE') return true;
      return o.date_echeance && o.date_echeance <= aujourdhui;
    });
    const sansResultat = termine.filter(o => !o.resultat || String(o.resultat).trim() === '');
    return {
      total: lot.length, termine: termine.length, suspendu: suspendu.length, ouvert: ouvert.length,
      bloque: bloque.length, retard: retard.length, nonAffecte: nonAffecte.length, dues: dues.length,
      tauxRespect: avecDelai.length ? Math.round(dansDelai.length / avecDelai.length * 1000) / 10 : null,
      tauxRealisation: dues.length ? Math.round(termine.length / dues.length * 1000) / 10 : null,
      delaiMoyen: avecDuree.length ? Math.round(somme / avecDuree.length * 10) / 10 : null,
      sansResultat: sansResultat.length,
      listeRetard: retard.slice().sort((a, b) => joursRestants(a) - joursRestants(b)),
      listeBloque: bloque,
      listeHorsDelai: avecDelai.filter(o => ecartOuvres(o.date_fin, o.date_echeance) < 0)
    };
  },
  lotPeriode(bornes, lot) {
    const base = lot || visibles();
    return base.filter(o => dansPeriode(o.date_planifiee, bornes) || dansPeriode(o.date_fin, bornes));
  },
  parDivision(lot) {
    return D.divisions.map(d => {
      const sous = lot.filter(o => o.division_id === d.id);
      const s = Stats.synthese(sous); s.divisionId = d.id; s.libelle = d.court; return s;
    }).filter(s => s.total > 0);
  },
  parActeur(lot) {
    const m = {};
    lot.forEach(o => { const k = o.responsable_id || '__NA__'; (m[k] = m[k] || []).push(o); });
    return Object.keys(m).map(k => {
      const s = Stats.synthese(m[k]);
      s.acteurId = k === '__NA__' ? null : k;
      s.libelle = k === '__NA__' ? 'Non affectées' : nomAgent(k);
      s.enCours = m[k].filter(o => o.statut === 'EN_COURS' || o.statut === 'BLOQUE').length;
      return s;
    }).sort((a, b) => b.total - a.total);
  },
  parFrequence(lot) {
    const m = {};
    lot.forEach(o => { const k = o.frequence || 'A_LA_DEMANDE'; m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(k => [FREQUENCES[k] ? FREQUENCES[k].libelle : k, m[k]]).sort((a, b) => b[1] - a[1]);
  },
  surcharges() {
    const seuil = D.parametres.wip_par_agent;
    return Stats.parActeur(D.activites.filter(estOuvert)).filter(s => s.acteurId && s.enCours > seuil);
  },
  syntheseAttentions(lot) {
    const ouverts = lot.filter(p => p.statut !== 'RESOLU');
    const resolus = lot.filter(p => p.statut === 'RESOLU');
    const enRetard = ouverts.filter(p => p.echeance && ecartOuvres(auj(), p.echeance) < 0);
    let somme = 0, n = 0;
    resolus.forEach(p => { if (p.date && p.date_resolution) { somme += ecartOuvres(p.date, p.date_resolution); n++; } });
    return {
      total: lot.length, ouverts: ouverts.length, resolus: resolus.length, enRetard: enRetard.length,
      tauxResolution: lot.length ? Math.round(resolus.length / lot.length * 1000) / 10 : null,
      delaiMoyenResolution: n ? Math.round(somme / n * 10) / 10 : null,
      listeOuverts: ouverts.slice().sort((a, b) => (a.echeance || '9999') < (b.echeance || '9999') ? -1 : 1)
    };
  },
  /* Textes français figés — artefact qualité SMQ, à ne pas reformuler. */
  appreciation(taux, cible) {
    if (taux === null || taux === undefined)
      return "Aucune activité clôturée sur la période : l'indicateur n'est pas calculable.";
    if (taux >= 95) return 'La performance est conforme à la cible. Maintenir le dispositif en l\'état.';
    if (taux >= (cible || 85)) return 'Performance satisfaisante mais perfectible. Cibler les activités les plus en écart.';
    if (taux >= 70) return 'Performance insuffisante. Analyser les causes de dépassement et renforcer le suivi hebdomadaire.';
    return 'Performance critique. Une action corrective formalisée est requise.';
  }
};

/* ======================================================== démarrage / menu */
async function demarrer() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  const { data: { user } } = await sb.auth.getUser();
  const { data: moi } = await sb.from('acteurs').select('*').eq('user_id', user.id).eq('actif', true).maybeSingle();
  if (!moi) { window.location.href = 'index.html'; return; }
  D.moi = moi;

  const { data: acc } = await sb.from('module_acces').select('role_module')
    .eq('id_acteur', moi.id_acteur).eq('module', 'operations').eq('actif', true).maybeSingle();
  if (!acc) {
    $('#ecranAcces').classList.remove('hidden');
    $('#msgAcces').textContent = `Votre compte (${moi.nom_prenoms}) n'a pas accès à la chambre « Gestion des opérations (D2MG) ». Demandez son ouverture au Pilote depuis l'accueil D2MG Pilotage.`;
    return;
  }
  const { data: dr } = await sb.from('acteur_droits').select('droit_code,autorise').eq('id_acteur', moi.id_acteur);
  D.droits = {}; (dr || []).forEach(x => D.droits[x.droit_code] = x.autorise);

  await chargerFeries();
  await chargerReferentiels();
  await chargerActivites();
  await chargerSeances();

  $('#app').classList.remove('hidden');
  $('#qui').innerHTML = `<strong style="color:#fff">${ech(moi.nom_prenoms)}</strong><br>${ech(moi.fonction || moi.role)}`
    + (moi.division_operations_id ? `<br><span style="opacity:.8">${ech(nomDivision(moi.division_operations_id))}</span>` : '');
  $('#btnDeco').addEventListener('click', async () => { await sb.auth.signOut(); window.location.href = 'index.html'; });
  $('#modFermer').addEventListener('click', fermerModale);
  aller('bord');
}

async function chargerReferentiels() {
  const [dv, ct, pr, at, ag] = await Promise.all([
    sb.from('operations_divisions').select('*').order('ordre'),
    sb.from('operations_catalogue').select('*').order('division_id').order('intitule'),
    sb.from('operations_parametres').select('*').eq('id', true).maybeSingle(),
    sb.from('operations_attentions').select('*').order('echeance'),
    sb.from('acteurs').select('id_acteur,nom_prenoms,fonction,role,actif,division_operations_id,role_operations').eq('actif', true).order('nom_prenoms')
  ]);
  D.divisions = dv.data || [];
  D.catalogue = ct.data || [];
  if (pr.data) D.parametres = pr.data;
  D.attentions = at.data || [];
  D.agents = ag.data || [];
}
async function chargerActivites() {
  const { data, error } = await sb.from('operations_activites').select('*').order('date_echeance');
  if (error) { toast('Erreur de chargement des activités : ' + error.message, 'err'); return; }
  D.activites = data || [];
}
async function chargerSeances() {
  const { data, error } = await sb.from('operations_seances').select('*').order('date', { ascending: false });
  if (error) { toast('Erreur de chargement des séances : ' + error.message, 'err'); return; }
  D.seances = data || [];
}
async function chargerAttentions() {
  const { data, error } = await sb.from('operations_attentions').select('*').order('echeance');
  if (error) { toast('Erreur de chargement des points d\'attention : ' + error.message, 'err'); return; }
  D.attentions = data || [];
}
async function rafraichir() { await chargerActivites(); aller(D.vue); }

const Compteurs = {
  mes: () => D.activites.filter(o => o.responsable_id === D.moi.id_acteur && estOuvert(o)).length,
  attention: () => D.attentions.filter(p => p.statut !== 'RESOLU').length
};

const VUES = [
  { grp: "Vue d'ensemble" },
  { id: 'bord', lib: 'Tableau de bord', ic: '◧' },
  { id: 'aujourdhui', lib: "Aujourd'hui", ic: '☀' },
  { grp: 'Mon travail' },
  { id: 'mes', lib: 'Mes activités', ic: '☑', badge: () => Compteurs.mes() },
  { id: 'kanban', lib: 'Suivi (kanban)', ic: '▤' },
  { id: 'planifier', lib: 'Planifier', ic: '✎', droit: 'ops.planifier' },
  { grp: 'Animation' },
  { id: 'attention', lib: "Points d'attention", ic: '⚑', badge: () => Compteurs.attention() },
  { id: 'revue', lib: 'Revue hebdomadaire', ic: '↻' },
  { id: 'revueMois', lib: 'Revue mensuelle', ic: '↻' },
  { grp: 'Restitution' },
  { id: 'registre', lib: 'Registre général', ic: '≡' },
  { id: 'rapports', lib: 'Rapports', ic: '▦', droit: 'ops.rapport' },
  { id: 'catalogue', lib: 'Catalogue', ic: '📚' },
  { grp: 'Configuration' },
  { id: 'parametrage', lib: 'Paramétrage', ic: '⚙', droit: 'ops.parametrer' },
  { id: 'annuaire', lib: 'Annuaire', ic: '👥', droit: 'ops.parametrer' },
  { id: 'aide', lib: "Mode d'emploi", ic: '?' }
];

function construireMenu() {
  let h = '';
  VUES.forEach(v => {
    if (v.grp) { h += `<div class="grp">${ech(v.grp)}</div>`; return; }
    if (v.droit && !aDroit(v.droit)) return;
    const n = v.badge ? v.badge() : 0;
    h += `<button type="button" class="lien${D.vue === v.id ? ' active' : ''}" data-vue="${v.id}">
      <span class="ic">${v.ic}</span><span>${ech(v.lib)}</span>${n > 0 ? `<span class="pastille">${n}</span>` : ''}</button>`;
  });
  $('#menu').innerHTML = h;
  $$('#menu button[data-vue]').forEach(b => b.addEventListener('click', () => aller(b.dataset.vue)));
}

const RENDU = {
  bord: vueBord,
  aujourdhui: vueAujourdhui,
  mes: vueMes,
  kanban: vueKanban,
  planifier: vuePlanifier,
  attention: vueAttention,
  revue: vueRevue,
  revueMois: vueRevueMois,
  registre: vueRegistre,
  rapports: vueRapports,
  catalogue: vueCatalogue,
  parametrage: vueParametrage,
  annuaire: vueAnnuaire,
  aide: vueAide
};
function aller(v) { D.vue = v; construireMenu(); (RENDU[v] || vueBord)(); window.scrollTo(0, 0); }

function vuePlaceholder(titre, desc) {
  $('#zone').innerHTML = `<div class="tete"><div><h1>${ech(titre)}</h1><p>${ech(desc)}</p></div></div>
    <div class="carte"><p class="gris">Cet écran sera livré dans une prochaine phase du portage vers Supabase. Les données sous-jacentes sont déjà protégées par les mêmes droits d'usage (ops.*) que le reste du module.</p></div>`;
}

/* ---------------------------------------------------------------- modale */
function ouvrirModale(titre, corps, actions) {
  $('#modTitre').textContent = titre;
  $('#modCorps').innerHTML = corps;
  $('#modActions').innerHTML = '';
  (actions || []).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.cl || ''); b.type = 'button'; b.textContent = a.lib;
    b.addEventListener('click', a.act); $('#modActions').appendChild(b);
  });
  $('#modale').classList.add('on');
}
function fermerModale() { $('#modale').classList.remove('on'); }
function modaleTexte(titre, label, cb, req) {
  ouvrirModale(titre, `<label>${ech(label)}</label><textarea id="mt" rows="4"></textarea>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale }, { lib: 'Valider', cl: 'primaire', act: () => cb($('#mt').value.trim()) }]);
}

/* ======================================================== TABLEAU DE BORD */
function vueBord() {
  const e = D.etat.bord || (D.etat.bord = { periode: 'MOIS' });
  const b = bornesPeriode(e.periode);
  const lot = Stats.lotPeriode(b);
  const s = Stats.synthese(lot);
  const att = Stats.syntheseAttentions(attentionsVisibles());
  const surch = Stats.surcharges();
  const p = D.parametres;

  const alertes = [];
  if (s.nonAffecte) alertes.push(`${s.nonAffecte} activité(s) planifiée(s) mais <b>non affectée(s)</b> — personne ne les traite aujourd'hui.`);
  if (surch.length) alertes.push(`${surch.length} acteur(s) au-delà du seuil de charge de ${p.wip_par_agent} activités simultanées.`);
  if (s.sansResultat) alertes.push(`${s.sansResultat} activité(s) terminée(s) sans résultat documenté.`);

  const pd = Stats.parDivision(lot);
  const pa = Stats.parActeur(lot.filter(estOuvert)).slice(0, 10);
  const pf = Stats.parFrequence(lot);

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Tableau de bord</h1>
      <p>Vue d'ensemble des activités de la D2MG : volume, respect des délais contractuels, blocages et points d'attention.</p></div></div>
    <div class="barre noPrint">
      <div style="min-width:220px"><label>Période</label><select id="f_periode">
        ${PERIODES.map(x => `<option value="${x.code}" ${e.periode === x.code ? 'selected' : ''}>${ech(x.libelle)}</option>`).join('')}
      </select></div>
      <span class="gris" style="padding-bottom:9px">${ech(b.libelle)}</span>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="lib">Activités de la période</div><div class="val">${s.total}</div><div class="sub">${s.termine} terminées · ${s.ouvert} en cours</div></div>
      <div class="kpi ${s.tauxRealisation === null ? '' : (s.tauxRealisation >= p.cible_realisation ? 'ok' : (s.tauxRealisation >= 70 ? 'al' : 'ko'))}">
        <div class="lib">Taux de réalisation</div><div class="val">${pct(s.tauxRealisation)}</div><div class="sub">des ${s.dues} arrivées à échéance · cible ${p.cible_realisation} %</div></div>
      <div class="kpi ${s.tauxRespect === null ? '' : (s.tauxRespect >= p.cible_respect_delai ? 'ok' : (s.tauxRespect >= 70 ? 'al' : 'ko'))}">
        <div class="lib">Respect des délais</div><div class="val">${pct(s.tauxRespect)}</div><div class="sub">cible ${p.cible_respect_delai} %</div></div>
      <div class="kpi ${s.retard ? 'ko' : 'ok'}"><div class="lib">En retard</div><div class="val">${s.retard}</div><div class="sub">${s.retard ? 'à traiter en priorité' : 'aucun retard'}</div></div>
      <div class="kpi ${s.bloque ? 'al' : ''}"><div class="lib">Bloquées</div><div class="val">${s.bloque}</div><div class="sub">${s.bloque ? "en attente d'un tiers" : 'aucun blocage'}</div></div>
      <div class="kpi ${att.ouverts ? 'al' : 'ok'}"><div class="lib">Points d'attention</div><div class="val">${att.ouverts}</div><div class="sub">${att.enRetard ? att.enRetard + ' hors délai' : 'ouverts'}</div></div>
    </div>
    ${alertes.length ? `<div class="msgInfo noPrint"><b>À regarder :</b><ul style="margin:6px 0 0;padding-left:20px;line-height:1.6">${alertes.map(a => `<li>${a}</li>`).join('')}</ul></div>` : ''}
    <div class="carte"><h3>Performance par division</h3>
      ${pd.length ? `<div class="tw" style="max-height:none"><table><thead><tr><th>Division</th><th class="centre">Activités</th><th class="centre">Terminées</th>
        <th class="centre">En cours</th><th class="centre">En retard</th><th class="centre">Bloquées</th><th class="centre">Réalisation</th><th class="centre">Respect délai</th><th class="centre">Délai moyen</th></tr></thead>
        <tbody>${pd.map(d => `<tr data-division="${ech(d.divisionId)}" style="cursor:pointer">
          <td><b>${ech(d.libelle)}</b></td><td class="centre">${d.total}</td><td class="centre">${d.termine}</td><td class="centre">${d.ouvert}</td>
          <td class="centre">${d.retard ? `<span class="et rouge">${d.retard}</span>` : '0'}</td>
          <td class="centre">${d.bloque ? `<span class="et orange">${d.bloque}</span>` : '0'}</td>
          <td class="centre">${pct(d.tauxRealisation)}</td><td class="centre">${pct(d.tauxRespect)}</td><td class="centre">${jrs(d.delaiMoyen)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vide">Aucune activité sur la période.</div>'}
    </div>
    <div class="deux">
      <div class="carte"><h3>Charge en cours par acteur</h3>${barresHtml(pa.map(a => [a.libelle, a.ouvert]))}
        <p class="gris" style="font-size:11px;margin-top:8px">Seuil d'alerte de charge : ${p.wip_par_agent} activités simultanées par acteur.</p></div>
      <div class="carte"><h3>Répartition par rythme d'activité</h3>${barresHtml(pf)}</div>
    </div>
    <div class="carte"><h3>Activités en retard</h3>
      ${tableauActivites(s.listeRetard.slice(0, 12), { vide: 'Aucune activité en retard sur la période. La situation est maîtrisée.' })}
    </div>
    <div class="carte"><h3>Points d'attention ouverts</h3>
      ${att.listeOuverts.length ? `<div class="tw" style="max-height:none"><table><thead><tr><th>N°</th><th>Point d'attention</th><th>Division</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
        <tbody>${att.listeOuverts.slice(0, 8).map(pnt => `<tr>
          <td class="mono">${ech(numCourt(pnt.numero))}</td><td><b>${ech(pnt.intitule)}</b></td>
          <td>${ech(nomDivision(pnt.division_id))}</td><td>${ech(pnt.responsable_id ? nomAgent(pnt.responsable_id) : '—')}</td>
          <td>${dateFr(pnt.echeance)}${pnt.echeance && ecartOuvres(auj(), pnt.echeance) < 0 ? ' <span class="et rouge">dépassée</span>' : ''}</td>
          <td>${badgeStatutAtt(pnt.statut)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vide">Aucun point d\'attention ouvert.</div>'}
      <p class="gris" style="font-size:11px;margin-top:8px">Le traitement des points d'attention (Andon) sera disponible dans une prochaine phase.</p>
    </div>`;

  $('#f_periode').addEventListener('change', ev => { e.periode = ev.target.value; vueBord(); });
  $$('[data-fiche]').forEach(tr => tr.addEventListener('click', () => ouvrirFiche(tr.dataset.fiche)));
  $$('[data-division]').forEach(tr => tr.addEventListener('click', () => { D.etat.kanban = Object.assign(D.etat.kanban || {}, { division: tr.dataset.division }); aller('kanban'); }));
}

/* ================================================= TABLEAUX D'ACTIVITÉS */
function ligneActivite(o, opt) {
  opt = opt || {};
  return `<tr data-fiche="${ech(o.id)}" style="cursor:pointer">
    <td class="mono">${ech(numCourt(o.numero))}</td>
    <td><b>${ech(o.intitule)}</b>${o.precision ? `<div class="gris" style="font-size:11px">${ech(o.precision)}</div>` : ''}</td>
    ${opt.sansDivision ? '' : `<td>${ech(nomDivision(o.division_id))}</td>`}
    <td>${o.responsable_id ? ech(nomAgent(o.responsable_id)) : '<span class="et orange">À affecter</span>'}</td>
    <td>${dateFr(o.date_echeance)}</td>
    <td>${badgeStatut(o.statut)} ${badgePriorite(o.priorite)}</td>
    <td>${badgeEcheance(o)}</td>
  </tr>`;
}
function tableauActivites(lot, opt) {
  opt = opt || {};
  if (!lot.length) return `<div class="vide">${ech(opt.vide || 'Aucune activité.')}</div>`;
  return `<div class="tw" style="max-height:none"><table><thead><tr><th>N°</th><th>Activité</th>${opt.sansDivision ? '' : '<th>Division</th>'}
    <th>Responsable</th><th>Échéance</th><th>Statut</th><th>Délai</th></tr></thead>
    <tbody>${lot.map(o => ligneActivite(o, opt)).join('')}</tbody></table></div>`;
}
function ficheKanban(o) {
  const cl = o.statut === 'SUSPENDUE' ? 'suspendu' : classeEcheance(o);
  return `<div class="fiche ${cl}" data-fiche="${ech(o.id)}">
    <div class="gris" style="font-size:10.5px">${ech(numCourt(o.numero))} · ${ech(nomDivision(o.division_id))}</div>
    <div><b>${ech(tronque(o.intitule, 72))}</b></div>
    <div style="margin-top:4px">${badgeEcheance(o)} ${badgePriorite(o.priorite)}</div>
    <div class="gris" style="font-size:11px;margin-top:4px">${o.responsable_id ? ech(nomAgent(o.responsable_id)) : 'Non affectée'}</div>
  </div>`;
}

/* =========================================================== MES ACTIVITÉS */
function vueMes() {
  const mien = D.activites.filter(o => o.responsable_id === D.moi.id_acteur);
  const ouvert = mien.filter(estOuvert).sort((a, b) => joursRestants(a) - joursRestants(b));
  const clos = mien.filter(estClos).sort((a, b) => (b.date_fin || '') < (a.date_fin || '') ? -1 : 1);
  const s = Stats.synthese(mien);
  const seuil = D.parametres.wip_par_agent;
  const enCours = mien.filter(o => o.statut === 'EN_COURS' || o.statut === 'BLOQUE').length;

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Mes activités</h1><p>Votre file de travail personnelle, classée par urgence.</p></div></div>
    <div class="kpis">
      <div class="kpi"><div class="lib">À traiter</div><div class="val">${ouvert.length}</div><div class="sub">activités ouvertes</div></div>
      <div class="kpi ${enCours > seuil ? 'ko' : 'ok'}"><div class="lib">En cours simultanément</div><div class="val">${enCours}</div><div class="sub">seuil de charge : ${seuil}</div></div>
      <div class="kpi ${s.retard ? 'ko' : 'ok'}"><div class="lib">En retard</div><div class="val">${s.retard}</div><div class="sub">délai dépassé</div></div>
      <div class="kpi ${s.bloque ? 'al' : ''}"><div class="lib">Bloquées</div><div class="val">${s.bloque}</div><div class="sub">en attente d'un tiers</div></div>
      <div class="kpi ok"><div class="lib">Terminées</div><div class="val">${s.termine}</div><div class="sub">depuis l'origine</div></div>
    </div>
    ${enCours > seuil ? `<div class="msgInfo">Charge élevée : vous avez ${enCours} activités démarrées en même temps, au-delà du seuil de ${seuil}. Terminez-en avant d'en démarrer d'autres — c'est ce qui raccourcit les délais.</div>` : ''}
    <div class="carte"><h3>Ma file de travail</h3>
      ${tableauActivites(ouvert, { sansDivision: true, vide: "Vous n'avez aucune activité en cours. Rien ne vous attend." })}
    </div>
    <div class="carte"><h3>Mes dernières activités clôturées</h3>
      ${clos.length ? `<div class="tw" style="max-height:none"><table><thead><tr><th>N°</th><th>Activité</th><th>Réalisée le</th><th>Résultat</th><th>Délai</th></tr></thead>
        <tbody>${clos.slice(0, 15).map(o => `<tr data-fiche="${ech(o.id)}" style="cursor:pointer">
          <td class="mono">${ech(numCourt(o.numero))}</td><td><b>${ech(tronque(o.intitule, 55))}</b></td>
          <td>${dateFr(o.date_fin)}</td><td>${ech(tronque(o.resultat || o.motif_suspension || '', 70))}</td>
          <td>${badgeEcheance(o)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vide">Aucune activité clôturée pour l\'instant.</div>'}
    </div>`;
  $$('[data-fiche]').forEach(tr => tr.addEventListener('click', () => ouvrirFiche(tr.dataset.fiche)));
}

/* ================================================================= KANBAN */
function vueKanban() {
  const e = D.etat.kanban || (D.etat.kanban = { division: '', acteur: '', masquerClos: true });
  let lot = D.activites.slice();
  if (e.division) lot = lot.filter(o => o.division_id === e.division);
  if (e.acteur) lot = lot.filter(o => o.responsable_id === e.acteur);
  if (e.masquerClos) lot = lot.filter(estOuvert);

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Suivi des activités</h1>
      <p>Cliquez sur une fiche pour l'ouvrir et agir dessus. La bande de couleur à gauche indique l'état du délai : vert dans le délai, orange proche, rouge en retard.</p></div></div>
    <div class="barre noPrint">
      <div style="min-width:190px"><label>Division</label><select id="f_div"><option value="">Toutes</option>
        ${D.divisions.map(d => `<option value="${ech(d.id)}" ${e.division === d.id ? 'selected' : ''}>${ech(d.court)}</option>`).join('')}</select></div>
      <div style="min-width:190px"><label>Acteur</label><select id="f_ac"><option value="">Tous</option>
        ${D.agents.map(a => `<option value="${ech(a.id_acteur)}" ${e.acteur === a.id_acteur ? 'selected' : ''}>${ech(a.nom_prenoms)}</option>`).join('')}</select></div>
      <label style="font-weight:400;color:var(--gris);display:flex;align-items:center;gap:6px;padding-bottom:9px">
        <input type="checkbox" id="f_mc" ${e.masquerClos ? 'checked' : ''}> Masquer les activités closes</label>
      <span class="gris" style="padding-bottom:9px">${lot.length} activité(s)</span>
      ${aDroit('ops.planifier') ? '<button class="btn primaire" id="btnPlanifier" style="margin-left:auto">Planifier une activité</button>' : ''}
    </div>
    <div class="kanban">${ORDRE_STATUTS.map(code => {
      const st = STATUTS[code];
      const col = lot.filter(o => o.statut === code).sort((a, b) => joursRestants(a) - joursRestants(b));
      return `<div class="kcol"><h4><span>${ech(st.libelle)}</span><span>${col.length}</span></h4>
        ${col.length ? col.map(ficheKanban).join('') : '<p class="gris" style="font-size:11px;padding:6px 4px">—</p>'}</div>`;
    }).join('')}</div>`;

  $('#f_div').addEventListener('change', ev => { e.division = ev.target.value; vueKanban(); });
  $('#f_ac').addEventListener('change', ev => { e.acteur = ev.target.value; vueKanban(); });
  $('#f_mc').addEventListener('change', ev => { e.masquerClos = ev.target.checked; vueKanban(); });
  const bp = $('#btnPlanifier'); if (bp) bp.addEventListener('click', () => aller('planifier'));
  $$('[data-fiche]').forEach(el => el.addEventListener('click', () => ouvrirFiche(el.dataset.fiche)));
}

/* ============================================================= CATALOGUE */
function vueCatalogue() {
  const e = D.etat.catalogue || (D.etat.catalogue = { division: '' });
  const cat = D.catalogue.filter(f => !e.division || f.division_id === e.division);

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Catalogue d'activités</h1>
      <p>Le catalogue décrit le travail standard de chaque division de la D2MG : les activités qui reviennent, leur rythme et leur délai contractuel.</p></div></div>
    <div class="barre noPrint">
      <button type="button" class="btn ${e.division === '' ? 'primaire' : ''}" data-div="">Toutes</button>
      ${D.divisions.map(d => `<button type="button" class="btn ${e.division === d.id ? 'primaire' : ''}" data-div="${ech(d.id)}">${ech(d.court)}</button>`).join('')}
      <span class="gris" style="margin-left:auto;padding-bottom:9px">${cat.length} activité(s) au catalogue</span>
    </div>
    ${D.divisions.map(d => {
      const sous = cat.filter(f => f.division_id === d.id);
      if (!sous.length) return '';
      return `<div class="carte"><h3>${ech(d.libelle)} <span class="et gris">${sous.length}</span></h3>
        <div class="tw" style="max-height:none"><table><thead><tr><th>Code</th><th>Activité</th><th>Rythme</th><th class="centre">Délai proposé</th>
          <th>Portée par</th><th class="centre">Occurrences</th>${aDroit('ops.planifier') ? '<th class="noPrint"></th>' : ''}</tr></thead>
          <tbody>${sous.map(f => {
            const occ = D.activites.filter(o => o.fiche_id === f.id).length;
            return `<tr><td class="mono">${ech(f.id)}</td><td>${ech(f.intitule)}${f.actif === false ? ' <span class="et gris">inactive</span>' : ''}</td>
              <td>${ech(FREQUENCES[f.frequence] ? FREQUENCES[f.frequence].libelle : f.frequence)}</td>
              <td class="centre">${f.delai} j</td>
              <td>${(f.roles && f.roles.length) ? f.roles.map(r => ROLES_LABELS[r] || r).join(', ') : '—'}</td>
              <td class="centre">${occ}</td>
              ${aDroit('ops.planifier') ? `<td class="noPrint"><button type="button" class="btn sm" data-reconduire="${ech(f.id)}">Planifier</button></td>` : ''}</tr>`;
          }).join('')}</tbody></table></div></div>`;
    }).join('')}`;

  $$('[data-div]').forEach(bt => bt.addEventListener('click', () => { e.division = bt.dataset.div; vueCatalogue(); }));
  $$('[data-reconduire]').forEach(bt => bt.addEventListener('click', () => {
    const f = D.catalogue.find(x => x.id === bt.dataset.reconduire);
    D.etat.planifierPreset = { ficheId: bt.dataset.reconduire, divisionId: f ? f.division_id : '' };
    aller('planifier');
  }));
}

/* ============================================================= PLANIFIER */
function vuePlanifier() {
  if (!aDroit('ops.planifier')) {
    $('#zone').innerHTML = `<div class="tete"><div><h1>Planifier une activité</h1></div></div>
      <div class="msgInfo">Votre profil ne permet pas de planifier une activité. Adressez-vous à votre chef de division ou au Pilote du processus.</div>`;
    return;
  }
  const preset = D.etat.planifierPreset || {};
  D.etat.planifierPreset = null;
  const divDefaut = preset.divisionId || D.moi.division_operations_id || (D.divisions[0] ? D.divisions[0].id : '');
  const demain = prochainOuvre(auj());

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Planifier une activité</h1>
      <p>Choisissez une <b>activité du catalogue</b> (délais et rythme déjà arrêtés — recommandé) ou créez une <b>activité ponctuelle</b> pour un sujet qui ne revient pas.</p></div></div>
    <div class="carte"><div class="champs">
      <div>
        <label for="pl_origine">Type d'activité</label>
        <select id="pl_origine">
          <option value="CATALOGUE">Activité du catalogue (recommandé)</option>
          <option value="AD_HOC">Activité ponctuelle</option>
        </select>
        <label for="pl_division">Division</label>
        <select id="pl_division">${D.divisions.map(d => `<option value="${ech(d.id)}" ${d.id === divDefaut ? 'selected' : ''}>${ech(d.libelle)}</option>`).join('')}</select>
        <div id="bloc_catalogue">
          <label for="pl_fiche">Activité</label><select id="pl_fiche"></select>
          <div class="aide">Le rythme et le délai sont repris automatiquement du catalogue.</div>
        </div>
        <div id="bloc_libre" class="hidden">
          <label for="pl_intitule">Intitulé de l'activité</label>
          <input type="text" id="pl_intitule" maxlength="160" placeholder="Commencez par un verbe d'action">
          <label for="pl_delai_libre">Délai en jours ouvrés</label>
          <input type="number" id="pl_delai_libre" value="3" min="1" max="120">
        </div>
        <label for="pl_precision">Précision (facultatif)</label>
        <input type="text" id="pl_precision" maxlength="180" placeholder="Ce qui distingue cette occurrence des précédentes">
      </div>
      <div>
        <label for="pl_resp">Responsable</label><select id="pl_resp"></select>
        <div class="aide">Peut rester vide : l'activité apparaîtra alors dans les alertes « à affecter ».</div>
        <label for="pl_priorite">Priorité</label>
        <select id="pl_priorite">${Object.keys(PRIORITES).sort((a, b) => PRIORITES[a].ordre - PRIORITES[b].ordre)
          .map(k => `<option value="${k}" ${k === 'NORMAL' ? 'selected' : ''}>${ech(PRIORITES[k].libelle)}</option>`).join('')}</select>
        <div class="aide">Urgent réduit le délai de moitié, non urgent le majore de moitié.</div>
        <label for="pl_date">Planifiée le</label>
        <input type="date" id="pl_date" value="${demain}">
        <label>Échéance calculée</label>
        <div class="chrono" id="pl_chrono" style="padding:8px 0 0 14px">—</div>
      </div>
    </div>
    <div class="barre" style="margin:14px 0 0">
      <button type="button" class="btn primaire" id="pl_valider">Enregistrer l'activité</button>
      <button type="button" class="btn" id="pl_annuler">Annuler</button>
    </div></div>`;

  function majFicheEtResp() {
    const div = $('#pl_division').value;
    const sf = $('#pl_fiche');
    const fic = D.catalogue.filter(f => f.actif && f.division_id === div);
    sf.innerHTML = fic.length
      ? fic.map(f => `<option value="${ech(f.id)}">${ech(f.id)} — ${ech(f.intitule)} (${ech(FREQUENCES[f.frequence] ? FREQUENCES[f.frequence].libelle : f.frequence)}, ${f.delai} j)</option>`).join('')
      : '<option value="">Aucune activité au catalogue pour cette division</option>';
    if (preset.ficheId && fic.some(f => f.id === preset.ficheId)) sf.value = preset.ficheId;
    const sr = $('#pl_resp');
    let cand = agentsDe(div); if (!cand.length) cand = D.agents;
    sr.innerHTML = '<option value="">— À affecter plus tard —</option>' +
      cand.map(a => `<option value="${ech(a.id_acteur)}">${ech(a.nom_prenoms)}${a.fonction ? ' — ' + ech(a.fonction) : ''}</option>`).join('');
    recalculer();
  }
  function recalculer() {
    const origine = $('#pl_origine').value;
    const f = origine === 'CATALOGUE' ? D.catalogue.find(x => x.id === $('#pl_fiche').value) : null;
    const base = origine === 'CATALOGUE' ? (f ? f.delai : 3) : (parseInt($('#pl_delai_libre').value, 10) || 3);
    const prio = $('#pl_priorite').value || 'NORMAL';
    const dp = $('#pl_date').value || auj();
    const delai = delaiEffectif(base, prio);
    const echCalc = ajoutOuvres(dp, delai);
    const motif = prio === 'URGENT' ? ` (délai de base ${base} j, réduit de moitié pour une activité urgente)`
      : prio === 'NON_URGENT' ? ` (délai de base ${base} j, majoré de moitié)` : ` (délai de base ${base} j)`;
    $('#pl_chrono').innerHTML = `Planifiée le <b>${dateFr(dp)}</b>${estOuvre(dp) ? '' : ' <span class="et orange">jour non ouvré</span>'}
      &nbsp;→&nbsp; délai de <b>${delai} jours ouvrés</b>${ech(motif)}<br>Échéance calculée : <b>${dateLongue(echCalc)}</b>
      <br><span class="gris" style="font-size:11px">Les samedis, dimanches et jours fériés ne sont pas comptés.</span>`;
    $('#bloc_libre').classList.toggle('hidden', origine === 'CATALOGUE');
    $('#bloc_catalogue').classList.toggle('hidden', origine !== 'CATALOGUE');
  }
  $('#pl_origine').addEventListener('change', recalculer);
  $('#pl_division').addEventListener('change', majFicheEtResp);
  $('#pl_fiche').addEventListener('change', recalculer);
  $('#pl_priorite').addEventListener('change', recalculer);
  $('#pl_date').addEventListener('change', recalculer);
  $('#pl_delai_libre').addEventListener('input', recalculer);
  $('#pl_annuler').addEventListener('click', () => aller('kanban'));
  $('#pl_valider').addEventListener('click', enregistrerPlanification);
  if (preset.ficheId) $('#pl_origine').value = 'CATALOGUE';
  majFicheEtResp();
}

async function enregistrerPlanification() {
  const btn = $('#pl_valider'); if (btn) btn.disabled = true;
  const origine = $('#pl_origine').value;
  const div = $('#pl_division').value;
  const dp = $('#pl_date').value;
  const prio = $('#pl_priorite').value || 'NORMAL';
  const resp = $('#pl_resp').value;
  const prec = ($('#pl_precision').value || '').trim();

  let intitule = '', ficheId = null, base = 3, freq = 'A_LA_DEMANDE';
  const erreurs = [];
  if (origine === 'CATALOGUE') {
    const f = D.catalogue.find(x => x.id === $('#pl_fiche').value);
    if (!f) erreurs.push("Choisissez l'activité dans le catalogue de la division.");
    else { intitule = f.intitule; ficheId = f.id; base = f.delai; freq = f.frequence; }
  } else {
    intitule = ($('#pl_intitule').value || '').trim();
    if (intitule.length < 5) erreurs.push("Indiquez l'intitulé de l'activité (5 caractères minimum, en commençant par un verbe).");
    base = parseInt($('#pl_delai_libre').value, 10);
    if (!base || base < 1) erreurs.push("Indiquez un délai d'au moins 1 jour ouvré.");
  }
  if (!div) erreurs.push('Choisissez la division qui portera l\'activité.');
  if (!dp) erreurs.push("Indiquez la date à laquelle l'activité est planifiée.");
  if (erreurs.length) { toast(erreurs[0], 'err'); if (btn) btn.disabled = false; return; }

  const delai = delaiEffectif(base, prio);
  const dateEch = ajoutOuvres(dp, delai);

  const { data: numero, error: errNum } = await sb.rpc('operations_numeroter', { p_serie: 'ACT' });
  if (errNum) { toast('Erreur de numérotation : ' + errNum.message, 'err'); if (btn) btn.disabled = false; return; }

  const payload = {
    numero, origine, fiche_id: ficheId, division_id: div, intitule, precision: prec,
    frequence: freq, responsable_id: resp || null, priorite: prio,
    date_planifiee: dp, delai_jours: delai, date_echeance: dateEch, statut: 'A_FAIRE',
    created_by: D.moi.id_acteur
  };
  const { data: nouv, error } = await sb.from('operations_activites').insert(payload).select().single();
  if (error) { toast('Erreur : ' + error.message, 'err'); if (btn) btn.disabled = false; return; }

  await tracerActivite(nouv.id, 'Planification', `Activité planifiée pour le ${dateFr(dp)}, échéance au ${dateFr(dateEch)}`);
  if (resp) await tracerActivite(nouv.id, 'Affectation', 'Confiée à ' + nomAgent(resp));

  toast(`Activité ${numCourt(numero)} enregistrée. Échéance au ${dateFr(dateEch)}.`, 'ok');
  D.etat.kanban = Object.assign(D.etat.kanban || {}, { division: div, masquerClos: true });
  await chargerActivites();
  aller('kanban');
}

/* ===================================================== FICHE D'ACTIVITÉ
 * Volet latéral (comme courriers-app.js::ouvrirFiche), gestes de la
 * machine à états gérés via les tables enfants (historique/commentaires). */
async function tracerActivite(activiteId, action, detail) {
  await sb.from('operations_activite_historique').insert({ activite_id: activiteId, auteur_id: D.moi.id_acteur, action, detail: detail || '' });
}
async function majActivite(o, patch, action, detail) {
  patch.updated_at = new Date().toISOString();
  const { error } = await sb.from('operations_activites').update(patch).eq('id', o.id);
  if (error) { toast('Erreur : ' + error.message, 'err'); return false; }
  Object.assign(o, patch);
  if (action) await tracerActivite(o.id, action, detail);
  return true;
}

async function ouvrirFiche(id) {
  const o = D.activites.find(x => x.id === id);
  if (!o) { toast('Activité introuvable.', 'err'); return; }
  const [{ data: coms }, { data: hist }] = await Promise.all([
    sb.from('operations_activite_commentaires').select('*').eq('activite_id', id).order('created_at'),
    sb.from('operations_activite_historique').select('*').eq('activite_id', id).order('created_at')
  ]);
  const f = o.fiche_id ? D.catalogue.find(x => x.id === o.fiche_id) : null;

  const voile = document.createElement('div'); voile.className = 'voile'; voile.id = 'voile';
  voile.addEventListener('click', fermerFiche); document.body.appendChild(voile);

  const v = document.createElement('div'); v.className = 'volet'; v.id = 'volet';
  v.innerHTML = `<button type="button" class="fermer" id="fFerm">✕</button>
    <div class="mono gris" style="font-size:11px">${ech(numCourt(o.numero))}</div>
    <h2 style="color:var(--accent-fonce);font-size:16px;margin:2px 0 8px">${ech(o.intitule)}</h2>
    <div style="margin-bottom:12px">${badgeStatut(o.statut)} ${badgePriorite(o.priorite)} ${badgeEcheance(o)}</div>
    ${o.precision ? `<div class="msgInfo"><b>Précision :</b> ${ech(o.precision)}</div>` : ''}
    ${o.statut === 'BLOQUE' ? `<div class="msgErreur"><b>Blocage signalé le ${dateFr(o.date_blocage)} :</b><br>${nl2br(o.motif_blocage || 'Motif non précisé')}</div>` : ''}
    ${o.statut === 'SUSPENDUE' ? `<div class="msgInfo"><b>Activité suspendue :</b><br>${nl2br(o.motif_suspension || 'Motif non précisé')}</div>` : ''}
    ${o.statut === 'TERMINEE' ? `<div class="msgOk"><b>Résultat obtenu (${dateFr(o.date_fin)}) :</b><br>${nl2br(o.resultat)}</div>` : ''}
    <div class="tw" style="max-height:none;margin-bottom:14px"><table><tbody>
      <tr><th style="width:42%">Division</th><td>${ech(nomDivision(o.division_id))}</td></tr>
      <tr><th>Responsable</th><td>${o.responsable_id ? ech(nomAgent(o.responsable_id)) : '<span class="et orange">À affecter</span>'}</td></tr>
      <tr><th>Origine</th><td>${o.origine === 'CATALOGUE' ? 'Catalogue — ' + ech(f ? f.id : '—') : 'Activité ponctuelle'}</td></tr>
      <tr><th>Planifiée le</th><td>${dateFr(o.date_planifiee)}</td></tr>
      <tr><th>Échéance</th><td><b>${dateFr(o.date_echeance)}</b></td></tr>
      <tr><th>Délai contractuel</th><td>${o.delai_jours} jours ouvrés</td></tr>
    </tbody></table></div>
    <div id="actionsFiche" style="margin-bottom:14px"></div>
    <h3 style="color:var(--accent-fonce);font-size:13px;margin-bottom:8px">Échanges</h3>
    <ul class="chrono">${(coms || []).map(c => `<li><div class="q">${dateFr((c.created_at || '').slice(0, 10))} — ${ech(nomAgent(c.auteur_id))} — ${ech(nomDivision(c.division_id))}</div>${nl2br(c.texte)}</li>`).join('')
      || '<li class="gris">Aucun échange sur cette activité.</li>'}</ul>
    <h3 style="color:var(--accent-fonce);font-size:13px;margin:16px 0 8px">Historique</h3>
    <ul class="chrono">${(hist || []).slice().reverse().map(h => `<li><div class="q">${dateFr((h.created_at || '').slice(0, 10))} — ${ech(nomAgent(h.auteur_id))}</div><b>${ech(h.action)}</b>${h.detail ? ' — ' + ech(h.detail) : ''}</li>`).join('')
      || '<li class="gris">Aucun mouvement enregistré.</li>'}</ul>
    <p class="gris" style="font-size:11px">L'historique n'est pas modifiable : il constitue la preuve documentaire du traitement.</p>`;
  document.body.appendChild(v);
  $('#fFerm').addEventListener('click', fermerFiche);
  construireActionsFiche(o);
}
function fermerFiche() { const a = $('#voile'), b = $('#volet'); if (a) a.remove(); if (b) b.remove(); }

function construireActionsFiche(o) {
  const z = $('#actionsFiche'); if (!z) return;
  const suivants = TRANSITIONS[o.statut] || [];
  const acts = [];
  if (!o.responsable_id && aDroit('ops.affecter')) acts.push({ id: 'affecter', lib: 'Affecter', cl: 'primaire' });
  if (suivants.indexOf('EN_COURS') !== -1 && aDroit('ops.traiter')) acts.push({ id: 'prendre', lib: o.statut === 'A_FAIRE' ? 'Prendre en main' : 'Reprendre', cl: 'primaire' });
  if (suivants.indexOf('BLOQUE') !== -1 && aDroit('ops.traiter')) acts.push({ id: 'bloquer', lib: 'Signaler un blocage', cl: '' });
  if (suivants.indexOf('TERMINEE') !== -1 && aDroit('ops.cloturer')) acts.push({ id: 'cloturer', lib: 'Clôturer', cl: 'primaire' });
  if (suivants.indexOf('SUSPENDUE') !== -1 && aDroit('ops.cloturer')) acts.push({ id: 'suspendre', lib: 'Suspendre', cl: '' });
  if (suivants.indexOf('A_FAIRE') !== -1 && aDroit('ops.planifier')) acts.push({ id: 'reprendreAFaire', lib: 'Remettre à faire', cl: '' });
  if (estOuvert(o) && (aDroit('ops.traiter') || aDroit('ops.planifier'))) acts.push({ id: 'commenter', lib: 'Ajouter un message', cl: 'doux' });

  z.innerHTML = acts.length
    ? `<div class="barre" style="margin:0">${acts.map(a => `<button type="button" class="btn sm ${a.cl}" data-act="${a.id}">${ech(a.lib)}</button>`).join('')}</div>`
    : '<p class="gris" style="font-size:11.5px">Aucune action disponible avec vos droits d\'usage sur cette activité.</p>';
  $$('[data-act]', z).forEach(b => b.addEventListener('click', () => actionFiche(o, b.dataset.act)));
}

function actionFiche(o, act) {
  if (act === 'affecter') return void modaleAffecter(o);
  if (act === 'prendre') return void (async () => {
    if (await majActivite(o, { statut: 'EN_COURS', date_blocage: null, motif_blocage: '' },
        o.statut === 'SUSPENDUE' ? 'Reprise' : 'Prise en main', 'Passage à « En cours »'))
    { toast('Activité prise en main.', 'ok'); fermerFiche(); await rafraichir(); }
  })();
  if (act === 'bloquer') return void modaleTexte('Signaler un blocage', "Qu'est-ce qui bloque ? (obligatoire)", async t => {
    if (!t) { toast('Indiquez ce qui bloque.', 'err'); return; }
    if (await majActivite(o, { statut: 'BLOQUE', motif_blocage: t, date_blocage: auj() }, 'Blocage signalé', t))
    { toast('Blocage signalé. Il apparaît dans le tableau de bord.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
  });
  if (act === 'cloturer') return void modaleCloturer(o);
  if (act === 'suspendre') return void modaleTexte("Suspendre l'activité", 'Motif de la suspension (obligatoire)', async t => {
    if (!t) { toast('Le motif de suspension est obligatoire.', 'err'); return; }
    if (await majActivite(o, { statut: 'SUSPENDUE', motif_suspension: t }, 'Suspension', t))
    { toast('Activité suspendue.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
  });
  if (act === 'reprendreAFaire') return void (async () => {
    if (await majActivite(o, { statut: 'A_FAIRE' }, 'Remise à faire', 'Passage de « Suspendue » à « À faire »'))
    { toast('Activité remise à faire.', 'ok'); fermerFiche(); await rafraichir(); }
  })();
  if (act === 'commenter') return void modaleTexte('Ajouter un message', "Message à l'attention des autres divisions", async t => {
    if (!t) { toast('Le message est vide.', 'err'); return; }
    const { error } = await sb.from('operations_activite_commentaires').insert({ activite_id: o.id, auteur_id: D.moi.id_acteur, division_id: D.moi.division_operations_id, texte: t });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    toast('Message publié.', 'ok'); fermerModale(); fermerFiche(); await rafraichir();
  });
}

function modaleAffecter(o) {
  let cand = agentsDe(o.division_id);
  const repli = !cand.length;
  if (repli) cand = D.agents;
  ouvrirModale("Affecter l'activité",
    `<p>${ech(o.intitule)}</p><label for="af_resp">Confier à</label>
     <select id="af_resp">${cand.map(a => `<option value="${ech(a.id_acteur)}">${ech(a.nom_prenoms)}${a.fonction ? ' — ' + ech(a.fonction) : ''}</option>`).join('')}</select>
     <div class="aide">${repli ? "Aucun acteur n'est encore rattaché à la division " + ech(nomDivision(o.division_id)) + " (voir Annuaire) — liste complète affichée."
        : 'Seuls les acteurs de la division ' + ech(nomDivision(o.division_id)) + ' sont proposés.'}</div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: "Confirmer l'affectation", cl: 'primaire', act: async () => {
        const v = $('#af_resp').value; if (!v) { toast('Choisissez un responsable.', 'err'); return; }
        if (await majActivite(o, { responsable_id: v }, 'Affectation', 'Confiée à ' + nomAgent(v)))
        { toast('Activité confiée à ' + nomAgent(v) + '.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
     } }]);
}
function modaleCloturer(o) {
  ouvrirModale("Clôturer l'activité",
    `<p><b>${ech(o.intitule)}</b></p>
     <div class="msgInfo">La clôture est impossible sans résultat : c'est ce qui garantit que le rapport de division dispose d'une preuve exploitable.</div>
     <label for="cl_res">Résultat obtenu (obligatoire)</label><textarea id="cl_res" rows="4">${ech(o.resultat || '')}</textarea>
     <div id="cl_err"></div>
     <label for="cl_date">Date de réalisation</label><input type="date" id="cl_date" value="${auj()}" max="${auj()}">
     <div class="aide">Échéance prévue : ${dateFr(o.date_echeance)}</div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Clôturer l\'activité', cl: 'primaire', act: async () => {
        const r = ($('#cl_res').value || '').trim();
        const d = $('#cl_date').value || auj();
        if (r.length < 5) { $('#cl_err').innerHTML = '<div class="msgErreur">Le résultat est obligatoire (5 caractères minimum, compréhensible par un lecteur extérieur).</div>'; return; }
        if (d > auj()) { $('#cl_err').innerHTML = '<div class="msgErreur">La date de réalisation ne peut pas être dans le futur.</div>'; return; }
        if (await majActivite(o, { statut: 'TERMINEE', resultat: r, date_fin: d, date_blocage: null }, 'Clôture', r)) {
          const ecart = ecartOuvres(d, o.date_echeance);
          toast(ecart >= 0 ? 'Activité clôturée dans le délai.' : `Activité clôturée avec ${-ecart} jour(s) de retard.`, 'ok');
          fermerModale(); fermerFiche(); await rafraichir();
        }
     } }]);
}

/* ============================================================ UTILITAIRES */
function estPiloteOuCopilote() { return D.moi && ['Pilote', 'Co-pilote'].includes(D.moi.role); }
function veilleOuvree() {
  let d = dt(auj()), garde = 0;
  do { d.setDate(d.getDate() - 1); garde++; } while (!estOuvre(iso(d)) && garde < 30);
  return iso(d);
}
function csvLigne(vals) {
  return vals.map(v => { v = v === null || v === undefined ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';');
}
function telechargerFichier(nom, contenu, type) {
  const blob = new Blob([contenu], { type: type || 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function telechargerCsv(nom, contenu) { telechargerFichier(nom, '﻿' + contenu, 'text/csv'); }
async function enregistrerSeance(type, existante, payload, action, detail) {
  let error;
  if (existante) {
    ({ error } = await sb.from('operations_seances').update(payload).eq('id', existante.id));
    if (!error) await tracerSeance(existante.id, action, detail);
  } else {
    const { data: numero, error: errNum } = await sb.rpc('operations_numeroter', { p_serie: 'SEA' });
    if (errNum) { toast('Erreur de numérotation : ' + errNum.message, 'err'); return false; }
    const complet = Object.assign({ type, numero, created_by: D.moi.id_acteur }, payload);
    const { data, error: errIns } = await sb.from('operations_seances').insert(complet).select().single();
    error = errIns;
    if (!error) await tracerSeance(data.id, action, detail);
  }
  if (error) { toast('Erreur : ' + error.message, 'err'); return false; }
  return true;
}
async function tracerSeance(seanceId, action, detail) {
  await sb.from('operations_seance_historique').insert({ seance_id: seanceId, auteur_id: D.moi.id_acteur, action, detail: detail || '' });
}

/* ============================================================= AUJOURD'HUI */
function lotsAujourdhui(divisionId) {
  const base = visibles().filter(o => !divisionId || o.division_id === divisionId);
  const hier = veilleOuvree();
  return {
    termineHier: base.filter(o => o.statut === 'TERMINEE' && o.date_fin === hier),
    bloque: base.filter(o => o.statut === 'BLOQUE'),
    ceJour: base.filter(o => estOuvert(o) && etatEcheance(o) === 'ceJour'),
    retard: base.filter(o => estOuvert(o) && etatEcheance(o) === 'retard'),
    enCours: base.filter(o => o.statut === 'EN_COURS'),
    aFaire: base.filter(o => o.statut === 'A_FAIRE'),
    nonAffecte: base.filter(o => estOuvert(o) && !o.responsable_id)
  };
}
function seanceDuJour() { return D.seances.find(s => s.type === 'STAND_UP' && s.date === auj()) || null; }
function blocageAncien(o) { return o.date_blocage && ecartOuvres(o.date_blocage, auj()) >= (D.parametres.blocage_jours || 3); }

function blocAujourdhui(titre, lot, couleur, vide) {
  if (!lot.length) return `<div style="margin-bottom:10px"><div class="gris" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;font-weight:700">${ech(titre)}</div><div class="gris" style="font-size:11.5px">${ech(vide)}</div></div>`;
  return `<div style="margin-bottom:10px"><div class="gris" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;font-weight:700">${ech(titre)} <span class="et ${couleur}">${lot.length}</span></div>
    ${lot.slice(0, 4).map(o => `<div data-fiche="${ech(o.id)}" style="padding:3px 0;cursor:pointer;line-height:1.4;font-size:11.8px">&bull; ${ech(tronque(o.intitule, 62))}<span class="gris"> — ${ech(o.responsable_id ? nomAgent(o.responsable_id) : 'non affectée')}</span></div>`).join('')}
    ${lot.length > 4 ? `<div class="gris" style="font-size:11px">… et ${lot.length - 4} autre(s)</div>` : ''}</div>`;
}
function carteDivisionAujourdhui(d) {
  const l = lotsAujourdhui(d.id);
  const totalOuvert = l.enCours.length + l.aFaire.length + l.bloque.length;
  if (!totalOuvert && !l.termineHier.length) return '';
  const alerte = l.bloque.length || l.retard.length;
  return `<div class="carte" style="border-left:4px solid ${alerte ? 'var(--rouge)' : 'var(--vertok)'}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">${ech(d.court)}</h3><span class="et gris">${totalOuvert} en cours</span>
    </div>
    ${blocAujourdhui('Terminé la veille', l.termineHier, 'vert', 'Rien de clôturé la veille.')}
    ${blocAujourdhui('Bloqué — à débloquer', l.bloque, 'rouge', 'Aucun blocage.')}
    ${blocAujourdhui("Échéance aujourd'hui", l.ceJour, 'orange', 'Aucune échéance ce jour.')}
    ${blocAujourdhui('En retard', l.retard, 'rouge', 'Aucun retard.')}
  </div>`;
}
function panneauMotifsBlocage() {
  const l = lotsAujourdhui();
  const anciens = l.bloque.filter(blocageAncien);
  if (!anciens.length) return '';
  return `<div class="carte" style="border-left:4px solid var(--rouge)"><h3>Blocages non levés depuis plus de ${D.parametres.blocage_jours} jours</h3>
    <div class="tw" style="max-height:none"><table><thead><tr><th>Activité</th><th>Division</th><th>Responsable</th><th>Bloquée depuis</th><th>Motif</th></tr></thead>
    <tbody>${anciens.map(o => `<tr data-fiche="${ech(o.id)}" style="cursor:pointer">
      <td><b>${ech(tronque(o.intitule, 60))}</b></td><td>${ech(nomDivision(o.division_id))}</td>
      <td>${ech(nomAgent(o.responsable_id))}</td><td><span class="et rouge">${ecartOuvres(o.date_blocage, auj())} j</span></td>
      <td>${ech(tronque(o.motif_blocage, 80))}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function vueAujourdhui() {
  const l = lotsAujourdhui();
  const s = seanceDuJour();
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>${ech(dateLongue(auj()))}</h1>
      <p>Point quotidien de la D2MG : activités échues, blocages non levés et compte rendu du point du jour par division.</p></div></div>
    <div class="barre noPrint">
      ${!estOuvre(auj()) ? '<span class="et orange">Jour non ouvré</span>' : ''}
      ${s ? `<span class="et vert">Point du jour enregistré</span>${aDroit('ops.animer') ? '<button class="btn sm" id="btnAuj">Modifier le compte rendu</button>' : ''}`
          : (aDroit('ops.animer') ? '<button class="btn primaire" id="btnAuj">Enregistrer le point du jour</button>' : '<span class="gris">Compte rendu non encore enregistré</span>')}
    </div>
    <div class="kpis">
      <div class="kpi ok"><div class="lib">Terminées la veille</div><div class="val">${l.termineHier.length}</div><div class="sub">${dateFr(veilleOuvree())}</div></div>
      <div class="kpi ${l.bloque.length ? 'ko' : ''}"><div class="lib">Bloquées</div><div class="val">${l.bloque.length}</div><div class="sub">en attente d'un tiers</div></div>
      <div class="kpi ${l.ceJour.length ? 'al' : ''}"><div class="lib">Échéance ce jour</div><div class="val">${l.ceJour.length}</div><div class="sub">à clôturer aujourd'hui</div></div>
      <div class="kpi ${l.retard.length ? 'ko' : 'ok'}"><div class="lib">En retard</div><div class="val">${l.retard.length}</div><div class="sub">délai dépassé</div></div>
      <div class="kpi"><div class="lib">En cours</div><div class="val">${l.enCours.length}</div><div class="sub">activités démarrées</div></div>
      <div class="kpi ${l.nonAffecte.length ? 'al' : ''}"><div class="lib">Non affectées</div><div class="val">${l.nonAffecte.length}</div><div class="sub">sans responsable</div></div>
    </div>
    ${s && s.decisions ? `<div class="msgOk"><b>Décisions du point du jour :</b><br>${nl2br(s.decisions)}</div>` : ''}
    ${panneauMotifsBlocage()}
    ${l.nonAffecte.length ? `<div class="carte" style="border-left:4px solid var(--orange)"><h3>Activités sans responsable</h3>${tableauActivites(l.nonAffecte, {})}</div>` : ''}
    <h3 style="margin:18px 0 10px">Tour de table par division</h3>
    <div class="deux" style="grid-template-columns:repeat(3,1fr)">
      ${D.divisions.map(carteDivisionAujourdhui).filter(Boolean).join('') || '<div class="carte"><p class="gris">Aucune activité en cours ni clôturée la veille.</p></div>'}
    </div>`;
  const b = $('#btnAuj'); if (b) b.addEventListener('click', ouvrirModaleAujourdhui);
  $$('[data-fiche]').forEach(el => el.addEventListener('click', () => ouvrirFiche(el.dataset.fiche)));
}
function ouvrirModaleAujourdhui() {
  const l = lotsAujourdhui();
  const cd = D.agents.filter(a => a.role_operations === 'Directeur' || a.role_operations === 'Chef de division');
  ouvrirModale("Enregistrer le point du jour — " + dateLongue(auj()),
    `<div class="msgInfo">Le compte rendu reprend automatiquement la situation du jour. Il constitue la preuve que le rituel d'animation a bien été tenu.</div>
     <div class="kpis">
       <div class="kpi ok"><div class="lib">Terminées la veille</div><div class="val">${l.termineHier.length}</div></div>
       <div class="kpi ${l.bloque.length ? 'ko' : ''}"><div class="lib">Blocages</div><div class="val">${l.bloque.length}</div></div>
       <div class="kpi ${l.ceJour.length ? 'al' : ''}"><div class="lib">Échéance ce jour</div><div class="val">${l.ceJour.length}</div></div>
       <div class="kpi ${l.retard.length ? 'ko' : ''}"><div class="lib">En retard</div><div class="val">${l.retard.length}</div></div>
     </div>
     <label>Participants</label>
     <div class="champs">${(cd.length ? cd : D.agents).map(a => `<label style="font-weight:400;display:flex;align-items:center;gap:6px"><input type="checkbox" class="sePart" value="${ech(a.id_acteur)}" checked> ${ech(a.nom_prenoms)}</label>`).join('')}</div>
     <label for="seDec">Décisions et arbitrages du jour</label>
     <textarea id="seDec" rows="3" placeholder="Exemple : le Directeur reçoit le prestataire d'entretien en fin de matinée."></textarea>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Enregistrer le point du jour', cl: 'primaire', act: enregistrerAujourdhui }]);
}
async function enregistrerAujourdhui() {
  const l = lotsAujourdhui();
  const parts = $$('.sePart').filter(c => c.checked).map(c => c.value);
  if (!parts.length) { toast('Sélectionnez au moins un participant.', 'err'); return; }
  const dec = ($('#seDec').value || '').trim();
  const existante = seanceDuJour();
  const instantane = { termineVeille: l.termineHier.length, bloque: l.bloque.length, ceJour: l.ceJour.length, retard: l.retard.length, enCours: l.enCours.length, nonAffecte: l.nonAffecte.length };
  const ok = await enregistrerSeance('STAND_UP', existante, {
    date: auj(), animateur_id: D.moi.id_acteur, participants: parts,
    points_abordes: 'Revue des activités du jour par division, blocages signalés et arbitrages immédiats.',
    decisions: dec, statut: 'TENUE', instantane
  }, existante ? 'Mise à jour du compte rendu' : 'Séance tenue', 'Point quotidien');
  if (ok) { toast('Point du jour enregistré.', 'ok'); fermerModale(); await chargerSeances(); aller('aujourdhui'); }
}

/* ======================================================= REVUE HEBDOMADAIRE */
function semaineDe(decalage) {
  const lun = lundiDe(ajoutJours(auj(), (decalage || 0) * 7));
  return { debut: lun, fin: ajoutJours(lun, 6), libelle: 'Semaine du ' + dateFr(lun) + ' au ' + dateFr(ajoutJours(lun, 4)) };
}
function seanceRevueHebdo(bornes) { return D.seances.find(s => s.type === 'REVUE_HEBDO' && s.date >= bornes.debut && s.date <= bornes.fin) || null; }
function activitesReconductibles(frequences) {
  const ouvertes = {};
  D.activites.filter(estOuvert).forEach(o => { if (o.fiche_id) ouvertes[o.fiche_id] = true; });
  return D.catalogue.filter(f => {
    if (!f.actif) return false;
    if (!frequences.includes(f.frequence)) return false;
    if (ouvertes[f.id]) return false;
    if (aDroit('ops.voir_division') && !aDroit('ops.voir_tout') && f.division_id !== D.moi.division_operations_id) return false;
    return true;
  });
}
async function reconduireFiche(ficheId, datePlanifiee, motifDetail) {
  const f = D.catalogue.find(x => x.id === ficheId);
  if (!f) { toast('Activité introuvable au catalogue.', 'err'); return; }
  const dp = prochainOuvre(datePlanifiee);
  const delai = delaiEffectif(f.delai, 'NORMAL');
  let cand = agentsDe(f.division_id);
  if (f.roles && f.roles.length) cand = cand.filter(a => f.roles.includes(a.role_operations));
  const { data: numero, error: errNum } = await sb.rpc('operations_numeroter', { p_serie: 'ACT' });
  if (errNum) { toast('Erreur de numérotation : ' + errNum.message, 'err'); return; }
  const payload = {
    numero, origine: 'CATALOGUE', fiche_id: f.id, division_id: f.division_id, intitule: f.intitule, precision: '',
    frequence: f.frequence, responsable_id: cand.length ? cand[0].id_acteur : null, priorite: 'NORMAL',
    date_planifiee: dp, delai_jours: delai, date_echeance: ajoutOuvres(dp, delai), statut: 'A_FAIRE', created_by: D.moi.id_acteur
  };
  const { data: nouv, error } = await sb.from('operations_activites').insert(payload).select().single();
  if (error) { toast('Erreur : ' + error.message, 'err'); return; }
  await tracerActivite(nouv.id, 'Planification', motifDetail);
  toast(f.intitule + ' — planifiée au ' + dateFr(dp) + '.', 'ok');
  await chargerActivites();
  aller(D.vue);
}
function vueRevue() {
  const e = D.etat.revue || (D.etat.revue = { decalage: -1 });
  const b = semaineDe(e.decalage);
  const s = seanceRevueHebdo(b);
  const lot = visibles().filter(o => dansPeriode(o.date_fin, b) || (estOuvert(o) && dansPeriode(o.date_planifiee, b)));
  const st = Stats.synthese(lot);
  const termine = lot.filter(o => o.statut === 'TERMINEE');
  const ecarts = lot.filter(o => estOuvert(o) && (etatEcheance(o) === 'retard' || o.statut === 'BLOQUE'));
  const reporte = lot.filter(o => estOuvert(o) && etatEcheance(o) !== 'retard' && o.statut !== 'BLOQUE');
  const rec = activitesReconductibles(['QUOTIDIENNE', 'HEBDOMADAIRE']);
  const peutAnimer = aDroit('ops.animer');
  const peutPlanifier = aDroit('ops.planifier') || peutAnimer;

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Revue hebdomadaire</h1><p>Résultats de la semaine écoulée et planification de la semaine à venir.</p></div></div>
    <div class="barre noPrint">
      <div style="min-width:220px"><label>Semaine</label><select id="f_semaine">
        ${[0, -1, -2, -3, -4].map(d => { const bb = semaineDe(d); const lib = d === 0 ? 'Semaine en cours' : (d === -1 ? 'Semaine écoulée' : bb.libelle);
          return `<option value="${d}" ${e.decalage === d ? 'selected' : ''}>${ech(lib)}</option>`; }).join('')}
      </select></div>
      <span class="gris" style="padding-bottom:9px">${ech(b.libelle)}</span>
      <span style="margin-left:auto"></span>
      ${s ? `<span class="et vert" style="align-self:center">Revue enregistrée</span>${peutAnimer ? '<button class="btn sm" id="btnRevue">Modifier le compte rendu</button>' : ''}`
          : (peutAnimer ? '<button class="btn primaire" id="btnRevue">Enregistrer la revue</button>' : '<span class="gris" style="align-self:center">Revue non encore enregistrée</span>')}
    </div>
    <div class="carte"><h3>1. Résultats de la semaine</h3>
      <div class="kpis">
        <div class="kpi"><div class="lib">Activités de la semaine</div><div class="val">${st.total}</div></div>
        <div class="kpi ok"><div class="lib">Terminées</div><div class="val">${st.termine}</div></div>
        <div class="kpi ${st.retard ? 'ko' : 'ok'}"><div class="lib">En retard</div><div class="val">${st.retard}</div></div>
        <div class="kpi ${st.bloque ? 'al' : ''}"><div class="lib">Bloquées</div><div class="val">${st.bloque}</div></div>
        <div class="kpi ${st.tauxRespect === null ? '' : (st.tauxRespect >= D.parametres.cible_respect_delai ? 'ok' : 'al')}"><div class="lib">Respect du délai</div><div class="val">${pct(st.tauxRespect)}</div></div>
      </div>
      <p><b>Appréciation :</b> ${ech(Stats.appreciation(st.tauxRespect, D.parametres.cible_respect_delai))}</p>
      ${s && s.decisions ? `<div class="msgOk"><b>Décisions arrêtées en revue :</b><br>${nl2br(s.decisions)}</div>` : ''}
    </div>
    <div class="carte"><h3>2. Ce qui a été réalisé, par division</h3>
      ${termine.length ? D.divisions.map(d => {
        const sous = termine.filter(o => o.division_id === d.id);
        if (!sous.length) return '';
        return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><h4 style="color:var(--accent-fonce);margin-bottom:4px">${ech(d.court)} <span class="et vert">${sous.length}</span></h4>
          <ul style="margin:4px 0 0;padding-left:18px;line-height:1.7;font-size:12.5px">${sous.map(o => `<li><span data-fiche="${ech(o.id)}" style="cursor:pointer"><b>${ech(o.intitule)}</b></span>${o.precision ? ` <span class="gris">(${ech(o.precision)})</span>` : ''}<br><span class="gris">→ ${ech(o.resultat)}</span> ${badgeEcheance(o)}</li>`).join('')}</ul></div>`;
      }).join('') : '<div class="vide">Aucune activité clôturée sur la semaine.</div>'}
    </div>
    <div class="carte"><h3>3. Écarts à traiter</h3>
      ${tableauActivites(ecarts, { vide: "Aucun écart sur la semaine : toutes les activités sont dans le délai et aucune n'est bloquée." })}
    </div>
    <div class="carte"><h3>4. Planification de la semaine à venir</h3>
      <h4>Activités reportées</h4>
      ${reporte.length ? tableauActivites(reporte, {}) : '<p class="gris">Aucune activité reportée de la semaine écoulée.</p>'}
      <h4 style="margin-top:14px">Travail standard à reconduire</h4>
      <p class="gris" style="font-size:11.5px">Activités quotidiennes et hebdomadaires du catalogue sans occurrence ouverte.</p>
      ${rec.length ? `<div class="tw" style="max-height:none"><table><thead><tr><th>Code</th><th>Activité</th><th>Division</th><th>Rythme</th><th>Délai</th>${peutPlanifier ? '<th class="noPrint"></th>' : ''}</tr></thead>
        <tbody>${rec.slice(0, 20).map(f => `<tr><td class="mono">${ech(f.id)}</td><td>${ech(f.intitule)}</td><td>${ech(nomDivision(f.division_id))}</td>
          <td>${ech(FREQUENCES[f.frequence] ? FREQUENCES[f.frequence].libelle : f.frequence)}</td><td>${f.delai} j</td>
          ${peutPlanifier ? `<td class="noPrint"><button class="btn sm" data-reconduireHebdo="${ech(f.id)}">Planifier</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
        ${rec.length > 20 ? `<p class="gris" style="font-size:11px">… et ${rec.length - 20} autre(s) au catalogue.</p>` : ''}`
        : '<p class="gris">Tout le travail standard est déjà planifié.</p>'}
    </div>`;

  $('#f_semaine').addEventListener('change', ev => { e.decalage = parseInt(ev.target.value, 10); vueRevue(); });
  const b2 = $('#btnRevue'); if (b2) b2.addEventListener('click', () => ouvrirModaleRevue(e.decalage));
  $$('[data-fiche]').forEach(el => el.addEventListener('click', () => ouvrirFiche(el.dataset.fiche)));
  $$('[data-reconduireHebdo]').forEach(bt => bt.addEventListener('click', () => {
    const lunProchain = lundiDe(ajoutJours(auj(), 7));
    reconduireFiche(bt.dataset.reconduireHebdo, lunProchain, 'Reconduite en revue hebdomadaire pour la semaine du ' + dateFr(lunProchain));
  }));
}
function ouvrirModaleRevue(decalage) {
  const b = semaineDe(decalage);
  const lot = visibles().filter(o => dansPeriode(o.date_fin, b) || (estOuvert(o) && dansPeriode(o.date_planifiee, b)));
  const st = Stats.synthese(lot);
  const cd = D.agents.filter(a => a.role_operations === 'Directeur' || a.role_operations === 'Chef de division');
  ouvrirModale('Enregistrer la revue hebdomadaire — ' + b.libelle,
    `<div class="msgInfo">Le compte rendu reprend automatiquement les résultats de la semaine. Il vaut preuve d'animation du processus pour le SMQ.</div>
     <div class="kpis">
       <div class="kpi ok"><div class="lib">Terminées</div><div class="val">${st.termine}</div></div>
       <div class="kpi ${st.retard ? 'ko' : ''}"><div class="lib">En retard</div><div class="val">${st.retard}</div></div>
       <div class="kpi ${st.bloque ? 'al' : ''}"><div class="lib">Bloquées</div><div class="val">${st.bloque}</div></div>
       <div class="kpi"><div class="lib">Respect du délai</div><div class="val">${pct(st.tauxRespect)}</div></div>
     </div>
     <p class="gris">${ech(Stats.appreciation(st.tauxRespect, D.parametres.cible_respect_delai))}</p>
     <label>Participants</label>
     <div class="champs">${(cd.length ? cd : D.agents).map(a => `<label style="font-weight:400;display:flex;align-items:center;gap:6px"><input type="checkbox" class="rvPart" value="${ech(a.id_acteur)}" checked> ${ech(a.nom_prenoms)}</label>`).join('')}</div>
     <label for="rvDec">Décisions et planification de la semaine à venir</label>
     <textarea id="rvDec" rows="4"></textarea>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Enregistrer la revue', cl: 'primaire', act: () => enregistrerRevue(decalage) }]);
}
async function enregistrerRevue(decalage) {
  const b = semaineDe(decalage);
  const parts = $$('.rvPart').filter(c => c.checked).map(c => c.value);
  if (!parts.length) { toast('Sélectionnez au moins un participant.', 'err'); return; }
  const dec = ($('#rvDec').value || '').trim();
  if (dec.length < 5) { toast('Indiquez au moins une décision ou orientation pour la semaine à venir.', 'err'); return; }
  const lot = visibles().filter(o => dansPeriode(o.date_fin, b) || (estOuvert(o) && dansPeriode(o.date_planifiee, b)));
  const st = Stats.synthese(lot);
  const existante = seanceRevueHebdo(b);
  let dateSeance = existante ? existante.date : (b.fin > auj() ? auj() : prochainOuvre(ajoutJours(b.debut, 4)));
  if (dateSeance > auj()) dateSeance = auj();
  const ok = await enregistrerSeance('REVUE_HEBDO', existante, {
    date: dateSeance, animateur_id: D.moi.id_acteur, participants: parts,
    points_abordes: 'Résultats de la semaine écoulée par division, écarts constatés, planification de la semaine suivante.',
    decisions: dec, statut: 'TENUE',
    instantane: { termine: st.termine, retard: st.retard, bloque: st.bloque, tauxRespect: st.tauxRespect, tauxRealisation: st.tauxRealisation }
  }, existante ? 'Mise à jour du compte rendu' : 'Séance tenue', 'Revue hebdomadaire — ' + b.libelle);
  if (ok) { toast('Revue hebdomadaire enregistrée.', 'ok'); fermerModale(); await chargerSeances(); aller('revue'); }
}

/* ========================================================= REVUE MENSUELLE */
function moisDe(decalage) {
  const d = dt(auj());
  const pivot = iso(new Date(d.getFullYear(), d.getMonth() + (decalage || 0), 15));
  return { debut: debutMois(pivot), fin: finMois(pivot), libelle: 'Mois de ' + moisFr(pivot) };
}
function seanceRevueMois(bornes) { return D.seances.find(s => s.type === 'REVUE_MOIS' && s.date >= bornes.debut && s.date <= bornes.fin) || null; }
function vueRevueMois() {
  const e = D.etat.revueMois || (D.etat.revueMois = { decalage: 0 });
  const b = moisDe(e.decalage);
  const s = seanceRevueMois(b);
  const lot = visibles().filter(o => dansPeriode(o.date_fin, b) || (estOuvert(o) && dansPeriode(o.date_planifiee, b)));
  const st = Stats.synthese(lot);
  const termine = lot.filter(o => o.statut === 'TERMINEE');
  const attOuvertes = attentionsVisibles().filter(p => p.statut !== 'RESOLU');
  const rec = activitesReconductibles(['MENSUELLE']);
  const peutAnimer = aDroit('ops.animer');
  const peutPlanifier = aDroit('ops.planifier') || peutAnimer;

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Revue mensuelle</h1><p>Consolidation mensuelle pour la Direction et les chefs de division.</p></div></div>
    <div class="barre noPrint">
      <div style="min-width:220px"><label>Mois</label><select id="f_mois">
        ${[0, -1, -2, -3, -4, -5].map(d => { const bb = moisDe(d); const lib = d === 0 ? 'Mois en cours' : (d === -1 ? 'Mois écoulé' : bb.libelle);
          return `<option value="${d}" ${e.decalage === d ? 'selected' : ''}>${ech(lib)}</option>`; }).join('')}
      </select></div>
      <span class="gris" style="padding-bottom:9px">${ech(b.libelle)}</span>
      <span style="margin-left:auto"></span>
      ${s ? `<span class="et vert" style="align-self:center">Revue enregistrée</span>${peutAnimer ? '<button class="btn sm" id="btnRevueMois">Modifier le compte rendu</button>' : ''}`
          : (peutAnimer ? '<button class="btn primaire" id="btnRevueMois">Enregistrer la revue</button>' : '<span class="gris" style="align-self:center">Revue non encore enregistrée</span>')}
    </div>
    <div class="carte"><h3>Situation du mois</h3>
      <div class="kpis">
        <div class="kpi"><div class="lib">Activités du mois</div><div class="val">${st.total}</div></div>
        <div class="kpi ok"><div class="lib">Terminées</div><div class="val">${st.termine}</div></div>
        <div class="kpi ${st.retard ? 'ko' : 'ok'}"><div class="lib">En retard</div><div class="val">${st.retard}</div></div>
        <div class="kpi ${st.bloque ? 'al' : ''}"><div class="lib">Bloquées</div><div class="val">${st.bloque}</div></div>
        <div class="kpi ${attOuvertes.length ? 'al' : 'ok'}"><div class="lib">Points d'attention ouverts</div><div class="val">${attOuvertes.length}</div></div>
      </div>
      <p><b>Appréciation :</b> ${ech(Stats.appreciation(st.tauxRespect, D.parametres.cible_respect_delai))}</p>
      ${s && s.decisions ? `<div class="msgOk"><b>Décisions arrêtées en revue :</b><br>${nl2br(s.decisions)}</div>` : ''}
    </div>
    <div class="carte"><h3>1. Ce qui a été réalisé</h3>
      ${termine.length ? D.divisions.map(d => {
        const sous = termine.filter(o => o.division_id === d.id);
        if (!sous.length) return '';
        return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><h4 style="color:var(--accent-fonce);margin-bottom:4px">${ech(d.court)} <span class="et vert">${sous.length}</span></h4>
          <ul style="margin:4px 0 0;padding-left:18px;line-height:1.7;font-size:12.5px">${sous.map(o => `<li><span data-fiche="${ech(o.id)}" style="cursor:pointer"><b>${ech(o.intitule)}</b></span>${o.precision ? ` <span class="gris">(${ech(o.precision)})</span>` : ''}<br><span class="gris">→ ${ech(o.resultat)}</span> ${badgeEcheance(o)}</li>`).join('')}</ul></div>`;
      }).join('') : '<div class="vide">Aucune activité clôturée sur le mois.</div>'}
    </div>
    <div class="carte"><h3>2. Ce qui doit être fait</h3>
      ${(() => {
        let une = false;
        const h = D.divisions.map(d => {
          const ouvertesDiv = lot.filter(o => o.division_id === d.id && estOuvert(o));
          const recDiv = rec.filter(f => f.division_id === d.id);
          if (!ouvertesDiv.length && !recDiv.length) return '';
          une = true;
          return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><h4 style="color:var(--accent-fonce)">${ech(d.court)}</h4>
            ${ouvertesDiv.length ? `<p class="gris" style="font-size:11px;margin:4px 0">À poursuivre ou à clôturer</p>
              <ul style="margin:0 0 8px;padding-left:18px;line-height:1.7;font-size:12.5px">${ouvertesDiv.slice(0, 10).map(o => `<li><span data-fiche="${ech(o.id)}" style="cursor:pointer"><b>${ech(o.intitule)}</b></span> ${badgeStatut(o.statut)} ${badgeEcheance(o)}</li>`).join('')}
              ${ouvertesDiv.length > 10 ? `<li class="gris">… et ${ouvertesDiv.length - 10} autre(s).</li>` : ''}</ul>` : ''}
            ${recDiv.length ? `<p class="gris" style="font-size:11px;margin:4px 0">Travail standard mensuel à reconduire</p>
              <ul style="margin:0;padding-left:18px;line-height:1.7;font-size:12.5px">${recDiv.map(f => `<li>${ech(f.intitule)}${peutPlanifier ? ` <button class="btn sm noPrint" style="margin-left:6px" data-reconduireMois="${ech(f.id)}">Planifier</button>` : ''}</li>`).join('')}</ul>` : ''}
          </div>`;
        }).join('');
        return une ? h : '<div class="vide">Aucune activité ouverte ni travail standard mensuel à reconduire.</div>';
      })()}
    </div>
    <div class="carte"><h3>3. Points d'attention</h3>
      ${attOuvertes.length ? D.divisions.map(d => {
        const sous = attOuvertes.filter(p => p.division_id === d.id);
        if (!sous.length) return '';
        return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><h4 style="color:var(--accent-fonce);margin-bottom:4px">${ech(d.court)} <span class="et orange">${sous.length}</span></h4>
          <ul style="margin:4px 0 0;padding-left:18px;line-height:1.7;font-size:12.5px">${sous.map(p => {
            const enRetard = p.echeance && ecartOuvres(auj(), p.echeance) < 0;
            return `<li><span data-attention="${ech(p.id)}" style="cursor:pointer"><b>${ech(p.intitule)}</b></span> ${badgeStatutAtt(p.statut)}${enRetard ? ' <span class="et rouge">dépassée</span>' : ''}<br><span class="gris">${ech(tronque(p.action_a_mener, 100))}</span> — <span class="gris">${ech(nomAgent(p.responsable_id))}, échéance ${dateFr(p.echeance)}</span></li>`;
          }).join('')}</ul></div>`;
      }).join('') : '<div class="vide">Aucun point d\'attention ouvert.</div>'}
    </div>`;

  $('#f_mois').addEventListener('change', ev => { e.decalage = parseInt(ev.target.value, 10); vueRevueMois(); });
  const b2 = $('#btnRevueMois'); if (b2) b2.addEventListener('click', () => ouvrirModaleRevueMois(e.decalage));
  $$('[data-fiche]').forEach(el => el.addEventListener('click', () => ouvrirFiche(el.dataset.fiche)));
  $$('[data-attention]').forEach(el => el.addEventListener('click', () => ouvrirAttention(el.dataset.attention)));
  $$('[data-reconduireMois]').forEach(bt => bt.addEventListener('click', () => {
    const d = dt(auj());
    const premierJourMoisProchain = iso(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    reconduireFiche(bt.dataset.reconduireMois, premierJourMoisProchain, 'Reconduite en revue mensuelle pour le mois de ' + moisFr(premierJourMoisProchain));
  }));
}
function ouvrirModaleRevueMois(decalage) {
  const b = moisDe(decalage);
  const lot = visibles().filter(o => dansPeriode(o.date_fin, b) || (estOuvert(o) && dansPeriode(o.date_planifiee, b)));
  const st = Stats.synthese(lot);
  const att = attentionsVisibles().filter(p => p.statut !== 'RESOLU');
  const cd = D.agents.filter(a => a.role_operations === 'Directeur' || a.role_operations === 'Chef de division');
  ouvrirModale('Enregistrer la revue mensuelle — ' + b.libelle,
    `<div class="msgInfo">Le compte rendu reprend automatiquement les résultats du mois, division par division. Il vaut preuve d'animation du processus pour le SMQ.</div>
     <div class="kpis">
       <div class="kpi ok"><div class="lib">Terminées</div><div class="val">${st.termine}</div></div>
       <div class="kpi ${st.retard ? 'ko' : ''}"><div class="lib">En retard</div><div class="val">${st.retard}</div></div>
       <div class="kpi ${st.bloque ? 'al' : ''}"><div class="lib">Bloquées</div><div class="val">${st.bloque}</div></div>
       <div class="kpi ${att.length ? 'al' : 'ok'}"><div class="lib">Points d'attention ouverts</div><div class="val">${att.length}</div></div>
     </div>
     <p class="gris">${ech(Stats.appreciation(st.tauxRespect, D.parametres.cible_respect_delai))}</p>
     <label>Participants</label>
     <div class="champs">${(cd.length ? cd : D.agents).map(a => `<label style="font-weight:400;display:flex;align-items:center;gap:6px"><input type="checkbox" class="rmPart" value="${ech(a.id_acteur)}" checked> ${ech(a.nom_prenoms)}</label>`).join('')}</div>
     <label for="rmDec">Décisions et priorités du mois à venir</label>
     <textarea id="rmDec" rows="4"></textarea>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Enregistrer la revue', cl: 'primaire', act: () => enregistrerRevueMois(decalage) }]);
}
async function enregistrerRevueMois(decalage) {
  const b = moisDe(decalage);
  const parts = $$('.rmPart').filter(c => c.checked).map(c => c.value);
  if (!parts.length) { toast('Sélectionnez au moins un participant.', 'err'); return; }
  const dec = ($('#rmDec').value || '').trim();
  if (dec.length < 5) { toast('Indiquez au moins une décision ou priorité pour le mois à venir.', 'err'); return; }
  const lot = visibles().filter(o => dansPeriode(o.date_fin, b) || (estOuvert(o) && dansPeriode(o.date_planifiee, b)));
  const st = Stats.synthese(lot);
  const att = attentionsVisibles().filter(p => p.statut !== 'RESOLU');
  const existante = seanceRevueMois(b);
  let dateSeance = existante ? existante.date : (b.fin > auj() ? auj() : prochainOuvre(b.fin));
  if (dateSeance > auj()) dateSeance = auj();
  const ok = await enregistrerSeance('REVUE_MOIS', existante, {
    date: dateSeance, animateur_id: D.moi.id_acteur, participants: parts,
    points_abordes: "Résultats du mois par division, travail à conduire le mois suivant, points d'attention ouverts.",
    decisions: dec, statut: 'TENUE',
    instantane: { termine: st.termine, retard: st.retard, bloque: st.bloque, tauxRespect: st.tauxRespect, tauxRealisation: st.tauxRealisation, pointsAttention: att.length }
  }, existante ? 'Mise à jour du compte rendu' : 'Séance tenue', 'Revue mensuelle — ' + b.libelle);
  if (ok) { toast('Revue mensuelle enregistrée.', 'ok'); fermerModale(); await chargerSeances(); aller('revueMois'); }
}

/* ===================================================== POINTS D'ATTENTION */
let attentionCourante = null;
function ouvrirModaleNouvelleAttention() {
  const divDefaut = D.moi.division_operations_id || (D.divisions[0] ? D.divisions[0].id : '');
  ouvrirModale("Signaler un point d'attention",
    `<div class="msgInfo">Un point d'attention est un irritant durable ou un obstacle qui dépasse une activité isolée. Il reste visible de tous jusqu'à sa résolution.</div>
     <label for="paTitre">Intitulé</label><input type="text" id="paTitre" maxlength="140" placeholder="Exemple : étanchéité de la salle de réunion du 3ᵉ étage">
     <label for="paDesc">Description du problème</label><textarea id="paDesc" rows="3" placeholder="Ce qui est constaté, depuis quand, quelles conséquences."></textarea>
     <label for="paAction">Action à mener</label><textarea id="paAction" rows="3" placeholder="Exemple : solliciter un autre prestataire pour un devis contradictoire."></textarea>
     <div class="champs">
       <div><label for="paDiv">Division concernée</label><select id="paDiv">${D.divisions.map(d => `<option value="${ech(d.id)}" ${d.id === divDefaut ? 'selected' : ''}>${ech(d.court)}</option>`).join('')}</select></div>
       <div><label for="paResp">Responsable</label><select id="paResp"></select></div>
     </div>
     <label for="paEch">Échéance de résolution</label><input type="date" id="paEch" value="${ajoutOuvres(auj(), 10)}">
     <div id="errPa"></div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Signaler le point', cl: 'primaire', act: enregistrerAttention }]);
  const majResp = () => {
    const div = $('#paDiv').value;
    let cand = agentsDe(div); if (!cand.length) cand = D.agents;
    $('#paResp').innerHTML = cand.map(a => `<option value="${ech(a.id_acteur)}">${ech(a.nom_prenoms)}</option>`).join('');
  };
  $('#paDiv').addEventListener('change', majResp);
  majResp();
}
async function enregistrerAttention() {
  const t = ($('#paTitre').value || '').trim();
  const d = ($('#paDesc').value || '').trim();
  const ac = ($('#paAction').value || '').trim();
  const erreurs = [];
  if (t.length < 5) erreurs.push('Donnez un intitulé court et reconnaissable (5 caractères minimum).');
  if (d.length < 10) erreurs.push('Décrivez le problème pour que celui qui le reprendra comprenne (10 caractères minimum).');
  if (ac.length < 5) erreurs.push("Indiquez l'action à mener : un point sans action ne se résout pas.");
  if (erreurs.length) { $('#errPa').innerHTML = `<div class="msgErreur">${ech(erreurs[0])}</div>`; return; }
  const div = $('#paDiv').value, resp = $('#paResp').value, echeanceVal = $('#paEch').value || ajoutOuvres(auj(), 10);

  const { data: numero, error: errNum } = await sb.rpc('operations_numeroter', { p_serie: 'ATT' });
  if (errNum) { toast('Erreur de numérotation : ' + errNum.message, 'err'); return; }
  const payload = { numero, date: auj(), intitule: t, description: d, action_a_mener: ac, division_id: div, responsable_id: resp || null, echeance: echeanceVal, statut: 'OUVERT', created_by: D.moi.id_acteur };
  const { data: nouv, error } = await sb.from('operations_attentions').insert(payload).select().single();
  if (error) { toast('Erreur : ' + error.message, 'err'); return; }
  await tracerAttention(nouv.id, 'Signalement', d);
  toast("Point d'attention " + numCourt(numero) + ' enregistré.', 'ok');
  fermerModale();
  await chargerAttentions();
  aller('attention');
}
async function tracerAttention(attentionId, action, detail) {
  await sb.from('operations_attention_historique').insert({ attention_id: attentionId, auteur_id: D.moi.id_acteur, action, detail: detail || '' });
}
async function majAttention(p, patch, action, detail) {
  patch.updated_at = new Date().toISOString();
  const { error } = await sb.from('operations_attentions').update(patch).eq('id', p.id);
  if (error) { toast('Erreur : ' + error.message, 'err'); return false; }
  Object.assign(p, patch);
  if (action) await tracerAttention(p.id, action, detail);
  return true;
}
async function ouvrirAttention(id) {
  const p = D.attentions.find(x => x.id === id);
  if (!p) { toast("Point d'attention introuvable.", 'err'); return; }
  attentionCourante = id;
  const [{ data: coms }, { data: hist }] = await Promise.all([
    sb.from('operations_attention_commentaires').select('*').eq('attention_id', id).order('created_at'),
    sb.from('operations_attention_historique').select('*').eq('attention_id', id).order('created_at')
  ]);
  const enRetard = p.echeance && p.statut !== 'RESOLU' && ecartOuvres(auj(), p.echeance) < 0;
  const corps = `
    <div class="tw" style="max-height:none;margin-bottom:14px"><table><tbody>
      <tr><th style="width:42%">Numéro</th><td class="mono">${ech(numCourt(p.numero))}</td></tr>
      <tr><th>Signalé le</th><td>${dateFr(p.date)}</td></tr>
      <tr><th>Division</th><td>${ech(nomDivision(p.division_id))}</td></tr>
      <tr><th>Responsable</th><td>${ech(nomAgent(p.responsable_id))}</td></tr>
      <tr><th>Échéance</th><td>${dateFr(p.echeance)}${enRetard ? ` <span class="et rouge">dépassée de ${-ecartOuvres(auj(), p.echeance)} j</span>` : ''}</td></tr>
      <tr><th>Statut</th><td>${badgeStatutAtt(p.statut)}${p.date_resolution ? ` <span class="gris">le ${dateFr(p.date_resolution)}</span>` : ''}</td></tr>
    </tbody></table></div>
    <div class="msgInfo"><b>Problème constaté :</b><br>${nl2br(p.description)}</div>
    <div class="msgOk"><b>Action à mener :</b><br>${nl2br(p.action_a_mener)}</div>
    <h3 style="color:var(--accent-fonce);font-size:13px;margin-bottom:8px">Échanges</h3>
    <ul class="chrono">${(coms || []).map(c => `<li><div class="q">${dateFr((c.created_at || '').slice(0, 10))} — ${ech(nomAgent(c.auteur_id))}</div>${nl2br(c.texte)}</li>`).join('') || '<li class="gris">Aucun échange.</li>'}</ul>
    ${p.statut !== 'RESOLU' ? `<label for="paCom">Ajouter un message</label><textarea id="paCom" rows="2" placeholder="Apporter une information ou proposer une solution…"></textarea>
      <button class="btn sm doux" type="button" id="btnPaCom" style="margin-top:6px">Publier</button>` : ''}
    <h3 style="color:var(--accent-fonce);font-size:13px;margin:16px 0 8px">Historique</h3>
    <ul class="chrono">${(hist || []).slice().reverse().map(h => `<li><div class="q">${dateFr((h.created_at || '').slice(0, 10))} — ${ech(nomAgent(h.auteur_id))}</div><b>${ech(h.action)}</b>${h.detail ? ' — ' + ech(h.detail) : ''}</li>`).join('') || '<li class="gris">Aucun mouvement enregistré.</li>'}</ul>`;

  const actions = [];
  if (p.statut === 'OUVERT' && aDroit('ops.attention')) actions.push({ lib: 'Prendre en traitement', cl: 'primaire', act: () => actionAttention('prendre') });
  if (p.statut !== 'RESOLU' && aDroit('ops.attention')) actions.push({ lib: 'Marquer résolu', cl: 'primaire', act: () => actionAttention('resoudre') });
  if (p.statut === 'RESOLU' && aDroit('ops.attention')) actions.push({ lib: 'Rouvrir', cl: '', act: () => actionAttention('rouvrir') });
  actions.push({ lib: 'Fermer', cl: '', act: fermerModale });

  ouvrirModale(ech(numCourt(p.numero)) + ' — ' + ech(tronque(p.intitule, 60)), corps, actions);
  const btnCom = $('#btnPaCom'); if (btnCom) btnCom.addEventListener('click', () => actionAttention('commenter'));
}
async function actionAttention(act) {
  const p = D.attentions.find(x => x.id === attentionCourante);
  if (!p) return;
  if (act === 'prendre') {
    if (await majAttention(p, { statut: 'EN_COURS' }, 'Prise en traitement', '')) { toast('Point pris en traitement.', 'ok'); await chargerAttentions(); ouvrirAttention(p.id); aller(D.vue); }
    return;
  }
  if (act === 'resoudre') { ouvrirModaleResoudre(p); return; }
  if (act === 'rouvrir') {
    if (await majAttention(p, { statut: 'EN_COURS', date_resolution: null }, 'Réouverture', 'Le point est réapparu')) { toast('Point rouvert.', 'ok'); await chargerAttentions(); ouvrirAttention(p.id); aller(D.vue); }
    return;
  }
  if (act === 'commenter') {
    const t = ($('#paCom').value || '').trim();
    if (!t) { toast('Le message est vide.', 'err'); return; }
    const { error } = await sb.from('operations_attention_commentaires').insert({ attention_id: p.id, auteur_id: D.moi.id_acteur, division_id: D.moi.division_operations_id, texte: t });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await tracerAttention(p.id, 'Message', tronque(t, 60));
    toast('Message publié.', 'ok'); await chargerAttentions(); ouvrirAttention(p.id);
  }
}
function ouvrirModaleResoudre(p) {
  ouvrirModale('Marquer le point comme résolu',
    `<p><b>${ech(p.intitule)}</b></p>
     <label for="paRes">Comment le point a-t-il été résolu ?</label><textarea id="paRes" rows="3" placeholder="Exemple : travaux réalisés et réceptionnés le 12 du mois."></textarea>
     <div id="errPaRes"></div>
     <label for="paResDate">Date de résolution</label><input type="date" id="paResDate" value="${auj()}" max="${auj()}">`,
    [{ lib: 'Annuler', cl: '', act: () => ouvrirAttention(p.id) },
     { lib: 'Confirmer la résolution', cl: 'primaire', act: async () => {
        const r = ($('#paRes').value || '').trim();
        if (r.length < 5) { $('#errPaRes').innerHTML = '<div class="msgErreur">Indiquez comment le point a été résolu.</div>'; return; }
        const dr = $('#paResDate').value || auj();
        if (await majAttention(p, { statut: 'RESOLU', date_resolution: dr }, 'Résolution', r)) {
          await sb.from('operations_attention_commentaires').insert({ attention_id: p.id, auteur_id: D.moi.id_acteur, division_id: D.moi.division_operations_id, texte: r });
          toast("Point d'attention résolu.", 'ok'); fermerModale(); await chargerAttentions(); aller('attention');
        }
     } }]);
}
function vueAttention() {
  const e = D.etat.attention || (D.etat.attention = { filtre: 'OUVERTS' });
  const tous = attentionsVisibles();
  const s = Stats.syntheseAttentions(tous);
  const lot = tous.filter(p => {
    if (e.filtre === 'OUVERTS') return p.statut !== 'RESOLU';
    if (e.filtre === 'RESOLUS') return p.statut === 'RESOLU';
    return true;
  }).sort((a, b) => {
    const oa = a.statut !== 'RESOLU' ? 0 : 1, ob = b.statut !== 'RESOLU' ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return (a.echeance || '9999') < (b.echeance || '9999') ? -1 : 1;
  });
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Points d'attention</h1><p>Mémoire collective des irritants qui dépassent une activité isolée.</p></div></div>
    <div class="kpis">
      <div class="kpi ${s.ouverts ? 'al' : 'ok'}"><div class="lib">Points ouverts</div><div class="val">${s.ouverts}</div><div class="sub">en attente de résolution</div></div>
      <div class="kpi ${s.enRetard ? 'ko' : 'ok'}"><div class="lib">Échéance dépassée</div><div class="val">${s.enRetard}</div><div class="sub">à arbitrer</div></div>
      <div class="kpi ok"><div class="lib">Résolus</div><div class="val">${s.resolus}</div><div class="sub">depuis l'origine</div></div>
      <div class="kpi"><div class="lib">Taux de résolution</div><div class="val">${pct(s.tauxResolution)}</div></div>
      <div class="kpi"><div class="lib">Délai moyen de résolution</div><div class="val">${jrs(s.delaiMoyenResolution)}</div></div>
    </div>
    <div class="barre noPrint">
      ${['OUVERTS', 'RESOLUS', 'TOUS'].map(f => `<button type="button" class="btn ${e.filtre === f ? 'primaire' : ''}" data-filtre="${f}">${f === 'OUVERTS' ? 'Ouverts' : (f === 'RESOLUS' ? 'Résolus' : 'Tous')}</button>`).join('')}
      <span style="margin-left:auto"></span>
      ${aDroit('ops.attention') ? '<button class="btn primaire" id="btnNouvAtt">Signaler un point d\'attention</button>' : ''}
    </div>
    <div class="carte">
      ${lot.length ? `<div class="tw" style="max-height:none"><table><thead><tr><th>N°</th><th>Point d'attention</th><th>Action à mener</th><th>Division</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
        <tbody>${lot.map(p => {
          const retard = p.echeance && p.statut !== 'RESOLU' && ecartOuvres(auj(), p.echeance) < 0;
          return `<tr data-attention="${ech(p.id)}" style="cursor:pointer">
            <td class="mono">${ech(numCourt(p.numero))}</td><td><b>${ech(p.intitule)}</b><div class="gris" style="font-size:11px">signalé le ${dateFr(p.date)}</div></td>
            <td>${ech(tronque(p.action_a_mener, 80))}</td><td>${ech(nomDivision(p.division_id))}</td><td>${ech(nomAgent(p.responsable_id))}</td>
            <td>${dateFr(p.echeance)}${retard ? '<br><span class="et rouge">dépassée</span>' : ''}</td><td>${badgeStatutAtt(p.statut)}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="vide">Aucun point d\'attention dans cette sélection.</div>'}
    </div>`;
  $$('[data-filtre]').forEach(bt => bt.addEventListener('click', () => { e.filtre = bt.dataset.filtre; vueAttention(); }));
  const bn = $('#btnNouvAtt'); if (bn) bn.addEventListener('click', ouvrirModaleNouvelleAttention);
  $$('[data-attention]').forEach(tr => tr.addEventListener('click', () => ouvrirAttention(tr.dataset.attention)));
}

/* =============================================================== REGISTRE */
function lotRegistre() {
  const e = D.etat.registre || (D.etat.registre = { division: '', statut: '', acteur: '', recherche: '', du: '', au: '' });
  const q = (e.recherche || '').toLowerCase();
  return visibles().filter(o => {
    if (e.division && o.division_id !== e.division) return false;
    if (e.statut && o.statut !== e.statut) return false;
    if (e.acteur && o.responsable_id !== e.acteur) return false;
    if (e.du && o.date_planifiee < e.du) return false;
    if (e.au && o.date_planifiee > e.au) return false;
    if (q) { const t = (o.numero + ' ' + o.intitule + ' ' + (o.precision || '') + ' ' + (o.resultat || '')).toLowerCase(); if (t.indexOf(q) === -1) return false; }
    return true;
  }).sort((a, b) => a.date_planifiee < b.date_planifiee ? 1 : -1);
}
function exporterRegistre() {
  const lot = lotRegistre();
  const l = [csvLigne(['Numéro', 'Division', 'Activité', 'Précision', 'Rythme', 'Responsable', 'Priorité', 'Planifiée le', 'Délai (j ouvrés)', 'Échéance', 'Statut', 'Réalisée le', 'Résultat', 'Respect du délai'])];
  lot.forEach(o => {
    const resp = o.responsable_id ? nomAgent(o.responsable_id) : '';
    let respect = '';
    if (o.statut === 'TERMINEE' && o.date_fin && o.date_echeance) respect = ecartOuvres(o.date_fin, o.date_echeance) >= 0 ? 'Dans le délai' : 'Hors délai';
    l.push(csvLigne([o.numero, nomDivision(o.division_id), o.intitule, o.precision || '', FREQUENCES[o.frequence] ? FREQUENCES[o.frequence].libelle : o.frequence, resp,
      PRIORITES[o.priorite] ? PRIORITES[o.priorite].libelle : o.priorite, dateFr(o.date_planifiee), o.delai_jours, dateFr(o.date_echeance),
      STATUTS[o.statut].libelle, o.date_fin ? dateFr(o.date_fin) : '', o.resultat || o.motif_suspension || '', respect]));
  });
  telechargerCsv('D2MG_activites_' + auj() + '.csv', l.join('\r\n'));
  toast(lot.length + ' activité(s) exportée(s).', 'ok');
}
function vueRegistre() {
  const e = D.etat.registre || (D.etat.registre = { division: '', statut: '', acteur: '', recherche: '', du: '', au: '' });
  const lot = lotRegistre();
  const s = Stats.synthese(lot);
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Registre général</h1><p>Toutes les activités visibles, filtrables et exportables.</p></div></div>
    <div class="carte noPrint"><div class="champs" style="grid-template-columns:repeat(3,1fr)">
      <div><label for="rg_recherche">Rechercher</label><input type="text" id="rg_recherche" value="${ech(e.recherche)}" placeholder="numéro, intitulé, résultat…"></div>
      <div><label for="rg_division">Division</label><select id="rg_division"><option value="">Toutes</option>${D.divisions.map(d => `<option value="${ech(d.id)}" ${e.division === d.id ? 'selected' : ''}>${ech(d.court)}</option>`).join('')}</select></div>
      <div><label for="rg_statut">Statut</label><select id="rg_statut"><option value="">Tous</option>${ORDRE_STATUTS.map(k => `<option value="${k}" ${e.statut === k ? 'selected' : ''}>${ech(STATUTS[k].libelle)}</option>`).join('')}</select></div>
      <div><label for="rg_acteur">Responsable</label><select id="rg_acteur"><option value="">Tous</option>${D.agents.map(a => `<option value="${ech(a.id_acteur)}" ${e.acteur === a.id_acteur ? 'selected' : ''}>${ech(a.nom_prenoms)}</option>`).join('')}</select></div>
      <div><label for="rg_du">Planifiée du</label><input type="date" id="rg_du" value="${ech(e.du)}"></div>
      <div><label for="rg_au">au</label><input type="date" id="rg_au" value="${ech(e.au)}"></div>
    </div></div>
    <div class="barre noPrint">
      <span class="et gris">${lot.length} activité(s)</span><span class="et vert">${s.termine} terminées</span><span class="et bleu">${s.ouvert} ouvertes</span>
      ${s.retard ? `<span class="et rouge">${s.retard} en retard</span>` : ''}
      <span style="margin-left:auto"></span>
      <button class="btn" id="btnExportRegistre">Exporter en CSV (Excel)</button>
      <button class="btn" id="btnResetRegistre">Réinitialiser</button>
    </div>
    <div class="carte">${tableauActivites(lot.slice(0, 250), { vide: 'Aucune activité ne correspond à ces critères.' })}
      ${lot.length > 250 ? `<p class="gris" style="font-size:11px;margin-top:8px">Affichage limité aux 250 premières. Affinez les filtres ou exportez en CSV pour tout obtenir.</p>` : ''}
    </div>`;
  const relire = () => { ['division', 'statut', 'acteur', 'recherche', 'du', 'au'].forEach(k => { const el = $('#rg_' + k); if (el) e[k] = el.value; }); vueRegistre(); };
  ['division', 'statut', 'acteur', 'du', 'au'].forEach(k => { const el = $('#rg_' + k); if (el) el.addEventListener('change', relire); });
  const rech = $('#rg_recherche'); if (rech) rech.addEventListener('input', relire);
  $('#btnExportRegistre').addEventListener('click', exporterRegistre);
  $('#btnResetRegistre').addEventListener('click', () => { D.etat.registre = { division: '', statut: '', acteur: '', recherche: '', du: '', au: '' }; vueRegistre(); });
  $$('[data-fiche]').forEach(tr => tr.addEventListener('click', () => ouvrirFiche(tr.dataset.fiche)));
}

/* =============================================================== RAPPORTS */
function bornesRapport() {
  const e = D.etat.rapports || (D.etat.rapports = { periode: 'MOIS', division: '', du: debutMois(auj()), au: auj() });
  return bornesPeriode(e.periode, { debut: e.du, fin: e.au });
}
function lotRapport() {
  const e = D.etat.rapports || (D.etat.rapports = { periode: 'MOIS', division: '', du: debutMois(auj()), au: auj() });
  const b = bornesRapport();
  return Stats.lotPeriode(b).filter(o => !e.division || o.division_id === e.division);
}
function seancesRapport() {
  const b = bornesRapport();
  return D.seances.filter(s => dansPeriode(s.date, b)).sort((a, b2) => a.date < b2.date ? -1 : 1);
}
function exporterRapportCsv() {
  const lot = lotRapport(), b = bornesRapport();
  const l = [csvLigne(['Période', b.libelle]), csvLigne([])];
  l.push(csvLigne(['Numéro', 'Division', 'Activité', 'Responsable', 'Planifiée le', 'Échéance', 'Statut', 'Réalisée le', 'Résultat']));
  lot.forEach(o => l.push(csvLigne([o.numero, nomDivision(o.division_id), o.intitule, o.responsable_id ? nomAgent(o.responsable_id) : '',
    dateFr(o.date_planifiee), dateFr(o.date_echeance), STATUTS[o.statut].libelle, o.date_fin ? dateFr(o.date_fin) : '', o.resultat || o.motif_suspension || ''])));
  telechargerCsv('D2MG_rapport_' + auj() + '.csv', l.join('\r\n'));
  toast('Données du rapport exportées.', 'ok');
}
function enregistrerRapportHtml() {
  const corps = $('#zoneRapport');
  if (!corps) { toast('Rapport introuvable.', 'err'); return; }
  const style = "body{font-family:Calibri,Arial,sans-serif;font-size:12px;color:#1C2529;margin:26px}"
    + "table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}"
    + "th{background:#2C4A63;color:#fff;text-align:left;padding:6px 8px}"
    + "td{padding:5px 8px;border-bottom:1px solid #DDE3E7}"
    + "tbody tr:nth-child(even){background:#F4F6F7}"
    + ".enteteInst{text-align:center;border-bottom:2px solid #2C4A63;padding-bottom:8px;margin-bottom:12px;font-size:11px;line-height:1.5}"
    + ".enteteInst .t{font-weight:700;color:#1B2F3F;font-size:15px;margin:12px 0 4px}"
    + ".kpis{display:block}.kpi{border:1px solid #DDE3E7;border-radius:6px;padding:8px;display:inline-block;min-width:150px;margin:0 8px 8px 0;vertical-align:top}"
    + ".kpi .lib{font-size:10px;color:#6B767C;text-transform:uppercase}.kpi .val{font-size:20px;font-weight:700}"
    + ".et{display:inline-block;padding:1px 7px;border-radius:9px;font-size:10px;border:1px solid #DDE3E7}"
    + ".blocSignature{display:flex;gap:10px;margin-top:20px}.blocSignature .cs{flex:1;border:1px solid #DDE3E7;padding:8px;font-size:11px;min-height:80px}"
    + ".gris{color:#6B767C}.noPrint{display:none}";
  const html = "<!DOCTYPE html><html lang='fr'><head><meta charset='utf-8'><title>Rapport D2MG</title><style>" + style + "</style></head><body>" + corps.innerHTML + "</body></html>";
  telechargerFichier('D2MG_rapport_' + auj() + '.html', html, 'text/html');
  toast('Rapport enregistré en fichier autonome, ouvrable dans Word.', 'ok');
}
function vueRapports() {
  const e = D.etat.rapports || (D.etat.rapports = { periode: 'MOIS', division: '', du: debutMois(auj()), au: auj() });
  const b = bornesRapport();
  const lot = lotRapport();
  const s = Stats.synthese(lot);
  const p = D.parametres;
  const org = p.organisation || {};
  const seances = seancesRapport();
  const attPeriode = attentionsVisibles().filter(pt => dansPeriode(pt.date, b) || (pt.date_resolution && dansPeriode(pt.date_resolution, b)) || pt.statut !== 'RESOLU');
  const sa = Stats.syntheseAttentions(attPeriode);
  const termine = lot.filter(o => o.statut === 'TERMINEE').sort((a, b2) => a.date_fin < b2.date_fin ? -1 : 1);
  const pd = !e.division ? Stats.parDivision(lot) : [];
  const pa = Stats.parActeur(lot);
  const nbSU = seances.filter(x => x.type === 'STAND_UP').length;
  const nbRH = seances.filter(x => x.type === 'REVUE_HEBDO').length;
  const nbRM = seances.filter(x => x.type === 'REVUE_MOIS').length;
  const TYPES_SEANCE_LIB = { STAND_UP: 'Point quotidien', REVUE_HEBDO: 'Revue hebdomadaire', REVUE_MOIS: 'Revue mensuelle' };

  const actions = [];
  if (s.retard) actions.push(`Résorber les ${s.retard} activité(s) en retard : les inscrire au point quotidien jusqu'à clôture.`);
  if (s.bloque) actions.push(`Lever les ${s.bloque} blocage(s) déclaré(s) en sollicitant les interlocuteurs concernés.`);
  if (s.nonAffecte) actions.push(`Affecter sans délai les ${s.nonAffecte} activité(s) restée(s) sans responsable.`);
  if (sa.enRetard) actions.push(`Arbitrer les ${sa.enRetard} point(s) d'attention dont l'échéance est dépassée.`);
  if (s.tauxRespect !== null && s.tauxRespect < p.cible_respect_delai) actions.push("Réexaminer la grille des délais des activités les plus souvent dépassées : soit le délai est irréaliste, soit le processus doit être allégé.");
  if (s.sansResultat) actions.push(`Compléter le résultat des ${s.sansResultat} activité(s) clôturée(s) sans preuve documentée.`);
  if (!actions.length) actions.push("Maintenir le dispositif : aucun écart significatif n'appelle d'action corrective sur la période.");

  let n = 1;
  const secSynthese = n++;
  const secDivision = !e.division ? n++ : null;
  const secRealise = n++;
  const secEcarts = n++;
  const secAttention = n++;
  const secAnimation = n++;
  const secCharge = n++;
  const secConclusions = n++;

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Rapports</h1><p>Rapport d'activités périodique, imprimable, au format institutionnel ANADER.</p></div></div>
    <div class="barre noPrint">
      <div style="min-width:200px"><label>Période</label><select id="rp_periode">${PERIODES.map(x => `<option value="${x.code}" ${e.periode === x.code ? 'selected' : ''}>${ech(x.libelle)}</option>`).join('')}</select></div>
      <div style="min-width:220px"><label>Périmètre</label><select id="rp_division"><option value="">Direction — rapport consolidé</option>${D.divisions.map(d => `<option value="${ech(d.id)}" ${e.division === d.id ? 'selected' : ''}>${ech(d.libelle)}</option>`).join('')}</select></div>
      <span style="margin-left:auto"></span>
      <button class="btn primaire" id="btnImprimer">Imprimer / enregistrer en PDF</button>
      <button class="btn" id="btnExportRapportCsv">Exporter les données (CSV)</button>
      <button class="btn" id="btnEnregistrerRapport">Enregistrer le rapport</button>
    </div>
    <div class="rapport"><div id="zoneRapport">
      <div class="enteteInst">
        <div>${ech(org.pays || "RÉPUBLIQUE DE CÔTE D'IVOIRE")}</div>
        <div style="font-style:italic">${ech(org.ministere || '')}</div>
        <div class="t">${ech(org.agence || 'ANADER')}</div>
        <div>${ech(org.entite || 'Direction D2MG')}</div>
      </div>
      <div style="text-align:center;margin:14px 0">
        <h2 style="text-transform:uppercase;color:var(--accent-fonce);margin:0;font-size:16px">Rapport d'activités — Gestion des opérations</h2>
        <div class="gris">${ech(e.division ? ((D.divisions.find(d => d.id === e.division) || {}).libelle || '') : 'Rapport consolidé de la Direction')} · ${ech(b.libelle)}</div>
        <div class="gris" style="font-size:11px">Édité le ${dateFr(auj())} par ${ech(D.moi.nom_prenoms)}</div>
      </div>

      <h3>${secSynthese}. Synthèse de la période</h3>
      <div class="kpis">
        <div class="kpi"><div class="lib">Activités</div><div class="val">${s.total}</div><div class="sub">planifiées ou clôturées</div></div>
        <div class="kpi ok"><div class="lib">Terminées</div><div class="val">${s.termine}</div><div class="sub">${s.suspendu} suspendue(s)</div></div>
        <div class="kpi ${s.tauxRealisation === null ? '' : (s.tauxRealisation >= p.cible_realisation ? 'ok' : 'al')}"><div class="lib">Taux de réalisation</div><div class="val">${pct(s.tauxRealisation)}</div><div class="sub">des ${s.dues} arrivées à échéance</div></div>
        <div class="kpi ${s.tauxRespect === null ? '' : (s.tauxRespect >= p.cible_respect_delai ? 'ok' : 'al')}"><div class="lib">Respect des délais</div><div class="val">${pct(s.tauxRespect)}</div><div class="sub">cible ${p.cible_respect_delai} %</div></div>
        <div class="kpi"><div class="lib">Délai moyen</div><div class="val">${jrs(s.delaiMoyen)}</div></div>
      </div>
      <p><b>Appréciation :</b> ${ech(Stats.appreciation(s.tauxRespect, p.cible_respect_delai))}</p>
      <p class="gris" style="font-size:11.5px">Activités encore ouvertes à la date d'édition : ${s.ouvert}, dont ${s.retard} en retard et ${s.bloque} bloquée(s).</p>

      ${secDivision ? `<h3>${secDivision}. Performance par division</h3>
        ${pd.length ? `<table><thead><tr><th>Division</th><th class="centre">Activités</th><th class="centre">Terminées</th><th class="centre">Ouvertes</th><th class="centre">Retard</th><th class="centre">Réalisation</th><th class="centre">Respect délai</th><th class="centre">Délai moyen</th></tr></thead>
          <tbody>${pd.map(d => `<tr><td><b>${ech(d.libelle)}</b></td><td class="centre">${d.total}</td><td class="centre">${d.termine}</td><td class="centre">${d.ouvert}</td><td class="centre">${d.retard}</td><td class="centre">${pct(d.tauxRealisation)}</td><td class="centre">${pct(d.tauxRespect)}</td><td class="centre">${jrs(d.delaiMoyen)}</td></tr>`).join('')}</tbody></table>`
          : '<p class="gris">Aucune activité sur la période.</p>'}` : ''}

      <h3>${secRealise}. Activités réalisées et résultats obtenus</h3>
      ${termine.length ? `<table><thead><tr><th>N°</th><th>Activité</th>${e.division ? '' : '<th>Division</th>'}<th>Responsable</th><th>Réalisée le</th><th>Résultat obtenu</th><th>Délai</th></tr></thead>
        <tbody>${termine.map(o => { const dansD = o.date_fin && o.date_echeance && ecartOuvres(o.date_fin, o.date_echeance) >= 0;
          return `<tr><td class="mono">${ech(numCourt(o.numero))}</td><td>${ech(o.intitule)}${o.precision ? `<div class="gris" style="font-size:11px">${ech(o.precision)}</div>` : ''}</td>${e.division ? '' : `<td>${ech(nomDivision(o.division_id))}</td>`}
            <td>${ech(o.responsable_id ? nomAgent(o.responsable_id) : '—')}</td><td>${dateFr(o.date_fin)}</td><td>${ech(o.resultat)}</td>
            <td><span class="et ${dansD ? 'vert' : 'rouge'}">${dansD ? 'Dans le délai' : 'Hors délai'}</span></td></tr>`; }).join('')}</tbody></table>`
        : '<p class="gris">Aucune activité clôturée sur la période.</p>'}

      <h3>${secEcarts}. Analyse des écarts</h3>
      ${(!s.listeHorsDelai.length && !s.listeRetard.length && !s.listeBloque.length) ? '<p class="gris">Aucun écart constaté sur la période.</p>' : `
        ${s.listeHorsDelai.length ? `<p><b>Activités réalisées hors délai (${s.listeHorsDelai.length}) :</b></p>
          <table><thead><tr><th>Activité</th><th>Division</th><th>Échéance</th><th>Réalisée le</th><th class="centre">Dépassement</th></tr></thead>
          <tbody>${s.listeHorsDelai.map(o => `<tr><td>${ech(o.intitule)}</td><td>${ech(nomDivision(o.division_id))}</td><td>${dateFr(o.date_echeance)}</td><td>${dateFr(o.date_fin)}</td><td class="centre">${-ecartOuvres(o.date_fin, o.date_echeance)} j</td></tr>`).join('')}</tbody></table>` : ''}
        ${s.listeRetard.length ? `<p><b>Activités encore en retard à la date d'édition (${s.listeRetard.length}) :</b></p>
          <table><thead><tr><th>Activité</th><th>Division</th><th>Responsable</th><th>Échéance</th><th class="centre">Retard</th></tr></thead>
          <tbody>${s.listeRetard.map(o => `<tr><td>${ech(o.intitule)}</td><td>${ech(nomDivision(o.division_id))}</td><td>${ech(o.responsable_id ? nomAgent(o.responsable_id) : 'non affectée')}</td><td>${dateFr(o.date_echeance)}</td><td class="centre">${-ecartOuvres(auj(), o.date_echeance)} j</td></tr>`).join('')}</tbody></table>` : ''}
        ${s.listeBloque.length ? `<p><b>Activités bloquées (${s.listeBloque.length}) — causes déclarées :</b></p>
          <table><thead><tr><th>Activité</th><th>Division</th><th>Bloquée depuis</th><th>Motif</th></tr></thead>
          <tbody>${s.listeBloque.map(o => `<tr><td>${ech(o.intitule)}</td><td>${ech(nomDivision(o.division_id))}</td><td>${o.date_blocage ? dateFr(o.date_blocage) : '—'}</td><td>${ech(o.motif_blocage || '—')}</td></tr>`).join('')}</tbody></table>` : ''}`}

      <h3>${secAttention}. Points d'attention</h3>
      <p style="font-size:12.5px">${sa.ouverts} point(s) ouvert(s), ${sa.resolus} résolu(s). Délai moyen de résolution : ${jrs(sa.delaiMoyenResolution)}.</p>
      ${attPeriode.length ? `<table><thead><tr><th>N°</th><th>Point d'attention</th><th>Action à mener</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
        <tbody>${attPeriode.slice(0, 30).map(pt => `<tr><td class="mono">${ech(numCourt(pt.numero))}</td><td>${ech(pt.intitule)}</td><td>${ech(pt.action_a_mener)}</td><td>${ech(nomAgent(pt.responsable_id))}</td><td>${dateFr(pt.echeance)}</td><td>${badgeStatutAtt(pt.statut)}</td></tr>`).join('')}</tbody></table>` : "<p class=\"gris\">Aucun point d'attention sur la période.</p>"}

      <h3>${secAnimation}. Animation de la Direction</h3>
      <p style="font-size:12.5px">${nbSU} point(s) quotidien(s), ${nbRH} revue(s) hebdomadaire(s) et ${nbRM} revue(s) mensuelle(s) tenu(s) et consigné(s) sur la période.</p>
      ${(nbRH || nbRM) ? `<table><thead><tr><th>Date</th><th>Séance</th><th class="centre">Participants</th><th>Décisions arrêtées</th></tr></thead>
        <tbody>${seances.filter(x => x.type === 'REVUE_HEBDO' || x.type === 'REVUE_MOIS').map(x => `<tr><td>${dateFr(x.date)}</td><td>${ech(TYPES_SEANCE_LIB[x.type])}</td><td class="centre">${(x.participants || []).length}</td><td>${ech(x.decisions || '—')}</td></tr>`).join('')}</tbody></table>` : ''}

      <h3>${secCharge}. Charge par acteur</h3>
      ${pa.length ? barresHtml(pa.slice(0, 14).map(a => [a.libelle, a.total])) : '<p class="gris">Aucune donnée.</p>'}

      <h3>${secConclusions}. Conclusions et actions proposées</h3>
      <ol style="line-height:1.8;padding-left:20px;font-size:12.5px">${actions.map(a => `<li>${ech(a)}</li>`).join('')}</ol>

      <div class="blocSignature">
        <div class="cs"><b>Rédaction</b>${ech(D.moi.nom_prenoms)}<br><span class="gris">${ech(D.moi.fonction || '')}</span></div>
        <div class="cs"><b>Vérification</b><br><span class="gris">Nom, date, visa</span></div>
        <div class="cs"><b>Approbation</b><br><span class="gris">Nom, fonction, date, visa</span></div>
      </div>
      <p style="text-align:center;font-size:11px;color:var(--gris);margin-top:22px;border-top:1px solid var(--line);padding-top:8px">${ech(org.pied || 'ANADER — Société Anonyme au capital de 500 000 000 F CFA — Siège social : Abidjan — www.anader.ci')}</p>
    </div></div>`;

  $('#rp_periode').addEventListener('change', ev => { e.periode = ev.target.value; vueRapports(); });
  $('#rp_division').addEventListener('change', ev => { e.division = ev.target.value; vueRapports(); });
  $('#btnImprimer').addEventListener('click', () => window.print());
  $('#btnExportRapportCsv').addEventListener('click', exporterRapportCsv);
  $('#btnEnregistrerRapport').addEventListener('click', enregistrerRapportHtml);
}

/* ============================================================ PARAMÉTRAGE */
function vueParametrage() {
  const e = D.etat.param || (D.etat.param = { tab: 'catalogue' });
  const tabs = [['catalogue', 'Délais et catalogue'], ['seuils', 'Seuils de pilotage'], ['feries', 'Jours fériés'], ['sauvegarde', 'Sauvegarde des données']];
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Paramétrage</h1><p>Grille des délais, seuils de pilotage, calendrier ouvré et sauvegarde des données. Ces paramètres pilotent tout le calcul des échéances.</p></div></div>
    <div class="onglets">${tabs.map(t => `<button type="button" data-tab="${t[0]}" class="${e.tab === t[0] ? 'active' : ''}">${ech(t[1])}</button>`).join('')}</div>
    <div id="pz"></div>`;
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => { e.tab = b.dataset.tab; vueParametrage(); }));
  ({ catalogue: pCatalogue, seuils: pSeuilsOps, feries: pFeriesOps, sauvegarde: pSauvegardeOps }[e.tab] || pCatalogue)();
}
function prochainCodeFiche(divisionId) {
  let max = 0;
  D.catalogue.forEach(f => { if (f.division_id !== divisionId) return; const m = /^[A-Z]+-(\d+)$/.exec(f.id || ''); if (m) { const nn = parseInt(m[1], 10); if (nn > max) max = nn; } });
  return divisionId + '-' + String(max + 1).padStart(2, '0');
}
function casesRoles(idPrefix, rolesActifs) {
  rolesActifs = rolesActifs || [];
  return `<div class="champs">${Object.keys(ROLES_LABELS).map(r => `<label style="font-weight:400;display:flex;align-items:center;gap:6px"><input type="checkbox" id="${idPrefix}_${r}" ${rolesActifs.includes(r) ? 'checked' : ''}> ${ech(ROLES_LABELS[r])}</label>`).join('')}</div>`;
}
function rolesCoches(idPrefix) { return Object.keys(ROLES_LABELS).filter(r => { const c = $('#' + idPrefix + '_' + r); return c && c.checked; }); }
function pCatalogue() {
  const peut = aDroit('ops.catalogue') || estPiloteOuCopilote();
  if (!peut) { $('#pz').innerHTML = `<div class="carte"><p class="gris">Ce droit d'usage (Gérer le catalogue des délais) ne vous a pas été attribué. Le Pilote peut l'activer depuis l'accueil D2MG Pilotage, onglet de votre profil.</p></div>`; return; }
  $('#pz').innerHTML = `
    <div class="msgInfo"><b>Ces délais pilotent le calcul de toutes les échéances.</b> Un délai modifié ici ne change pas les échéances déjà calculées sur les activités existantes.</div>
    <div class="barre noPrint"><button class="btn primaire" id="btnAjoutFiche">Ajouter une activité récurrente</button></div>
    ${D.divisions.map(d => {
      const sous = D.catalogue.filter(f => f.division_id === d.id);
      if (!sous.length) return '';
      return `<div class="carte"><h3>${ech(d.libelle)} <span class="et gris">${sous.length}</span></h3>
        <div class="tw" style="max-height:none"><table><thead><tr><th>Code</th><th>Activité</th><th>Rythme</th><th class="centre">Délai (j ouvrés)</th><th class="centre">Actif</th><th class="noPrint"></th></tr></thead>
        <tbody>${sous.map(f => `<tr ${f.actif ? '' : 'style="opacity:.55"'}>
          <td class="mono">${ech(f.id)}</td><td>${ech(f.intitule)}</td>
          <td><select class="f_freq" data-id="${ech(f.id)}" style="padding:4px;font-size:12px">${Object.keys(FREQUENCES).sort((a, b) => FREQUENCES[a].ordre - FREQUENCES[b].ordre).map(k => `<option value="${k}" ${f.frequence === k ? 'selected' : ''}>${ech(FREQUENCES[k].libelle)}</option>`).join('')}</select></td>
          <td class="centre"><input type="number" class="f_delai" data-id="${ech(f.id)}" value="${f.delai}" min="1" max="250" style="width:70px;text-align:center"></td>
          <td class="centre"><input type="checkbox" class="f_actif" data-id="${ech(f.id)}" ${f.actif ? 'checked' : ''}></td>
          <td class="noPrint"><button class="btn sm" data-modif="${ech(f.id)}">Modifier</button> <button class="btn sm danger" data-suppr="${ech(f.id)}">✕</button></td></tr>`).join('')}</tbody></table></div></div>`;
    }).join('')}`;
  $('#btnAjoutFiche').addEventListener('click', ouvrirModaleAjoutFiche);
  $$('.f_freq').forEach(sel => sel.addEventListener('change', async () => { await sb.from('operations_catalogue').update({ frequence: sel.value }).eq('id', sel.dataset.id); await chargerReferentiels(); toast('Rythme mis à jour.', 'ok'); }));
  $$('.f_delai').forEach(i => i.addEventListener('change', async () => {
    const v = parseInt(i.value, 10);
    if (!v || v < 1 || v > 250) { toast('Le délai doit être compris entre 1 et 250 jours ouvrés.', 'err'); pCatalogue(); return; }
    await sb.from('operations_catalogue').update({ delai: v }).eq('id', i.dataset.id); await chargerReferentiels(); toast('Délai mis à jour.', 'ok');
  }));
  $$('.f_actif').forEach(c => c.addEventListener('change', async () => { await sb.from('operations_catalogue').update({ actif: c.checked }).eq('id', c.dataset.id); await chargerReferentiels(); }));
  $$('[data-modif]').forEach(bt => bt.addEventListener('click', () => ouvrirModaleModifierFiche(bt.dataset.modif)));
  $$('[data-suppr]').forEach(bt => bt.addEventListener('click', async () => {
    const f = D.catalogue.find(x => x.id === bt.dataset.suppr);
    const nn = D.activites.filter(o => o.fiche_id === f.id).length;
    let msg = `Supprimer définitivement l'activité récurrente ${f.id} (${f.intitule}) du catalogue ?`;
    if (nn) msg += `\n\n${nn} activité(s) déjà planifiée(s) à partir de cette fiche resteront dans le registre, mais ne seront plus reconductibles automatiquement en revue.`;
    if (!confirm(msg)) return;
    const { error } = await sb.from('operations_catalogue').delete().eq('id', f.id);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); toast('Activité ' + f.id + ' retirée du catalogue.', 'ok'); pCatalogue();
  }));
}
function ouvrirModaleAjoutFiche() {
  ouvrirModale('Ajouter une activité récurrente',
    `<label for="fDiv">Division</label><select id="fDiv">${D.divisions.map(d => `<option value="${ech(d.id)}">${ech(d.libelle)}</option>`).join('')}</select>
     <label for="fInt">Intitulé de l'activité</label><input type="text" id="fInt" maxlength="160">
     <div class="champs">
       <div><label for="fFreq">Rythme</label><select id="fFreq">${Object.keys(FREQUENCES).sort((a, b) => FREQUENCES[a].ordre - FREQUENCES[b].ordre).map(k => `<option value="${k}" ${k === 'A_LA_DEMANDE' ? 'selected' : ''}>${ech(FREQUENCES[k].libelle)}</option>`).join('')}</select></div>
       <div><label for="fDelai">Délai (jours ouvrés)</label><input type="number" id="fDelai" value="5" min="1" max="250"></div>
     </div>
     <label>Rôles autorisés à la traiter (aucun coché = tous)</label>${casesRoles('fRol', [])}
     <div id="errFiche"></div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Ajouter', cl: 'primaire', act: async () => {
        const div = $('#fDiv').value, intitule = ($('#fInt').value || '').trim(), delai = parseInt($('#fDelai').value, 10);
        if (intitule.length < 5) { $('#errFiche').innerHTML = "<div class=\"msgErreur\">Précisez l'intitulé de l'activité (5 caractères au moins).</div>"; return; }
        if (!delai || delai < 1 || delai > 250) { $('#errFiche').innerHTML = '<div class="msgErreur">Le délai doit être compris entre 1 et 250 jours ouvrés.</div>'; return; }
        const code = prochainCodeFiche(div);
        const { error } = await sb.from('operations_catalogue').insert({ id: code, division_id: div, intitule, frequence: $('#fFreq').value, delai, roles: rolesCoches('fRol'), actif: true });
        if (error) { toast('Erreur : ' + error.message, 'err'); return; }
        await chargerReferentiels(); fermerModale(); toast('Activité ' + code + ' ajoutée au catalogue.', 'ok'); pCatalogue();
     } }]);
}
function ouvrirModaleModifierFiche(id) {
  const f = D.catalogue.find(x => x.id === id); if (!f) return;
  ouvrirModale('Modifier ' + f.id,
    `<p class="gris">Division et code restent fixes : ${ech(nomDivision(f.division_id))} · ${ech(f.id)}</p>
     <label for="fInt2">Intitulé de l'activité</label><input type="text" id="fInt2" maxlength="160" value="${ech(f.intitule)}">
     <div class="champs">
       <div><label for="fFreq2">Rythme</label><select id="fFreq2">${Object.keys(FREQUENCES).sort((a, b) => FREQUENCES[a].ordre - FREQUENCES[b].ordre).map(k => `<option value="${k}" ${f.frequence === k ? 'selected' : ''}>${ech(FREQUENCES[k].libelle)}</option>`).join('')}</select></div>
       <div><label for="fDelai2">Délai (jours ouvrés)</label><input type="number" id="fDelai2" value="${f.delai}" min="1" max="250"></div>
     </div>
     <label>Rôles autorisés à la traiter (aucun coché = tous)</label>${casesRoles('fRol2', f.roles || [])}
     <div id="errFiche2"></div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Enregistrer', cl: 'primaire', act: async () => {
        const intitule = ($('#fInt2').value || '').trim(), delai = parseInt($('#fDelai2').value, 10);
        if (intitule.length < 5) { $('#errFiche2').innerHTML = "<div class=\"msgErreur\">Précisez l'intitulé de l'activité (5 caractères au moins).</div>"; return; }
        if (!delai || delai < 1 || delai > 250) { $('#errFiche2').innerHTML = '<div class="msgErreur">Le délai doit être compris entre 1 et 250 jours ouvrés.</div>'; return; }
        const { error } = await sb.from('operations_catalogue').update({ intitule, frequence: $('#fFreq2').value, delai, roles: rolesCoches('fRol2') }).eq('id', f.id);
        if (error) { toast('Erreur : ' + error.message, 'err'); return; }
        await chargerReferentiels(); fermerModale(); toast(f.id + ' — activité modifiée.', 'ok'); pCatalogue();
     } }]);
}
function pSeuilsOps() {
  const peut = aDroit('ops.parametrer') || estPiloteOuCopilote();
  const p = D.parametres;
  const champs = [
    ['alerte_avant_jours', "Alerte d'échéance proche", "Nombre de jours ouvrés avant l'échéance à partir duquel l'activité passe en orange."],
    ['wip_par_agent', 'Seuil de charge par acteur', "Nombre d'activités simultanément démarrées au-delà duquel une alerte de surcharge apparaît."],
    ['dormant_jours', 'Activité dormante', 'Nombre de jours ouvrés sans mouvement au-delà duquel une activité ouverte est signalée.'],
    ['blocage_jours', 'Blocage non levé', 'Nombre de jours ouvrés au-delà duquel un blocage remonte à la Direction.'],
    ['cible_respect_delai', 'Cible de respect des délais', "Objectif du taux d'activités clôturées dans le délai (%)."],
    ['cible_realisation', 'Cible de réalisation', "Objectif du taux d'activités planifiées effectivement réalisées (%)."]
  ];
  $('#pz').innerHTML = `
    <div class="carte"><h3>Seuils de pilotage</h3>
      <div class="champs">${champs.map(c => `<div><label for="s_${c[0]}">${ech(c[1])}</label><input type="number" id="s_${c[0]}" value="${p[c[0]]}" min="0" max="365" ${peut ? '' : 'disabled'}><div class="aide">${ech(c[2])}</div></div>`).join('')}</div>
      ${peut ? '<div class="barre" style="margin-top:10px"><button class="btn primaire sm" id="btnSeuils">Enregistrer</button></div>' : "<p class=\"gris\" style=\"margin-top:10px\">Ce droit d'usage ne vous a pas été attribué.</p>"}
    </div>
    <div class="carte"><h3>Facteurs de priorité</h3>
      <div class="tw" style="max-height:none"><table><thead><tr><th>Priorité</th><th class="centre">Facteur appliqué au délai</th><th>Effet</th></tr></thead>
      <tbody>${Object.keys(PRIORITES).sort((a, b) => PRIORITES[a].ordre - PRIORITES[b].ordre).map(k => { const pr = PRIORITES[k];
        return `<tr><td><b>${ech(pr.libelle)}</b></td><td class="centre">× ${pr.facteur}</td><td>${pr.facteur < 1 ? 'Délai réduit de moitié, avec un plancher de 1 jour ouvré.' : (pr.facteur > 1 ? 'Délai majoré de moitié.' : 'Délai du catalogue appliqué tel quel.')}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="aide">Ces facteurs sont fixes dans cette version du module.</p>
    </div>`;
  const btn = $('#btnSeuils');
  if (btn) btn.addEventListener('click', async () => {
    const patch = {};
    champs.forEach(c => { const v = parseInt($('#s_' + c[0]).value, 10); if (!isNaN(v) && v >= 0) patch[c[0]] = v; });
    patch.updated_at = new Date().toISOString();
    const { error } = await sb.from('operations_parametres').update(patch).eq('id', true);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); toast('Seuils mis à jour.', 'ok'); pSeuilsOps();
  });
}
async function pFeriesOps() {
  const peut = aDroit('ops.parametrer') || estPiloteOuCopilote();
  const { data } = await sb.from('jours_feries').select('*').order('date_ferie');
  $('#pz').innerHTML = `
    <div class="msgInfo">Les échéances sont calculées en <b>jours ouvrés</b> : samedis, dimanches et les dates ci-dessous ne sont pas comptés. Ce calendrier est partagé avec les autres modules du portail.</div>
    <div class="carte"><h3>Jours fériés pris en compte <span class="et gris">${(data || []).length}</span></h3>
      ${peut ? `<div class="barre"><input type="date" id="j_d" style="max-width:200px"><input type="text" id="j_l" placeholder="Libellé (facultatif)" style="max-width:260px"><button class="btn primaire sm" id="j_add">Ajouter</button></div>` : ''}
      <div class="tw" style="max-height:none"><table><thead><tr><th>Date</th><th>Jour</th>${peut ? '<th class="noPrint"></th>' : ''}</tr></thead>
      <tbody>${(data || []).map(f => `<tr><td>${dateFr(f.date_ferie)}</td><td class="gris">${ech(dateLongue(f.date_ferie))}${f.libelle ? ' — ' + ech(f.libelle) : ''}</td>${peut ? `<td class="noPrint"><button class="btn sm danger" data-jd="${f.id}">Retirer</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
    </div>`;
  const add = $('#j_add');
  if (add) add.addEventListener('click', async () => {
    const d = $('#j_d').value; if (!d) { toast('Choisissez une date.', 'err'); return; }
    const { error } = await sb.from('jours_feries').insert({ date_ferie: d, libelle: ($('#j_l').value || '').trim() || null });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerFeries(); toast('Jour férié ajouté.', 'ok'); pFeriesOps();
  });
  $$('[data-jd]').forEach(bt => bt.addEventListener('click', async () => { await sb.from('jours_feries').delete().eq('id', bt.dataset.jd); await chargerFeries(); pFeriesOps(); }));
}

/* ------------------------------------------------- SAUVEGARDE / RESTAURATION */
const SAUVEGARDE_TABLES_OPS = [
  { table: 'operations_divisions', feuille: 'Divisions', ordre: 'ordre' },
  { table: 'operations_catalogue', feuille: 'Catalogue' },
  { table: 'operations_parametres', feuille: 'Parametres' },
  { table: 'operations_activites', feuille: 'Activites', ordre: 'created_at' },
  { table: 'operations_activite_commentaires', feuille: 'Activite_Commentaires' },
  { table: 'operations_activite_historique', feuille: 'Activite_Historique' },
  { table: 'operations_attentions', feuille: 'Points_Attention' },
  { table: 'operations_attention_commentaires', feuille: 'Attention_Commentaires' },
  { table: 'operations_attention_historique', feuille: 'Attention_Historique' },
  { table: 'operations_seances', feuille: 'Seances' },
  { table: 'operations_seance_historique', feuille: 'Seance_Historique' }
];
function sauvegardeStatutOps(msg) { const el = $('#sauvegardeStatut'); if (el) el.textContent = msg || ''; }
async function collecterSauvegardeOps() {
  const resultat = {}; const erreurs = [];
  for (const def of SAUVEGARDE_TABLES_OPS) {
    sauvegardeStatutOps('Extraction en cours : ' + def.feuille + '...');
    let q = sb.from(def.table).select('*');
    if (def.ordre) q = q.order(def.ordre, { ascending: true });
    const { data, error } = await q;
    if (error) { erreurs.push(def.table + ' : ' + error.message); resultat[def.table] = []; }
    else resultat[def.table] = data || [];
  }
  sauvegardeStatutOps('');
  return { resultat, erreurs };
}
async function telechargerSauvegardeJsonOps() {
  toast('Extraction des données en cours...', 'ok');
  const { resultat, erreurs } = await collecterSauvegardeOps();
  const totalLignes = Object.values(resultat).reduce((s, arr) => s + arr.length, 0);
  const paquet = {
    plateforme: 'D2MG Pilotage — ANADER — Gestion des opérations',
    date_sauvegarde: new Date().toISOString(),
    realisee_par: D.moi ? D.moi.nom_prenoms + ' (' + D.moi.role + ')' : '—',
    nombre_tables: SAUVEGARDE_TABLES_OPS.length, nombre_enregistrements: totalLignes,
    tables_en_erreur: erreurs, donnees: resultat
  };
  telechargerFichier('GestionOperations_Sauvegarde_Brute_' + auj() + '.json', JSON.stringify(paquet, null, 2), 'application/json');
  if (erreurs.length) toast('Sauvegarde générée avec ' + erreurs.length + ' table(s) inaccessible(s).', 'err');
  else toast('Sauvegarde brute générée : ' + totalLignes + ' enregistrements.', 'ok');
}
async function chargerEtatBaseOps() {
  const maj = (id, val) => { const el = $('#' + id); if (el) el.textContent = val; };
  const compter = async t => { const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true }); return error ? '—' : (count || 0); };
  const [nbAct, nbAtt, nbSea, nbCat] = await Promise.all([compter('operations_activites'), compter('operations_attentions'), compter('operations_seances'), compter('operations_catalogue')]);
  maj('etatBaseActivites', nbAct); maj('etatBaseAttentions', nbAtt); maj('etatBaseSeances', nbSea); maj('etatBaseCatalogue', nbCat);
}
function pSauvegardeOps() {
  $('#pz').innerHTML = `
    <div class="carte"><h3>État de la base</h3>
      <div class="kpis">
        <div class="kpi"><div class="lib">Activités</div><div class="val" id="etatBaseActivites">…</div></div>
        <div class="kpi"><div class="lib">Points d'attention</div><div class="val" id="etatBaseAttentions">…</div></div>
        <div class="kpi"><div class="lib">Séances consignées</div><div class="val" id="etatBaseSeances">…</div></div>
        <div class="kpi"><div class="lib">Activités au catalogue</div><div class="val" id="etatBaseCatalogue">…</div></div>
      </div>
    </div>
    <div class="carte"><h3>Sauvegarde brute (JSON)</h3>
      <p class="aide">Copie fidèle et intégrale des données du module, champ par champ. À conserver pour une restauration technique éventuelle.</p>
      <button class="btn sm" type="button" id="btnSauvJsonOps">Télécharger la sauvegarde brute</button>
    </div>
    <p class="aide" id="sauvegardeStatut"></p>
    ${estPiloteOuCopilote() ? `
    <div class="carte" id="restaurationCard"><h3>Restauration des données</h3>
      <p class="aide">Réservé au Pilote et aux Co-pilotes. Recharge le contenu d'un fichier de sauvegarde brute (JSON) téléchargé depuis cet écran. Les enregistrements du fichier remplacent, table par table, ceux qui portent le même identifiant ; les autres données existantes ne sont pas touchées. Action irréversible, à réserver à une reprise après incident.</p>
      <input type="file" id="restaurationFichierOps" accept="application/json" style="max-width:420px">
      <div style="margin-top:9px"><button class="btn sm danger" type="button" id="btnRestaurerOps">Restaurer depuis ce fichier</button></div>
      <p class="aide" id="restaurationStatutOps"></p>
    </div>` : ''}`;
  $('#btnSauvJsonOps').addEventListener('click', telechargerSauvegardeJsonOps);
  const btnR = $('#btnRestaurerOps'); if (btnR) btnR.addEventListener('click', restaurerSauvegardeOperations);
  chargerEtatBaseOps();
}
const RESTAURATION_TABLES_OPS = [
  { table: 'operations_divisions', pk: 'id' },
  { table: 'operations_catalogue', pk: 'id' },
  { table: 'operations_parametres', pk: 'id' },
  { table: 'operations_activites', pk: 'id' },
  { table: 'operations_activite_commentaires', pk: 'id' },
  { table: 'operations_activite_historique', pk: 'id' },
  { table: 'operations_attentions', pk: 'id' },
  { table: 'operations_attention_commentaires', pk: 'id' },
  { table: 'operations_attention_historique', pk: 'id' },
  { table: 'operations_seances', pk: 'id' },
  { table: 'operations_seance_historique', pk: 'id' }
];
async function restaurerLotDeTablesOps(paquet, tables, setStatut) {
  if (!paquet || typeof paquet !== 'object' || !paquet.donnees || typeof paquet.donnees !== 'object')
    throw new Error('Fichier de sauvegarde invalide : structure inattendue.');
  const rapport = [];
  for (const def of tables) {
    const rows = paquet.donnees[def.table];
    if (!rows || !rows.length) { rapport.push({ table: def.table, n: 0, erreur: null }); continue; }
    setStatut('Restauration en cours : ' + def.table + ' (' + rows.length + ' enregistrement(s))...');
    let total = 0, erreur = null;
    for (let i = 0; i < rows.length; i += 500) {
      const lot = rows.slice(i, i + 500);
      const { error } = await sb.from(def.table).upsert(lot, { onConflict: def.pk });
      if (error) { erreur = error.message; break; }
      total += lot.length;
    }
    rapport.push({ table: def.table, n: total, erreur });
  }
  setStatut('');
  return rapport;
}
async function restaurerSauvegardeOperations() {
  if (!estPiloteOuCopilote()) { toast('Réservé au Pilote et aux Co-pilotes.', 'err'); return; }
  const input = $('#restaurationFichierOps');
  if (!input.files || !input.files[0]) { toast("Choisissez d'abord un fichier de sauvegarde JSON.", 'err'); return; }
  if (!confirm('Restaurer « ' + input.files[0].name + ' » ? Les enregistrements du fichier remplaceront ceux qui portent le même identifiant dans la base actuelle. Cette action est irréversible.')) return;
  const setStatut = m => { const el = $('#restaurationStatutOps'); if (el) el.textContent = m || ''; };
  try {
    const texte = await input.files[0].text();
    const paquet = JSON.parse(texte);
    toast('Restauration en cours...', 'ok');
    const rapport = await restaurerLotDeTablesOps(paquet, RESTAURATION_TABLES_OPS, setStatut);
    const erreurs = rapport.filter(r => r.erreur);
    const total = rapport.reduce((s, r) => s + r.n, 0);
    if (erreurs.length) { toast('Restauration terminée avec ' + erreurs.length + ' table(s) en erreur (voir la console). Total restauré : ' + total + '.', 'err'); console.error('Erreurs de restauration :', erreurs); }
    else toast('Restauration terminée : ' + total + ' enregistrement(s) restauré(s).', 'ok');
    await chargerReferentiels(); await chargerActivites(); await chargerSeances(); await chargerFeries();
    chargerEtatBaseOps();
  } catch (e) {
    setStatut(''); toast('Erreur de restauration : ' + e.message, 'err');
  }
}

/* =============================================================== ANNUAIRE */
function vueAnnuaire() {
  const peut = aDroit('ops.parametrer') || estPiloteOuCopilote();
  if (!peut) { $('#zone').innerHTML = `<div class="tete"><div><h1>Annuaire</h1></div></div><div class="carte"><p class="gris">Ce droit d'usage ne vous a pas été attribué.</p></div>`; return; }
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Annuaire</h1><p>Rattachement des acteurs du portail aux divisions et aux rôles opérationnels de la D2MG.</p></div></div>
    <div class="msgInfo">Cet écran ne gère pas les droits d'usage (ops.*) : ceux-ci se règlent depuis l'accueil D2MG Pilotage, sur la fiche de chaque acteur, onglet « Gestion des opérations ». Il permet seulement de rattacher un acteur à une division et de lui donner un intitulé de rôle opérationnel.</div>
    <div class="carte"><div class="tw" style="max-height:none"><table><thead><tr><th>Acteur</th><th>Fonction</th><th>Rôle plateforme</th><th>Division D2MG</th><th>Rôle opérationnel</th></tr></thead>
      <tbody>${D.agents.map(a => `<tr>
        <td><b>${ech(a.nom_prenoms)}</b></td><td class="gris">${ech(a.fonction || '—')}</td><td class="gris">${ech(a.role)}</td>
        <td><select class="an_div" data-id="${ech(a.id_acteur)}"><option value="">—</option>${D.divisions.map(d => `<option value="${ech(d.id)}" ${a.division_operations_id === d.id ? 'selected' : ''}>${ech(d.court)}</option>`).join('')}</select></td>
        <td><input type="text" class="an_role" data-id="${ech(a.id_acteur)}" value="${ech(a.role_operations || '')}" list="rolesOps" placeholder="Directeur, Chef de division…"></td>
      </tr>`).join('')}</tbody></table></div></div>
    <datalist id="rolesOps">${Object.values(ROLES_LABELS).map(l => `<option value="${ech(l)}">`).join('')}</datalist>`;
  $$('.an_div').forEach(sel => sel.addEventListener('change', async () => {
    const { error } = await sb.from('acteurs').update({ division_operations_id: sel.value || null }).eq('id_acteur', sel.dataset.id);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); toast('Rattachement enregistré.', 'ok');
  }));
  $$('.an_role').forEach(i => i.addEventListener('change', async () => {
    const { error } = await sb.from('acteurs').update({ role_operations: i.value.trim() || null }).eq('id_acteur', i.dataset.id);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); toast('Rôle opérationnel enregistré.', 'ok');
  }));
}

/* ============================================================ MODE D'EMPLOI */
function vueAide() {
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Mode d'emploi</h1><p>Le pilotage des opérations de la D2MG, de la planification à la clôture, et ce que chaque écran permet de faire.</p></div></div>
    <div class="carte">
      <h3>Manuel d'utilisation</h3>
      <p class="aide" style="margin:0 0 12px">La description ci-dessous couvre l'essentiel. Pour le détail complet, écran par écran, consultez ou téléchargez le manuel d'utilisation du module.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="Manuel_Utilisation_Gestion_des_Operations_D2MG.pdf" target="_blank" rel="noopener" class="btn primaire" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">📖 Consulter le manuel (PDF)</a>
        <a href="Manuel_Utilisation_Gestion_des_Operations_D2MG.pdf" download class="btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">⬇ Télécharger le manuel (PDF)</a>
      </div>
    </div>
    <div class="carte"><h3>Le principe</h3>
      <p style="font-size:12.5px">Chaque activité — qu'elle vienne du catalogue de travail standard ou qu'elle soit ponctuelle — est planifiée avec une échéance calculée automatiquement en jours ouvrés, affectée à un responsable, puis suivie jusqu'à sa clôture avec un résultat documenté. Les points d'attention couvrent les irritants qui dépassent une activité isolée. Le point quotidien et les revues hebdomadaire/mensuelle consignent l'animation de la Direction.</p></div>
    <div class="deux">
      <div class="carte"><h3>Comment se calcule l'échéance</h3>
        <p style="font-size:12.5px">Chaque activité porte un <b>délai de base en jours ouvrés</b> (repris du catalogue ou saisi librement), pondéré par la priorité retenue à la planification :</p>
        <ul style="font-size:12.5px;padding-left:19px">${Object.values(PRIORITES).map(p => `<li><b>${ech(p.libelle)}</b> : délai × ${p.facteur}</li>`).join('')}</ul>
        <p style="font-size:12.5px">L'échéance est calculée à partir de la date de planification, en ne comptant que les jours ouvrés : samedis, dimanches et jours fériés du calendrier partagé sont déduits.</p></div>
      <div class="carte"><h3>Le cycle de vie d'une activité</h3>
        <p style="font-size:12.5px">À faire → En cours → (Bloqué) → Terminée, ou Suspendue à tout moment tant qu'elle n'est pas terminée. Chaque geste est tracé dans un historique non modifiable.</p>
        <ul style="font-size:12.5px;padding-left:19px">${ORDRE_STATUTS.map(k => `<li>${badgeStatut(k)}</li>`).join('')}</ul></div>
    </div>
    <div class="carte"><h3>Vos droits d'usage sur ce module</h3>
      <p class="aide">Chaque acteur dispose de droits d'usage individuels, attribués par le Pilote depuis l'accueil D2MG Pilotage.</p>
      <div id="zDroitsOps"></div>
    </div>
    <div class="carte"><h3>Bonnes pratiques</h3>
      <ul style="font-size:12.5px;line-height:1.8;padding-left:19px">
        <li><b>Planifier avant d'agir.</b> Une activité non planifiée n'a pas d'échéance et échappe au pilotage.</li>
        <li><b>Affecter sans délai.</b> Une activité sans responsable n'est traitée par personne.</li>
        <li><b>Documenter le résultat à la clôture.</b> Une activité terminée sans résultat documenté ne vaut pas preuve.</li>
        <li><b>Signaler un blocage dès qu'il survient.</b> C'est ce qui permet à la Direction d'arbitrer au point quotidien.</li>
        <li><b>Tenir le point quotidien et les revues.</b> Ils constituent la preuve d'animation du processus pour le SMQ.</li>
        <li><b>Ouvrir un point d'attention pour tout irritant durable</b> qui dépasse une activité isolée.</li>
      </ul>
    </div>`;
  sb.from('ref_droits').select('*').eq('module', 'operations').order('ordre').then(({ data }) => {
    const z = $('#zDroitsOps'); if (!z) return;
    const grp = {};
    (data || []).forEach(d => (grp[d.groupe] = grp[d.groupe] || []).push(d));
    z.innerHTML = Object.keys(grp).map(g => `<h4 style="color:var(--accent);font-size:11.5px;text-transform:uppercase;margin:12px 0 5px">${ech(g)}</h4>
      ${grp[g].map(d => `<div style="display:flex;gap:9px;align-items:flex-start;padding:4px 0;font-size:12.5px">
        <span class="et ${aDroit(d.code) ? 'vert' : 'gris'}" style="min-width:92px;text-align:center">${aDroit(d.code) ? 'Autorisé' : 'Non autorisé'}</span>
        <span><b>${ech(d.libelle)}</b> — <span class="gris">${ech(d.description || '')}</span></span></div>`).join('')}`).join('');
  });
}

/* ==================================================================== */
demarrer();

})();
