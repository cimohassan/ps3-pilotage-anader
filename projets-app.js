/* =========================================================================
 * D2MG PILOTAGE — CHAMBRE « GESTION DE PROJET »
 * Application autonome, adossée à Supabase.
 * Structure générique de pilotage de projet inspirée des standards PMBOK/PMP
 * (charte, parties prenantes, RACI, WBS, jalons, livrables, maîtrise des
 * coûts, registre des risques coté P x I, registre des décisions, réserves,
 * indicateurs de phase, RETEX) et des principes d'excellence opérationnelle
 * et de lean management (kanban, limite d'en-cours, journal des obstacles,
 * management visuel par écarts, capitalisation).
 * ========================================================================= */
(function () {
'use strict';

/* ---------------------------------------------------------------- socle */
const SUPABASE_URL = 'https://tcirboephslicjmhokbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaXJib2VwaHNsaWNqbWhva2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjYxNjUsImV4cCI6MjEwMDg0MjE2NX0.e3f1B__NmDVL5G1Cze1p115ya2Rs-ErzzTUr25UCKEg';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ech = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nl2br = s => ech(s).replace(/\n/g, '<br>');

function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4300);
}
function iso(d) { return d.toISOString().slice(0, 10); }
function auj() { return iso(new Date()); }
function fdate(d) { if (!d) return '—'; try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR'); } catch (e) { return d; } }
function fnum(n) { return (n === null || n === undefined || n === '') ? '—' : Number(n).toLocaleString('fr-FR'); }
function pct(n) { return (n === null || n === undefined || isNaN(n)) ? '—' : Math.round(n) + '%'; }

/* ------------------------------------------- moteur de délais jours ouvrés */
let feries = new Set();
async function chargerFeries() {
  const { data } = await sb.from('jours_feries').select('date_ferie');
  feries = new Set((data || []).map(f => f.date_ferie));
}
function ouvre(d) {
  const j = new Date(d + 'T00:00:00').getDay();
  return j !== 0 && j !== 6 && !feries.has(d);
}
function ecartOuvres(cible) {
  if (!cible) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const c = new Date(cible + 'T00:00:00');
  const sens = c >= a ? 1 : -1;
  let d = new Date(a), n = 0, garde = 0;
  while (iso(d) !== cible && garde++ < 4000) { d.setDate(d.getDate() + sens); if (ouvre(iso(d))) n += sens; }
  return n;
}
function joursCal(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

/* ------------------------------------------------------- état applicatif */
const S = {
  acteur: null, droits: {}, acteurs: [], seuils: [],
  projets: [], projet: null,
  phases: [], jalons: [], activites: [], livrables: [], equipe: [], parties: [],
  raci: [], budget: [], risques: [], decisions: [], reserves: [], indicateurs: [],
  obstacles: [], lecons: [], rapports: [],
  vue: 'portefeuille'
};

const peut = c => S.droits[c] === true;
const STATUTS_ACT = ['À faire', 'En cours', 'Réalisé'];
const METEO = { Vert: '🟢', Orange: '🟠', Rouge: '🔴' };

/* Modèles de découpage — le module reste générique : à la création d'un
   projet on choisit un modèle de phases, puis tout est modifiable. */
const MODELES = {
  'pmbok': {
    lib: 'Générique PMP (5 groupes de processus)',
    phases: [
      ['1. Démarrage / Cadrage', 'Formaliser la charte, le besoin, les parties prenantes et l\'enveloppe.'],
      ['2. Planification', 'Construire le WBS, le planning, le budget de référence et le registre des risques.'],
      ['3. Exécution', 'Réaliser les travaux et produire les livrables.'],
      ['4. Maîtrise / Surveillance', 'Piloter les écarts coût-délai-qualité et traiter les demandes de changement.'],
      ['5. Clôture', 'Réceptionner, solder, capitaliser (RETEX) et archiver.']
    ]
  },
  'travaux': {
    lib: 'Travaux / Réhabilitation (6 phases)',
    phases: [
      ['1. Cadrage & Lancement', 'Cadrer le besoin, le budget et la gouvernance.'],
      ['2. Conception / Études', 'Figer les plans, les coûts et le planning détaillé.'],
      ['3. Préparation Chantier', 'Sécuriser le démarrage : visas, HSE, accès, phasage.'],
      ['4. Exécution des Travaux', 'Réaliser les travaux, y compris en site occupé.'],
      ['5. Réception / Mise en Service', 'Réceptionner, lever les réserves critiques, transférer.'],
      ['6. Clôture & Garantie', 'Clôture technique et financière, suivi post-livraison, RETEX.']
    ]
  },
  'acquisition': {
    lib: 'Acquisition / Marché public (5 phases)',
    phases: [
      ['1. Expression du besoin', 'Définir le besoin, le budget et la stratégie d\'achat.'],
      ['2. Préparation du dossier', 'Constituer le DAO, les spécifications et les critères.'],
      ['3. Consultation & Attribution', 'Publier, dépouiller, évaluer et attribuer.'],
      ['4. Exécution du marché', 'Suivre les livraisons, la qualité et les paiements.'],
      ['5. Réception & Clôture', 'Réceptionner, solder et capitaliser.']
    ]
  },
  'organisation': {
    lib: 'Projet d\'organisation / amélioration (Lean DMAIC)',
    phases: [
      ['1. Définir', 'Cadrer le problème, le périmètre, la voix du client et les gains attendus.'],
      ['2. Mesurer', 'Mesurer la performance actuelle et cartographier le processus.'],
      ['3. Analyser', 'Identifier les causes racines des écarts.'],
      ['4. Innover / Améliorer', 'Concevoir, tester et déployer les solutions.'],
      ['5. Contrôler', 'Standardiser, mesurer la tenue des gains, capitaliser.']
    ]
  }
};

/* =========================================================================
 *  DÉFINITION DES REGISTRES (pilotés par configuration)
 * ========================================================================= */
function optActeurs(vide) {
  return (vide ? '<option value="">—</option>' : '') +
    S.acteurs.map(a => `<option value="${ech(a.id_acteur)}">${ech(a.nom_prenoms)}</option>`).join('');
}
function optPhases(vide) {
  return (vide ? '<option value="">—</option>' : '') +
    S.phases.map(p => `<option value="${p.id}">${ech(p.libelle)}</option>`).join('');
}
function nomActeur(id) { const a = S.acteurs.find(x => x.id_acteur === id); return a ? a.nom_prenoms : (id || '—'); }
function nomPhase(id) { const p = S.phases.find(x => String(x.id) === String(id)); return p ? p.libelle : '—'; }
function respAff(r) { return r.responsable_id ? nomActeur(r.responsable_id) : (r.responsable_externe || '—'); }

const REG = {
  livrables: {
    table: 'projet_livrables', titre: 'Livrables', droit: 'prj.livrables', etat: 'S.livrables',
    intro: "Ce qui doit être produit et validé à chaque phase. Un livrable non défini est un livrable qui n'arrive jamais.",
    cols: [
      { k: 'libelle', l: 'Livrable', w: '22%' },
      { k: 'id_phase', l: 'Phase', f: v => nomPhase(v) },
      { k: '_resp', l: 'Responsable', f: (v, r) => respAff(r) },
      { k: 'echeance', l: 'Échéance', f: fdate },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) }
    ],
    champs: [
      { k: 'libelle', l: 'Intitulé du livrable', t: 'text', req: 1, full: 1 },
      { k: 'id_phase', l: 'Phase', t: 'select', opts: () => optPhases(1) },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['À produire', 'En cours', 'Soumis', 'Validé', 'Abandonné']) },
      { k: 'description', l: 'Description succincte', t: 'textarea', full: 1 },
      { k: 'contenu_cle', l: 'Contenu / éléments clés attendus', t: 'textarea', full: 1 },
      { k: 'responsable_id', l: 'Responsable interne', t: 'select', opts: () => optActeurs(1) },
      { k: 'responsable_externe', l: 'Ou responsable externe', t: 'text' },
      { k: 'echeance', l: 'Échéance', t: 'date' },
      { k: 'emplacement', l: 'Lien / emplacement', t: 'text' },
      { k: 'commentaire', l: 'Commentaire', t: 'textarea', full: 1 }
    ]
  },
  budget: {
    table: 'projet_budget', titre: 'Budget & variations', droit: 'prj.budget', etat: 'S.budget',
    intro: "Maîtrise des coûts : budget de référence par poste, avenants et variations, écarts et approbations.",
    cols: [
      { k: 'code_poste', l: 'Poste', w: '9%' },
      { k: 'libelle', l: 'Désignation', w: '22%' },
      { k: 'type_ligne', l: 'Type', f: v => `<span class="et ${v === 'Variation' ? 'orange' : 'gris'}">${ech(v)}</span>` },
      { k: 'montant_prevu', l: 'Prévu', cls: 'num', f: fnum },
      { k: 'montant_actuel', l: 'Actuel', cls: 'num', f: fnum },
      { k: '_ecart', l: 'Écart', cls: 'num', f: (v, r) => ecartBudgetHtml(r) },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) },
      { k: 'approbation', l: 'Approuvé', f: v => v ? '<span class="et vert">Oui</span>' : '<span class="et gris">Non</span>' }
    ],
    champs: [
      { k: 'code_poste', l: 'Code du poste / lot', t: 'text' },
      { k: 'type_ligne', l: 'Type de ligne', t: 'select', opts: () => opts(['Base', 'Variation']) },
      { k: 'libelle', l: 'Désignation', t: 'text', req: 1, full: 1 },
      { k: 'montant_prevu', l: 'Montant prévu (budget de référence)', t: 'number' },
      { k: 'montant_actuel', l: 'Montant actuel / révisé', t: 'number' },
      { k: 'montant_engage', l: 'Montant engagé', t: 'number' },
      { k: 'montant_paye', l: 'Montant payé', t: 'number' },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['À suivre', 'Validé', 'En négociation', 'Rejeté']) },
      { k: 'approbation', l: 'Approuvé par le commanditaire', t: 'check' },
      { k: 'commentaire', l: 'Commentaire / justification', t: 'textarea', full: 1 }
    ]
  },
  risques: {
    table: 'projet_risques', titre: 'Registre des risques', droit: 'prj.risques', etat: 'S.risques',
    intro: "Cotation Probabilité × Impact (1 à 5). Chaque risque porte une stratégie, un plan préventif, un signal déclencheur et un plan de repli.",
    cols: [
      { k: 'reference', l: 'Réf.', w: '6%' },
      { k: 'description', l: 'Risque', w: '26%' },
      { k: 'categorie', l: 'Catégorie' },
      { k: '_crit', l: 'P×I', cls: 'num', f: (v, r) => critHtml(r) },
      { k: 'strategie', l: 'Stratégie' },
      { k: '_prop', l: 'Propriétaire', f: (v, r) => r.proprietaire_id ? nomActeur(r.proprietaire_id) : (r.proprietaire_externe || '—') },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) }
    ],
    champs: [
      { k: 'reference', l: 'Référence', t: 'text' },
      { k: 'categorie', l: 'Catégorie', t: 'select', opts: () => opts(['Délais / Logistique', 'Technique / Qualité', 'Coût / Achats', 'Ressources', 'Gouvernance / Contrat', 'HSE / Sécurité', 'Continuité d\'activité', 'Coordination', 'Externe / Réglementaire']) },
      { k: 'description', l: 'Description du risque (cause → événement → conséquence)', t: 'textarea', req: 1, full: 1 },
      { k: 'zone_impactee', l: 'Zone / périmètre impacté', t: 'text', full: 1 },
      { k: 'probabilite', l: 'Probabilité (1 à 5)', t: 'select', opts: () => opts([1, 2, 3, 4, 5]) },
      { k: 'impact', l: 'Impact (1 à 5)', t: 'select', opts: () => opts([1, 2, 3, 4, 5]) },
      { k: 'strategie', l: 'Stratégie de réponse', t: 'select', opts: () => opts(['Éviter', 'Réduire', 'Transférer', 'Accepter', 'Exploiter']) },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['Ouvert', 'En cours', 'Maîtrisé', 'Survenu', 'Clos']) },
      { k: 'plan_attenuation', l: 'Plan d\'atténuation (préventif)', t: 'textarea', full: 1 },
      { k: 'declencheur', l: 'Signal déclencheur (trigger)', t: 'textarea', full: 1 },
      { k: 'plan_contingence', l: 'Plan de contingence (si le risque survient)', t: 'textarea', full: 1 },
      { k: 'proprietaire_id', l: 'Propriétaire interne', t: 'select', opts: () => optActeurs(1) },
      { k: 'proprietaire_externe', l: 'Ou propriétaire externe', t: 'text' },
      { k: 'echeance', l: 'Échéance de traitement', t: 'date' }
    ]
  },
  decisions: {
    table: 'projet_decisions', titre: 'Registre des décisions', droit: 'prj.decisions', etat: 'S.decisions',
    intro: "Tracer les arbitrages : qui a décidé quoi, quand, avec quel impact coût-délai, et qui exécute.",
    cols: [
      { k: 'objet', l: 'Objet de l\'arbitrage', w: '26%' },
      { k: 'date_decision', l: 'Décidé le', f: fdate },
      { k: 'instance', l: 'Instance' },
      { k: '_resp', l: 'Exécution', f: (v, r) => r.responsable_execution_id ? nomActeur(r.responsable_execution_id) : (r.responsable_externe || '—') },
      { k: 'echeance', l: 'Échéance', f: fdate },
      { k: '_imp', l: 'Impact', f: (v, r) => impactHtml(r) },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) }
    ],
    champs: [
      { k: 'objet', l: 'Objet de la décision / point d\'arbitrage', t: 'text', req: 1, full: 1 },
      { k: 'decision', l: 'Décision prise', t: 'textarea', full: 1 },
      { k: 'date_decision', l: 'Date de décision', t: 'date' },
      { k: 'instance', l: 'Instance décisionnaire', t: 'select', opts: () => opts(['Comité de projet', 'Direction D2MG', 'Direction Générale', 'Responsable de projet', 'Comité technique']) },
      { k: 'responsable_execution_id', l: 'Responsable de l\'exécution', t: 'select', opts: () => optActeurs(1) },
      { k: 'responsable_externe', l: 'Ou responsable externe', t: 'text' },
      { k: 'echeance', l: 'Échéance d\'exécution', t: 'date' },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['En attente de décision', 'À exécuter', 'En cours', 'Exécutée', 'Annulée']) },
      { k: 'impact_cout', l: 'Impact coût estimé', t: 'number' },
      { k: 'impact_delai_jours', l: 'Impact délai (jours)', t: 'number' },
      { k: 'commentaire', l: 'Commentaire / suivi', t: 'textarea', full: 1 }
    ]
  },
  reserves: {
    table: 'projet_reserves', titre: 'Réserves & réception', droit: 'prj.reserves', etat: 'S.reserves',
    intro: "Réserves constatées à la réception. Aucune réserve critique ne doit rester ouverte avant la mise en service.",
    cols: [
      { k: 'zone', l: 'Zone' },
      { k: 'description', l: 'Réserve', w: '30%' },
      { k: 'categorie', l: 'Catégorie', f: v => `<span class="et ${v === 'Critique' ? 'rouge' : 'gris'}">${ech(v)}</span>` },
      { k: '_resp', l: 'Responsable', f: (v, r) => respAff(r) },
      { k: 'echeance_levee', l: 'Échéance levée', f: fdate },
      { k: 'date_levee', l: 'Levée le', f: fdate },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) }
    ],
    champs: [
      { k: 'zone', l: 'Zone / ouvrage concerné', t: 'text' },
      { k: 'categorie', l: 'Catégorie', t: 'select', opts: () => opts(['Critique', 'Non critique']) },
      { k: 'description', l: 'Description de la réserve', t: 'textarea', req: 1, full: 1 },
      { k: 'responsable_id', l: 'Responsable interne', t: 'select', opts: () => optActeurs(1) },
      { k: 'responsable_externe', l: 'Ou responsable externe', t: 'text' },
      { k: 'echeance_levee', l: 'Échéance de levée', t: 'date' },
      { k: 'date_levee', l: 'Date de levée effective', t: 'date' },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['Ouverte', 'En cours de levée', 'Levée', 'Refusée']) },
      { k: 'commentaire', l: 'Commentaire', t: 'textarea', full: 1 }
    ]
  },
  indicateurs: {
    table: 'projet_indicateurs', titre: 'Indicateurs de pilotage', droit: 'prj.indicateurs', etat: 'S.indicateurs',
    intro: "Chaque indicateur porte une méthode de calcul, une cible et un seuil d'alerte. Un indicateur sans cible n'est pas pilotable.",
    cols: [
      { k: 'libelle', l: 'Indicateur', w: '22%' },
      { k: 'id_phase', l: 'Phase', f: v => nomPhase(v) },
      { k: 'cible', l: 'Cible / seuil' },
      { k: 'valeur_mesuree', l: 'Mesure' },
      { k: 'unite', l: 'Unité' },
      { k: 'date_mesure', l: 'Mesuré le', f: fdate },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) }
    ],
    champs: [
      { k: 'libelle', l: 'Intitulé de l\'indicateur', t: 'text', req: 1, full: 1 },
      { k: 'id_phase', l: 'Phase concernée', t: 'select', opts: () => optPhases(1) },
      { k: 'frequence', l: 'Fréquence de mesure', t: 'select', opts: () => opts(['Quotidienne', 'Hebdomadaire', 'Mensuelle', 'Par phase', 'À la clôture']) },
      { k: 'description', l: 'Ce que l\'indicateur mesure', t: 'textarea', full: 1 },
      { k: 'methode_calcul', l: 'Méthode de calcul', t: 'textarea', full: 1 },
      { k: 'cible', l: 'Cible', t: 'text' },
      { k: 'seuil_alerte', l: 'Seuil d\'alerte', t: 'text' },
      { k: 'valeur_mesuree', l: 'Dernière valeur mesurée', t: 'text' },
      { k: 'unite', l: 'Unité', t: 'text' },
      { k: 'date_mesure', l: 'Date de la mesure', t: 'date' },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['OK', 'Alerte', 'Non mesuré']) },
      { k: 'commentaire', l: 'Commentaire / action corrective', t: 'textarea', full: 1 }
    ]
  },
  obstacles: {
    table: 'projet_obstacles', titre: 'Obstacles & blocages', droit: 'prj.obstacles', etat: 'S.obstacles',
    intro: "Journal lean des points bloquants. Un obstacle signalé doit avoir un responsable de levée et une cause racine identifiée.",
    cols: [
      { k: 'description', l: 'Obstacle', w: '28%' },
      { k: 'cause_racine', l: 'Cause racine', w: '20%' },
      { k: '_resp', l: 'Responsable levée', f: (v, r) => r.responsable_id ? nomActeur(r.responsable_id) : '—' },
      { k: 'date_signalement', l: 'Signalé le', f: fdate },
      { k: '_age', l: 'Âge', cls: 'num', f: (v, r) => ageObstacle(r) },
      { k: 'statut', l: 'Statut', f: v => badgeStatut(v) }
    ],
    champs: [
      { k: 'description', l: 'Description de l\'obstacle', t: 'textarea', req: 1, full: 1 },
      { k: 'cause_racine', l: 'Cause racine identifiée', t: 'textarea', full: 1 },
      { k: 'action_levee', l: 'Action de levée décidée', t: 'textarea', full: 1 },
      { k: 'responsable_id', l: 'Responsable de la levée', t: 'select', opts: () => optActeurs(1) },
      { k: 'date_signalement', l: 'Date de signalement', t: 'date' },
      { k: 'date_levee', l: 'Date de levée', t: 'date' },
      { k: 'impact', l: 'Impact constaté', t: 'select', opts: () => opts(['Faible', 'Modéré', 'Fort', 'Bloquant']) },
      { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['Ouvert', 'En cours', 'Levé', 'Abandonné']) }
    ]
  },
  lecons: {
    table: 'projet_lecons', titre: 'RETEX & leçons apprises', droit: 'prj.retex', etat: 'S.lecons',
    intro: "Capitalisation : ce qu'on a constaté, pourquoi, ce qu'on en retient et ce qu'on recommande pour les projets suivants.",
    cols: [
      { k: 'categorie', l: 'Catégorie' },
      { k: 'constat', l: 'Constat', w: '25%' },
      { k: 'enseignement', l: 'Enseignement', w: '25%' },
      { k: 'recommandation', l: 'Recommandation', w: '25%' }
    ],
    champs: [
      { k: 'categorie', l: 'Catégorie', t: 'select', opts: () => opts(['Délai', 'Coût', 'Qualité', 'Organisation', 'Contractuel', 'Relations parties prenantes', 'Technique', 'HSE']) },
      { k: 'constat', l: 'Constat (ce qui s\'est passé)', t: 'textarea', req: 1, full: 1 },
      { k: 'cause', l: 'Cause', t: 'textarea', full: 1 },
      { k: 'enseignement', l: 'Enseignement à retenir', t: 'textarea', full: 1 },
      { k: 'recommandation', l: 'Recommandation pour les projets futurs', t: 'textarea', full: 1 }
    ]
  },
  parties: {
    table: 'projet_parties_prenantes', titre: 'Parties prenantes', droit: 'prj.equipe', etat: 'S.parties',
    intro: "Cartographie des parties prenantes : qui est concerné, quel pouvoir d'influence, quel intérêt, et comment on les embarque.",
    cols: [
      { k: 'code_court', l: 'Code', w: '8%' },
      { k: 'libelle', l: 'Partie prenante', w: '22%' },
      { k: 'organisation', l: 'Organisation' },
      { k: 'role_projet', l: 'Rôle' },
      { k: 'influence', l: 'Influence', f: v => niveauHtml(v) },
      { k: 'interet', l: 'Intérêt', f: v => niveauHtml(v) }
    ],
    champs: [
      { k: 'libelle', l: 'Nom / désignation de la partie prenante', t: 'text', req: 1, full: 1 },
      { k: 'code_court', l: 'Code court (utilisé en colonne RACI)', t: 'text' },
      { k: 'acteur_id', l: 'Acteur D2MG correspondant', t: 'select', opts: () => optActeurs(1) },
      { k: 'organisation', l: 'Organisation / entité', t: 'text' },
      { k: 'role_projet', l: 'Rôle dans le projet', t: 'select', opts: () => opts(['Commanditaire (MOA)', 'Assistance à maîtrise d\'ouvrage (AMO)', 'Maîtrise d\'œuvre (MOE)', 'Exécutant / Entreprise', 'Utilisateur / Bénéficiaire', 'Contrôle / Autorité', 'Fournisseur', 'Autre']) },
      { k: 'influence', l: 'Niveau d\'influence', t: 'select', opts: () => opts(['Faible', 'Moyen', 'Fort']) },
      { k: 'interet', l: 'Niveau d\'intérêt', t: 'select', opts: () => opts(['Faible', 'Moyen', 'Fort']) },
      { k: 'strategie_engagement', l: 'Stratégie d\'engagement', t: 'textarea', full: 1 }
    ]
  }
};

function opts(arr) { return arr.map(v => `<option value="${ech(v)}">${ech(v)}</option>`).join(''); }
function badgeStatut(v) {
  const m = {
    'Validé': 'vert', 'Levée': 'vert', 'Exécutée': 'vert', 'Réalisé': 'vert', 'Maîtrisé': 'vert', 'Clos': 'vert', 'OK': 'vert', 'Levé': 'vert',
    'En cours': 'orange', 'Soumis': 'orange', 'En cours de levée': 'orange', 'En négociation': 'orange', 'À suivre': 'orange', 'Alerte': 'rouge',
    'Ouvert': 'rouge', 'Ouverte': 'rouge', 'Survenu': 'rouge', 'Rejeté': 'rouge', 'Refusée': 'rouge', 'Bloquant': 'rouge',
    'À produire': 'gris', 'À exécuter': 'bleu', 'En attente de décision': 'orange', 'Non mesuré': 'gris', 'Abandonné': 'gris', 'Abandonnée': 'gris', 'Annulée': 'gris'
  };
  return `<span class="et ${m[v] || 'gris'}">${ech(v)}</span>`;
}
function niveauHtml(v) { return `<span class="et ${v === 'Fort' ? 'rouge' : v === 'Moyen' ? 'orange' : 'gris'}">${ech(v || '—')}</span>`; }
function critHtml(r) {
  const c = (r.probabilite || 0) * (r.impact || 0);
  const cl = c >= 15 ? 'rouge' : c >= 8 ? 'orange' : 'vert';
  return `<span class="et ${cl}">${r.probabilite}×${r.impact} = ${c}</span>`;
}
function ecartBudgetHtml(r) {
  if (r.montant_actuel === null || r.montant_actuel === undefined) return '—';
  const e = Number(r.montant_actuel) - Number(r.montant_prevu || 0);
  if (!e) return '<span class="muted">0</span>';
  return `<span style="color:${e > 0 ? 'var(--bad)' : 'var(--ok)'};font-weight:700">${e > 0 ? '+' : ''}${fnum(e)}</span>`;
}
function impactHtml(r) {
  const p = [];
  if (r.impact_cout) p.push(fnum(r.impact_cout));
  if (r.impact_delai_jours) p.push(r.impact_delai_jours + ' j');
  return p.length ? p.join(' / ') : '—';
}
function ageObstacle(r) {
  if (r.statut === 'Levé' || r.statut === 'Abandonné') return '—';
  const n = joursCal(r.date_signalement, auj());
  return n === null ? '—' : `<span class="${n > 7 ? 'crit' : ''}">${n} j</span>`;
}

/* =========================================================================
 *  AUTHENTIFICATION ET DÉMARRAGE
 * ========================================================================= */
async function demarrer() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'portail.html'; return; }

  const { data: { user } } = await sb.auth.getUser();
  const { data: acteur } = await sb.from('acteurs').select('*').eq('user_id', user.id).eq('actif', true).maybeSingle();
  if (!acteur) { window.location.href = 'portail.html'; return; }
  S.acteur = acteur;

  const { data: acc } = await sb.from('module_acces').select('role_module')
    .eq('id_acteur', acteur.id_acteur).eq('module', 'projets').eq('actif', true).maybeSingle();
  if (!acc) {
    $('#ecranAcces').classList.remove('hidden');
    $('#msgAcces').textContent = `Votre compte (${acteur.nom_prenoms}) n'a pas accès à la chambre « Gestion de projet ». Demandez son ouverture au Pilote depuis l'accueil D2MG Pilotage.`;
    return;
  }

  const { data: dr } = await sb.from('acteur_droits').select('droit_code,autorise').eq('id_acteur', acteur.id_acteur);
  S.droits = {}; (dr || []).forEach(d => { S.droits[d.droit_code] = d.autorise; });

  await chargerFeries();
  const { data: ac } = await sb.from('acteurs').select('id_acteur,nom_prenoms,role,fonction').eq('actif', true).order('nom_prenoms');
  S.acteurs = ac || [];
  const { data: se } = await sb.from('seuils_charge').select('id_acteur,seuil').eq('module', 'projets');
  S.seuils = se || [];

  $('#app').classList.remove('hidden');
  $('#who').innerHTML = `<strong style="color:#fff">${ech(acteur.nom_prenoms)}</strong><br>${ech(acteur.role)}`;
  $('#btnDeco').addEventListener('click', async () => { await sb.auth.signOut(); window.location.href = 'portail.html'; });
  $('#modFermer').addEventListener('click', fermerModale);

  await chargerPortefeuille();
  aller('portefeuille');
}

/* --------------------------------------------------------------- menu */
const MENU = [
  { grp: 'Portefeuille' },
  { id: 'portefeuille', lib: 'Mes projets', ic: '▦' },
  { grp: 'Cadrage', projet: 1 },
  { id: 'charte', lib: 'Charte de projet', ic: '◈', projet: 1 },
  { id: 'parties', lib: 'Parties prenantes', ic: '⚉', projet: 1 },
  { id: 'raci', lib: 'Matrice RACI', ic: '⊞', projet: 1 },
  { grp: 'Planification', projet: 1 },
  { id: 'phases', lib: 'Phases & jalons', ic: '⏱', projet: 1 },
  { id: 'wbs', lib: 'Activités (kanban)', ic: '▤', projet: 1 },
  { id: 'planning', lib: 'Planning visuel', ic: '▬', projet: 1 },
  { id: 'livrables', lib: 'Livrables', ic: '❑', projet: 1 },
  { grp: 'Maîtrise', projet: 1 },
  { id: 'budget', lib: 'Budget & variations', ic: '₣', projet: 1 },
  { id: 'risques', lib: 'Risques', ic: '⚠', projet: 1 },
  { id: 'decisions', lib: 'Décisions', ic: '⚖', projet: 1 },
  { id: 'reserves', lib: 'Réserves', ic: '⚑', projet: 1 },
  { id: 'obstacles', lib: 'Obstacles', ic: '⛒', projet: 1, badge: () => S.obstacles.filter(o => o.statut === 'Ouvert' || o.statut === 'En cours').length },
  { grp: 'Pilotage', projet: 1 },
  { id: 'tdb', lib: 'Tableau de bord', ic: '◧', projet: 1 },
  { id: 'indicateurs', lib: 'Indicateurs', ic: '∿', projet: 1 },
  { id: 'alertes', lib: 'Alertes & relances', ic: '🔔', projet: 1, badge: () => nbAlertes() },
  { id: 'rapports', lib: 'Rapports d\'avancement', ic: '✎', projet: 1 },
  { id: 'fiche5', lib: 'Fiche 5 blocs', ic: '▣', projet: 1 },
  { grp: 'Clôture', projet: 1 },
  { id: 'lecons', lib: 'RETEX', ic: '♺', projet: 1 },
  { grp: 'Aide' },
  { id: 'aide', lib: "Mode d'emploi", ic: '?' }
];

function construireMenu() {
  let h = '';
  MENU.forEach(m => {
    if (m.projet && !S.projet) return;
    if (m.grp) { h += `<div class="grp">${ech(m.grp)}</div>`; return; }
    const n = m.badge ? m.badge() : 0;
    h += `<button type="button" class="lien${S.vue === m.id ? ' active' : ''}" data-vue="${m.id}">
            <span class="ic">${m.ic}</span><span>${ech(m.lib)}</span>
            ${n > 0 ? `<span class="pastille">${n}</span>` : ''}
          </button>`;
  });
  $('#menu').innerHTML = h;
  $$('#menu button[data-vue]').forEach(b => b.addEventListener('click', () => aller(b.dataset.vue)));

  $('#projetActif').innerHTML = S.projet
    ? `<div class="projet-actif"><strong>${METEO[S.projet.appreciation_avancement] || ''} ${ech(S.projet.denomination)}</strong>${ech(S.projet.id_projet)} · ${ech(S.projet.statut)}</div>`
    : '';
}

const VUES = {
  portefeuille: vuePortefeuille, charte: vueCharte, parties: () => vueRegistre('parties'),
  raci: vueRaci, phases: vuePhases, wbs: vueWbs, planning: vuePlanning,
  livrables: () => vueRegistre('livrables'), budget: vueBudget, risques: vueRisques,
  decisions: () => vueRegistre('decisions'), reserves: () => vueRegistre('reserves'),
  obstacles: () => vueRegistre('obstacles'), tdb: vueTdb, indicateurs: () => vueRegistre('indicateurs'),
  alertes: vueAlertes, rapports: vueRapports, fiche5: vueFiche5, lecons: () => vueRegistre('lecons'),
  aide: vueAide
};

function aller(v) {
  S.vue = v;
  construireMenu();
  (VUES[v] || vuePortefeuille)();
  window.scrollTo(0, 0);
}

/* =========================================================================
 *  PORTEFEUILLE DE PROJETS
 * ========================================================================= */
async function chargerPortefeuille() {
  const { data, error } = await sb.from('projets').select('*').order('created_at', { ascending: false });
  if (error) { toast('Erreur de chargement : ' + error.message, 'err'); return; }
  S.projets = data || [];
  const ids = S.projets.map(p => p.id_projet);
  S._actsGlobal = {};
  if (ids.length) {
    const { data: acts } = await sb.from('projet_activites').select('id_projet,statut,date_prevue,avancement_pct').in('id_projet', ids);
    (acts || []).forEach(a => (S._actsGlobal[a.id_projet] = S._actsGlobal[a.id_projet] || []).push(a));
  }
}

function avancementListe(id) {
  const a = S._actsGlobal[id] || [];
  if (!a.length) return 0;
  return Math.round(a.reduce((s, x) => s + (x.statut === 'Réalisé' ? 100 : x.statut === 'En cours' ? (x.avancement_pct || 50) : 0), 0) / a.length);
}

function vuePortefeuille() {
  S.projet = null;
  const cartes = S.projets.map(p => {
    const av = avancementListe(p.id_projet);
    const acts = S._actsGlobal[p.id_projet] || [];
    const retard = acts.filter(a => a.statut !== 'Réalisé' && a.date_prevue && ecartOuvres(a.date_prevue) < 0).length;
    return `<div class="pcard" data-projet="${ech(p.id_projet)}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <h3>${METEO[p.appreciation_avancement] || ''} ${ech(p.denomination)}</h3>
        ${badgeStatut(p.statut)}
      </div>
      <div class="muted" style="font-size:11.5px">${ech(p.id_projet)}${p.type_projet ? ' · ' + ech(p.type_projet) : ''} · ${ech(nomActeur(p.responsable_id))}</div>
      <div class="prog"><span style="width:${av}%"></span></div>
      <div style="display:flex;justify-content:space-between;font-size:11.5px" class="muted">
        <span>${av}% · ${acts.length} activité(s)</span>
        <span>${retard ? `<span class="crit">${retard} en retard</span>` : 'à jour'}</span>
      </div>
      <div class="muted" style="font-size:11.5px;margin-top:6px">Échéance : ${fdate(p.date_fin_prevue)}</div>
    </div>`;
  }).join('');

  $('#zone').innerHTML = `
    <div class="topbar">
      <div><h1>Portefeuille de projets</h1>
        <p>Pilotage des projets de la D2MG selon une structure générique inspirée des standards PMP : cadrage, planification, exécution, maîtrise des écarts et clôture capitalisée.</p></div>
      ${peut('prj.creer') ? '<button class="btn primaire" id="btnNouveau">+ Nouveau projet</button>' : ''}
    </div>
    ${S.projets.length ? `<div class="pf">${cartes}</div>` : '<div class="carte"><p class="muted">Aucun projet visible. ' + (peut('prj.creer') ? 'Créez le premier avec « + Nouveau projet ».' : 'Vous verrez ici les projets dont vous êtes responsable ou membre.') + '</p></div>'}`;

  $$('[data-projet]').forEach(c => c.addEventListener('click', () => ouvrirProjet(c.dataset.projet)));
  const b = $('#btnNouveau'); if (b) b.addEventListener('click', modaleNouveauProjet);
}

function modaleNouveauProjet() {
  const champs = [
    { k: 'denomination', l: 'Dénomination du projet', t: 'text', req: 1, full: 1 },
    { k: 'type_projet', l: 'Type de projet', t: 'select', opts: () => opts(['Travaux / Réhabilitation', 'Acquisition / Marché', 'Maintenance', 'Organisation / Amélioration', 'Informatique / Digitalisation', 'Autre']) },
    { k: 'modele', l: 'Modèle de découpage en phases', t: 'select', opts: () => Object.keys(MODELES).map(k => `<option value="${k}">${ech(MODELES[k].lib)}</option>`).join('') },
    { k: 'responsable_id', l: 'Responsable du projet', t: 'select', req: 1, opts: () => optActeurs(0) },
    { k: 'commanditaire_id', l: 'Commanditaire (MOA)', t: 'select', opts: () => optActeurs(1) },
    { k: 'date_debut', l: 'Date de début', t: 'date' },
    { k: 'date_fin_prevue', l: 'Date de fin prévue', t: 'date' },
    { k: 'budget_prevu', l: 'Budget prévisionnel', t: 'number' },
    { k: 'objectif_projet', l: 'Objectif du projet', t: 'textarea', full: 1 }
  ];
  ouvrirModale('Nouveau projet', formHtml(champs, { responsable_id: S.acteur.id_acteur, date_debut: auj() }), [
    { lib: 'Annuler', cl: '', act: fermerModale },
    {
      lib: 'Créer le projet', cl: 'primaire', act: async () => {
        const v = lireForm(champs);
        if (!v.denomination || !v.responsable_id) { toast('Dénomination et responsable sont obligatoires.', 'err'); return; }
        const modele = v.modele; delete v.modele;
        v.statut = 'Non démarré'; v.appreciation_avancement = 'Vert';
        const { data: { user } } = await sb.auth.getUser();
        v.created_by = user.id;
        const { data, error } = await sb.from('projets').insert(v).select().single();
        if (error) { toast('Erreur : ' + error.message, 'err'); return; }
        await sb.from('projet_equipe').insert({ id_projet: data.id_projet, acteur_id: v.responsable_id, role_equipe: 'Responsable' });
        const mp = (MODELES[modele] || MODELES.pmbok).phases;
        await sb.from('projet_phases').insert(mp.map((p, i) => ({
          id_projet: data.id_projet, ordre: i + 1, libelle: p[0], objectif_principal: p[1]
        })));
        fermerModale();
        toast(`Projet ${data.id_projet} créé avec son découpage en phases.`, 'ok');
        await chargerPortefeuille();
        await ouvrirProjet(data.id_projet);
      }
    }
  ]);
}

async function ouvrirProjet(id) {
  const { data: p } = await sb.from('projets').select('*').eq('id_projet', id).maybeSingle();
  if (!p) { toast('Projet introuvable.', 'err'); return; }
  S.projet = p;
  const q = t => sb.from(t).select('*').eq('id_projet', id);
  const [ph, ja, ac, li, eq, pa, ra, bu, ri, de, re, ind, ob, le, rap] = await Promise.all([
    q('projet_phases').order('ordre'), q('projet_jalons').order('date_prevue'),
    q('projet_activites').order('ordre'), q('projet_livrables').order('echeance'),
    q('projet_equipe'), q('projet_parties_prenantes').order('ordre'),
    q('projet_raci').order('ordre'), q('projet_budget').order('ordre'),
    q('projet_risques'), q('projet_decisions').order('date_decision', { ascending: false }),
    q('projet_reserves'), q('projet_indicateurs').order('ordre'),
    q('projet_obstacles').order('date_signalement', { ascending: false }), q('projet_lecons'),
    q('projet_rapports').order('date_rapport', { ascending: false })
  ]);
  S.phases = ph.data || []; S.jalons = ja.data || []; S.activites = ac.data || [];
  S.livrables = li.data || []; S.equipe = eq.data || []; S.parties = pa.data || [];
  S.raci = ra.data || []; S.budget = bu.data || []; S.risques = ri.data || [];
  S.decisions = de.data || []; S.reserves = re.data || []; S.indicateurs = ind.data || [];
  S.obstacles = ob.data || []; S.lecons = le.data || []; S.rapports = rap.data || [];
  aller('tdb');
}
async function rafraichir() { if (S.projet) { const v = S.vue; await ouvrirProjet(S.projet.id_projet); aller(v); } }

/* =========================================================================
 *  FORMULAIRES GÉNÉRIQUES
 * ========================================================================= */
function formHtml(champs, val) {
  val = val || {};
  return '<div class="champs">' + champs.map(c => {
    const v = val[c.k];
    let ctrl;
    if (c.t === 'textarea') ctrl = `<textarea id="f_${c.k}">${ech(v || '')}</textarea>`;
    else if (c.t === 'select') ctrl = `<select id="f_${c.k}">${c.opts()}</select>`;
    else if (c.t === 'check') ctrl = `<input type="checkbox" id="f_${c.k}" ${v ? 'checked' : ''} style="width:auto">`;
    else ctrl = `<input type="${c.t}" id="f_${c.k}" value="${ech(v == null ? '' : v)}" ${c.t === 'number' ? 'step="any"' : ''}>`;
    return `<div class="${c.full ? 'full' : ''}"><label>${ech(c.l)}${c.req ? ' <span style="color:var(--bad)">*</span>' : ''}</label>${ctrl}</div>`;
  }).join('') + '</div>';
}
function remplirSelects(champs, val) {
  champs.filter(c => c.t === 'select').forEach(c => {
    const el = $('#f_' + c.k);
    if (el && val && val[c.k] != null) el.value = val[c.k];
  });
}
function lireForm(champs) {
  const o = {};
  champs.forEach(c => {
    const el = $('#f_' + c.k); if (!el) return;
    if (c.t === 'check') o[c.k] = el.checked;
    else if (c.t === 'number') o[c.k] = el.value === '' ? null : Number(el.value);
    else o[c.k] = el.value === '' ? null : el.value;
  });
  return o;
}
function ouvrirModale(titre, corps, actions) {
  $('#modTitre').textContent = titre;
  $('#modCorps').innerHTML = corps;
  $('#modActions').innerHTML = '';
  (actions || []).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.cl || ''); b.type = 'button'; b.textContent = a.lib;
    b.addEventListener('click', a.act);
    $('#modActions').appendChild(b);
  });
  $('#modale').classList.add('on');
}
function fermerModale() { $('#modale').classList.remove('on'); }

/* =========================================================================
 *  REGISTRE GÉNÉRIQUE (livrables, risques, décisions, réserves, ...)
 * ========================================================================= */
function donneesRegistre(nom) {
  return { livrables: S.livrables, budget: S.budget, risques: S.risques, decisions: S.decisions,
    reserves: S.reserves, indicateurs: S.indicateurs, obstacles: S.obstacles, lecons: S.lecons,
    parties: S.parties }[nom] || [];
}

function vueRegistre(nom, extraHtml, lignesForcees) {
  const cfg = REG[nom];
  const lignes = lignesForcees || donneesRegistre(nom);
  const modif = peut(cfg.droit);
  const th = cfg.cols.map(c => `<th${c.w ? ` style="width:${c.w}"` : ''}>${ech(c.l)}</th>`).join('') + (modif ? '<th></th>' : '');
  const tr = lignes.map(r => {
    const tds = cfg.cols.map(c => {
      const raw = r[c.k];
      const v = c.f ? c.f(raw, r) : (raw == null || raw === '' ? '—' : ech(raw));
      return `<td class="${c.cls || ''}">${v}</td>`;
    }).join('');
    return `<tr>${tds}${modif ? `<td style="white-space:nowrap"><button class="btn sm" data-edit="${r.id}">Modifier</button> <button class="btn sm danger" data-del="${r.id}">✕</button></td>` : ''}</tr>`;
  }).join('');

  $('#zone').innerHTML = `
    <div class="topbar">
      <div><h1>${ech(cfg.titre)}</h1><p>${ech(cfg.intro)}</p></div>
      ${modif ? `<button class="btn primaire" id="btnAdd">+ Ajouter</button>` : ''}
    </div>
    ${extraHtml || ''}
    <div class="tw">
      <table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>
      ${lignes.length ? '' : '<div class="vide">Aucun enregistrement pour le moment.</div>'}
    </div>`;

  const add = $('#btnAdd');
  if (add) add.addEventListener('click', () => modaleRegistre(nom, null));
  $$('[data-edit]').forEach(b => b.addEventListener('click', () => modaleRegistre(nom, lignes.find(x => String(x.id) === b.dataset.edit))));
  $$('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer définitivement cet enregistrement ?')) return;
    const { error } = await sb.from(cfg.table).delete().eq('id', b.dataset.del);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    toast('Supprimé.', 'ok'); await rafraichir();
  }));
}

function modaleRegistre(nom, ligne) {
  const cfg = REG[nom];
  ouvrirModale((ligne ? 'Modifier — ' : 'Ajouter — ') + cfg.titre, formHtml(cfg.champs, ligne || {}), [
    { lib: 'Annuler', cl: '', act: fermerModale },
    {
      lib: 'Enregistrer', cl: 'primaire', act: async () => {
        const v = lireForm(cfg.champs);
        const req = cfg.champs.filter(c => c.req).find(c => !v[c.k]);
        if (req) { toast(`« ${req.l} » est obligatoire.`, 'err'); return; }
        let error;
        if (ligne) ({ error } = await sb.from(cfg.table).update(v).eq('id', ligne.id));
        else { v.id_projet = S.projet.id_projet; ({ error } = await sb.from(cfg.table).insert(v)); }
        if (error) { toast('Erreur : ' + error.message, 'err'); return; }
        fermerModale(); toast('Enregistré.', 'ok'); await rafraichir();
      }
    }
  ]);
  remplirSelects(cfg.champs, ligne || {});
}

/* =========================================================================
 *  CHARTE DE PROJET
 * ========================================================================= */
const CHAMPS_CHARTE = [
  { k: 'denomination', l: 'Dénomination du projet', t: 'text', req: 1, full: 1 },
  { k: 'code_projet', l: 'Code / référence interne', t: 'text' },
  { k: 'type_projet', l: 'Type de projet', t: 'select', opts: () => opts(['Travaux / Réhabilitation', 'Acquisition / Marché', 'Maintenance', 'Organisation / Amélioration', 'Informatique / Digitalisation', 'Autre']) },
  { k: 'contexte', l: 'Contexte et justification', t: 'textarea', full: 1 },
  { k: 'objectif_projet', l: 'Objectif du projet (formulation SMART)', t: 'textarea', full: 1 },
  { k: 'livrable_final', l: 'Livrable final attendu', t: 'textarea', full: 1 },
  { k: 'perimetre_inclus', l: 'Périmètre INCLUS', t: 'textarea', full: 1 },
  { k: 'perimetre_exclus', l: 'Périmètre EXCLU (hors projet)', t: 'textarea', full: 1 },
  { k: 'criteres_succes', l: 'Critères de succès / de réception', t: 'textarea', full: 1 },
  { k: 'contraintes', l: 'Contraintes', t: 'textarea', full: 1 },
  { k: 'hypotheses', l: 'Hypothèses retenues', t: 'textarea', full: 1 },
  { k: 'gouvernance', l: 'Gouvernance et circuit de décision', t: 'textarea', full: 1 },
  { k: 'responsable_id', l: 'Responsable de projet', t: 'select', req: 1, opts: () => optActeurs(0) },
  { k: 'commanditaire_id', l: 'Commanditaire (MOA)', t: 'select', opts: () => optActeurs(1) },
  { k: 'sponsor', l: 'Sponsor / autorité de tutelle', t: 'text' },
  { k: 'statut', l: 'Statut du projet', t: 'select', opts: () => opts(['Non démarré', 'En cours', 'Suspendu', 'Clôturé', 'Abandonné']) },
  { k: 'date_debut', l: 'Date de début', t: 'date' },
  { k: 'date_fin_prevue', l: 'Date de fin prévue', t: 'date' },
  { k: 'date_fin_baseline', l: 'Date de fin de référence (baseline)', t: 'date' },
  { k: 'date_fin_reelle', l: 'Date de fin réelle', t: 'date' },
  { k: 'budget_prevu', l: 'Budget prévisionnel', t: 'number' },
  { k: 'budget_approuve', l: 'Budget approuvé (référence)', t: 'number' },
  { k: 'devise', l: 'Devise', t: 'text' },
  { k: 'appreciation_avancement', l: 'Météo du projet', t: 'select', opts: () => opts(['Vert', 'Orange', 'Rouge']) },
  { k: 'points_attention', l: 'Points d\'attention actuels', t: 'textarea', full: 1 }
];

function vueCharte() {
  const p = S.projet;
  const bloc = (t, v) => `<p style="margin:0 0 9px"><strong>${t} :</strong><br><span class="muted">${v ? nl2br(v) : 'Non renseigné'}</span></p>`;
  const membres = S.equipe.map(m => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)">
      <span>${ech(nomActeur(m.acteur_id))} <span class="et corail">${ech(m.role_equipe)}</span></span>
      ${peut('prj.equipe') ? `<button class="btn sm danger" data-delm="${m.id}">✕</button>` : ''}
    </div>`).join('') || '<p class="muted">Aucun membre enregistré.</p>';

  $('#zone').innerHTML = `
    <div class="topbar">
      <div><h1>Charte de projet</h1><p>Document de référence du projet : ce qu'on fait, pourquoi, pour qui, dans quel périmètre, avec quel budget et quelle gouvernance.</p></div>
      <div style="display:flex;gap:8px">
        ${peut('prj.exporter') ? '<button class="btn" id="btnImpCharte">Imprimer</button>' : ''}
        ${peut('prj.modifier') ? '<button class="btn primaire" id="btnEditCharte">Modifier la charte</button>' : ''}
      </div>
    </div>
    <div class="deux-col">
      <div>
        <div class="carte"><h3>Identification</h3>
          <p style="margin:0 0 9px"><strong>Référence :</strong> ${ech(p.id_projet)}${p.code_projet ? ' / ' + ech(p.code_projet) : ''} · <strong>Type :</strong> ${ech(p.type_projet || '—')}</p>
          <p style="margin:0 0 9px"><strong>Responsable :</strong> ${ech(nomActeur(p.responsable_id))} · <strong>Commanditaire :</strong> ${ech(p.commanditaire_id ? nomActeur(p.commanditaire_id) : (p.sponsor || '—'))}</p>
          <p style="margin:0 0 9px"><strong>Période :</strong> ${fdate(p.date_debut)} → ${fdate(p.date_fin_prevue)}${p.date_fin_reelle ? ' (terminé le ' + fdate(p.date_fin_reelle) + ')' : ''}</p>
          <p style="margin:0"><strong>Budget :</strong> ${fnum(p.budget_approuve || p.budget_prevu)} ${ech(p.devise || '')} · <strong>Météo :</strong> ${METEO[p.appreciation_avancement] || ''} ${ech(p.appreciation_avancement)}</p>
        </div>
        <div class="carte"><h3>Cadrage</h3>
          ${bloc('Contexte et justification', p.contexte)}
          ${bloc('Objectif du projet', p.objectif_projet)}
          ${bloc('Livrable final attendu', p.livrable_final)}
          ${bloc('Critères de succès', p.criteres_succes)}
        </div>
      </div>
      <div>
        <div class="carte"><h3>Périmètre</h3>
          ${bloc('Inclus dans le projet', p.perimetre_inclus)}
          ${bloc('Exclu du projet', p.perimetre_exclus)}
        </div>
        <div class="carte"><h3>Cadre d'exécution</h3>
          ${bloc('Contraintes', p.contraintes)}
          ${bloc('Hypothèses', p.hypotheses)}
          ${bloc('Gouvernance', p.gouvernance)}
          ${bloc('Points d\'attention actuels', p.points_attention)}
        </div>
        <div class="carte"><h3>Équipe projet</h3>${membres}
          ${peut('prj.equipe') ? '<button class="btn doux sm" id="btnAddM" style="margin-top:9px">+ Ajouter un membre</button>' : ''}
        </div>
      </div>
    </div>`;

  const be = $('#btnEditCharte');
  if (be) be.addEventListener('click', () => {
    ouvrirModale('Modifier la charte de projet', formHtml(CHAMPS_CHARTE, p), [
      { lib: 'Annuler', cl: '', act: fermerModale },
      {
        lib: 'Enregistrer', cl: 'primaire', act: async () => {
          const v = lireForm(CHAMPS_CHARTE);
          if (!v.denomination || !v.responsable_id) { toast('Dénomination et responsable sont obligatoires.', 'err'); return; }
          v.updated_at = new Date().toISOString();
          const { error } = await sb.from('projets').update(v).eq('id_projet', p.id_projet);
          if (error) { toast('Erreur : ' + error.message, 'err'); return; }
          fermerModale(); toast('Charte mise à jour.', 'ok'); await rafraichir();
        }
      }
    ]);
    remplirSelects(CHAMPS_CHARTE, p);
  });

  const bm = $('#btnAddM');
  if (bm) bm.addEventListener('click', () => {
    const ch = [{ k: 'acteur_id', l: 'Acteur', t: 'select', req: 1, opts: () => optActeurs(0), full: 1 },
                { k: 'role_equipe', l: 'Rôle dans l\'équipe', t: 'select', opts: () => opts(['Membre', 'Responsable', 'Contributeur', 'Expert', 'Observateur']), full: 1 }];
    ouvrirModale('Ajouter un membre', formHtml(ch, {}), [
      { lib: 'Annuler', cl: '', act: fermerModale },
      { lib: 'Ajouter', cl: 'primaire', act: async () => {
          const v = lireForm(ch); v.id_projet = p.id_projet;
          const { error } = await sb.from('projet_equipe').insert(v);
          if (error) { toast('Erreur : ' + error.message, 'err'); return; }
          fermerModale(); toast('Membre ajouté.', 'ok'); await rafraichir();
        } }
    ]);
  });
  $$('[data-delm]').forEach(b => b.addEventListener('click', async () => {
    await sb.from('projet_equipe').delete().eq('id', b.dataset.delm);
    toast('Membre retiré.', 'ok'); await rafraichir();
  }));
  const bi = $('#btnImpCharte');
  if (bi) bi.addEventListener('click', () => imprimer($('#zone').innerHTML.replace(/<button[\s\S]*?<\/button>/g, '')));
}

/* =========================================================================
 *  MATRICE RACI
 * ========================================================================= */
function vueRaci() {
  const pp = S.parties.length ? S.parties : [];
  const modif = peut('prj.equipe');
  if (!pp.length) {
    $('#zone').innerHTML = `<div class="topbar"><div><h1>Matrice RACI</h1>
      <p>Qui est Responsable de la réalisation, qui Approuve, qui est Consulté, qui est Informé.</p></div></div>
      <div class="carte"><p class="muted">Commencez par déclarer les parties prenantes du projet : elles deviendront les colonnes de la matrice RACI.</p>
      <button class="btn primaire" id="goPP" style="margin-top:9px">Aller aux parties prenantes</button></div>`;
    $('#goPP').addEventListener('click', () => aller('parties'));
    return;
  }
  const entetes = pp.map(x => `<th style="text-align:center">${ech(x.code_court || x.libelle.slice(0, 10))}</th>`).join('');
  const lignes = S.raci.map(r => {
    const cells = pp.map(x => {
      const k = x.code_court || String(x.id);
      const v = (r.assignations || {})[k] || '';
      return `<td class="cell ${v}" ${modif ? `data-raci="${r.id}" data-pp="${k}"` : ''} title="Cliquer pour changer">${v || '·'}</td>`;
    }).join('');
    return `<tr><td>${ech(r.activite)}</td><td class="muted" style="font-size:11px">${ech(nomPhase(r.id_phase))}</td>${cells}${modif ? `<td><button class="btn sm danger" data-delr="${r.id}">✕</button></td>` : ''}</tr>`;
  }).join('');

  $('#zone').innerHTML = `
    <div class="topbar">
      <div><h1>Matrice RACI</h1><p>Une seule lettre <strong>A</strong> par ligne : une activité n'a qu'un seul approbateur. Cliquez sur une case pour faire tourner R → A → C → I → vide.</p></div>
      ${modif ? '<button class="btn primaire" id="btnAddRaci">+ Ajouter une activité</button>' : ''}
    </div>
    <div class="carte" style="padding:11px 13px">
      <span class="et rouge">R</span> Réalise &nbsp; <span class="et orange">A</span> Approuve / rend compte &nbsp;
      <span class="et bleu">C</span> Consulté &nbsp; <span class="et gris">I</span> Informé
    </div>
    <div class="tw"><table class="matrice"><thead><tr><th style="width:32%">Activité / processus</th><th>Phase</th>${entetes}${modif ? '<th></th>' : ''}</tr></thead>
      <tbody>${lignes}</tbody></table>
      ${S.raci.length ? '' : '<div class="vide">Aucune activité dans la matrice.</div>'}</div>`;

  const b = $('#btnAddRaci');
  if (b) b.addEventListener('click', () => {
    const ch = [{ k: 'activite', l: 'Activité / processus', t: 'text', req: 1, full: 1 },
                { k: 'id_phase', l: 'Phase', t: 'select', opts: () => optPhases(1), full: 1 }];
    ouvrirModale('Ajouter une activité à la matrice', formHtml(ch, {}), [
      { lib: 'Annuler', cl: '', act: fermerModale },
      { lib: 'Ajouter', cl: 'primaire', act: async () => {
          const v = lireForm(ch); if (!v.activite) { toast('Intitulé obligatoire.', 'err'); return; }
          v.id_projet = S.projet.id_projet; v.ordre = S.raci.length + 1; v.assignations = {};
          const { error } = await sb.from('projet_raci').insert(v);
          if (error) { toast('Erreur : ' + error.message, 'err'); return; }
          fermerModale(); await rafraichir();
        } }
    ]);
  });
  const cycle = { '': 'R', 'R': 'A', 'A': 'C', 'C': 'I', 'I': '' };
  $$('[data-raci]').forEach(td => td.addEventListener('click', async () => {
    const r = S.raci.find(x => String(x.id) === td.dataset.raci);
    const a = Object.assign({}, r.assignations || {});
    a[td.dataset.pp] = cycle[a[td.dataset.pp] || ''];
    if (!a[td.dataset.pp]) delete a[td.dataset.pp];
    const { error } = await sb.from('projet_raci').update({ assignations: a }).eq('id', r.id);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    r.assignations = a; vueRaci();
  }));
  $$('[data-delr]').forEach(b2 => b2.addEventListener('click', async () => {
    await sb.from('projet_raci').delete().eq('id', b2.dataset.delr); await rafraichir();
  }));
}

/* =========================================================================
 *  PHASES & JALONS
 * ========================================================================= */
const CH_PHASE = [
  { k: 'libelle', l: 'Intitulé de la phase', t: 'text', req: 1, full: 1 },
  { k: 'objectif_principal', l: 'Objectif principal de la phase', t: 'textarea', full: 1 },
  { k: 'ordre', l: 'Ordre', t: 'number' },
  { k: 'statut', l: 'Statut (feu)', t: 'select', opts: () => opts(['Vert', 'Orange', 'Rouge']) },
  { k: 'date_debut_prevue', l: 'Début prévu', t: 'date' },
  { k: 'date_fin_prevue', l: 'Fin prévue', t: 'date' },
  { k: 'date_debut_reelle', l: 'Début réel', t: 'date' },
  { k: 'date_fin_reelle', l: 'Fin réelle', t: 'date' },
  { k: 'commentaire', l: 'Commentaire d\'impact', t: 'textarea', full: 1 }
];
const CH_JALON = [
  { k: 'libelle', l: 'Jalon', t: 'text', req: 1, full: 1 },
  { k: 'id_phase', l: 'Phase', t: 'select', opts: () => optPhases(1) },
  { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(['Prévu', 'En cours', 'Réalisé', 'Manqué', 'Annulé']) },
  { k: 'responsable_id', l: 'Responsable interne', t: 'select', opts: () => optActeurs(1) },
  { k: 'responsable_externe', l: 'Ou responsable externe', t: 'text' },
  { k: 'date_prevue', l: 'Date prévue', t: 'date' },
  { k: 'date_reelle', l: 'Date réelle', t: 'date' },
  { k: 'preuve', l: 'Preuve de réalisation', t: 'textarea', full: 1 },
  { k: 'commentaire', l: 'Commentaire', t: 'textarea', full: 1 }
];

function derive(prev, reel) { const n = joursCal(prev, reel); return n === null ? null : n; }
function deriveHtml(n) {
  if (n === null) return '<span class="muted">—</span>';
  if (n === 0) return '<span class="et vert">à l\'heure</span>';
  return `<span class="et ${n > 0 ? 'rouge' : 'vert'}">${n > 0 ? '+' : ''}${n} j</span>`;
}

function vuePhases() {
  const modif = peut('prj.phases');
  const lignesPh = S.phases.map(p => {
    const dd = derive(p.date_debut_prevue, p.date_debut_reelle);
    const df = derive(p.date_fin_prevue, p.date_fin_reelle);
    const nbJ = S.jalons.filter(j => String(j.id_phase) === String(p.id)).length;
    const nbJok = S.jalons.filter(j => String(j.id_phase) === String(p.id) && j.statut === 'Réalisé').length;
    return `<tr>
      <td><strong>${ech(p.libelle)}</strong><div class="muted" style="font-size:11px">${ech(p.objectif_principal || '')}</div></td>
      <td>${fdate(p.date_debut_prevue)} → ${fdate(p.date_fin_prevue)}</td>
      <td>${fdate(p.date_debut_reelle)} → ${fdate(p.date_fin_reelle)}</td>
      <td>${deriveHtml(dd)}</td><td>${deriveHtml(df)}</td>
      <td>${nbJok}/${nbJ}</td>
      <td><span class="et ${p.statut === 'Vert' ? 'vert' : p.statut === 'Orange' ? 'orange' : 'rouge'}">${ech(p.statut)}</span></td>
      ${modif ? `<td style="white-space:nowrap"><button class="btn sm" data-ep="${p.id}">Modifier</button> <button class="btn sm danger" data-dp="${p.id}">✕</button></td>` : ''}
    </tr>`;
  }).join('');

  const lignesJa = S.jalons.map(j => {
    const e = derive(j.date_prevue, j.date_reelle);
    const enRetard = j.statut !== 'Réalisé' && j.date_prevue && ecartOuvres(j.date_prevue) < 0;
    return `<tr>
      <td><strong>${ech(j.libelle)}</strong>${enRetard ? ' <span class="et rouge">en retard</span>' : ''}
        <div class="muted" style="font-size:11px">${ech(j.preuve || '')}</div></td>
      <td class="muted" style="font-size:11.5px">${ech(nomPhase(j.id_phase))}</td>
      <td>${ech(j.responsable_id ? nomActeur(j.responsable_id) : (j.responsable_externe || '—'))}</td>
      <td>${fdate(j.date_prevue)}</td><td>${fdate(j.date_reelle)}</td>
      <td>${deriveHtml(e)}</td><td>${badgeStatut(j.statut)}</td>
      ${modif ? `<td style="white-space:nowrap"><button class="btn sm" data-ej="${j.id}">Modifier</button> <button class="btn sm danger" data-dj="${j.id}">✕</button></td>` : ''}
    </tr>`;
  }).join('');

  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Phases & jalons</h1>
      <p>Découpage du projet et points de contrôle. La dérive est calculée automatiquement entre le prévu et le réel.</p></div>
      ${modif ? '<div style="display:flex;gap:8px"><button class="btn" id="btnAddPh">+ Phase</button><button class="btn primaire" id="btnAddJa">+ Jalon</button></div>' : ''}
    </div>
    <h3 style="color:var(--corail-fonce);margin-bottom:9px">Phases</h3>
    <div class="tw" style="margin-bottom:22px"><table><thead><tr>
      <th style="width:26%">Phase</th><th>Prévu</th><th>Réel</th><th>Dérive début</th><th>Dérive fin</th><th>Jalons</th><th>Feu</th>${modif ? '<th></th>' : ''}
    </tr></thead><tbody>${lignesPh}</tbody></table>${S.phases.length ? '' : '<div class="vide">Aucune phase définie.</div>'}</div>
    <h3 style="color:var(--corail-fonce);margin-bottom:9px">Jalons</h3>
    <div class="tw"><table><thead><tr>
      <th style="width:28%">Jalon</th><th>Phase</th><th>Responsable</th><th>Prévu</th><th>Réel</th><th>Écart</th><th>Statut</th>${modif ? '<th></th>' : ''}
    </tr></thead><tbody>${lignesJa}</tbody></table>${S.jalons.length ? '' : '<div class="vide">Aucun jalon défini.</div>'}</div>`;

  const ap = $('#btnAddPh'); if (ap) ap.addEventListener('click', () => modalePhase(null));
  const aj = $('#btnAddJa'); if (aj) aj.addEventListener('click', () => modaleJalon(null));
  $$('[data-ep]').forEach(b => b.addEventListener('click', () => modalePhase(S.phases.find(x => String(x.id) === b.dataset.ep))));
  $$('[data-ej]').forEach(b => b.addEventListener('click', () => modaleJalon(S.jalons.find(x => String(x.id) === b.dataset.ej))));
  $$('[data-dp]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer cette phase ? Les jalons et activités rattachés seront détachés.')) return;
    await sb.from('projet_phases').delete().eq('id', b.dataset.dp); await rafraichir();
  }));
  $$('[data-dj]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer ce jalon ?')) return;
    await sb.from('projet_jalons').delete().eq('id', b.dataset.dj); await rafraichir();
  }));
}
function modalePhase(p) { modaleSimple('projet_phases', CH_PHASE, p, p ? 'Modifier la phase' : 'Nouvelle phase'); }
function modaleJalon(j) { modaleSimple('projet_jalons', CH_JALON, j, j ? 'Modifier le jalon' : 'Nouveau jalon'); }
function modaleSimple(table, champs, ligne, titre) {
  ouvrirModale(titre, formHtml(champs, ligne || {}), [
    { lib: 'Annuler', cl: '', act: fermerModale },
    { lib: 'Enregistrer', cl: 'primaire', act: async () => {
        const v = lireForm(champs);
        const req = champs.filter(c => c.req).find(c => !v[c.k]);
        if (req) { toast(`« ${req.l} » est obligatoire.`, 'err'); return; }
        let error;
        if (ligne) ({ error } = await sb.from(table).update(v).eq('id', ligne.id));
        else { v.id_projet = S.projet.id_projet; ({ error } = await sb.from(table).insert(v)); }
        if (error) { toast('Erreur : ' + error.message, 'err'); return; }
        fermerModale(); toast('Enregistré.', 'ok'); await rafraichir();
      } }
  ]);
  remplirSelects(champs, ligne || {});
}

/* =========================================================================
 *  ACTIVITÉS — WBS / KANBAN
 * ========================================================================= */
const CH_ACT = [
  { k: 'denomination', l: 'Intitulé de l\'activité', t: 'text', req: 1, full: 1 },
  { k: 'code_wbs', l: 'Code WBS', t: 'text' },
  { k: 'id_phase', l: 'Phase', t: 'select', opts: () => optPhases(1) },
  { k: 'description', l: 'Description succincte', t: 'textarea', full: 1 },
  { k: 'contenu_cle', l: 'Contenu / éléments clés', t: 'textarea', full: 1 },
  { k: 'responsable_id', l: 'Responsable (lead)', t: 'select', opts: () => optActeurs(1) },
  { k: 'priorite', l: 'Priorité', t: 'select', opts: () => opts(['Basse', 'Moyenne', 'Haute', 'Critique']) },
  { k: 'statut', l: 'Statut', t: 'select', opts: () => opts(STATUTS_ACT) },
  { k: 'chemin_critique', l: 'Sur le chemin critique', t: 'check' },
  { k: 'date_debut_prevue', l: 'Début prévu', t: 'date' },
  { k: 'date_prevue', l: 'Fin prévue (échéance)', t: 'date' },
  { k: 'date_debut_reelle', l: 'Début réel', t: 'date' },
  { k: 'date_realisation', l: 'Fin réelle', t: 'date' },
  { k: 'charge_jours', l: 'Charge estimée (jours)', t: 'number' },
  { k: 'avancement_pct', l: 'Avancement déclaré (%)', t: 'number' },
  { k: 'bloquee', l: 'Activité bloquée', t: 'check' },
  { k: 'motif_blocage', l: 'Motif du blocage', t: 'textarea', full: 1 },
  { k: 'commentaire', l: 'Commentaire', t: 'textarea', full: 1 },
  { k: 'preuve', l: 'Référence de preuve', t: 'text', full: 1 }
];

function classeEch(a) {
  if (a.bloquee) return 'bloquee';
  if (a.statut === 'Réalisé' || !a.date_prevue) return '';
  const e = ecartOuvres(a.date_prevue);
  return e < 0 ? 'retard' : e <= 2 ? 'proche' : 'ok';
}
function seuilDe(id) { const s = S.seuils.find(x => x.id_acteur === id); return s ? s.seuil : 5; }

function vueWbs() {
  const modif = peut('prj.activites');
  const filtrePhase = S._fPhase || '';
  const acts = S.activites.filter(a => !filtrePhase || String(a.id_phase) === filtrePhase);

  const cols = STATUTS_ACT.map((st, i) => {
    const items = acts.filter(a => a.statut === st);
    const retards = items.filter(a => a.statut !== 'Réalisé' && a.date_prevue && ecartOuvres(a.date_prevue) < 0).length;
    return `<div class="kcol">
      <h4><span>${st}</span><span>${items.length}${retards ? ` · <span class="crit">${retards} en retard</span>` : ''}</span></h4>
      ${items.map(a => `<div class="kcard ${classeEch(a)}" data-act="${ech(a.id_activite)}">
          <strong>${a.chemin_critique ? '<span class="crit" title="Chemin critique">◆</span> ' : ''}${ech(a.denomination)}</strong>
          <div class="meta">
            ${a.code_wbs ? ech(a.code_wbs) + ' · ' : ''}${ech(a.responsable_id ? nomActeur(a.responsable_id) : 'non affectée')}
            ${a.date_prevue ? '<br>échéance ' + fdate(a.date_prevue) + libEcart(a) : ''}
            ${a.bloquee ? '<br><span style="color:#7c3aed;font-weight:700">⛒ bloquée</span>' : ''}
          </div>
          ${modif ? `<div style="margin-top:6px;display:flex;gap:4px">
            ${i > 0 ? `<button class="btn sm" data-mv="-1" data-id="${ech(a.id_activite)}">◀</button>` : ''}
            ${i < 2 ? `<button class="btn sm" data-mv="1" data-id="${ech(a.id_activite)}">▶</button>` : ''}
          </div>` : ''}
        </div>`).join('') || '<div class="muted" style="font-size:11.5px;padding:6px">Aucune activité.</div>'}
    </div>`;
  }).join('');

  const charge = {};
  acts.filter(a => a.statut === 'En cours' && a.responsable_id).forEach(a => charge[a.responsable_id] = (charge[a.responsable_id] || 0) + 1);
  const surcharge = Object.keys(charge).filter(id => charge[id] > seuilDe(id));

  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Activités du projet (WBS / kanban)</h1>
      <p>Décomposition du travail à réaliser. Le liseré coloré signale l'échéance, le losange ◆ marque le chemin critique, le violet une activité bloquée.</p></div>
      ${modif ? '<button class="btn primaire" id="btnAddAct">+ Nouvelle activité</button>' : ''}
    </div>
    <div class="barre">
      <label style="margin:0">Filtrer par phase</label>
      <select id="fPhase" style="max-width:280px"><option value="">Toutes les phases</option>${optPhases(0)}</select>
      <span class="muted" style="font-size:11.5px">${acts.length} activité(s)</span>
    </div>
    ${surcharge.length ? `<div class="carte" style="border-left:4px solid var(--warn)"><strong>Limite d'en-cours dépassée</strong><br>
      <span class="muted" style="font-size:12.5px">${surcharge.map(id => `${ech(nomActeur(id))} : ${charge[id]} activités en cours (seuil ${seuilDe(id)})`).join(' · ')}</span></div>` : ''}
    <div class="kanban">${cols}</div>`;

  $('#fPhase').value = filtrePhase;
  $('#fPhase').addEventListener('change', e => { S._fPhase = e.target.value; vueWbs(); });
  const ba = $('#btnAddAct'); if (ba) ba.addEventListener('click', () => modaleActivite(null));
  $$('[data-act]').forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('[data-mv]')) return;
    modaleActivite(S.activites.find(a => a.id_activite === c.dataset.act));
  }));
  $$('[data-mv]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const a = S.activites.find(x => x.id_activite === b.dataset.id);
    const i = STATUTS_ACT.indexOf(a.statut) + Number(b.dataset.mv);
    if (i < 0 || i > 2) return;
    const p = { statut: STATUTS_ACT[i], updated_at: new Date().toISOString() };
    if (STATUTS_ACT[i] === 'Réalisé') { p.date_realisation = auj(); p.avancement_pct = 100; }
    if (STATUTS_ACT[i] === 'En cours' && !a.date_debut_reelle) p.date_debut_reelle = auj();
    const { error } = await sb.from('projet_activites').update(p).eq('id_activite', a.id_activite);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await rafraichir();
  }));
}
function libEcart(a) {
  if (a.statut === 'Réalisé' || !a.date_prevue) return '';
  const e = ecartOuvres(a.date_prevue);
  if (e < 0) return ` <span class="crit">(retard ${Math.abs(e)} j ouvrés)</span>`;
  if (e <= 2) return ` (dans ${e} j ouvrés)`;
  return '';
}
function modaleActivite(a) {
  const actions = [{ lib: 'Annuler', cl: '', act: fermerModale }];
  if (a && peut('prj.activites')) actions.push({ lib: 'Supprimer', cl: 'danger', act: async () => {
    if (!confirm('Supprimer cette activité ?')) return;
    await sb.from('projet_activites').delete().eq('id_activite', a.id_activite);
    fermerModale(); toast('Activité supprimée.', 'ok'); await rafraichir();
  }});
  if (peut('prj.activites')) actions.push({ lib: 'Enregistrer', cl: 'primaire', act: async () => {
    const v = lireForm(CH_ACT);
    if (!v.denomination) { toast('L\'intitulé est obligatoire.', 'err'); return; }
    v.updated_at = new Date().toISOString();
    let error;
    if (a) ({ error } = await sb.from('projet_activites').update(v).eq('id_activite', a.id_activite));
    else { v.id_projet = S.projet.id_projet; v.ordre = S.activites.length + 1;
           const { data: { user } } = await sb.auth.getUser(); v.created_by = user.id;
           ({ error } = await sb.from('projet_activites').insert(v)); }
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    fermerModale(); toast('Enregistré.', 'ok'); await rafraichir();
  }});
  ouvrirModale(a ? 'Activité — ' + a.denomination : 'Nouvelle activité', formHtml(CH_ACT, a || { statut: 'À faire', priorite: 'Moyenne' }), actions);
  remplirSelects(CH_ACT, a || { statut: 'À faire', priorite: 'Moyenne' });
}

/* =========================================================================
 *  PLANNING VISUEL (Gantt simplifié)
 * ========================================================================= */
function vuePlanning() {
  const items = [];
  S.phases.forEach(p => items.push({ t: 'phase', lib: p.libelle, d: p.date_debut_prevue, f: p.date_fin_prevue, dr: p.date_debut_reelle, fr: p.date_fin_reelle, st: p.statut }));
  S.activites.forEach(a => items.push({ t: 'act', lib: a.denomination, d: a.date_debut_prevue, f: a.date_prevue, dr: a.date_debut_reelle, fr: a.date_realisation, crit: a.chemin_critique, st: a.statut }));
  const avec = items.filter(i => i.d && i.f);
  if (!avec.length) {
    $('#zone').innerHTML = `<div class="topbar"><div><h1>Planning visuel</h1><p>Vue calendaire des phases et activités.</p></div></div>
      <div class="carte"><p class="muted">Renseignez des dates de début et de fin prévues sur les phases ou les activités pour afficher le planning.</p></div>`;
    return;
  }
  const min = avec.reduce((m, i) => i.d < m ? i.d : m, avec[0].d);
  const max = avec.reduce((m, i) => i.f > m ? i.f : m, avec[0].f);
  const total = Math.max(joursCal(min, max), 1);
  const posi = d => Math.max(0, Math.min(100, (joursCal(min, d) / total) * 100));

  const ligne = i => {
    const g = posi(i.d), w = Math.max(1.2, posi(i.f) - g);
    const cl = i.st === 'Rouge' ? 'rouge' : i.st === 'Orange' ? 'orange' : i.st === 'Réalisé' ? 'vert' : '';
    let reel = '';
    if (i.dr) { const gr = posi(i.dr), wr = Math.max(1.2, posi(i.fr || auj()) - gr);
      reel = `<span class="gbar reel" style="left:${gr}%;width:${wr}%"></span>`; }
    return `<div class="gline">
      <div style="${i.t === 'phase' ? 'font-weight:700;color:var(--corail-fonce)' : 'padding-left:12px'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${ech(i.lib)}">
        ${i.crit ? '<span class="crit">◆</span> ' : ''}${ech(i.lib)}</div>
      <div class="gbar-zone"><span class="gbar ${cl}" style="left:${g}%;width:${w}%"></span>${reel}</div>
    </div>`;
  };

  const posAuj = posi(auj());
  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Planning visuel</h1>
      <p>Barre claire = prévu, barre foncée = réel. Du ${fdate(min)} au ${fdate(max)}. Le trait vertical marque aujourd'hui.</p></div></div>
    <div class="gantt" style="position:relative">
      ${posAuj >= 0 && posAuj <= 100 ? `<div style="position:absolute;left:calc(210px + 10px + (100% - 220px - 24px) * ${posAuj / 100});top:12px;bottom:12px;width:2px;background:var(--bad);opacity:.55"></div>` : ''}
      <div style="font-size:11px;color:var(--muted);margin-bottom:9px">Phases</div>
      ${avec.filter(i => i.t === 'phase').map(ligne).join('')}
      <div style="font-size:11px;color:var(--muted);margin:14px 0 9px">Activités</div>
      ${avec.filter(i => i.t === 'act').map(ligne).join('') || '<div class="muted" style="font-size:12px">Aucune activité datée.</div>'}
    </div>`;
}

/* =========================================================================
 *  BUDGET (registre + synthèse)
 * ========================================================================= */
function vueBudget() {
  const prevu = S.budget.reduce((s, l) => s + Number(l.montant_prevu || 0), 0);
  const actuel = S.budget.reduce((s, l) => s + Number(l.montant_actuel != null ? l.montant_actuel : l.montant_prevu || 0), 0);
  const engage = S.budget.reduce((s, l) => s + Number(l.montant_engage || 0), 0);
  const paye = S.budget.reduce((s, l) => s + Number(l.montant_paye || 0), 0);
  const ref = Number(S.projet.budget_approuve || S.projet.budget_prevu || 0);
  const derivePct = ref ? ((actuel - ref) / ref) * 100 : null;
  const dev = S.projet.devise || '';
  const clDer = derivePct === null ? '' : derivePct > 10 ? 'bad' : derivePct > 0 ? 'warn' : 'ok';

  const synth = `<div class="kpis">
    <div class="kpi"><div class="lib">Budget de référence approuvé</div><div class="val" style="font-size:19px">${fnum(ref)}</div><div class="sub">${ech(dev)}</div></div>
    <div class="kpi"><div class="lib">Total des postes (prévu)</div><div class="val" style="font-size:19px">${fnum(prevu)}</div></div>
    <div class="kpi ${clDer}"><div class="lib">Coût actuel projeté</div><div class="val" style="font-size:19px">${fnum(actuel)}</div>
      <div class="sub">${derivePct === null ? 'référence non définie' : (derivePct > 0 ? '+' : '') + derivePct.toFixed(1) + '% vs référence'}</div></div>
    <div class="kpi"><div class="lib">Engagé / Payé</div><div class="val" style="font-size:19px">${fnum(engage)}</div><div class="sub">payé : ${fnum(paye)}</div></div>
  </div>`;
  vueRegistre('budget', synth);
}

/* =========================================================================
 *  RISQUES (registre + matrice de criticité)
 * ========================================================================= */
function vueRisques() {
  const actifs = S.risques.filter(r => r.statut !== 'Clos');
  let cells = '';
  for (let i = 5; i >= 1; i--) {
    cells += `<tr><td class="axe">${i}</td>`;
    for (let p = 1; p <= 5; p++) {
      const c = p * i;
      const n = actifs.filter(r => r.probabilite === p && r.impact === i).length;
      const bg = c >= 15 ? '#cf3f3f' : c >= 8 ? '#cb8800' : '#19945d';
      cells += `<td style="background:${n ? bg : '#f2ebe9'};color:${n ? '#fff' : '#bdaba6'}" title="Criticité ${c}">${n || '·'}</td>`;
    }
    cells += '</tr>';
  }
  const crit = actifs.filter(r => (r.probabilite * r.impact) >= 15).length;
  const synth = `<div class="deux-col" style="margin-bottom:15px">
    <div class="carte"><h3>Matrice de criticité (risques actifs)</h3>
      <table class="heat"><tbody>${cells}
        <tr><td class="axe"></td>${[1,2,3,4,5].map(p => `<td class="axe">${p}</td>`).join('')}</tr></tbody></table>
      <div class="muted" style="font-size:11px;margin-top:6px">Axe vertical : impact — Axe horizontal : probabilité. Rouge = criticité ≥ 15.</div>
    </div>
    <div class="carte"><h3>Synthèse</h3>
      <div class="kpis" style="margin:0">
        <div class="kpi"><div class="lib">Risques actifs</div><div class="val">${actifs.length}</div></div>
        <div class="kpi ${crit ? 'bad' : 'ok'}"><div class="lib">Dont critiques (≥15)</div><div class="val">${crit}</div></div>
        <div class="kpi"><div class="lib">Sans plan d'atténuation</div><div class="val">${actifs.filter(r => !r.plan_attenuation).length}</div></div>
        <div class="kpi"><div class="lib">Sans propriétaire</div><div class="val">${actifs.filter(r => !r.proprietaire_id && !r.proprietaire_externe).length}</div></div>
      </div>
    </div></div>`;
  const tri = S.risques.slice().sort((a, b) => (b.probabilite * b.impact) - (a.probabilite * a.impact));
  vueRegistre('risques', synth, tri);
}

/* =========================================================================
 *  TABLEAU DE BORD
 * ========================================================================= */
function avancementReel() {
  if (!S.activites.length) return 0;
  return S.activites.reduce((s, a) => s + (a.statut === 'Réalisé' ? 100 : a.statut === 'En cours' ? (a.avancement_pct != null ? a.avancement_pct : 50) : (a.avancement_pct || 0)), 0) / S.activites.length;
}
function avancementPrevu() {
  const dat = S.activites.filter(a => a.date_debut_prevue && a.date_prevue);
  if (!dat.length) return null;
  const t = auj();
  return dat.reduce((s, a) => {
    if (t >= a.date_prevue) return s + 100;
    if (t <= a.date_debut_prevue) return s + 0;
    const tot = Math.max(joursCal(a.date_debut_prevue, a.date_prevue), 1);
    return s + Math.min(100, (joursCal(a.date_debut_prevue, t) / tot) * 100);
  }, 0) / dat.length;
}
function nbAlertes() {
  const r = S.activites.filter(a => a.statut !== 'Réalisé' && a.date_prevue && ecartOuvres(a.date_prevue) < 0).length;
  const j = S.jalons.filter(x => x.statut !== 'Réalisé' && x.date_prevue && ecartOuvres(x.date_prevue) < 0).length;
  const res = S.reserves.filter(x => x.categorie === 'Critique' && x.statut !== 'Levée').length;
  return r + j + res;
}

function vueTdb() {
  const p = S.projet;
  const ar = avancementReel(), ap = avancementPrevu();
  const spi = (ap && ap > 0) ? ar / ap : null;
  const actRetard = S.activites.filter(a => a.statut !== 'Réalisé' && a.date_prevue && ecartOuvres(a.date_prevue) < 0);
  const critRetard = actRetard.filter(a => a.chemin_critique).length;
  const jalOk = S.jalons.filter(j => j.statut === 'Réalisé').length;
  const risqCrit = S.risques.filter(r => r.statut !== 'Clos' && (r.probabilite * r.impact) >= 15).length;
  const resCrit = S.reserves.filter(r => r.categorie === 'Critique' && r.statut !== 'Levée').length;
  const livRetard = S.livrables.filter(l => l.statut !== 'Validé' && l.echeance && ecartOuvres(l.echeance) < 0).length;
  const obsOuv = S.obstacles.filter(o => o.statut === 'Ouvert' || o.statut === 'En cours').length;
  const indAlerte = S.indicateurs.filter(i => i.statut === 'Alerte').length;
  const ref = Number(p.budget_approuve || p.budget_prevu || 0);
  const actuel = S.budget.reduce((s, l) => s + Number(l.montant_actuel != null ? l.montant_actuel : l.montant_prevu || 0), 0);
  const derB = ref ? ((actuel - ref) / ref) * 100 : null;
  const decEnAttente = S.decisions.filter(d => d.statut === 'En attente de décision' || d.statut === 'À exécuter').length;

  const clSpi = spi === null ? '' : spi >= 0.95 ? 'ok' : spi >= 0.85 ? 'warn' : 'bad';
  const clB = derB === null ? '' : derB > 10 ? 'bad' : derB > 0 ? 'warn' : 'ok';

  const parPhase = S.phases.map(ph => {
    const a = S.activites.filter(x => String(x.id_phase) === String(ph.id));
    const av = a.length ? Math.round(a.reduce((s, x) => s + (x.statut === 'Réalisé' ? 100 : x.statut === 'En cours' ? (x.avancement_pct || 50) : 0), 0) / a.length) : 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px"><span>${ech(ph.libelle)}</span>
        <span class="muted">${av}% · ${a.length} act.</span></div>
      <div class="prog"><span style="width:${av}%"></span></div></div>`;
  }).join('') || '<p class="muted">Aucune phase définie.</p>';

  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Tableau de bord — ${ech(p.denomination)}</h1>
      <p>Pilotage par les écarts : avancement, tenue du planning, maîtrise des coûts, risques et points bloquants.</p></div>
      ${peut('prj.exporter') ? '<button class="btn" id="btnImpTdb">Imprimer</button>' : ''}
    </div>
    <div class="kpis">
      <div class="kpi"><div class="lib">Avancement réel des activités</div><div class="val">${pct(ar)}</div>
        <div class="sub">${ap === null ? 'planning non daté' : 'prévu à ce jour : ' + pct(ap)}</div></div>
      <div class="kpi ${clSpi}"><div class="lib">Tenue du planning (SPI)</div><div class="val">${spi === null ? '—' : spi.toFixed(2)}</div>
        <div class="sub">${spi === null ? 'dates à renseigner' : spi >= 1 ? 'en avance ou à l\'heure' : 'retard sur le prévu'}</div></div>
      <div class="kpi ${clB}"><div class="lib">Dérive budgétaire</div><div class="val">${derB === null ? '—' : (derB > 0 ? '+' : '') + derB.toFixed(1) + '%'}</div>
        <div class="sub">${fnum(actuel)} / ${fnum(ref)} ${ech(p.devise || '')}</div></div>
      <div class="kpi ${actRetard.length ? 'bad' : 'ok'}"><div class="lib">Activités en retard</div><div class="val">${actRetard.length}</div>
        <div class="sub">${critRetard} sur le chemin critique</div></div>
      <div class="kpi"><div class="lib">Jalons atteints</div><div class="val">${jalOk}/${S.jalons.length}</div>
        <div class="sub">${S.jalons.length ? Math.round(jalOk / S.jalons.length * 100) + '% des jalons' : '—'}</div></div>
      <div class="kpi ${risqCrit ? 'bad' : 'ok'}"><div class="lib">Risques critiques ouverts</div><div class="val">${risqCrit}</div>
        <div class="sub">sur ${S.risques.filter(r => r.statut !== 'Clos').length} risques actifs</div></div>
      <div class="kpi ${livRetard ? 'warn' : 'ok'}"><div class="lib">Livrables en retard</div><div class="val">${livRetard}</div>
        <div class="sub">${S.livrables.filter(l => l.statut === 'Validé').length}/${S.livrables.length} validés</div></div>
      <div class="kpi ${obsOuv ? 'warn' : 'ok'}"><div class="lib">Obstacles ouverts</div><div class="val">${obsOuv}</div>
        <div class="sub">${decEnAttente} décision(s) en attente</div></div>
      <div class="kpi ${resCrit ? 'bad' : 'ok'}"><div class="lib">Réserves critiques ouvertes</div><div class="val">${resCrit}</div>
        <div class="sub">sur ${S.reserves.filter(r => r.statut !== 'Levée').length} réserves ouvertes</div></div>
      <div class="kpi ${indAlerte ? 'warn' : 'ok'}"><div class="lib">Indicateurs en alerte</div><div class="val">${indAlerte}</div>
        <div class="sub">sur ${S.indicateurs.length} indicateurs suivis</div></div>
    </div>
    <div class="deux-col">
      <div class="carte"><h3>Avancement par phase</h3>${parPhase}</div>
      <div class="carte"><h3>Points saillants</h3>
        <p style="margin:0 0 8px"><strong>Météo déclarée :</strong> ${METEO[p.appreciation_avancement] || ''} ${ech(p.appreciation_avancement)}</p>
        <p style="margin:0 0 8px"><strong>Points d'attention :</strong><br><span class="muted">${p.points_attention ? nl2br(p.points_attention) : 'RAS'}</span></p>
        <h4>Prochaines échéances</h4>
        ${prochainesEcheances()}
      </div>
    </div>`;
  const b = $('#btnImpTdb');
  if (b) b.addEventListener('click', () => imprimer($('#zone').innerHTML.replace(/<button[\s\S]*?<\/button>/g, '')));
}

function prochainesEcheances() {
  const l = [];
  S.jalons.filter(j => j.statut !== 'Réalisé' && j.date_prevue).forEach(j => l.push({ d: j.date_prevue, t: 'Jalon', lib: j.libelle }));
  S.activites.filter(a => a.statut !== 'Réalisé' && a.date_prevue).forEach(a => l.push({ d: a.date_prevue, t: 'Activité', lib: a.denomination }));
  S.livrables.filter(x => x.statut !== 'Validé' && x.echeance).forEach(x => l.push({ d: x.echeance, t: 'Livrable', lib: x.libelle }));
  l.sort((a, b) => a.d < b.d ? -1 : 1);
  if (!l.length) return '<p class="muted">Aucune échéance à venir enregistrée.</p>';
  return l.slice(0, 8).map(x => {
    const e = ecartOuvres(x.d);
    return `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);font-size:12px">
      <span><span class="et gris">${x.t}</span> ${ech(x.lib)}</span>
      <span class="${e < 0 ? 'crit' : 'muted'}" style="white-space:nowrap">${fdate(x.d)}${e < 0 ? ` (${Math.abs(e)} j)` : ''}</span></div>`;
  }).join('');
}

/* =========================================================================
 *  ALERTES & RELANCES
 * ========================================================================= */
function vueAlertes() {
  const actifs = S.activites.filter(a => a.statut !== 'Réalisé');
  const retard = actifs.filter(a => a.date_prevue && ecartOuvres(a.date_prevue) < 0);
  const proche = actifs.filter(a => { const e = a.date_prevue ? ecartOuvres(a.date_prevue) : null; return e !== null && e >= 0 && e <= 3; });
  const sansDate = actifs.filter(a => !a.date_prevue);
  const sansResp = actifs.filter(a => !a.responsable_id);
  const bloquees = actifs.filter(a => a.bloquee);
  const jalRetard = S.jalons.filter(j => j.statut !== 'Réalisé' && j.date_prevue && ecartOuvres(j.date_prevue) < 0);
  const dormantes = actifs.filter(a => a.statut === 'En cours' && a.updated_at && joursCal(a.updated_at.slice(0, 10), auj()) >= 10);

  const charge = {};
  actifs.filter(a => a.statut === 'En cours' && a.responsable_id).forEach(a => charge[a.responsable_id] = (charge[a.responsable_id] || 0) + 1);
  const surcharge = Object.keys(charge).filter(id => charge[id] > seuilDe(id));

  const ligneAct = a => {
    const e = a.date_prevue ? ecartOuvres(a.date_prevue) : null;
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--line)">
      <div><strong>${a.chemin_critique ? '<span class="crit">◆</span> ' : ''}${ech(a.denomination)}</strong>
        <div class="muted" style="font-size:11.5px">${ech(a.responsable_id ? nomActeur(a.responsable_id) : 'non affectée')}
          ${a.date_prevue ? ' · échéance ' + fdate(a.date_prevue) : ' · sans échéance'}
          ${e !== null && e < 0 ? ` · <span class="crit">retard de ${Math.abs(e)} j ouvrés</span>` : ''}</div></div>
      ${a.responsable_id && peut('prj.relancer') ? `<button class="btn sm doux" data-rel="${ech(a.id_activite)}">Copier une relance</button>` : ''}
    </div>`;
  };
  const bloc = (t, arr, f) => `<div class="carte"><h3>${t} <span class="et ${arr.length ? 'rouge' : 'vert'}">${arr.length}</span></h3>
    ${arr.length ? arr.map(f || ligneAct).join('') : '<p class="muted">Rien à signaler.</p>'}</div>`;

  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Alertes & relances</h1>
      <p>Management par exception : ce qui dérive, ce qui bloque, ce qui n'a pas de pilote. Les délais sont calculés en jours ouvrés, jours fériés déduits.</p></div>
      ${peut('prj.relancer') && (retard.length || proche.length) ? '<button class="btn primaire" id="btnRelGlobale">Relance groupée par responsable</button>' : ''}
    </div>
    <div class="kpis">
      <div class="kpi ${retard.length ? 'bad' : 'ok'}"><div class="lib">Activités en retard</div><div class="val">${retard.length}</div></div>
      <div class="kpi ${proche.length ? 'warn' : 'ok'}"><div class="lib">Échéance sous 3 j ouvrés</div><div class="val">${proche.length}</div></div>
      <div class="kpi ${bloquees.length ? 'bad' : 'ok'}"><div class="lib">Activités bloquées</div><div class="val">${bloquees.length}</div></div>
      <div class="kpi ${jalRetard.length ? 'bad' : 'ok'}"><div class="lib">Jalons manqués</div><div class="val">${jalRetard.length}</div></div>
      <div class="kpi ${sansResp.length ? 'warn' : 'ok'}"><div class="lib">Sans responsable</div><div class="val">${sansResp.length}</div></div>
      <div class="kpi ${sansDate.length ? 'warn' : 'ok'}"><div class="lib">Sans échéance</div><div class="val">${sansDate.length}</div></div>
      <div class="kpi ${dormantes.length ? 'warn' : 'ok'}"><div class="lib">Dormantes (10 j sans mise à jour)</div><div class="val">${dormantes.length}</div></div>
      <div class="kpi ${surcharge.length ? 'bad' : 'ok'}"><div class="lib">Responsables en surcharge</div><div class="val">${surcharge.length}</div></div>
    </div>
    ${bloc('Activités en retard', retard)}
    ${bloc('Échéance proche', proche)}
    ${bloc('Activités bloquées', bloquees)}
    ${bloc('Jalons manqués', jalRetard, j => `<div style="padding:8px 0;border-bottom:1px solid var(--line)">
        <strong>${ech(j.libelle)}</strong><div class="muted" style="font-size:11.5px">${ech(nomPhase(j.id_phase))} · prévu le ${fdate(j.date_prevue)}
        · <span class="crit">retard de ${Math.abs(ecartOuvres(j.date_prevue))} j ouvrés</span></div></div>`)}
    ${surcharge.length ? `<div class="carte"><h3>Charge de travail (limite d'en-cours)</h3>
      ${surcharge.map(id => `<p style="margin:0 0 6px">⚠️ <strong>${ech(nomActeur(id))}</strong> porte ${charge[id]} activités en cours, au-delà du seuil paramétré (${seuilDe(id)}). En lean, au-delà de la limite d'en-cours le délai de traitement se dégrade sans gain de production.</p>`).join('')}</div>` : ''}`;

  $$('[data-rel]').forEach(b => b.addEventListener('click', () => {
    const a = S.activites.find(x => x.id_activite === b.dataset.rel);
    copier(texteRelance(a));
  }));
  const bg = $('#btnRelGlobale');
  if (bg) bg.addEventListener('click', relanceGroupee);
}

function texteRelance(a) {
  const e = a.date_prevue ? ecartOuvres(a.date_prevue) : null;
  return `Objet : Relance — activité « ${a.denomination} » (projet ${S.projet.denomination})

Bonjour ${nomActeur(a.responsable_id)},

Point de suivi sur l'activité « ${a.denomination} » du projet « ${S.projet.denomination} » (${S.projet.id_projet}).
Échéance prévue : ${fdate(a.date_prevue)}${e !== null && e < 0 ? ` — retard de ${Math.abs(e)} jour(s) ouvré(s)` : ''}.
Statut actuel : ${a.statut}.${a.chemin_critique ? '\nCette activité est sur le chemin critique du projet : tout retard décale la date de fin.' : ''}${a.bloquee && a.motif_blocage ? '\nBlocage signalé : ' + a.motif_blocage : ''}

Merci de m'indiquer l'état d'avancement et la date de réalisation envisagée.

Cordialement,
${S.acteur.nom_prenoms}`;
}

function relanceGroupee() {
  const actifs = S.activites.filter(a => a.statut !== 'Réalisé' && a.responsable_id && a.date_prevue && ecartOuvres(a.date_prevue) <= 3);
  const par = {};
  actifs.forEach(a => (par[a.responsable_id] = par[a.responsable_id] || []).push(a));
  const ids = Object.keys(par);
  if (!ids.length) { toast('Aucune relance à générer.', 'ok'); return; }
  const corps = ids.map(id => `<div class="carte"><h3>${ech(nomActeur(id))} — ${par[id].length} activité(s)</h3>
      <ul style="margin:0;padding-left:18px;font-size:12.5px">${par[id].map(a => `<li>${ech(a.denomination)} — ${fdate(a.date_prevue)}</li>`).join('')}</ul>
      <button class="btn sm doux" data-relg="${ech(id)}" style="margin-top:8px">Copier le message</button></div>`).join('');
  ouvrirModale('Relance groupée par responsable', corps, [{ lib: 'Fermer', cl: '', act: fermerModale }]);
  $$('[data-relg]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.relg;
    const t = `Objet : Point d'avancement — projet ${S.projet.denomination}

Bonjour ${nomActeur(id)},

Les activités suivantes du projet « ${S.projet.denomination} » (${S.projet.id_projet}) arrivent à échéance ou sont en retard :

${par[id].map(a => {
  const e = ecartOuvres(a.date_prevue);
  return `- ${a.denomination} — échéance ${fdate(a.date_prevue)}${e < 0 ? ` (retard de ${Math.abs(e)} j ouvrés)` : ''}${a.chemin_critique ? ' [chemin critique]' : ''}`;
}).join('\n')}

Merci de me transmettre l'état d'avancement de chacune et, le cas échéant, les difficultés rencontrées.

Cordialement,
${S.acteur.nom_prenoms}`;
    copier(t);
  }));
}

function copier(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(
      () => toast('Message copié dans le presse-papiers.', 'ok'),
      () => toast('Copie impossible sur ce navigateur.', 'err'));
  } else toast('Copie automatique non supportée par ce navigateur.', 'err');
}

/* =========================================================================
 *  RAPPORTS D'AVANCEMENT
 * ========================================================================= */
const CH_RAP = [
  { k: 'date_rapport', l: 'Date du rapport', t: 'date' },
  { k: 'periode_libelle', l: 'Période couverte', t: 'text' },
  { k: 'appreciation_avancement', l: 'Météo du projet', t: 'select', opts: () => opts(['Vert', 'Orange', 'Rouge']) },
  { k: 'taux_avancement', l: 'Taux d\'avancement (%)', t: 'number' },
  { k: 'synthese', l: 'Synthèse de la période', t: 'textarea', full: 1 },
  { k: 'points_attention', l: 'Points d\'attention / décisions attendues', t: 'textarea', full: 1 }
];

function vueRapports() {
  const peutSaisir = peut('prj.rapport');
  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Rapports d'avancement</h1>
      <p>Compte rendu périodique au commanditaire. Le rapport met à jour la météo et les points d'attention du projet.</p></div>
      ${peutSaisir ? '<button class="btn primaire" id="btnAddRap">+ Nouveau rapport</button>' : ''}
    </div>
    ${S.rapports.length ? S.rapports.map(r => `<div class="carte">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <h3>${METEO[r.appreciation_avancement] || ''} ${fdate(r.date_rapport)}${r.periode_libelle ? ' — ' + ech(r.periode_libelle) : ''}</h3>
        <span class="muted" style="font-size:11.5px">${ech(nomActeur(r.auteur_id))}${r.taux_avancement != null ? ' · avancement ' + r.taux_avancement + '%' : ''}</span>
      </div>
      ${r.synthese ? `<p style="margin:8px 0 0"><strong>Synthèse :</strong><br><span class="muted">${nl2br(r.synthese)}</span></p>` : ''}
      ${r.points_attention ? `<p style="margin:8px 0 0"><strong>Points d'attention :</strong><br><span class="muted">${nl2br(r.points_attention)}</span></p>` : ''}
    </div>`).join('') : '<div class="carte"><p class="muted">Aucun rapport enregistré pour l\'instant.</p></div>'}`;

  const b = $('#btnAddRap');
  if (b) b.addEventListener('click', () => {
    const pre = { date_rapport: auj(), appreciation_avancement: S.projet.appreciation_avancement || 'Vert',
                  taux_avancement: Math.round(avancementReel()), points_attention: S.projet.points_attention };
    ouvrirModale('Nouveau rapport d\'avancement', formHtml(CH_RAP, pre), [
      { lib: 'Annuler', cl: '', act: fermerModale },
      { lib: 'Enregistrer', cl: 'primaire', act: async () => {
          const v = lireForm(CH_RAP);
          v.id_projet = S.projet.id_projet; v.auteur_id = S.acteur.id_acteur;
          if (!v.date_rapport) v.date_rapport = auj();
          const { error } = await sb.from('projet_rapports').insert(v);
          if (error) { toast('Erreur : ' + error.message, 'err'); return; }
          await sb.from('projets').update({
            appreciation_avancement: v.appreciation_avancement,
            points_attention: v.points_attention,
            avancement_declare: v.taux_avancement,
            updated_at: new Date().toISOString()
          }).eq('id_projet', S.projet.id_projet);
          fermerModale(); toast('Rapport enregistré.', 'ok'); await rafraichir();
        } }
    ]);
    remplirSelects(CH_RAP, pre);
  });
}

/* =========================================================================
 *  FICHE D'ÉTAT D'AVANCEMENT — 5 BLOCS
 * ========================================================================= */
function listeAct(statut) {
  const items = S.activites.filter(a => a.statut === statut);
  if (!items.length) return '<p class="muted">Aucune activité dans cet état.</p>';
  return '<ul>' + items.map(a => `<li>${a.chemin_critique ? '◆ ' : ''}${ech(a.denomination)}` +
    (a.responsable_id ? ` — <em>${ech(nomActeur(a.responsable_id))}</em>` : '') +
    (a.date_prevue ? ` (échéance ${fdate(a.date_prevue)}${a.statut !== 'Réalisé' && ecartOuvres(a.date_prevue) < 0 ? ', en retard' : ''})` : '') +
    '</li>').join('') + '</ul>';
}
function fiche5Html() {
  const p = S.projet, ar = avancementReel(), ap = avancementPrevu();
  const spi = (ap && ap > 0) ? (ar / ap).toFixed(2) : '—';
  const risq = S.risques.filter(r => r.statut !== 'Clos' && r.probabilite * r.impact >= 15);
  const obs = S.obstacles.filter(o => o.statut === 'Ouvert' || o.statut === 'En cours');
  const dec = S.decisions.filter(d => d.statut === 'En attente de décision');
  return `
    <h2 style="margin:0 0 2px;color:var(--corail-fonce)">${ech(p.denomination)}</h2>
    <p class="muted" style="margin:0 0 14px;font-size:12px">${ech(p.id_projet)} · Fiche d'état d'avancement · ${fdate(auj())}</p>

    <div class="bloc5"><h3>1. Présentation et appréciation générale</h3>
      <p><strong>Météo du projet : ${METEO[p.appreciation_avancement] || ''} ${ech(p.appreciation_avancement)}</strong>
         — avancement ${pct(ar)}${ap !== null ? ` (prévu à ce jour ${pct(ap)}, SPI ${spi})` : ''}</p>
      <p><strong>Responsable :</strong> ${ech(nomActeur(p.responsable_id))}${p.commanditaire_id ? ' · <strong>Commanditaire :</strong> ' + ech(nomActeur(p.commanditaire_id)) : ''}</p>
      <p><strong>Objectif :</strong> ${p.objectif_projet ? nl2br(p.objectif_projet) : 'Non renseigné'}</p>
      <p><strong>Période :</strong> ${fdate(p.date_debut)} → ${fdate(p.date_fin_prevue)} · <strong>Budget :</strong> ${fnum(p.budget_approuve || p.budget_prevu)} ${ech(p.devise || '')}</p>
      <p><strong>Jalons atteints :</strong> ${S.jalons.filter(j => j.statut === 'Réalisé').length}/${S.jalons.length}
         · <strong>Livrables validés :</strong> ${S.livrables.filter(l => l.statut === 'Validé').length}/${S.livrables.length}</p>
    </div>

    <div class="bloc5"><h3>2. À faire</h3>${listeAct('À faire')}</div>
    <div class="bloc5"><h3>3. En cours</h3>${listeAct('En cours')}</div>
    <div class="bloc5"><h3>4. Réalisé</h3>${listeAct('Réalisé')}</div>

    <div class="bloc5"><h3>5. Points d'attention</h3>
      ${p.points_attention ? `<p>${nl2br(p.points_attention)}</p>` : ''}
      ${risq.length ? `<p><strong>Risques critiques ouverts :</strong></p><ul>${risq.map(r => `<li>${ech(r.description)} (criticité ${r.probabilite * r.impact})</li>`).join('')}</ul>` : ''}
      ${obs.length ? `<p><strong>Obstacles à lever :</strong></p><ul>${obs.map(o => `<li>${ech(o.description)}${o.responsable_id ? ' — ' + ech(nomActeur(o.responsable_id)) : ''}</li>`).join('')}</ul>` : ''}
      ${dec.length ? `<p><strong>Décisions attendues :</strong></p><ul>${dec.map(d => `<li>${ech(d.objet)}${d.instance ? ' — ' + ech(d.instance) : ''}</li>`).join('')}</ul>` : ''}
      ${!p.points_attention && !risq.length && !obs.length && !dec.length ? '<p class="muted">Aucun point d\'attention particulier à ce jour.</p>' : ''}
    </div>`;
}
function vueFiche5() {
  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Fiche d'état d'avancement</h1>
      <p>Synthèse en 5 blocs destinée à la Direction : où on en est, ce qui reste, ce qui avance, ce qui est fait, ce qui inquiète.</p></div>
      ${peut('prj.exporter') ? '<button class="btn primaire" id="btnPdf">Exporter en PDF</button>' : ''}
    </div>
    <div class="carte">${fiche5Html()}</div>`;
  const b = $('#btnPdf');
  if (b) b.addEventListener('click', () => imprimer(fiche5Html()));
}

function imprimer(html) {
  $('#imprZone').innerHTML = html;
  document.body.classList.add('impression');
  window.print();
}
window.addEventListener('afterprint', () => document.body.classList.remove('impression'));

/* ------------------------------------------------------------- Mode d'emploi */
function vueAide() {
  $('#zone').innerHTML = `
    <div class="topbar"><div><h1>Mode d'emploi</h1>
      <p>La chambre Gestion de projet de D2MG Pilotage, un module autonome de pilotage de projet inspiré des standards PMP, indépendant du processus PS3.</p></div></div>

    <div class="carte">
      <h3>Manuel d'utilisation</h3>
      <p class="muted" style="margin:0 0 12px">La description ci-dessous couvre l'essentiel. Pour le détail complet, écran par écran, consultez ou téléchargez le manuel d'utilisation du module.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="Manuel_Utilisation_Gestion_de_Projet_D2MG.pdf" target="_blank" rel="noopener" class="btn primaire" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">📖 Consulter le manuel (PDF)</a>
        <a href="Manuel_Utilisation_Gestion_de_Projet_D2MG.pdf" download class="btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">⬇ Télécharger le manuel (PDF)</a>
        <a href="Manuel_Utilisation_Gestion_de_Projet_D2MG.docx" download class="btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">⬇ Télécharger le manuel (Word)</a>
      </div>
    </div>

    <div class="carte">
      <h3>Comment est organisée la chambre</h3>
      <p style="font-size:12.5px;margin:0 0 10px">Chaque projet suit le même cycle, du cadrage à la clôture. Le menu latéral se structure en six groupes, dans l'ordre où on les utilise :</p>
      <div style="display:flex;flex-direction:column;gap:9px">
        <div style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--line)"><strong style="min-width:120px">Portefeuille</strong><span style="font-size:12.5px">La liste de tous les projets visibles ; c'est le point d'entrée pour ouvrir ou créer un projet.</span></div>
        <div style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--line)"><strong style="min-width:120px">Cadrage</strong><span style="font-size:12.5px">Charte de projet, parties prenantes et matrice RACI — ce qu'on fait, pourquoi, avec qui, et qui décide quoi.</span></div>
        <div style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--line)"><strong style="min-width:120px">Planification</strong><span style="font-size:12.5px">Phases & jalons, activités en kanban, planning visuel et livrables.</span></div>
        <div style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--line)"><strong style="min-width:120px">Maîtrise</strong><span style="font-size:12.5px">Budget & variations, risques, décisions, réserves et obstacles — le suivi des écarts en cours de route.</span></div>
        <div style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--line)"><strong style="min-width:120px">Pilotage</strong><span style="font-size:12.5px">Tableau de bord, indicateurs, alertes & relances, rapports d'avancement et fiche 5 blocs pour la Direction.</span></div>
        <div style="display:flex;gap:11px;padding:9px 0"><strong style="min-width:120px">Clôture</strong><span style="font-size:12.5px">RETEX — les leçons apprises, à capitaliser pour les projets suivants.</span></div>
      </div>
    </div>

    <div class="carte"><h3>Bonnes pratiques</h3>
      <ul style="font-size:12.5px;line-height:1.7;margin:0;padding-left:19px">
        <li><strong>Commencer par la charte.</strong> Un projet sans charte de projet validée manque de cadre pour arbitrer les décisions qui suivront.</li>
        <li><strong>Décomposer en activités suivables.</strong> Le taux d'avancement d'une phase se déduit de ses activités : le tenir à jour, c'est garder un tableau de bord fiable.</li>
        <li><strong>Tracer les décisions et les écarts.</strong> Un dépassement de budget ou un risque avéré doit être documenté au moment où il survient, pas reconstitué a posteriori.</li>
        <li><strong>Mettre à jour les indicateurs avant chaque comité.</strong> Le tableau de bord et la fiche 5 blocs sont faits pour être présentés tels quels.</li>
        <li><strong>Renseigner le RETEX à la clôture.</strong> Les leçons apprises n'ont de valeur que si elles sont écrites pendant que le projet est encore frais en mémoire.</li>
      </ul>
    </div>`;
}

/* --------------------------------------------------------------- lancement */
demarrer();
})();
