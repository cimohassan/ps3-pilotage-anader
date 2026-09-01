/* =========================================================================
 * D2MG PILOTAGE — CHAMBRE « GESTION DES CONTRATS FOURNISSEURS »
 * Reprise fidèle des écrans et du moteur métier de la version d'essai
 * locale (V0.3), portée sur Supabase : données partagées entre tous les
 * agents, authentification réelle, droits d'usage individuels (module
 * 'contrats' — ref_droits/module_acces/acteur_droits), audit central.
 * Intégrée à la plateforme D2MG Pilotage le 01/09/2026 (arbitrage Hassan).
 * Remarque technique : contrairement à courriers-app.js/projets-app.js (qui
 * pilotent leurs écrans par délégation d'événements), ce fichier reprend le
 * modèle d'origine de la version d'essai locale — de nombreux gestionnaires
 * sont posés en attributs inline (onclick="App.aller(...)", etc.) directement
 * dans le HTML généré. Il n'est donc PAS enveloppé dans une IIFE : App,
 * aDroit, toast, ouvrirModale et l'ensemble des fonctions ci-dessous doivent
 * rester dans la portée globale du script pour que ces attributs les
 * résolvent correctement.
 * ========================================================================= */

const SUPABASE_URL = 'https://tcirboephslicjmhokbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaXJib2VwaHNsaWNqbWhva2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjYxNjUsImV4cCI6MjEwMDg0MjE2NX0.e3f1B__NmDVL5G1Cze1p115ya2Rs-ErzzTUr25UCKEg';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   SECTION 1 — Constantes métier (reprises telles quelles de la
   version d'essai locale V0.3 ; ROLES a disparu, les droits sont
   désormais individuels — voir Section 5, aDroit()).
   ============================================================ */

const STATUTS = {
  BROUILLON:      {code:"BROUILLON",      libelle:"Brouillon",            couleur:"gris",   ordre:1},
  EN_NEGOCIATION: {code:"EN_NEGOCIATION", libelle:"En négociation",       couleur:"bleu",   ordre:2},
  EN_SIGNATURE:   {code:"EN_SIGNATURE",   libelle:"En signature",         couleur:"violet", ordre:3},
  ACTIF:          {code:"ACTIF",          libelle:"Actif",                couleur:"vert",   ordre:4},
  EN_PREAVIS:     {code:"EN_PREAVIS",     libelle:"En préavis",           couleur:"orange", ordre:5},
  CLOS:           {code:"CLOS",           libelle:"Clos",                 couleur:"gris",   ordre:6},
  ABANDONNE:      {code:"ABANDONNE",      libelle:"Abandonné",            couleur:"rouge",  ordre:7}
};
const STATUTS_ORDRE = ["BROUILLON","EN_NEGOCIATION","EN_SIGNATURE","ACTIF","EN_PREAVIS","CLOS"];

const MOTIFS_CLOTURE = [
  {code:"RENOUVELE",   libelle:"Renouvelé"},
  {code:"RESILIE",     libelle:"Résilié"},
  {code:"ARRIVE_TERME",libelle:"Arrivé à terme, non renouvelé"}
];
const MOTIFS_ABANDON = [
  {code:"NEGO_ROMPUE",   libelle:"Négociation rompue"},
  {code:"BUDGET",        libelle:"Contrainte budgétaire"},
  {code:"FOURNISSEUR",   libelle:"Retrait du fournisseur"},
  {code:"BESOIN_CADUC",  libelle:"Besoin devenu caduc"},
  {code:"AUTRE",         libelle:"Autre motif"}
];

const CRITICITES = {
  CRITIQUE: {code:"CRITIQUE", libelle:"Critique",   facteur:1.4, couleur:"rouge"},
  NORMALE:  {code:"NORMALE",  libelle:"Normale",    facteur:1,   couleur:"bleu"},
  MINEURE:  {code:"MINEURE",  libelle:"Mineure",    facteur:0.8, couleur:"gris"}
};

const NATURES_CONTRAT = {
  ACCORD_CADRE:  {code:"ACCORD_CADRE",  libelle:"Accord-cadre / marché à bons de commande", preavis:60, dureeTypeMois:36},
  TRAVAUX:       {code:"TRAVAUX",       libelle:"Marché de travaux",                        preavis:30, dureeTypeMois:12},
  MAINTENANCE:   {code:"MAINTENANCE",   libelle:"Maintenance / entretien technique",        preavis:30, dureeTypeMois:12},
  ASSURANCE:     {code:"ASSURANCE",     libelle:"Assurance (flotte, biens, personnes)",     preavis:45, dureeTypeMois:12},
  LOCATION:      {code:"LOCATION",      libelle:"Location (locaux, matériel)",              preavis:90, dureeTypeMois:24},
  PRESTATION:    {code:"PRESTATION",    libelle:"Prestation de service récurrente",         preavis:30, dureeTypeMois:12},
  ABONNEMENT:    {code:"ABONNEMENT",    libelle:"Abonnement (télécom, énergie, carburant)", preavis:30, dureeTypeMois:12},
  FOURNITURE:    {code:"FOURNITURE",    libelle:"Fourniture de biens (ponctuelle)",         preavis:15, dureeTypeMois:6}
};

const TYPES_CLAUSE = {
  DELAI_LIVRAISON:   {code:"DELAI_LIVRAISON",   libelle:"Délai de livraison",          unite:"jours",  sens:"max"},
  DELAI_INTERVENTION:{code:"DELAI_INTERVENTION",libelle:"Délai d'intervention",        unite:"heures", sens:"max"},
  DISPONIBILITE:     {code:"DISPONIBILITE",     libelle:"Taux de disponibilité",       unite:"%",      sens:"min"},
  PENALITE_RETARD:   {code:"PENALITE_RETARD",   libelle:"Pénalité de retard",          unite:"% / jour",sens:"info"},
  PREAVIS_RESILIATION:{code:"PREAVIS_RESILIATION",libelle:"Préavis de résiliation",    unite:"jours",  sens:"info"},
  GARANTIE:          {code:"GARANTIE",          libelle:"Garantie / SAV",              unite:"mois",   sens:"min"},
  CONFORMITE_QHSE:   {code:"CONFORMITE_QHSE",   libelle:"Conformité QHSE",             unite:"%",      sens:"min"}
};

const SEUILS_CLAUSE_DEFAUT = {
  DELAI_LIVRAISON:15, DELAI_INTERVENTION:24, DISPONIBILITE:98,
  PENALITE_RETARD:0.5, PREAVIS_RESILIATION:30, GARANTIE:12, CONFORMITE_QHSE:95
};

const LEXIQUE = {
  "préavis":        "Délai à respecter avant la date de fin pour prévenir le fournisseur qu'on arrête ou qu'on modifie le contrat.",
  "reconduction tacite": "Le contrat se renouvelle automatiquement si personne ne dit le contraire avant la date limite.",
  "pénalité de retard":  "Somme déduite du paiement du fournisseur si un délai promis n'est pas tenu.",
  "clause de résiliation": "Les règles qui expliquent comment et quand on peut arrêter le contrat avant son terme normal.",
  "avenant":         "Un document qui modifie un contrat déjà signé (montant, durée, prestations) sans en refaire un nouveau.",
  "SLA":             "« Service Level Agreement » — l'engagement chiffré du fournisseur sur un niveau de service (délai, disponibilité...).",
  "force majeure":   "Événement imprévisible et hors de contrôle (catastrophe, guerre...) qui peut suspendre les obligations du contrat.",
  "garantie":        "Période pendant laquelle le fournisseur doit réparer ou remplacer gratuitement en cas de défaut.",
  "caution":         "Somme ou garantie bancaire versée par le fournisseur pour couvrir un risque d'inexécution.",
  "MAC":             "« Material Adverse Change » — clause qui permet de se retirer si la situation du fournisseur se dégrade gravement."
};

const CRITERES_EVALUATION = {
  qualite:    {libelle:"Qualité",     poids:0.25, methode:"Taux de non-conformités constatées à la réception (0 défaut = 100)."},
  livraison:  {libelle:"Livraison",   poids:0.20, methode:"Part des livraisons reçues dans le délai contractuel."},
  cout:       {libelle:"Coût",        poids:0.20, methode:"Écart entre le prix facturé et le prix contractuel / marché de référence."},
  sla:        {libelle:"SLA",         poids:0.20, methode:"Respect des engagements de service chiffrés (délai d'intervention, disponibilité)."},
  conformite: {libelle:"Conformité",  poids:0.15, methode:"Pièces administratives et QHSE à jour (attestations, assurances, habilitations)."}
};

const REGIMES_CONTRACTUELS = [
  {code:"MARCHE_PUBLIC",        libelle:"Marché public (Code des marchés publics)"},
  {code:"PROCEDURE_SIMPLIFIEE", libelle:"Procédure simplifiée / marché à seuil réduit"},
  {code:"CONVENTION_ENTITES",   libelle:"Convention entre entités assujetties"},
  {code:"CONTRAT_PRIVE",        libelle:"Contrat commercial de droit privé"},
  {code:"FINANCEMENT_BAILLEUR", libelle:"Contrat financé par un bailleur (procédures propres)"},
  {code:"DEROGATION",           libelle:"Dérogation au Code des marchés publics"}
];

const REFERENTIEL_MARCHES_PUBLICS = {
  cumulAvenantsMaxPct: 30,
  garantieBonneExecutionMinPct: 3,
  garantieBonneExecutionMaxPct: 5,
  cumulPenalitesSeuilResiliationPct: 10,
  delaiPaiementMaxJours: 90
};

const ETAPES_ADMINISTRATIVES = [
  "Brouillon","En revue","À corriger","À approuver","À signer","Approuvé","Notifié",
  "En attente de démarrage","Actif","Suspendu","En modification","À renouveler",
  "Arrivé à échéance","Résilié","Clôturé","Archivé"
];

/* ============================================================
   SECTION 2 — Paramètres par défaut (fusionnés avec ce qui est
   chargé depuis contrats_parametres — voir Section 4)
   ============================================================ */
function seuilsParDefaut(){
  return {
    alertesJours:[90,60,30], joursAvantEscaladeN1:5, joursAvantEscaladeN2:10,
    scoreAlerteFournisseur:70, periodesConsecutivesEscalade:2, wipMaxParAgent:12
  };
}
function preavisParDefaut(){
  return Object.fromEntries(Object.values(NATURES_CONTRAT).map(n => [n.code, n.preavis]));
}
function numerotationParDefaut(){
  return { prefixe:"ANADER/D2MG", serie:"CTR", annee:new Date().getFullYear(), compteurs:{} };
}

/* ============================================================
   SECTION 3 — Outils dates / jours ouvrés (identique à la version locale)
   ============================================================ */
function iso(d){ const z = new Date(d.getTime() - d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); }
function auj(){ return iso(new Date()); }
function dt(s){ return new Date(s + "T00:00:00"); }

function estOuvre(d){
  const j = d.getDay();
  if (j === 0 || j === 6) return false;
  return !DB.params.joursFeries.includes(iso(d));
}
function ajoutOuvres(dateStr, n){
  const d = dt(dateStr); let c = 0, garde = 0;
  n = Math.max(0, Math.round(n));
  while (c < n && garde < 3650) { d.setDate(d.getDate()+1); garde++; if (estOuvre(d)) c++; }
  return iso(d);
}
function soustraireOuvres(dateStr, n){
  const d = dt(dateStr); let c = 0, garde = 0;
  n = Math.max(0, Math.round(n));
  while (c < n && garde < 3650) { d.setDate(d.getDate()-1); garde++; if (estOuvre(d)) c++; }
  return iso(d);
}
function ecartOuvres(a, b){
  if (a === b) return 0;
  const sens = dt(b) > dt(a) ? 1 : -1;
  let d = sens > 0 ? dt(a) : dt(b);
  const fin = sens > 0 ? dt(b) : dt(a);
  let c = 0, garde = 0;
  while (d < fin && garde < 3650) { d.setDate(d.getDate()+1); garde++; if (estOuvre(d)) c++; }
  return c * sens;
}
function formaterDate(s){
  if (!s) return "—";
  const [a,m,j] = s.split("-");
  const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  return j + " " + MOIS[parseInt(m,10)-1] + " " + a;
}
function nature(code){ return NATURES_CONTRAT[code]; }
function preavisEffectif(natureCode){
  const p = DB.params.preavisParNature[natureCode];
  return (p != null) ? p : (nature(natureCode) ? nature(natureCode).preavis : 30);
}
function dateLimitePreavis(o){
  if (!o.dateFin) return null;
  return soustraireOuvres(o.dateFin, preavisEffectif(o.natureId));
}
function estClos(o){ return o.statut === "CLOS" || o.statut === "ABANDONNE"; }
function estActif(o){ return o.statut === "ACTIF" || o.statut === "EN_PREAVIS"; }
function etatEcheance(o){
  if (estClos(o)) return o.statut === "ABANDONNE" ? "abandonne" : "clos";
  const lim = dateLimitePreavis(o);
  if (!lim) return "sansEcheance";
  const r = ecartOuvres(auj(), lim);
  if (r < 0) return "retard";
  if (r <= DB.params.seuils.alertesJours[2]) return "proche";
  return "ok";
}
function joursRestantsPreavis(o){
  const lim = dateLimitePreavis(o);
  if (!lim) return null;
  return ecartOuvres(auj(), lim);
}
function badgeEcheance(o){
  const e = etatEcheance(o);
  if (e === "clos")      return {texte:"Clos", couleur:"gris"};
  if (e === "abandonne") return {texte:"Abandonné", couleur:"rouge"};
  if (e === "sansEcheance") return {texte:"Sans échéance", couleur:"gris"};
  const r = joursRestantsPreavis(o);
  if (e === "retard") return {texte:"Préavis dépassé (" + Math.abs(r) + " j ouvrés)", couleur:"rouge"};
  if (r === 0)        return {texte:"Échéance de préavis ce jour", couleur:"rouge"};
  if (e === "proche")  return {texte:"J-" + r + " avant préavis", couleur:"orange"};
  return {texte:"Dans le délai (J-" + r + ")", couleur:"vert"};
}
function couleurClause(clause){
  if (clause.niveauManuel) return clause.niveauManuel;
  if (clause.sens === "info") return "bleu";
  const seuil = Number(clause.seuil), valeur = Number(clause.valeurConstatee);
  if (isNaN(seuil) || isNaN(valeur) || clause.valeurConstatee === "" || clause.valeurConstatee == null) return "gris";
  if (clause.sens === "max"){
    if (valeur <= seuil) return "vert";
    if (valeur <= seuil * 1.2) return "orange";
    return "rouge";
  }
  if (valeur >= seuil) return "vert";
  if (valeur >= seuil * 0.85) return "orange";
  return "rouge";
}
function numeroter(){
  const p = DB.params.numerotation, an = new Date().getFullYear();
  if (p.annee !== an) { p.annee = an; p.compteurs = {}; }
  p.compteurs[p.serie] = (p.compteurs[p.serie] || 0) + 1;
  return p.prefixe + "/" + an + "/" + p.serie + "/" + String(p.compteurs[p.serie]).padStart(4, "0");
}
function numeroCourt(numero){
  const parts = String(numero||"").split("/");
  return parts.slice(-2).join("/");
}

/* ============================================================
   SECTION 4 — Stockage (Supabase) : authentification réelle,
   chargement des référentiels partagés, sauvegarde intégrale.
   ============================================================ */
let DB = {
  params:{ agents:[], services:[], fournisseurs:[], seuils:seuilsParDefaut(), preavisParNature:preavisParDefaut(),
           joursFeries:[], numerotation:numerotationParDefaut(), directeurId:null, cjfId:null },
  contrats:[], evaluations:[], profilActif:null
};
let D = { droits:{} };

function mapActeurVersAgent(a){
  return { id:a.id_acteur, nom:a.nom_prenoms, role:a.role, fonction:a.fonction, serviceId:a.service_contrats_id };
}
function mapContratVersLigne(o){
  return {
    id:o.id, numero:o.numero, objet:o.objet, fournisseur_id:o.fournisseurId||null, nature_id:o.natureId,
    service_id:o.serviceId||null, proprietaire_id:o.proprietaireId||null, criticite:o.criticite||"NORMALE",
    regime_contractuel:o.regimeContractuel||"MARCHE_PUBLIC", motif_derogation:o.motifDerogation||"",
    etape_administrative:o.etapeAdministrative||"", reference_document_origine:o.referenceDocumentOrigine||"",
    date_enregistrement:o.dateEnregistrement||null, date_signature:o.dateSignature||null,
    date_debut:o.dateDebut||null, date_fin:o.dateFin||null, date_cloture:o.dateCloture||null,
    montant: (o.montant===""||o.montant==null) ? null : Number(o.montant),
    devise:o.devise||"XOF", mode_paiement:o.modePaiement||null,
    statut:o.statut||"BROUILLON", motif_cloture:o.motifCloture||null, motif_abandon:o.motifAbandon||null,
    clauses_sla:o.clausesSLA||[], avenants:o.avenants||[], revues:o.revues||[],
    demandes_avis:o.demandesAvis||[], pieces:o.pieces||[], historique:o.historique||[],
    updated_at:new Date().toISOString()
  };
}
function mapLigneVersContrat(r){
  return {
    id:r.id, numero:r.numero, objet:r.objet, fournisseurId:r.fournisseur_id, natureId:r.nature_id,
    serviceId:r.service_id, proprietaireId:r.proprietaire_id, criticite:r.criticite,
    regimeContractuel:r.regime_contractuel, motifDerogation:r.motif_derogation||"",
    etapeAdministrative:r.etape_administrative||"", referenceDocumentOrigine:r.reference_document_origine||"",
    dateEnregistrement:r.date_enregistrement, dateSignature:r.date_signature,
    dateDebut:r.date_debut, dateFin:r.date_fin, dateCloture:r.date_cloture,
    montant:r.montant, devise:r.devise, modePaiement:r.mode_paiement,
    statut:r.statut, motifCloture:r.motif_cloture, motifAbandon:r.motif_abandon,
    clausesSLA:r.clauses_sla||[], avenants:r.avenants||[], revues:r.revues||[],
    demandesAvis:r.demandes_avis||[], pieces:r.pieces||[], historique:r.historique||[]
  };
}

async function chargerReferentiels(){
  const [ag, sv, fo, pa, jf] = await Promise.all([
    sb.from('acteurs').select('id_acteur,nom_prenoms,role,fonction,service_contrats_id').eq('actif', true).order('nom_prenoms'),
    sb.from('contrats_services').select('*').order('ordre'),
    sb.from('contrats_fournisseurs').select('*').order('nom'),
    sb.from('contrats_parametres').select('*').eq('id',1).maybeSingle(),
    sb.from('jours_feries').select('date_ferie')
  ]);
  DB.params.agents = (ag.data||[]).map(mapActeurVersAgent);
  DB.params.services = (sv.data||[]).map(s => ({id:s.id, libelle:s.libelle, ordre:s.ordre, chefId:s.chef_id}));
  DB.params.fournisseurs = (fo.data||[]).map(f => ({id:f.id, nom:f.nom, secteur:f.secteur}));
  DB.params.joursFeries = (jf.data||[]).map(j => j.date_ferie);
  const p = pa.data;
  DB.params.seuils = Object.assign(seuilsParDefaut(), (p && p.seuils) || {});
  DB.params.preavisParNature = Object.assign(preavisParDefaut(), (p && p.preavis_par_nature) || {});
  DB.params.numerotation = (p && p.numerotation && p.numerotation.serie) ? p.numerotation : numerotationParDefaut();
  DB.params.directeurId = p ? p.directeur_id : null;
  DB.params.cjfId = p ? p.cjf_id : null;
}
async function chargerContrats(){
  const { data, error } = await sb.from('contrats').select('*').order('created_at', {ascending:false});
  if (error) { toast("Erreur de chargement des contrats : " + error.message, "err", 6000); DB.contrats = []; return; }
  DB.contrats = (data||[]).map(mapLigneVersContrat);
}
async function chargerEvaluations(){
  const { data } = await sb.from('contrats_evaluations').select('*');
  DB.evaluations = (data||[]).map(r => ({id:r.id, fournisseurId:r.fournisseur_id, periode:r.periode, date:r.date, scores:r.scores||{}, total:Number(r.total)}));
}

async function sauver(){
  try {
    const ops = [
      sb.from('contrats_parametres').upsert({
        id:1, seuils:DB.params.seuils, preavis_par_nature:DB.params.preavisParNature,
        numerotation:DB.params.numerotation, directeur_id:DB.params.directeurId||null,
        cjf_id:DB.params.cjfId||null, updated_at:new Date().toISOString()
      }, {onConflict:'id'})
    ];
    if (DB.contrats.length) ops.push(sb.from('contrats').upsert(DB.contrats.map(mapContratVersLigne), {onConflict:'id'}));
    if (DB.params.fournisseurs.length) ops.push(sb.from('contrats_fournisseurs').upsert(
      DB.params.fournisseurs.map(f => ({id:f.id, nom:f.nom, secteur:f.secteur, updated_at:new Date().toISOString()})), {onConflict:'id'}));
    if (DB.params.services.length) ops.push(sb.from('contrats_services').upsert(
      DB.params.services.map(s => ({id:s.id, libelle:s.libelle, ordre:s.ordre||0, chef_id:s.chefId||null})), {onConflict:'id'}));
    if (DB.evaluations && DB.evaluations.length) ops.push(sb.from('contrats_evaluations').upsert(
      DB.evaluations.map(e => ({id:e.id, fournisseur_id:e.fournisseurId, periode:e.periode, date:e.date, scores:e.scores, total:e.total})), {onConflict:'id'}));
    const resultats = await Promise.all(ops);
    const erreur = resultats.find(r => r && r.error);
    if (erreur) throw erreur.error;
    return true;
  } catch(e){
    console.error(e);
    toast("Erreur d'enregistrement : " + (e && e.message ? e.message : e), "err", 6500);
    return false;
  }
}
function exporterJSON(){
  const snapshot = { version:1, exporteLe:new Date().toISOString(), params:DB.params, contrats:DB.contrats, evaluations:DB.evaluations||[] };
  telecharger("d2mg_contrats_" + auj() + ".json", JSON.stringify(snapshot, null, 2), "application/json");
}

const TAILLE_MAX_PJ = 1.6 * 1024 * 1024;
function lireFichierEnPiece(file, cb){
  if (file.size > TAILLE_MAX_PJ) {
    cb({ nom:file.name, taille:file.size, contenu:null,
         avertissement:"Fichier trop volumineux (" + Math.round(file.size/1024) + " Ko) : seul le nom est conservé." });
    return;
  }
  const r = new FileReader();
  r.onload = () => cb({ nom:file.name, taille:file.size, contenu:r.result, avertissement:null });
  r.onerror = () => cb({ nom:file.name, taille:file.size, contenu:null, avertissement:"Lecture du fichier impossible." });
  r.readAsDataURL(file);
}

/* ============================================================
   SECTION 5 — Helpers (échappement, référentiels, droits, traçage)
   ============================================================ */
function ech(s){
  return String(s==null?"":s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function telecharger(nom, contenu, type){
  const b = new Blob(["﻿" + contenu], {type:(type||"text/plain")+";charset=utf-8"});
  const u = URL.createObjectURL(b), a = document.createElement("a");
  a.href = u; a.download = nom; document.body.appendChild(a); a.click();
  document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(u), 1500);
}
function csvLigne(t){ return t.map(v => '"' + String(v==null?"":v).replace(/"/g,'""') + '"').join(";"); }
function formaterMontant(n){
  if (n == null || isNaN(n)) return "—";
  return Math.round(n).toLocaleString("fr-FR") + " F CFA";
}

function service(id){ return DB.params.services.find(s => s.id === id); }
function agent(id){ return DB.params.agents.find(a => a.id === id); }
function fournisseur(id){ return DB.params.fournisseurs.find(f => f.id === id); }
function libelleService(id){ const s = service(id); return s ? s.libelle : "—"; }
function libelleAgent(id){ const a = agent(id); return a ? a.nom : "—"; }
function libelleFournisseur(id){ const f = fournisseur(id); return f ? f.nom : "—"; }
function libelleNature(code){ const n = nature(code); return n ? n.libelle : code; }
function libelleStatut(code){ const s = STATUTS[code]; return s ? s.libelle : code; }
function libelleRegime(code){ const r = REGIMES_CONTRACTUELS.find(x=>x.code===code); return r ? r.libelle : code; }

function normaliserTexte(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
}
function fournisseurParNom(nom){
  const n = normaliserTexte(nom);
  if (!n) return null;
  return DB.params.fournisseurs.find(f => normaliserTexte(f.nom) === n) ||
         DB.params.fournisseurs.find(f => normaliserTexte(f.nom).includes(n) || n.includes(normaliserTexte(f.nom))) || null;
}
function serviceParLibelle(lib){
  const n = normaliserTexte(lib);
  if (!n) return null;
  return DB.params.services.find(s => normaliserTexte(s.libelle) === n) ||
         DB.params.services.find(s => normaliserTexte(s.libelle).includes(n) || n.includes(normaliserTexte(s.libelle))) || null;
}
function natureParLibelle(lib){
  const n = normaliserTexte(lib);
  if (!n) return null;
  return Object.values(NATURES_CONTRAT).find(x => normaliserTexte(x.libelle) === n || x.code === lib) ||
         Object.values(NATURES_CONTRAT).find(x => normaliserTexte(x.libelle).includes(n) || n.includes(normaliserTexte(x.libelle))) || null;
}
function statutParLibelle(lib){
  const n = normaliserTexte(lib);
  if (!n) return null;
  return Object.values(STATUTS).find(x => normaliserTexte(x.libelle) === n || x.code === lib) || null;
}
function regimeParLibelle(lib){
  const n = normaliserTexte(lib);
  if (!n) return null;
  return REGIMES_CONTRACTUELS.find(x => normaliserTexte(x.libelle) === n || x.code === lib) ||
         REGIMES_CONTRACTUELS.find(x => normaliserTexte(x.libelle).includes(n) || n.includes(normaliserTexte(x.libelle))) || null;
}
function agentParNom(nom){
  const n = normaliserTexte(nom);
  if (!n) return null;
  return DB.params.agents.find(a => normaliserTexte(a.nom) === n) || null;
}

/* ---- Rôles et visibilité — droits individuels (module 'contrats',
   codes ctr.* chargés depuis acteur_droits au démarrage, voir Section 4). ---- */
function moi(){ return agent(DB.profilActif) || DB.params.agents[0]; }
function aDroit(d){ return !!D.droits[d]; }
function contratsVisibles(){
  const m = moi(); if (!m) return [];
  if (aDroit("voirTout")) return DB.contrats;
  if (aDroit("voirService")) return DB.contrats.filter(o => o.serviceId === m.serviceId || o.proprietaireId === m.id);
  return DB.contrats.filter(o => o.proprietaireId === m.id);
}
function contrat(id){ return DB.contrats.find(o => o.id === id); }

function tracer(o, action, detail){
  o.historique.push({ date:new Date().toISOString(), auteur:moi() ? moi().nom : "—", action, detail:detail||"" });
}
let __compteurIdContrat = 0;
function nouvelIdContrat(){ return "C" + Date.now() + "-" + (__compteurIdContrat++); }

function peutGererFournisseurs(){ return aDroit("enregistrer") || aDroit("parametrer"); }
let __compteurIdFournisseur = 0;
function nouvelIdFournisseur(){
  const max = DB.params.fournisseurs.reduce((m,f) => {
    const n = parseInt(String(f.id).replace(/^F/i,""),10);
    return isNaN(n) ? m : Math.max(m,n);
  }, 0);
  return "F" + String(max + 1 + (__compteurIdFournisseur++)).padStart(2,"0");
}
function validerFournisseur(nom, secteur){
  const erreurs = [];
  const n = (nom||"").trim(), s = (secteur||"").trim();
  if (!n) erreurs.push({champ:"nom", message:"Le nom du fournisseur est obligatoire."});
  if (!s) erreurs.push({champ:"secteur", message:"Le secteur d'activité est obligatoire."});
  if (n) {
    const doublon = fournisseurParNomExact(n);
    if (doublon) erreurs.push({champ:"nom", message:"Un fournisseur « " + doublon.nom + " » existe déjà dans le référentiel (" + doublon.id + ")."});
  }
  return erreurs;
}
function fournisseurParNomExact(nom){
  const n = normaliserTexte(nom);
  if (!n) return null;
  return DB.params.fournisseurs.find(f => normaliserTexte(f.nom) === n) || null;
}
function construireFournisseur(nom, secteur){
  return {id: nouvelIdFournisseur(), nom: (nom||"").trim(), secteur: (secteur||"").trim()};
}

function avecLexique(texte){
  let out = ech(texte);
  Object.keys(LEXIQUE).forEach(terme => {
    const re = new RegExp("\\b(" + terme.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + ")\\b", "i");
    if (re.test(out)) out = out.replace(re, '<span class="terme" title="' + ech(LEXIQUE[terme]) + '">$1</span>');
  });
  return out;
}

function ouvrirModale(titre, corpsHtml, piedHtml){
  document.getElementById("hoteModale").innerHTML =
    '<div class="voileModale" onclick="if(event.target===this) fermerModale()">' +
      '<div class="modale">' +
        '<div class="tete"><h3>' + ech(titre) + '</h3>' +
          '<button class="btn mini" onclick="fermerModale()">✕ Fermer</button></div>' +
        '<div class="corps">' + corpsHtml + '</div>' +
        (piedHtml ? '<div class="pied">' + piedHtml + '</div>' : '') +
      '</div>' +
    '</div>';
}
function fermerModale(){ document.getElementById("hoteModale").innerHTML = ""; }

function toast(texte, type, duree){
  const hote = document.getElementById("hoteToast");
  const id = "t" + Date.now() + Math.floor(Math.random()*1000);
  const div = document.createElement("div");
  div.className = "toast " + (type || "info");
  div.id = id;
  div.textContent = texte;
  hote.appendChild(div);
  setTimeout(() => { const el = document.getElementById(id); if (el) el.remove(); }, duree || 3500);
}

function ficheCardHtml(o){
  const badge = badgeEcheance(o);
  return '<div class="fiche bord-' + badge.couleur + '" onclick="App.aller(\'fiche\',{id:\'' + o.id + '\'})">' +
    '<div class="num">' + ech(numeroCourt(o.numero)) + ' · ' + ech(libelleNature(o.natureId)) + '</div>' +
    '<div class="obj">' + ech(o.objet) + '</div>' +
    '<div class="bas"><span class="muet">' + ech(libelleFournisseur(o.fournisseurId)) + '</span>' +
    '<span class="et ' + badge.couleur + '">' + ech(badge.texte) + '</span></div>' +
    '</div>';
}

function validerContrat(o, ignorerId){
  const erreurs = [];
  function req(champ, val, libelle){
    if (val == null || val === "") erreurs.push({champ, message: libelle + " est obligatoire."});
  }
  req("objet", o.objet, "L'objet du contrat");
  req("fournisseurId", o.fournisseurId, "Le fournisseur");
  req("natureId", o.natureId, "La nature du contrat");
  req("serviceId", o.serviceId, "Le service porteur");
  req("dateDebut", o.dateDebut, "La date de début");
  req("dateFin", o.dateFin, "La date de fin");
  req("montant", o.montant, "Le montant");
  req("regimeContractuel", o.regimeContractuel, "Le régime contractuel");
  if (o.regimeContractuel === "DEROGATION" && !(o.motifDerogation||"").trim()) {
    erreurs.push({champ:"motifDerogation", message:"Le motif de la dérogation au Code des marchés publics est obligatoire."});
  }
  if (o.dateDebut && o.dateFin && dt(o.dateFin) <= dt(o.dateDebut)) {
    erreurs.push({champ:"dateFin", message:"La date de fin doit être postérieure à la date de début."});
  }
  if (o.montant != null && o.montant !== "" && (isNaN(o.montant) || Number(o.montant) <= 0)) {
    erreurs.push({champ:"montant", message:"Le montant doit être un nombre positif."});
  }
  if (o.fournisseurId && !fournisseur(o.fournisseurId)) {
    erreurs.push({champ:"fournisseurId", message:"Fournisseur inconnu du référentiel."});
  }
  if (o.fournisseurId && o.objet && o.dateDebut && o.dateFin) {
    const objetNorm = o.objet.trim().toLowerCase();
    const doublon = DB.contrats.find(c =>
      c.id !== ignorerId &&
      c.fournisseurId === o.fournisseurId &&
      c.objet.trim().toLowerCase() === objetNorm &&
      !estClos(c) &&
      dt(c.dateDebut) <= dt(o.dateFin) && dt(c.dateFin) >= dt(o.dateDebut)
    );
    if (doublon) {
      erreurs.push({champ:"objet", message:"Doublon probable : un contrat actif (" + numeroCourt(doublon.numero) + ") existe déjà pour ce fournisseur, cet objet et une période qui se chevauche."});
    }
  }
  return erreurs;
}

/* ============================================================
   SECTION 6 — Moteur métier
   ============================================================ */
function escaladeNiveau(o){
  if (etatEcheance(o) !== "retard") return 0;
  const retardJours = -joursRestantsPreavis(o);
  if (retardJours >= DB.params.seuils.joursAvantEscaladeN2) return 2;
  if (retardJours >= DB.params.seuils.joursAvantEscaladeN1) return 1;
  return 0;
}
function cumulAvenantsPct(o){
  const sommeDeltas = (o.avenants||[]).reduce((s,a) => s + (a.montantDelta||0), 0);
  const montantInitial = (Number(o.montant)||0) - sommeDeltas;
  if (!montantInitial) return null;
  return Math.round((sommeDeltas / montantInitial) * 1000) / 10;
}
/* Destinataires institutionnels — réglés en Paramétrage (contrats_parametres.
   directeur_id / cjf_id, contrats_services.chef_id) : les droits étant
   désormais individuels, on ne peut plus les déduire d'un rôle fixe. */
function trouverChefService(serviceId){
  const s = service(serviceId);
  if (s && s.chefId) { const a = agent(s.chefId); if (a) return a; }
  return trouverDirecteur();
}
function trouverDirecteur(){ return DB.params.directeurId ? agent(DB.params.directeurId) : null; }
function trouverCJF(){ return DB.params.cjfId ? agent(DB.params.cjfId) : null; }

function destinataireAlerte(o){
  const niveau = escaladeNiveau(o);
  if (niveau === 2) return trouverDirecteur();
  if (niveau === 1) return trouverChefService(o.serviceId) || trouverDirecteur();
  return agent(o.proprietaireId);
}
function declencherDemandeAvis(o, clause, cause){
  if (!o.demandesAvis) o.demandesAvis = [];
  const dejaOuverte = o.demandesAvis.find(d => d.clauseId === clause.id && d.statut === "OUVERTE");
  if (dejaOuverte) return dejaOuverte;
  const cjf = trouverCJF();
  const demande = {
    id: "AV" + Date.now() + Math.floor(Math.random()*1000),
    date: new Date().toISOString(),
    clauseId: clause.id,
    clauseLibelle: clause.libelle,
    cause: cause || "Clause passée au rouge : " + clause.libelle,
    destinataireId: cjf ? cjf.id : null,
    statut: "OUVERTE",
    reponse: "",
    dateReponse: null
  };
  o.demandesAvis.push(demande);
  tracer(o, "Avis juridique demandé", demande.cause);
  return demande;
}
function verifierClausesEtDeclencherAvis(o){
  (o.clausesSLA || []).forEach(cl => {
    if (couleurClause(cl) === "rouge") declencherDemandeAvis(o, cl);
  });
}
function calculerScoreEvaluation(scores){
  let total = 0;
  Object.keys(CRITERES_EVALUATION).forEach(k => {
    const v = Number(scores[k]);
    total += (isNaN(v) ? 0 : v) * CRITERES_EVALUATION[k].poids;
  });
  return Math.round(total * 10) / 10;
}
function evaluationsFournisseur(fournisseurId){
  return (DB.evaluations || [])
    .filter(e => e.fournisseurId === fournisseurId)
    .sort((a,b) => a.periode < b.periode ? 1 : -1);
}
function fournisseurEnEscalade(fournisseurId){
  const evals = evaluationsFournisseur(fournisseurId);
  const n = DB.params.seuils.periodesConsecutivesEscalade;
  if (evals.length < n) return false;
  return evals.slice(0, n).every(e => e.total < DB.params.seuils.scoreAlerteFournisseur);
}
function dernierScoreFournisseur(fournisseurId){
  const evals = evaluationsFournisseur(fournisseurId);
  return evals.length ? evals[0].total : null;
}

/* ============================================================
   SECTION 7 — Application : routeur, menu, compteurs
   ============================================================ */
const MENU = [
  {id:"dashboard",     lib:"Tableau de bord",       icone:"◧"},
  {id:"enregistrer",   lib:"Enregistrer un contrat",icone:"✎", droit:"enregistrer"},
  {id:"importer",      lib:"Importer un contrat/BC",icone:"⭱", droit:"enregistrer"},
  {id:"aImputer",      lib:"À imputer",             icone:"➔", droit:"imputer", pastille:"aImputer"},
  {id:"mesContrats",   lib:"Mes contrats",          icone:"☑", pastille:"mesContrats"},
  {id:"suivi",         lib:"Suivi des échéances",   icone:"▤"},
  {id:"registre",      lib:"Registre des contrats", icone:"≡"},
  {id:"fournisseurs",  lib:"Grille fournisseur",    icone:"⚑", pastille:"fournisseurs"},
  {id:"alertes",       lib:"Alertes & relances",    icone:"⚠", pastille:"alertes"},
  {id:"revues",        lib:"Revues périodiques",    icone:"↻"},
  {id:"rapports",      lib:"Rapports",              icone:"▦", droit:"rapport"},
  {id:"parametrage",   lib:"Paramétrage",           icone:"⚙", droit:["parametrer","enregistrer"]},
  {id:"aide",          lib:"Mode d'emploi",         icone:"?"}
];

const Compteurs = {
  aImputer(){ return DB.contrats.filter(o => !o.proprietaireId && ["BROUILLON","EN_NEGOCIATION"].includes(o.statut)).length; },
  mesContrats(){ return moi() ? DB.contrats.filter(o => o.proprietaireId === moi().id && !estClos(o)).length : 0; },
  alertes(){
    const v = contratsVisibles();
    const echeances = v.filter(o => !estClos(o) && ["retard","proche"].includes(etatEcheance(o))).length;
    const avisOuverts = v.reduce((s,o) => s + (o.demandesAvis||[]).filter(d => d.statut==="OUVERTE").length, 0);
    return echeances + avisOuverts;
  },
  fournisseurs(){
    return [...new Set(DB.contrats.map(o=>o.fournisseurId))].filter(fid => fournisseurEnEscalade(fid)).length;
  }
};

const App = {
  vue:"dashboard",
  etat:{
    registre:{recherche:"", natureFiltre:"", statutFiltre:"", serviceFiltre:""},
    suivi:{}, rapports:{periode:"moisEnCours"}, parametrage:{onglet:"delais"},
    enregistrer:{}, importer:{}, fiche:{}
  },
  aller(vue, params){
    this.vue = vue;
    if (params) this.etat[vue] = Object.assign({}, this.etat[vue]||{}, params);
    this.rendre();
    window.scrollTo(0,0);
  },
  rendre(){
    const item = MENU.find(m => m.id === this.vue);
    let titre = item ? item.lib : "";
    if (this.vue === "fiche") {
      const o = contrat((this.etat.fiche||{}).id);
      titre = o ? ("Contrat " + numeroCourt(o.numero) + " — " + o.objet) : "Fiche contrat";
    }
    document.getElementById("titrePage").textContent = titre;
    const vueDef = VUES[this.vue];
    let html;
    try {
      html = vueDef ? vueDef.rendre(this.etat[this.vue]||{}) : "<p>Écran introuvable.</p>";
    } catch(e){
      console.error(e);
      html = '<div class="msgErreur"><b>Erreur d\'affichage :</b> ' + ech(e.message) + '</div>';
    }
    document.getElementById("contenu").innerHTML = html;
    construireMenu();
    if (vueDef && typeof vueDef.apresRendu === "function") {
      try { vueDef.apresRendu(this.etat[this.vue]||{}); } catch(e){ console.error(e); }
    }
  },
  demarrer(){
    construireMenu();
    this.aller(this.vue);
  }
};

function verifDroitMenu(m){
  if (!m.droit) return true;
  return Array.isArray(m.droit) ? m.droit.some(d => aDroit(d)) : aDroit(m.droit);
}
function construireMenu(){
  const html = MENU.filter(verifDroitMenu).map(m => {
    const cpt = m.pastille ? Compteurs[m.pastille]() : 0;
    const pastilleHtml = cpt > 0 ? '<span class="pastille' + (m.pastille==="aImputer"?"":" orange") + '">' + cpt + '</span>' : '';
    return '<li><a class="' + (App.vue===m.id?"actif":"") + '" onclick="App.aller(\'' + m.id + '\')">' +
      '<span class="lib">' + m.icone + ' ' + ech(m.lib) + '</span>' + pastilleHtml + '</a></li>';
  }).join("");
  const menuEl = document.getElementById("menu");
  if (menuEl) menuEl.innerHTML = html;
}

/* ============================================================
   SECTION 8 — Statistiques
   ============================================================ */
const Stats = {
  synthese(lot){
    const nonClos = lot.filter(o => !estClos(o));
    const clos = lot.filter(o => o.statut === "CLOS");
    const abandonnes = lot.filter(o => o.statut === "ABANDONNE");
    const enRetard = nonClos.filter(o => etatEcheance(o) === "retard");
    const enPreavis = nonClos.filter(o => etatEcheance(o) === "proche");
    const nonAffectes = lot.filter(o => !o.proprietaireId && ["BROUILLON","EN_NEGOCIATION"].includes(o.statut));

    const closAvecDates = clos.filter(o => o.dateCloture && o.dateFin);
    const closDansDelai = closAvecDates.filter(o => dt(o.dateCloture) <= dt(o.dateFin));
    const tauxRespect = closAvecDates.length ? Math.round(closDansDelai.length/closAvecDates.length*1000)/10 : null;

    const portefeuilleActif = lot.filter(o => estActif(o));
    const montantPortefeuille = portefeuilleActif.reduce((s,o) => s + (Number(o.montant)||0), 0);

    const fournisseursConcernes = [...new Set(lot.map(o => o.fournisseurId))];
    const scoresRecents = fournisseursConcernes.map(f => dernierScoreFournisseur(f)).filter(s => s != null);
    const scoreMoyenFournisseurs = scoresRecents.length ? Math.round(scoresRecents.reduce((a,b)=>a+b,0)/scoresRecents.length*10)/10 : null;

    const avisOuverts = lot.reduce((s,o) => s + (o.demandesAvis||[]).filter(d=>d.statut==="OUVERTE").length, 0);

    return {
      total:lot.length, actifs:portefeuilleActif.length, clos:clos.length, abandonnes:abandonnes.length,
      enRetard:enRetard.length, enPreavis:enPreavis.length, nonAffectes:nonAffectes.length,
      tauxRespect, montantPortefeuille, scoreMoyenFournisseurs, avisOuverts,
      listeRetard: enRetard.sort((a,b) => joursRestantsPreavis(a) - joursRestantsPreavis(b))
    };
  },
  repartition(lot, cle, libelleFn){
    const carte = {};
    lot.forEach(o => { const k = o[cle] || "—"; carte[k] = (carte[k]||0) + 1; });
    return Object.keys(carte).map(k => [libelleFn ? libelleFn(k) : k, carte[k]]).sort((a,b) => b[1]-a[1]);
  },
  performanceParNature(lot){
    return Object.keys(NATURES_CONTRAT).map(code => {
      const sousLot = lot.filter(o => o.natureId === code);
      const s = Stats.synthese(sousLot);
      return {nature:libelleNature(code), total:sousLot.length, retard:s.enRetard, taux:s.tauxRespect};
    }).filter(l => l.total > 0);
  },
  /* Charge de travail par propriétaire réel de contrat — remplace le filtre
     par rôle fixe ACHETEUR/CHEF_MARCHES de la version locale (les droits
     sont désormais individuels, sans étiquette de rôle figée). */
  chargeParAgent(lot){
    const ids = [...new Set(lot.filter(o => o.proprietaireId && !estClos(o)).map(o => o.proprietaireId))];
    return ids.map(id => {
      const siens = lot.filter(o => o.proprietaireId === id && !estClos(o));
      return {agent:libelleAgent(id), total:siens.length, retard:siens.filter(o=>etatEcheance(o)==="retard").length, surcharge: siens.length > DB.params.seuils.wipMaxParAgent};
    }).sort((a,b) => b.total - a.total);
  }
};

function barresHtml(paires, couleurFn){
  if (!paires.length) return '<p class="muet">Aucune donnée sur la période.</p>';
  const max = Math.max.apply(null, paires.map(p => p[1])) || 1;
  return paires.map(p =>
    '<div class="barreG"><div class="lb">' + ech(p[0]) + '</div>' +
    '<div class="zn"><i class="' + (couleurFn ? couleurFn(p) : "") + '" style="width:' + Math.max(2, p[1]/max*100) + '%"></i></div>' +
    '<div class="vl">' + p[1] + "</div></div>").join("");
}

/* ============================================================
   SECTION 9/10 — Vue : Tableau de bord
   ============================================================ */
const VueTableau = {
  rendre(){
    const lot = contratsVisibles();
    const s = Stats.synthese(lot);
    const parNature = Stats.repartition(lot.filter(o=>!estClos(o)), "natureId", libelleNature);
    const perf = Stats.performanceParNature(lot);
    const charge = Stats.chargeParAgent(lot);
    const fournisseursDifficulte = [...new Set(lot.map(o=>o.fournisseurId))].filter(fournisseurEnEscalade);

    return '' +
    '<div class="grille g5">' +
      kpi(s.actifs, "Contrats actifs", "vert") +
      kpi(s.enRetard, "Préavis dépassé", s.enRetard>0?"rouge":"vert") +
      kpi(s.enPreavis, "Échéance proche (≤30j)", s.enPreavis>0?"orange":"vert") +
      kpi(s.nonAffectes, "Non affectés", s.nonAffectes>0?"orange":"vert") +
      kpi(s.avisOuverts, "Avis juridiques ouverts", s.avisOuverts>0?"rouge":"vert") +
    '</div>' +
    '<div class="grille g3">' +
      kpi(formaterMontant(s.montantPortefeuille), "Montant du portefeuille actif", "bleu") +
      kpi(s.tauxRespect==null?"—":s.tauxRespect+" %", "Taux de clôture dans les délais", "bleu") +
      kpi(s.scoreMoyenFournisseurs==null?"—":s.scoreMoyenFournisseurs+" / 100", "Score fournisseur moyen", "bleu") +
    '</div>' +

    '<div class="grille g2">' +
      '<div class="carte"><div class="tete"><h3>Portefeuille par nature de contrat</h3></div>' +
        '<div class="corps">' + barresHtml(parNature) + '</div></div>' +

      '<div class="carte"><div class="tete"><h3>Fournisseurs en difficulté</h3>' +
        '<a class="btn mini" onclick="App.aller(\'fournisseurs\')">Voir la grille</a></div>' +
        '<div class="corps">' +
        (fournisseursDifficulte.length ?
          '<table><tbody>' + fournisseursDifficulte.map(fid =>
            '<tr><td>' + ech(libelleFournisseur(fid)) + '</td>' +
            '<td class="num">' + dernierScoreFournisseur(fid) + ' / 100</td>' +
            '<td><span class="et rouge">2 périodes sous seuil</span></td></tr>').join("") + '</tbody></table>'
          : '<p class="muet">Aucun fournisseur en dessous du seuil sur deux périodes consécutives.</p>') +
        '</div></div>' +
    '</div>' +

    '<div class="carte"><div class="tete"><h3>Performance par nature de contrat</h3></div>' +
      '<div class="corps tableauScroll"><table><thead><tr><th>Nature</th><th class="num">Contrats</th><th class="num">En retard de préavis</th><th class="num">Taux de clôture dans les délais</th></tr></thead><tbody>' +
      perf.map(p => '<tr><td>' + ech(p.nature) + '</td><td class="num">' + p.total + '</td>' +
        '<td class="num">' + (p.retard>0?'<span class="et rouge">'+p.retard+'</span>':'0') + '</td>' +
        '<td class="num">' + (p.taux==null?"—":p.taux+" %") + '</td></tr>').join("") +
      '</tbody></table></div></div>' +

    '<div class="carte"><div class="tete"><h3>Charge par acheteur</h3></div>' +
      '<div class="corps tableauScroll"><table><thead><tr><th>Acheteur</th><th class="num">Contrats en cours</th><th class="num">Dont en retard</th><th>Charge</th></tr></thead><tbody>' +
      charge.map(c => '<tr><td>' + ech(c.agent) + '</td><td class="num">' + c.total + '</td>' +
        '<td class="num">' + c.retard + '</td>' +
        '<td>' + (c.surcharge ? '<span class="et orange">Surcharge (>' + DB.params.seuils.wipMaxParAgent + ')</span>' : '<span class="et vert">Normale</span>') + '</td></tr>').join("") +
      '</tbody></table></div></div>' +

    (s.enRetard>0 ? '<div class="carte"><div class="tete"><h3>Contrats en retard de préavis — les plus urgents</h3>' +
      '<a class="btn mini alerte" onclick="App.aller(\'alertes\')">Ouvrir le centre d\'alertes</a></div>' +
      '<div class="corps tableauScroll">' + tableauContrats(s.listeRetard.slice(0,8)) + '</div></div>' : '');
  }
};

function kpi(valeur, libelle, couleur){
  return '<div class="kpi ' + couleur + '"><div class="valeur">' + valeur + '</div><div class="libelle">' + ech(libelle) + '</div></div>';
}

/* Tableau réutilisable de contrats (registre, alertes, mes contrats...) */
function tableauContrats(lot, options){
  options = options || {};
  if (!lot.length) return '<p class="muet">Aucun contrat à afficher.</p>';
  return '<table><thead><tr><th>N°</th><th>Objet</th><th>Fournisseur</th><th>Nature</th><th>Statut</th><th>Échéance préavis</th><th class="num">Montant</th><th>Propriétaire</th></tr></thead><tbody>' +
    lot.map(o => {
      const badge = badgeEcheance(o);
      const st = STATUTS[o.statut];
      return '<tr style="cursor:pointer" onclick="App.aller(\'fiche\',{id:\'' + o.id + '\'})">' +
        '<td>' + ech(numeroCourt(o.numero)) + '</td>' +
        '<td>' + ech(o.objet) + '</td>' +
        '<td>' + ech(libelleFournisseur(o.fournisseurId)) + '</td>' +
        '<td>' + ech(libelleNature(o.natureId)) + '</td>' +
        '<td><span class="et ' + st.couleur + '">' + ech(st.libelle) + '</span></td>' +
        '<td><span class="et ' + badge.couleur + '">' + ech(badge.texte) + '</span></td>' +
        '<td class="num">' + formaterMontant(o.montant) + '</td>' +
        '<td>' + (o.proprietaireId ? ech(libelleAgent(o.proprietaireId)) : '<span class="muet">Non affecté</span>') + '</td>' +
        '</tr>';
    }).join("") + '</tbody></table>';
}

/* ============================================================
   SECTION 11 — Vue : Enregistrer un contrat
   ============================================================ */
const VueEnregistrer = {
  rendre(etat){
    const v = etat.valeurs || {};
    const erreurs = etat.erreurs || [];
    const champErreur = (champ) => erreurs.find(e => e.champ === champ);
    const val = (champ, def) => v[champ] != null ? v[champ] : (def||"");

    return '' +
    (erreurs.length ? '<div class="msgErreur"><b>' + erreurs.length + ' champ(s) à corriger :</b><ul style="margin:6px 0 0 18px">' +
      erreurs.map(e => '<li>' + ech(e.message) + '</li>').join("") + '</ul></div>' : '') +

    '<div class="carte"><div class="tete"><h2>✎ Enregistrer un contrat fournisseur</h2></div><div class="corps">' +
    '<form id="formEnregistrer" onsubmit="return soumettreEnregistrement(event)">' +

    '<fieldset><legend>Identification</legend>' +
    '<div class="grille g2">' +
      champTexte("objet","Objet du contrat", val("objet"), champErreur("objet"), true) +
      champSelect("fournisseurId","Fournisseur", DB.params.fournisseurs.map(f=>[f.id,f.nom+" — "+f.secteur]), val("fournisseurId"), champErreur("fournisseurId"), true) +
    '</div>' +
    '<div class="grille g3">' +
      champSelect("natureId","Nature du contrat", Object.values(NATURES_CONTRAT).map(n=>[n.code,n.libelle]), val("natureId"), champErreur("natureId"), true, 'apercuEcheanceFormulaire()') +
      champSelect("serviceId","Service porteur", DB.params.services.map(s=>[s.id,s.libelle]), val("serviceId"), champErreur("serviceId"), true) +
      champSelect("criticite","Criticité", Object.values(CRITICITES).map(c=>[c.code,c.libelle]), val("criticite","NORMALE"), null, false) +
    '</div>' +
    '<div class="grille g2">' +
      champSelect("proprietaireId","Acheteur responsable", [["","— À affecter plus tard —"]].concat(DB.params.agents.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr")).map(a=>[a.id,a.nom])), val("proprietaireId"), champErreur("proprietaireId"), true) +
      champSelect("modePaiement","Mode de paiement", [["Virement à 30 jours","Virement à 30 jours"],["Virement à 45 jours","Virement à 45 jours"],["Paiement à réception facture","Paiement à réception facture"]], val("modePaiement"), null, false) +
    '</div></fieldset>' +

    '<fieldset><legend>Cadre réglementaire</legend>' +
    '<p class="msgInfo">L\'ANADER est assujettie au Code des marchés publics pour la quasi-totalité de ses marchés, sauf dérogation motivée. Repères indicatifs (à vérifier avec la Cellule Juridique et Fiscale) : cumul des avenants ≤ ' + REFERENTIEL_MARCHES_PUBLICS.cumulAvenantsMaxPct + ' % du montant initial, garantie de bonne exécution ' + REFERENTIEL_MARCHES_PUBLICS.garantieBonneExecutionMinPct + '–' + REFERENTIEL_MARCHES_PUBLICS.garantieBonneExecutionMaxPct + ' %, cumul des pénalités : seuil de résiliation à ' + REFERENTIEL_MARCHES_PUBLICS.cumulPenalitesSeuilResiliationPct + ' %, délai de paiement plafonné à ' + REFERENTIEL_MARCHES_PUBLICS.delaiPaiementMaxJours + ' jours. Ces valeurs ne bloquent aucune saisie : vous restez libre d\'indiquer la situation réelle du contrat.</p>' +
    '<div class="grille g2">' +
      champSelect("regimeContractuel","Régime contractuel", REGIMES_CONTRACTUELS.map(r=>[r.code,r.libelle]), val("regimeContractuel","MARCHE_PUBLIC"), champErreur("regimeContractuel"), true, 'basculerMotifDerogation()') +
      champTexte("referenceDocumentOrigine","Référence document d\'origine (optionnel)", val("referenceDocumentOrigine"), null, false) +
    '</div>' +
    '<div id="fEnr_blocMotif" style="display:' + (val("regimeContractuel","MARCHE_PUBLIC")==="DEROGATION"?"block":"none") + '">' +
      '<div class="champ' + (champErreur("motifDerogation")?" erreur":"") + '"><label>Motif de la dérogation <span class="oblig">*</span></label>' +
        '<textarea id="fEnr_motifDerogation" name="motifDerogation" rows="2">' + ech(val("motifDerogation")) + '</textarea>' +
        (champErreur("motifDerogation") ? '<div class="erreurChamp">' + ech(champErreur("motifDerogation").message) + '</div>' : '') +
      '</div></div>' +
    '</fieldset>' +

    '<fieldset><legend>Durée et montant</legend>' +
    '<div class="grille g3">' +
      champInput("dateDebut","Date de début","date", val("dateDebut"), champErreur("dateDebut"), true, 'apercuEcheanceFormulaire()') +
      champInput("dateFin","Date de fin","date", val("dateFin"), champErreur("dateFin"), true, 'apercuEcheanceFormulaire()') +
      champInput("montant","Montant (F CFA)","number", val("montant"), champErreur("montant"), true) +
    '</div>' +
    '<div class="champ"><label>Échéance de préavis calculée</label>' +
      '<div class="lexiquePop" id="fEnr_apercu">Choisissez la nature et la date de fin pour voir le préavis calculé.</div>' +
      '<div class="aide">Le préavis par défaut dépend de la nature du contrat (paramétrable dans <i>Paramétrage → Délais</i>).</div>' +
    '</div></fieldset>' +

    '<fieldset><legend>Statut au moment de l\'enregistrement</legend>' +
    '<div class="grille g2">' +
    champSelect("statut","Statut initial", [["BROUILLON","Brouillon"],["EN_NEGOCIATION","En négociation"],["EN_SIGNATURE","En signature"],["ACTIF","Actif (déjà signé)"]], val("statut","BROUILLON"), null, false) +
    champSelect("etapeAdministrative","Étape administrative détaillée (information, optionnel)", [["","— Non renseignée —"]].concat(ETAPES_ADMINISTRATIVES.map(e=>[e,e])), val("etapeAdministrative"), null, false) +
    '</div>' +
    '</fieldset>' +

    '<div class="barreActions">' +
      '<button type="submit" class="btn primaire">Enregistrer le contrat</button>' +
      '<button type="button" class="btn" onclick="App.aller(\'dashboard\')">Annuler</button>' +
    '</div>' +
    '</form></div></div>';
  },

  apresRendu(){ apercuEcheanceFormulaire(); basculerMotifDerogation(); }
};

function basculerMotifDerogation(idPrefixe){
  const p = idPrefixe || "fEnr_";
  const sel = document.getElementById(p+"regimeContractuel");
  const bloc = document.getElementById(p+"blocMotif");
  if (!sel || !bloc) return;
  bloc.style.display = sel.value === "DEROGATION" ? "block" : "none";
}

function champTexte(id, label, valeur, erreur, oblig){
  return '<div class="champ' + (erreur?" erreur":"") + '"><label>' + ech(label) + (oblig?' <span class="oblig">*</span>':'') + '</label>' +
    '<input id="fEnr_'+id+'" name="'+id+'" type="text" value="' + ech(valeur) + '">' +
    (erreur ? '<div class="erreurChamp">' + ech(erreur.message) + '</div>' : '') + '</div>';
}
function champInput(id, label, type, valeur, erreur, oblig, oninput){
  return '<div class="champ' + (erreur?" erreur":"") + '"><label>' + ech(label) + (oblig?' <span class="oblig">*</span>':'') + '</label>' +
    '<input id="fEnr_'+id+'" name="'+id+'" type="'+type+'" value="' + ech(valeur) + '"' + (oninput?' oninput="'+oninput+'"':'') + '>' +
    (erreur ? '<div class="erreurChamp">' + ech(erreur.message) + '</div>' : '') + '</div>';
}
function champSelect(id, label, paires, valeurSel, erreur, oblig, oninput){
  return '<div class="champ' + (erreur?" erreur":"") + '"><label>' + ech(label) + (oblig?' <span class="oblig">*</span>':'') + '</label>' +
    '<select id="fEnr_'+id+'" name="'+id+'"' + (oninput?' oninput="'+oninput+'"':'') + '>' +
    (oblig ? '<option value="">— Choisir —</option>' : '') +
    paires.map(p => '<option value="'+ech(p[0])+'"'+(String(p[0])===String(valeurSel)?" selected":"")+'>'+ech(p[1])+'</option>').join("") +
    '</select>' + (erreur ? '<div class="erreurChamp">' + ech(erreur.message) + '</div>' : '') + '</div>';
}

function apercuEcheanceFormulaire(){
  const elN = document.getElementById("fEnr_natureId"), elF = document.getElementById("fEnr_dateFin"), cible = document.getElementById("fEnr_apercu");
  if (!elN || !elF || !cible) return;
  const natureId = elN.value, dateFin = elF.value;
  if (!natureId || !dateFin) { cible.innerHTML = "Choisissez la nature et la date de fin pour voir le préavis calculé."; return; }
  const preavis = preavisEffectif(natureId);
  const lim = soustraireOuvres(dateFin, preavis);
  const ecart = ecartOuvres(auj(), lim);
  cible.innerHTML = "Préavis : <b>" + preavis + " jours ouvrés</b> avant le " + formaterDate(dateFin) +
    " → date limite pour notifier le fournisseur : <b>" + formaterDate(lim) + "</b> (" +
    (ecart >= 0 ? "dans " + ecart + " j ouvrés" : "<span style='color:var(--rouge)'>dépassée depuis " + Math.abs(ecart) + " j ouvrés</span>") + ").";
}

function lireFormulaireEnregistrement(){
  const g = (id) => { const el = document.getElementById("fEnr_"+id); return el ? el.value : ""; };
  return {
    objet:g("objet").trim(), fournisseurId:g("fournisseurId"), natureId:g("natureId"),
    serviceId:g("serviceId"), criticite:g("criticite")||"NORMALE", proprietaireId:g("proprietaireId")||null,
    modePaiement:g("modePaiement"), dateDebut:g("dateDebut"), dateFin:g("dateFin"),
    montant: g("montant")===""?"":Number(g("montant")), statut:g("statut")||"BROUILLON",
    regimeContractuel:g("regimeContractuel")||"MARCHE_PUBLIC", motifDerogation:g("motifDerogation").trim(),
    etapeAdministrative:g("etapeAdministrative")||"", referenceDocumentOrigine:g("referenceDocumentOrigine").trim()
  };
}

/* ---- Construction du contrat — mutualisée entre la saisie manuelle,
   l'extraction automatique et l'import CSV (section 11b), afin que les
   trois voies produisent exactement le même schéma. ---- */
function construireContrat(valeurs){
  const regime = valeurs.regimeContractuel || "MARCHE_PUBLIC";
  return {
    id:nouvelIdContrat(), numero:numeroter(),
    objet:valeurs.objet, fournisseurId:valeurs.fournisseurId, natureId:valeurs.natureId,
    serviceId:valeurs.serviceId, proprietaireId:valeurs.proprietaireId||null, criticite:valeurs.criticite||"NORMALE",
    regimeContractuel:regime, motifDerogation: regime==="DEROGATION" ? (valeurs.motifDerogation||"") : "",
    etapeAdministrative:valeurs.etapeAdministrative||"", referenceDocumentOrigine:valeurs.referenceDocumentOrigine||"",
    dateEnregistrement:auj(), dateSignature: valeurs.statut==="ACTIF" ? valeurs.dateDebut : null,
    dateDebut:valeurs.dateDebut, dateFin:valeurs.dateFin, dateCloture:null,
    montant:valeurs.montant, devise:"XOF", modePaiement:valeurs.modePaiement||"Virement à 30 jours",
    statut:valeurs.statut||"BROUILLON", motifCloture:null, motifAbandon:null,
    clausesSLA:[], avenants:[], revues:[], demandesAvis:[], pieces:[],
    historique:[]
  };
}
function finaliserAjoutContrat(o, origine){
  tracer(o, "Enregistrement du contrat", "Statut initial : " + libelleStatut(o.statut) + (origine ? " — " + origine : ""));
  DB.contrats.push(o);
  sauver();
}

function soumettreEnregistrement(evt){
  evt.preventDefault();
  const valeurs = lireFormulaireEnregistrement();
  const erreurs = validerContrat(valeurs);
  if (erreurs.length) {
    App.etat.enregistrer = {valeurs, erreurs};
    App.rendre();
    toast("Corrigez les champs signalés avant d'enregistrer.", "err");
    return false;
  }
  const o = construireContrat(valeurs);
  finaliserAjoutContrat(o, "Saisie manuelle");
  App.etat.enregistrer = {};
  toast("Contrat " + numeroCourt(o.numero) + " enregistré.", "ok");
  App.aller("fiche", {id:o.id});
  return false;
}

/* ============================================================
   SECTION 11b — Vue : Importer un contrat ou bon de commande
   ============================================================ */
const VueImporter = {
  rendre(etat){
    const onglet = etat.onglet || "texte";
    return '<div class="onglets noPrint">' +
      '<a class="'+(onglet==="texte"?"actif":"")+'" onclick="App.aller(\'importer\',{onglet:\'texte\'})">🔎 Extraction depuis un document</a>' +
      '<a class="'+(onglet==="csv"?"actif":"")+'" onclick="App.aller(\'importer\',{onglet:\'csv\'})">⭱ Import en masse (CSV)</a>' +
    '</div>' +
    (onglet === "csv" ? rendreImportCSV(etat) : rendreExtractionTexte(etat));
  },
  apresRendu(etat){
    if ((etat.onglet||"texte") === "texte" && etat.valeurs) basculerMotifDerogation();
  }
};

function rendreExtractionTexte(etat){
  if (!etat.valeurs) {
    return '<div class="carte"><div class="tete"><h2>🔎 Extraction automatique depuis un document</h2></div><div class="corps">' +
      '<p class="msgInfo">Ouvrez le contrat ou le bon de commande d\'origine (Word, PDF, e-mail…), copiez son texte, puis collez-le ci-dessous. Le module reconnaît automatiquement le fournisseur, les dates, le montant, la nature du contrat, etc. et pré-remplit le formulaire — vous vérifiez et complétez avant d\'enregistrer.</p>' +
      '<p class="aide">Limite assumée : un document scanné en image (sans texte sélectionnable) ne peut pas être lu automatiquement. Passez alors par la saisie manuelle ou le gabarit CSV.</p>' +
      '<div class="champ"><label>Texte du contrat / bon de commande</label>' +
        '<textarea id="imp_texte" rows="12" placeholder="Collez ici le texte du document…">' + ech(etat.brut||"") + '</textarea></div>' +
      '<div class="barreActions"><button class="btn primaire" onclick="analyserImportTexte()">🔎 Analyser le texte</button></div>' +
    '</div></div>';
  }

  const v = etat.valeurs, det = etat.detectes || {}, erreurs = etat.erreurs || [];
  const champErreur = (champ) => erreurs.find(e => e.champ === champ);
  const val = (champ, def) => v[champ] != null ? v[champ] : (def||"");
  const marque = (champ, lib) => (det[champ] ? "🔎 " : "") + lib;

  return '' +
  (erreurs.length ? '<div class="msgErreur"><b>' + erreurs.length + ' champ(s) à corriger :</b><ul style="margin:6px 0 0 18px">' +
    erreurs.map(e => '<li>' + ech(e.message) + '</li>').join("") + '</ul></div>' : '') +
  '<p class="msgOk">Extraction effectuée. Les champs marqués 🔎 ont été détectés automatiquement dans le texte collé : vérifiez-les avant d\'enregistrer. Les autres champs sont à compléter.</p>' +

  '<div class="carte"><div class="tete"><h2>Contrat détecté — à vérifier</h2></div><div class="corps">' +
  '<form id="formImportTexte" onsubmit="return soumettreImportTexte(event)">' +

  '<fieldset><legend>Identification</legend><div class="grille g2">' +
    champTexte("objet", marque("objet","Objet du contrat"), val("objet"), champErreur("objet"), true) +
    champSelect("fournisseurId", marque("fournisseurId","Fournisseur"), DB.params.fournisseurs.map(f=>[f.id,f.nom+" — "+f.secteur]), val("fournisseurId"), champErreur("fournisseurId"), true) +
  '</div><div class="grille g3">' +
    champSelect("natureId", marque("natureId","Nature du contrat"), Object.values(NATURES_CONTRAT).map(n=>[n.code,n.libelle]), val("natureId"), champErreur("natureId"), true) +
    champSelect("serviceId","Service porteur", DB.params.services.map(s=>[s.id,s.libelle]), val("serviceId"), champErreur("serviceId"), true) +
    champSelect("criticite","Criticité", Object.values(CRITICITES).map(c=>[c.code,c.libelle]), val("criticite","NORMALE"), null, false) +
  '</div><div class="grille g2">' +
    champSelect("proprietaireId","Acheteur responsable", [["","— À affecter plus tard —"]].concat(DB.params.agents.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr")).map(a=>[a.id,a.nom])), val("proprietaireId"), champErreur("proprietaireId"), true) +
    champSelect("modePaiement","Mode de paiement", [["Virement à 30 jours","Virement à 30 jours"],["Virement à 45 jours","Virement à 45 jours"],["Paiement à réception facture","Paiement à réception facture"]], val("modePaiement"), null, false) +
  '</div></fieldset>' +

  '<fieldset><legend>Cadre réglementaire</legend>' +
  '<p class="aide">Repères Code des marchés publics (rappel, non bloquant) : cumul avenants ≤ ' + REFERENTIEL_MARCHES_PUBLICS.cumulAvenantsMaxPct + ' %, garantie de bonne exécution ' + REFERENTIEL_MARCHES_PUBLICS.garantieBonneExecutionMinPct + '–' + REFERENTIEL_MARCHES_PUBLICS.garantieBonneExecutionMaxPct + ' %, délai de paiement ≤ ' + REFERENTIEL_MARCHES_PUBLICS.delaiPaiementMaxJours + ' jours.</p>' +
  '<div class="grille g2">' +
    champSelect("regimeContractuel", marque("regimeContractuel","Régime contractuel"), REGIMES_CONTRACTUELS.map(r=>[r.code,r.libelle]), val("regimeContractuel","MARCHE_PUBLIC"), champErreur("regimeContractuel"), true, 'basculerMotifDerogation()') +
    champTexte("referenceDocumentOrigine", marque("referenceDocumentOrigine","Référence document d\'origine"), val("referenceDocumentOrigine"), null, false) +
  '</div>' +
  '<div id="fEnr_blocMotif" style="display:'+(val("regimeContractuel","MARCHE_PUBLIC")==="DEROGATION"?"block":"none")+'">' +
    '<div class="champ'+(champErreur("motifDerogation")?" erreur":"")+'"><label>Motif de la dérogation <span class="oblig">*</span></label>' +
    '<textarea id="fEnr_motifDerogation" name="motifDerogation" rows="2">'+ech(val("motifDerogation"))+'</textarea>' +
    (champErreur("motifDerogation")?'<div class="erreurChamp">'+ech(champErreur("motifDerogation").message)+'</div>':'') + '</div></div>' +
  '</fieldset>' +

  '<fieldset><legend>Durée et montant</legend><div class="grille g3">' +
    champInput("dateDebut", marque("dateDebut","Date de début"), "date", val("dateDebut"), champErreur("dateDebut"), true) +
    champInput("dateFin", marque("dateFin","Date de fin"), "date", val("dateFin"), champErreur("dateFin"), true) +
    champInput("montant", marque("montant","Montant (F CFA)"), "number", val("montant"), champErreur("montant"), true) +
  '</div></fieldset>' +

  '<fieldset><legend>Statut</legend><div class="grille g2">' +
    champSelect("statut","Statut initial", [["BROUILLON","Brouillon"],["EN_NEGOCIATION","En négociation"],["EN_SIGNATURE","En signature"],["ACTIF","Actif (déjà signé)"]], val("statut","BROUILLON"), null, false) +
    champSelect("etapeAdministrative","Étape administrative détaillée (information, optionnel)", [["","— Non renseignée —"]].concat(ETAPES_ADMINISTRATIVES.map(e=>[e,e])), val("etapeAdministrative"), null, false) +
  '</div></fieldset>' +

  '<div class="barreActions">' +
    '<button type="submit" class="btn primaire">Enregistrer le contrat</button>' +
    '<button type="button" class="btn" onclick="App.aller(\'importer\',{onglet:\'texte\',brut:\'\',valeurs:null})">Recommencer avec un autre texte</button>' +
  '</div></form></div></div>';
}

function analyserImportTexte(){
  const texte = (document.getElementById("imp_texte").value || "").trim();
  if (!texte) { toast("Collez d'abord le texte du contrat ou du bon de commande.", "err"); return; }
  const {valeurs, detectes} = extraireContratDepuisTexte(texte);
  App.aller("importer", {onglet:"texte", brut:texte, valeurs, detectes, erreurs:[]});
  toast("Analyse effectuée : vérifiez les champs marqués 🔎 avant d'enregistrer.", "info", 4500);
}

function soumettreImportTexte(evt){
  evt.preventDefault();
  const valeurs = lireFormulaireEnregistrement();
  const erreurs = validerContrat(valeurs);
  if (erreurs.length) {
    App.etat.importer = Object.assign({}, App.etat.importer, {valeurs, erreurs});
    App.rendre();
    toast("Corrigez les champs signalés avant d'enregistrer.", "err");
    return false;
  }
  const o = construireContrat(valeurs);
  finaliserAjoutContrat(o, "Extraction automatique depuis un document collé");
  App.etat.importer = {};
  toast("Contrat " + numeroCourt(o.numero) + " importé.", "ok");
  App.aller("fiche", {id:o.id});
  return false;
}

const MOTS_CLES_NATURE = {
  ACCORD_CADRE: ["accord-cadre","accord cadre","marché à bons de commande","bons de commande"],
  TRAVAUX:      ["travaux","réfection","réhabilitation","aménagement","construction"],
  MAINTENANCE:  ["maintenance","entretien"],
  ASSURANCE:    ["assurance"],
  LOCATION:     ["location","bail","loyer"],
  PRESTATION:   ["prestation","gardiennage","nettoyage","transport","logistique"],
  ABONNEMENT:   ["abonnement","téléphonie","internet","fourniture d'énergie","énergie électrique"],
  FOURNITURE:   ["fourniture de","livraison de","achat de"]
};
const MOIS_FR = {
  "janvier":1,"fevrier":2,"mars":3,"avril":4,"mai":5,"juin":6,"juillet":7,
  "aout":8,"septembre":9,"octobre":10,"novembre":11,"decembre":12
};

function extraireMontant(texte){
  let m = texte.match(/([0-9][0-9\s.,]{3,})\s*(?:F\s?CFA|FCFA|XOF)\b/i);
  if (!m) m = texte.match(/montant[^0-9]{0,20}([0-9][0-9\s.,]{3,})/i);
  if (!m) return null;
  const brut = m[1].replace(/[^\d]/g,"");
  const n = parseInt(brut,10);
  return (isNaN(n) || n<=0) ? null : n;
}
function extraireDates(texte){
  const trouvees = [];
  const reNum = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  let m;
  while ((m = reNum.exec(texte))) {
    const j = +m[1], mo = +m[2], a = +m[3];
    if (mo>=1 && mo<=12 && j>=1 && j<=31) trouvees.push({iso:a+"-"+String(mo).padStart(2,"0")+"-"+String(j).padStart(2,"0"), index:m.index});
  }
  const reTexte = /(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+(\d{4})/gi;
  while ((m = reTexte.exec(texte))) {
    const j = +m[1], mo = MOIS_FR[normaliserTexte(m[2])], a = +m[3];
    if (mo) trouvees.push({iso:a+"-"+String(mo).padStart(2,"0")+"-"+String(j).padStart(2,"0"), index:m.index});
  }
  trouvees.sort((a,b) => a.index - b.index);
  return trouvees;
}
function extraireFournisseur(texte){
  const t = normaliserTexte(texte);
  return DB.params.fournisseurs.find(f => t.includes(normaliserTexte(f.nom))) || null;
}
function extraireNature(texte){
  const t = normaliserTexte(texte);
  for (const code of Object.keys(MOTS_CLES_NATURE)) {
    if (MOTS_CLES_NATURE[code].some(mot => t.includes(normaliserTexte(mot)))) return NATURES_CONTRAT[code];
  }
  return null;
}
function extraireRegime(texte){
  const t = normaliserTexte(texte);
  if (t.includes("derogation")) return "DEROGATION";
  if (t.includes("marche public") || t.includes("code des marches publics") || t.includes("appel d'offres") || t.includes("appel doffres")) return "MARCHE_PUBLIC";
  return "";
}
function extraireReference(texte){
  const m = texte.match(/(?:bon de commande|contrat|march[ée])\s*n\s*°?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,})/i) ||
            texte.match(/r[ée]f(?:[ée]rence)?\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,})/i);
  return m ? m[1] : "";
}
function extraireObjet(texte){
  const mExplicite = texte.match(/objet\s*(?:du contrat|du march[ée])?\s*[:\-]\s*(.{5,160})/i);
  if (mExplicite) return mExplicite[1].split("\n")[0].trim();
  const lignes = texte.split("\n").map(l=>l.trim()).filter(Boolean);
  const ligne = lignes.find(l => l.length >= 8 && l.length <= 160 && !/^\d/.test(l));
  return ligne || "";
}
function extraireContratDepuisTexte(texte){
  const valeurs = {criticite:"NORMALE", statut:"BROUILLON", regimeContractuel:"", motifDerogation:"", etapeAdministrative:"", referenceDocumentOrigine:"", proprietaireId:""};
  const detectes = {};

  const f = extraireFournisseur(texte);
  if (f) { valeurs.fournisseurId = f.id; detectes.fournisseurId = true; }

  const n = extraireNature(texte);
  if (n) { valeurs.natureId = n.code; detectes.natureId = true; }

  const montant = extraireMontant(texte);
  if (montant) { valeurs.montant = montant; detectes.montant = true; }

  const dates = extraireDates(texte);
  if (dates.length >= 2) {
    const iso1 = dates[0].iso, isoN = dates[dates.length-1].iso;
    const [deb, fin] = iso1 <= isoN ? [iso1, isoN] : [isoN, iso1];
    valeurs.dateDebut = deb; valeurs.dateFin = fin;
    detectes.dateDebut = true; detectes.dateFin = true;
  } else if (dates.length === 1) {
    valeurs.dateFin = dates[0].iso; detectes.dateFin = true;
  }

  const regime = extraireRegime(texte);
  valeurs.regimeContractuel = regime || "MARCHE_PUBLIC";
  if (regime) detectes.regimeContractuel = true;

  const ref = extraireReference(texte);
  if (ref) { valeurs.referenceDocumentOrigine = ref; detectes.referenceDocumentOrigine = true; }

  const objet = extraireObjet(texte);
  if (objet) { valeurs.objet = objet; detectes.objet = true; }

  return {valeurs, detectes};
}

const ENTETES_GABARIT_CSV = [
  "Objet","Fournisseur (nom exact du référentiel)","Nature","Service porteur",
  "Régime contractuel","Motif dérogation (si régime = Dérogation)","Criticité",
  "Acheteur responsable (nom, optionnel)","Date début (AAAA-MM-JJ)","Date fin (AAAA-MM-JJ)",
  "Montant (F CFA)","Mode de paiement","Statut initial",
  "Étape administrative (optionnel)","Référence document d'origine (optionnel)"
];

function rendreImportCSV(etat){
  const lignes = etat.lignesCSV || null;
  return '<div class="carte"><div class="tete"><h2>⭱ Import en masse depuis un gabarit CSV</h2></div><div class="corps">' +
    '<p class="msgInfo">Téléchargez le gabarit conçu à partir du schéma de contrat, complétez-le (Excel, LibreOffice Calc…) avec un contrat ou bon de commande par ligne, puis importez-le. Chaque ligne est contrôlée avant intégration : rien n\'est enregistré tant que vous n\'avez pas validé l\'aperçu.</p>' +
    '<div class="barreActions">' +
      '<button class="btn" onclick="telechargerGabaritImportCSV()">⭳ Télécharger le gabarit CSV</button>' +
      '<label class="btn primaire">⭱ Choisir un fichier CSV rempli<input type="file" accept=".csv" style="display:none" onchange="chargerFichierImportCSV(this.files[0])"></label>' +
    '</div>' +
    (lignes ? rendreApercuImportCSV(lignes) : '') +
  '</div></div>';
}

function telechargerGabaritImportCSV(){
  const exemple = [
    "Maintenance des groupes électrogènes du siège", "Générale de Froid et Climatisation",
    "Maintenance / entretien technique", "Division Marchés", "Marché public", "", "Normale", "",
    "2026-09-01", "2027-08-31", "4500000", "Virement à 30 jours", "Actif", "Actif", "BC-1234/D2MG/2026"
  ];
  const lignes = [csvLigne(ENTETES_GABARIT_CSV), csvLigne(exemple)];
  telecharger("gabarit_import_contrats_" + auj() + ".csv", lignes.join("\r\n"), "text/csv");
}

function parserCSV(texte){
  const lignes = [];
  let ligneCourante = [], champCourant = "", enGuillemets = false;
  const s = texte.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  for (let i=0; i<s.length; i++){
    const c = s[i];
    if (enGuillemets) {
      if (c === '"') { if (s[i+1] === '"') { champCourant += '"'; i++; } else enGuillemets = false; }
      else champCourant += c;
    } else {
      if (c === '"') enGuillemets = true;
      else if (c === ";") { ligneCourante.push(champCourant); champCourant = ""; }
      else if (c === "\n") { ligneCourante.push(champCourant); lignes.push(ligneCourante); ligneCourante = []; champCourant = ""; }
      else champCourant += c;
    }
  }
  if (champCourant !== "" || ligneCourante.length) { ligneCourante.push(champCourant); lignes.push(ligneCourante); }
  return lignes.filter(l => l.some(c => c.trim() !== ""));
}

function construireLigneImportCSV(cols, numeroLigne){
  const g = (i) => (cols[i]||"").trim();
  const f = fournisseurParNom(g(1));
  const n = natureParLibelle(g(2));
  const s = serviceParLibelle(g(3));
  const regime = regimeParLibelle(g(4));
  const critere = Object.values(CRITICITES).find(c => normaliserTexte(c.libelle)===normaliserTexte(g(6)));
  const ag = agentParNom(g(7));
  const statutObj = statutParLibelle(g(12));
  const montantBrut = g(10).replace(/[^\d,.\-]/g,"").replace(",", ".");

  const valeurs = {
    objet: g(0),
    fournisseurId: f ? f.id : "",
    natureId: n ? n.code : "",
    serviceId: s ? s.id : "",
    regimeContractuel: regime ? regime.code : (g(4) ? "" : "MARCHE_PUBLIC"),
    motifDerogation: g(5),
    criticite: critere ? critere.code : "NORMALE",
    proprietaireId: ag ? ag.id : "",
    dateDebut: g(8), dateFin: g(9),
    montant: montantBrut === "" ? "" : Number(montantBrut),
    modePaiement: g(11) || "Virement à 30 jours",
    statut: statutObj ? statutObj.code : (g(12) ? "BROUILLON" : "BROUILLON"),
    etapeAdministrative: ETAPES_ADMINISTRATIVES.includes(g(13)) ? g(13) : "",
    referenceDocumentOrigine: g(14)
  };

  const erreursColonnes = [];
  if (g(1) && !f) erreursColonnes.push({champ:"fournisseurId", message:"Fournisseur « " + g(1) + " » introuvable dans le référentiel (Paramétrage → Référentiels)."});
  if (g(2) && !n) erreursColonnes.push({champ:"natureId", message:"Nature « " + g(2) + " » non reconnue."});
  if (g(3) && !s) erreursColonnes.push({champ:"serviceId", message:"Service « " + g(3) + " » non reconnu."});
  if (g(4) && !regime) erreursColonnes.push({champ:"regimeContractuel", message:"Régime contractuel « " + g(4) + " » non reconnu."});
  if (g(12) && !statutObj) erreursColonnes.push({champ:"statut", message:"Statut « " + g(12) + " » non reconnu — ligne traitée en Brouillon si les autres champs sont valides."});

  const erreurs = validerContrat(valeurs).concat(erreursColonnes);
  return {numeroLigne, valeurs, erreurs};
}

function chargerFichierImportCSV(file){
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const texte = String(r.result||"").replace(/^\uFEFF/, "");
    const grille = parserCSV(texte);
    if (grille.length < 2) { toast("Le fichier CSV ne contient aucune ligne de données au-delà de l'en-tête.", "err"); return; }
    const lignesDonnees = grille.slice(1);
    const lignes = lignesDonnees.map((cols, idx) => construireLigneImportCSV(cols, idx+2));
    App.aller("importer", {onglet:"csv", lignesCSV:lignes});
    toast(lignes.length + " ligne(s) lue(s) — vérifiez l'aperçu avant d'importer.", "info", 4500);
  };
  r.onerror = () => toast("Lecture du fichier impossible.", "err");
  r.readAsText(file, "utf-8");
}

function rendreApercuImportCSV(lignes){
  const valides = lignes.filter(l => l.erreurs.length === 0);
  return '<hr style="margin:16px 0;border:none;border-top:1px solid var(--gris-200)">' +
    '<h3>Aperçu (' + lignes.length + ' ligne(s), ' + valides.length + ' valide(s))</h3>' +
    '<div class="tableauScroll"><table><thead><tr><th>Ligne</th><th>Statut</th><th>Objet</th><th>Fournisseur</th><th>Nature</th><th class="num">Montant</th><th>Détail</th></tr></thead><tbody>' +
    lignes.map(l => '<tr>' +
      '<td>' + l.numeroLigne + '</td>' +
      '<td>' + (l.erreurs.length ? '<span class="et rouge">Erreur</span>' : '<span class="et vert">OK</span>') + '</td>' +
      '<td>' + ech(l.valeurs.objet||"—") + '</td>' +
      '<td>' + ech(l.valeurs.fournisseurId ? libelleFournisseur(l.valeurs.fournisseurId) : "—") + '</td>' +
      '<td>' + ech(l.valeurs.natureId ? libelleNature(l.valeurs.natureId) : "—") + '</td>' +
      '<td class="num">' + (l.valeurs.montant ? formaterMontant(l.valeurs.montant) : "—") + '</td>' +
      '<td style="font-size:12px">' + (l.erreurs.length ? l.erreurs.map(e=>ech(e.message)).join("<br>") : '<span class="muet">—</span>') + '</td>' +
    '</tr>').join("") +
    '</tbody></table></div>' +
    '<div class="barreActions" style="margin-top:10px">' +
      (valides.length ? '<button class="btn primaire" onclick="importerLotCSV()">Importer les ' + valides.length + ' contrat(s) valide(s)</button>' : '<span class="muet">Aucune ligne valide à importer.</span>') +
      '<button class="btn" onclick="App.aller(\'importer\',{onglet:\'csv\',lignesCSV:null})">Annuler cet import</button>' +
    '</div>';
}

function importerLotCSV(){
  const etat = App.etat.importer || {};
  const lignes = etat.lignesCSV || [];
  const valides = lignes.filter(l => l.erreurs.length === 0);
  if (!valides.length) { toast("Aucune ligne valide à importer.", "err"); return; }
  valides.forEach(l => {
    const o = construireContrat(l.valeurs);
    finaliserAjoutContrat(o, "Import en masse (gabarit CSV, ligne " + l.numeroLigne + ")");
  });
  toast(valides.length + " contrat(s) importé(s) avec succès.", "ok", 5000);
  App.etat.importer = {};
  App.aller("registre");
}

/* ============================================================
   SECTION 12 — Vue : Registre des contrats
   ============================================================ */
const VueRegistre = {
  rendre(etat){
    let lot = contratsVisibles();
    if (etat.recherche) {
      const q = etat.recherche.toLowerCase();
      lot = lot.filter(o => (o.objet+" "+numeroCourt(o.numero)+" "+libelleFournisseur(o.fournisseurId)).toLowerCase().includes(q));
    }
    if (etat.natureFiltre) lot = lot.filter(o => o.natureId === etat.natureFiltre);
    if (etat.statutFiltre) lot = lot.filter(o => o.statut === etat.statutFiltre);
    if (etat.serviceFiltre) lot = lot.filter(o => o.serviceId === etat.serviceFiltre);
    lot = lot.slice().sort((a,b) => (joursRestantsPreavis(a)??9999) - (joursRestantsPreavis(b)??9999));

    return '' +
    '<div class="carte compact"><div class="corps">' +
    '<div class="grille g4">' +
      '<div class="champ"><label>Recherche</label><input type="text" value="' + ech(etat.recherche||"") + '" placeholder="N°, objet, fournisseur…" oninput="App.aller(\'registre\',{recherche:this.value})"></div>' +
      '<div class="champ"><label>Nature</label><select onchange="App.aller(\'registre\',{natureFiltre:this.value})">' +
        '<option value="">Toutes</option>' + Object.values(NATURES_CONTRAT).map(n=>'<option value="'+n.code+'"'+(etat.natureFiltre===n.code?" selected":"")+'>'+ech(n.libelle)+'</option>').join("") + '</select></div>' +
      '<div class="champ"><label>Statut</label><select onchange="App.aller(\'registre\',{statutFiltre:this.value})">' +
        '<option value="">Tous</option>' + STATUTS_ORDRE.concat(["ABANDONNE"]).map(c=>'<option value="'+c+'"'+(etat.statutFiltre===c?" selected":"")+'>'+ech(STATUTS[c].libelle)+'</option>').join("") + '</select></div>' +
      '<div class="champ"><label>Service</label><select onchange="App.aller(\'registre\',{serviceFiltre:this.value})">' +
        '<option value="">Tous</option>' + DB.params.services.map(s=>'<option value="'+s.id+'"'+(etat.serviceFiltre===s.id?" selected":"")+'>'+ech(s.libelle)+'</option>').join("") + '</select></div>' +
    '</div>' +
    '<div class="barreActions">' +
      '<span class="muet">' + lot.length + ' contrat(s)</span>' +
      '<button class="btn mini" onclick="exporterRegistreCSV()">⭳ Exporter en CSV</button>' +
      '<button class="btn mini" onclick="App.aller(\'registre\',{recherche:\'\',natureFiltre:\'\',statutFiltre:\'\',serviceFiltre:\'\'})">Réinitialiser les filtres</button>' +
    '</div></div></div>' +
    '<div class="carte"><div class="corps tableauScroll">' + tableauContrats(lot) + '</div></div>';
  }
};

function exporterRegistreCSV(){
  const lot = contratsVisibles();
  const lignes = [csvLigne(["Numéro","Objet","Fournisseur","Nature","Service","Statut","Date début","Date fin","Préavis (j ouvrés)","Échéance préavis","Montant (F CFA)","Propriétaire"])];
  lot.forEach(o => {
    lignes.push(csvLigne([
      o.numero, o.objet, libelleFournisseur(o.fournisseurId), libelleNature(o.natureId), libelleService(o.serviceId),
      libelleStatut(o.statut), o.dateDebut, o.dateFin, preavisEffectif(o.natureId), dateLimitePreavis(o)||"",
      Math.round(o.montant||0), o.proprietaireId ? libelleAgent(o.proprietaireId) : "Non affecté"
    ]));
  });
  telecharger("registre_contrats_" + auj() + ".csv", lignes.join("\r\n"), "text/csv");
}

/* ============================================================
   SECTION 13 — Vue : Suivi des échéances (kanban)
   ============================================================ */
const VueSuivi = {
  rendre(){
    const lot = contratsVisibles();
    const colonnes = STATUTS_ORDRE.concat(["ABANDONNE"]);
    return '' +
    '<p class="muet">Colonnes classées par étape du cycle de vie du contrat. Les contrats en préavis dépassé ou proche remontent en tête de leur colonne.</p>' +
    '<div class="kanban">' +
    colonnes.map(code => {
      let sousLot = lot.filter(o => o.statut === code);
      sousLot = sousLot.slice().sort((a,b) => (joursRestantsPreavis(a)??9999) - (joursRestantsPreavis(b)??9999));
      return '<div class="colonne"><h4>' + ech(STATUTS[code].libelle) + ' <span class="cpt">' + sousLot.length + '</span></h4>' +
        (sousLot.length ? sousLot.map(ficheCardHtml).join("") : '<p class="muet" style="font-size:11.5px">Aucun contrat.</p>') +
        '</div>';
    }).join("") +
    '</div>';
  }
};

const VueAImputer = {
  rendre(){
    const lot = DB.contrats.filter(o => !o.proprietaireId && ["BROUILLON","EN_NEGOCIATION"].includes(o.statut));
    return '<div class="carte"><div class="tete"><h2>➔ Contrats à imputer</h2></div><div class="corps">' +
      '<p class="muet">Contrats enregistrés sans acheteur responsable. Tant qu\'un contrat n\'est pas affecté, aucune échéance n\'est surveillée pour lui.</p>' +
      (lot.length ? tableauContrats(lot) : '<p class="msgOk">Aucun contrat en attente d\'affectation.</p>') +
      '</div></div>';
  }
};

const VueMesContrats = {
  rendre(){
    const lot = DB.contrats.filter(o => o.proprietaireId === moi().id && !estClos(o))
      .slice().sort((a,b) => (joursRestantsPreavis(a)??9999) - (joursRestantsPreavis(b)??9999));
    return '<div class="carte"><div class="tete"><h2>☑ Mes contrats — ' + ech(moi().nom) + '</h2></div><div class="corps">' +
      (lot.length ? tableauContrats(lot) : '<p class="muet">Aucun contrat affecté à ce profil.</p>') +
      '</div></div>';
  }
};

/* ============================================================
   SECTION 14 — Vue : Fiche contrat
   ============================================================ */
const VueFiche = {
  rendre(etat){
    const o = contrat(etat.id);
    if (!o) return '<div class="msgErreur">Contrat introuvable.</div>';
    const onglet = etat.onglet || "vue";
    const st = STATUTS[o.statut];
    const badge = badgeEcheance(o);
    const niveau = escaladeNiveau(o);

    return '' +
    '<div class="carte compact"><div class="corps">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">' +
        '<div><h2 style="margin-bottom:2px">' + ech(o.objet) + '</h2>' +
        '<span class="muet">' + ech(o.numero) + ' · ' + ech(libelleFournisseur(o.fournisseurId)) + ' · ' + ech(libelleNature(o.natureId)) + '</span></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<span class="et ' + st.couleur + '">' + ech(st.libelle) + '</span>' +
          '<span class="et ' + badge.couleur + '">' + ech(badge.texte) + '</span>' +
          (o.criticite==="CRITIQUE" ? '<span class="et rouge">Criticité : Critique</span>' : '') +
        '</div>' +
      '</div>' +
      (niveau>0 ? '<div class="msgErreur" style="margin-top:10px">⚠ <b>Escalade niveau ' + niveau + '</b> — destinataire actuel de l\'alerte : ' + ech(destinataireAlerte(o)?destinataireAlerte(o).nom:"—") + (niveau===2?" (Directeur D2MG)":" (chef du service porteur)") + '.</div>' : '') +
      '<div class="barreActions" style="margin-top:10px">' + actionsStatut(o) + '</div>' +
    '</div></div>' +

    '<div class="onglets noPrint">' +
      onglet2("vue","Vue d\'ensemble",onglet,o.id) + onglet2("clauses","Clauses SLA ("+o.clausesSLA.length+")",onglet,o.id) +
      onglet2("avenants","Avenants ("+o.avenants.length+")",onglet,o.id) + onglet2("revues","Revues ("+o.revues.length+")",onglet,o.id) +
      onglet2("avis","Avis juridiques ("+(o.demandesAvis||[]).length+")",onglet,o.id) +
      onglet2("pieces","Pièces jointes ("+o.pieces.length+")",onglet,o.id) + onglet2("historique","Historique",onglet,o.id) +
    '</div>' +

    ({vue:ongletVue, clauses:ongletClauses, avenants:ongletAvenants, revues:ongletRevues, avis:ongletAvis, pieces:ongletPieces, historique:ongletHistorique}[onglet] || ongletVue)(o);
  }
};

function onglet2(id, lib, actuel, contratId){
  return '<a class="' + (actuel===id?"actif":"") + '" onclick="App.aller(\'fiche\',{id:\''+contratId+'\',onglet:\''+id+'\'})">' + ech(lib) + '</a>';
}

function actionsStatut(o){
  let btns = [];
  if (!o.proprietaireId && aDroit("imputer")) btns.push('<button class="btn mini primaire" onclick="ouvrirModaleImputer(\''+o.id+'\')">Affecter un acheteur</button>');
  const suivant = {BROUILLON:"EN_NEGOCIATION", EN_NEGOCIATION:"EN_SIGNATURE", EN_SIGNATURE:"ACTIF"}[o.statut];
  if (suivant && aDroit("modifier")) btns.push('<button class="btn mini" onclick="changerStatutContrat(\''+o.id+'\',\''+suivant+'\')">Faire passer à « ' + STATUTS[suivant].libelle + ' »</button>');
  if (o.statut === "ACTIF" && etatEcheance(o)!=="ok" && aDroit("modifier")) btns.push('<button class="btn mini alerte" onclick="changerStatutContrat(\''+o.id+'\',\'EN_PREAVIS\')">Marquer « En préavis »</button>');
  if ((o.statut==="ACTIF"||o.statut==="EN_PREAVIS") && aDroit("cloturer")) btns.push('<button class="btn mini" onclick="ouvrirModaleCloture(\''+o.id+'\')">Clôturer le contrat</button>');
  if ((o.statut==="BROUILLON"||o.statut==="EN_NEGOCIATION") && aDroit("modifier")) btns.push('<button class="btn mini danger" onclick="ouvrirModaleAbandon(\''+o.id+'\')">Abandonner</button>');
  if (aDroit("demanderAvis")) btns.push('<button class="btn mini alerte" onclick="ouvrirModaleDemandeAvis(\''+o.id+'\')">⚖ Demander un avis juridique</button>');
  btns.push('<button class="btn mini noPrint" onclick="window.print()">🖶 Imprimer la fiche</button>');
  return btns.join("");
}

function ongletVue(o){
  const f = fournisseur(o.fournisseurId);
  const score = dernierScoreFournisseur(o.fournisseurId);
  return '<div class="grille g2">' +
    '<div class="carte"><div class="tete"><h3>Informations générales</h3></div><div class="corps">' +
      ligneInfo("Fournisseur", ech(f?f.nom:"—") + (f?' <span class="muet">('+ech(f.secteur)+')</span>':'')) +
      ligneInfo("Nature", libelleNature(o.natureId)) +
      ligneInfo("Service porteur", libelleService(o.serviceId)) +
      ligneInfo("Acheteur responsable", o.proprietaireId ? libelleAgent(o.proprietaireId) : '<span class="muet">Non affecté</span>') +
      ligneInfo("Criticité", CRITICITES[o.criticite] ? CRITICITES[o.criticite].libelle : o.criticite) +
      ligneInfo("Mode de paiement", o.modePaiement||"—") +
      (score!=null ? ligneInfo("Score fournisseur (dernière période)", score + " / 100" + (fournisseurEnEscalade(o.fournisseurId)?' <span class="et rouge">Escalade</span>':'')) : "") +
    '</div></div>' +
    '<div class="carte"><div class="tete"><h3>Dates et montant</h3></div><div class="corps">' +
      ligneInfo("Date de début", formaterDate(o.dateDebut)) +
      ligneInfo("Date de fin", formaterDate(o.dateFin)) +
      ligneInfo("Préavis applicable", preavisEffectif(o.natureId) + " jours ouvrés") +
      ligneInfo(avecLexique("Date limite pour notifier le préavis"), formaterDate(dateLimitePreavis(o))) +
      ligneInfo("Date de signature", o.dateSignature?formaterDate(o.dateSignature):"—") +
      ligneInfo("Date de clôture", o.dateCloture?formaterDate(o.dateCloture):"—") +
      ligneInfo("Montant", formaterMontant(o.montant)) +
      ligneInfo("Cumul des avenants", cumulAvenantsAffichage(o)) +
    '</div></div></div>' +
    '<div class="grille g2">' +
    '<div class="carte"><div class="tete"><h3>Cadre réglementaire</h3></div><div class="corps">' +
      ligneInfo("Régime contractuel", regimeContractuelAffichage(o)) +
      ligneInfo("Étape administrative détaillée (information)", etapeAdministrativeSelect(o)) +
      (o.referenceDocumentOrigine ? ligneInfo("Référence document d\'origine", ech(o.referenceDocumentOrigine)) : "") +
    '</div></div>' +
    '<div class="carte"><div class="tete"><h3>Repères réglementaires (rappel, non bloquant)</h3></div><div class="corps" style="font-size:12.5px">' +
      '<p class="muet">Code des marchés publics — à faire vérifier par la Cellule Juridique et Fiscale avant tout déploiement.</p>' +
      '<ul style="margin:6px 0 0 18px;padding:0">' +
        '<li>Cumul des avenants : repère ' + REFERENTIEL_MARCHES_PUBLICS.cumulAvenantsMaxPct + ' % max du montant initial</li>' +
        '<li>Garantie de bonne exécution : repère ' + REFERENTIEL_MARCHES_PUBLICS.garantieBonneExecutionMinPct + '–' + REFERENTIEL_MARCHES_PUBLICS.garantieBonneExecutionMaxPct + ' %</li>' +
        '<li>Cumul des pénalités : repère ' + REFERENTIEL_MARCHES_PUBLICS.cumulPenalitesSeuilResiliationPct + ' % (seuil de résiliation)</li>' +
        '<li>Délai de paiement : repère ' + REFERENTIEL_MARCHES_PUBLICS.delaiPaiementMaxJours + ' jours maximum</li>' +
      '</ul>' +
    '</div></div>' +
    '</div>' +
    (o.statut==="CLOS" ? '<div class="msgInfo">Motif de clôture : <b>' + ech((MOTIFS_CLOTURE.find(m=>m.code===o.motifCloture)||{}).libelle||"—") + '</b></div>' : "") +
    (o.statut==="ABANDONNE" ? '<div class="msgErreur">Motif d\'abandon : <b>' + ech((MOTIFS_ABANDON.find(m=>m.code===o.motifAbandon)||{}).libelle||"—") + '</b></div>' : "");
}
function regimeContractuelAffichage(o){
  const lib = o.regimeContractuel ? ech(libelleRegime(o.regimeContractuel)) : '<span class="muet">Non renseigné</span>';
  const motif = (o.regimeContractuel==="DEROGATION" && o.motifDerogation) ? '<div class="muet" style="font-size:12px;margin-top:2px">Motif : ' + ech(o.motifDerogation) + '</div>' : '';
  const btn = aDroit("modifier") ? ' <button class="btn mini noPrint" onclick="ouvrirModaleRegime(\''+o.id+'\')">Modifier</button>' : '';
  return lib + btn + motif;
}
function etapeAdministrativeSelect(o){
  if (!aDroit("modifier")) return ech(o.etapeAdministrative || "Non renseignée");
  const options = [["","— Non renseignée —"]].concat(ETAPES_ADMINISTRATIVES.map(e=>[e,e]));
  return '<select class="noPrint" style="font-size:12.5px;padding:3px 6px" onchange="changerEtapeAdministrative(\''+o.id+'\',this.value)">' +
    options.map(p => '<option value="'+ech(p[0])+'"'+(String(p[0])===String(o.etapeAdministrative||"")?" selected":"")+'>'+ech(p[1])+'</option>').join("") +
    '</select>';
}
function cumulAvenantsAffichage(o){
  const pct = cumulAvenantsPct(o);
  if (pct == null) return '<span class="muet">—</span>';
  const seuil = REFERENTIEL_MARCHES_PUBLICS.cumulAvenantsMaxPct;
  return pct + " %" + (pct > seuil ?
    ' <span class="et rouge" title="Repère habituel : ' + seuil + ' % (Code des marchés publics), non bloquant">⚠ au-delà du repère ' + seuil + ' %</span>' :
    ' <span class="muet">(repère : ' + seuil + ' % max)</span>');
}
function ligneInfo(lib, val){
  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--gris-200);font-size:13px">' +
    '<span class="muet">' + lib + '</span><span style="font-weight:600;text-align:right">' + val + '</span></div>';
}

function ongletClauses(o){
  const peutModifier = aDroit("modifier") || aDroit("enregistrer");
  return '<div class="carte"><div class="tete"><h3>Clauses suivies</h3>' +
    (peutModifier ? '<button class="btn mini" onclick="ouvrirModaleAjoutClause(\''+o.id+'\')">+ Ajouter une clause</button>' : '') + '</div>' +
    '<div class="corps">' +
    (o.clausesSLA.length ? o.clausesSLA.map(cl => renderClause(o, cl, peutModifier)).join("") : '<p class="muet">Aucune clause suivie sur ce contrat.</p>') +
    '</div></div>';
}
function renderClause(o, cl, peutModifier){
  const c = couleurClause(cl);
  const phrase = phraseClause(cl, c);
  return '<div class="carte compact" style="border-left:4px solid var(--'+({vert:"vert",orange:"orange",rouge:"rouge",bleu:"bleu",gris:"gris-300"}[c])+')"><div class="corps">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<div><b>' + avecLexique(cl.libelle) + '</b><div class="muet" style="font-size:12px">' + phrase + '</div></div>' +
      '<span class="et ' + c + '">' + ({vert:"Conforme",orange:"À surveiller",rouge:"Non conforme",bleu:"Information",gris:"À renseigner"})[c] + '</span>' +
    '</div>' +
    (peutModifier ? '<div class="grille g3" style="margin-top:10px">' +
      '<div class="champ" style="margin-bottom:0"><label>Valeur constatée (' + ech(cl.unite) + ')</label>' +
        '<input type="number" step="0.1" value="' + (cl.valeurConstatee??"") + '" onchange="mettreAJourClause(\''+o.id+'\',\''+cl.id+'\',this.value)"></div>' +
      '<div class="champ" style="margin-bottom:0"><label>Seuil contractuel</label><input type="text" value="' + cl.seuil + ' ' + ech(cl.unite) + '" disabled></div>' +
      '<div class="champ" style="margin-bottom:0"><label>Dernière mise à jour</label><input type="text" value="' + formaterDate(cl.derniereMaj) + '" disabled></div>' +
    '</div>' : '') +
    '</div></div>';
}
function phraseClause(cl, couleur){
  if (cl.sens === "info") return "Clause d\'information (" + cl.seuil + " " + cl.unite + ") — pas de seuil de conformité automatique.";
  if (cl.valeurConstatee == null || cl.valeurConstatee === "") return "Aucune valeur constatée renseignée pour l\'instant.";
  const verbe = cl.sens === "max" ? "ne doit pas dépasser" : "doit atteindre au moins";
  return "Le fournisseur " + verbe + " " + cl.seuil + " " + cl.unite + ". Valeur constatée : " + cl.valeurConstatee + " " + cl.unite + ".";
}

function ongletAvenants(o){
  return '<div class="carte"><div class="tete"><h3>Avenants</h3>' +
    (aDroit("modifier") ? '<button class="btn mini" onclick="ouvrirModaleAvenant(\''+o.id+'\')">+ Ajouter un avenant</button>' : '') + '</div>' +
    '<div class="corps">' + (o.avenants.length ?
      '<table><thead><tr><th>N°</th><th>Date</th><th>Objet</th><th class="num">Impact montant</th></tr></thead><tbody>' +
      o.avenants.map(a => '<tr><td>' + a.numero + '</td><td>' + formaterDate(a.date) + '</td><td>' + avecLexique(a.objet) + '</td><td class="num">' + (a.montantDelta?formaterMontant(a.montantDelta):"—") + '</td></tr>').join("") +
      '</tbody></table>' : '<p class="muet">Aucun avenant enregistré.</p>') + '</div></div>';
}

function ongletRevues(o){
  return '<div class="carte"><div class="tete"><h3>Revues périodiques d\'exécution</h3>' +
    (aDroit("modifier")||aDroit("evaluerFournisseur") ? '<button class="btn mini" onclick="ouvrirModaleRevue(\''+o.id+'\')">+ Enregistrer une revue</button>' : '') + '</div>' +
    '<div class="corps">' + (o.revues.length ?
      o.revues.slice().sort((a,b)=>a.date<b.date?1:-1).map(r =>
        '<div class="carte compact"><div class="corps"><div style="display:flex;justify-content:space-between"><b>' + ech(r.periode) + ' — ' + formaterDate(r.date) + '</b>' +
        '<span class="et ' + (r.note==="Satisfaisante"?"vert":r.note==="À surveiller"?"orange":"rouge") + '">' + ech(r.note) + '</span></div>' +
        '<p style="margin:6px 0 0 0">' + ech(r.commentaire) + '</p>' +
        (r.actions ? '<p class="muet" style="margin:4px 0 0 0"><b>Actions :</b> ' + ech(r.actions) + '</p>' : '') +
        '</div></div>').join("")
      : '<p class="muet">Aucune revue enregistrée. La première revue est due après 90 jours d\'exécution.</p>') + '</div></div>';
}

function ongletAvis(o){
  const avis = o.demandesAvis || [];
  return '<div class="carte"><div class="tete"><h3>⚖ Demandes d\'avis juridique</h3></div><div class="corps">' +
    (avis.length ? avis.slice().sort((a,b)=>a.date<b.date?1:-1).map(d => {
      const trait = d.statut === "TRAITEE";
      return '<div class="carte compact"><div class="corps">' +
        '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px"><b>' + formaterDate(d.date.slice(0,10)) + ' — ' + ech(d.cause) + '</b>' +
        '<span class="et ' + (trait?"vert":"rouge") + '">' + (trait?"Traitée":"Ouverte") + '</span></div>' +
        '<p class="muet" style="margin:4px 0">Destinataire : ' + ech(d.destinataireId?libelleAgent(d.destinataireId):"Cellule Juridique et Fiscale") + '</p>' +
        (trait ? '<p><b>Réponse CJF (' + formaterDate(d.dateReponse) + ') :</b> ' + ech(d.reponse) + '</p>' :
          (aDroit("traiterAvis") ? '<button class="btn mini primaire" onclick="ouvrirModaleTraiterAvis(\''+o.id+'\',\''+d.id+'\')">Enregistrer la réponse</button>' :
           '<p class="muet">En attente de traitement par la Cellule Juridique et Fiscale.</p>')) +
        '</div></div>';
    }).join("") : '<p class="msgOk">Aucune demande d\'avis juridique sur ce contrat.</p>') +
    '</div></div>';
}

function ongletPieces(o){
  return '<div class="carte"><div class="tete"><h3>Pièces jointes</h3></div><div class="corps">' +
    '<input type="file" id="inputPiece" multiple onchange="ajouterPieces(\''+o.id+'\',this.files)">' +
    '<div style="margin-top:10px">' + (o.pieces.length ?
      '<table><thead><tr><th>Nom</th><th class="num">Taille</th><th>Statut</th></tr></thead><tbody>' +
      o.pieces.map(p => '<tr><td>' + ech(p.nom) + '</td><td class="num">' + Math.round(p.taille/1024) + ' Ko</td><td>' + (p.avertissement?'<span class="et orange">'+ech(p.avertissement)+'</span>':'<span class="et vert">Conservée</span>') + '</td></tr>').join("") +
      '</tbody></table>' : '<p class="muet">Aucune pièce jointe.</p>') + '</div></div></div>';
}

function ongletHistorique(o){
  const h = o.historique.slice().sort((a,b) => a.date < b.date ? 1 : -1);
  return '<div class="carte"><div class="tete"><h3>Historique (non modifiable)</h3></div><div class="corps">' +
    '<table><thead><tr><th>Date</th><th>Auteur</th><th>Action</th><th>Détail</th></tr></thead><tbody>' +
    h.map(e => '<tr><td>' + formaterDate(e.date.slice(0,10)) + '</td><td>' + ech(e.auteur) + '</td><td>' + ech(e.action) + '</td><td>' + ech(e.detail) + '</td></tr>').join("") +
    '</tbody></table></div></div>';
}

/* ============================================================
   SECTION 15 — Actions de la fiche contrat (modales + handlers)
   ============================================================ */
function changerStatutContrat(id, statut){
  const o = contrat(id); if (!o) return;
  const ancien = o.statut;
  o.statut = statut;
  if (statut === "ACTIF" && !o.dateSignature) o.dateSignature = auj();
  tracer(o, "Changement de statut", libelleStatut(ancien) + " → " + libelleStatut(statut));
  sauver();
  toast("Statut mis à jour : " + libelleStatut(statut), "ok");
  App.aller("fiche", {id});
}

/* ---- Affectation ---- */
function ouvrirModaleImputer(id){
  const acheteurs = DB.params.agents.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
  ouvrirModale("Affecter un acheteur responsable",
    '<div class="champ"><label>Acheteur responsable</label><select id="mImp_acheteur">' +
      acheteurs.map(a=>'<option value="'+a.id+'">'+ech(a.nom)+(a.fonction?' — '+ech(a.fonction):'')+'</option>').join("") + '</select></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="imputerContrat(\''+id+'\',document.getElementById(\'mImp_acheteur\').value)">Affecter</button>');
}
function imputerContrat(id, proprietaireId){
  const o = contrat(id); if (!o) return;
  o.proprietaireId = proprietaireId;
  tracer(o, "Contrat affecté", "Acheteur responsable : " + libelleAgent(proprietaireId));
  sauver(); fermerModale();
  toast("Contrat affecté à " + libelleAgent(proprietaireId) + ".", "ok");
  App.aller("fiche", {id});
}

/* ---- Clôture ---- */
function ouvrirModaleCloture(id){
  ouvrirModale("Clôturer le contrat",
    '<div class="champ"><label>Motif de clôture <span class="oblig">*</span></label><select id="mClo_motif">' +
      MOTIFS_CLOTURE.map(m=>'<option value="'+m.code+'">'+ech(m.libelle)+'</option>').join("") + '</select></div>' +
    '<div class="champ"><label>Date de clôture</label><input type="date" id="mClo_date" value="' + auj() + '"></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="cloturerContrat(\''+id+'\',document.getElementById(\'mClo_motif\').value,document.getElementById(\'mClo_date\').value)">Clôturer</button>');
}
function cloturerContrat(id, motif, date){
  const o = contrat(id); if (!o) return;
  o.statut = "CLOS"; o.motifCloture = motif; o.dateCloture = date || auj();
  tracer(o, "Contrat clôturé", (MOTIFS_CLOTURE.find(m=>m.code===motif)||{}).libelle||"");
  sauver(); fermerModale();
  toast("Contrat clôturé.", "ok");
  App.aller("fiche", {id});
}

/* ---- Abandon ---- */
function ouvrirModaleAbandon(id){
  ouvrirModale("Abandonner ce contrat",
    '<p class="msgInfo">L\'abandon concerne un contrat en négociation qui n\'aboutira pas. Le motif est obligatoire et reste tracé dans l\'historique.</p>' +
    '<div class="champ"><label>Motif <span class="oblig">*</span></label><select id="mAba_motif">' +
      MOTIFS_ABANDON.map(m=>'<option value="'+m.code+'">'+ech(m.libelle)+'</option>').join("") + '</select></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn danger" onclick="abandonnerContrat(\''+id+'\',document.getElementById(\'mAba_motif\').value)">Abandonner</button>');
}
function abandonnerContrat(id, motif){
  const o = contrat(id); if (!o) return;
  o.statut = "ABANDONNE"; o.motifAbandon = motif;
  tracer(o, "Contrat abandonné", (MOTIFS_ABANDON.find(m=>m.code===motif)||{}).libelle||"");
  sauver(); fermerModale();
  toast("Contrat marqué comme abandonné.", "info");
  App.aller("fiche", {id});
}

/* ---- Régime contractuel (Code des marchés publics) ---- */
function ouvrirModaleRegime(id){
  const o = contrat(id); if (!o) return;
  ouvrirModale("Régime contractuel",
    '<p class="msgInfo">L\'ANADER est assujettie au Code des marchés publics pour la quasi-totalité de ses marchés, sauf dérogation motivée.</p>' +
    '<div class="champ"><label>Régime contractuel</label><select id="mReg_regimeContractuel" onchange="basculerMotifDerogation(\'mReg_\')">' +
      REGIMES_CONTRACTUELS.map(r=>'<option value="'+r.code+'"'+(o.regimeContractuel===r.code?" selected":"")+'>'+ech(r.libelle)+'</option>').join("") +
    '</select></div>' +
    '<div id="mReg_blocMotif" style="display:'+(o.regimeContractuel==="DEROGATION"?"block":"none")+'">' +
      '<div class="champ"><label>Motif de la dérogation <span class="oblig">*</span></label>' +
      '<textarea id="mReg_motif" rows="3">'+ech(o.motifDerogation||"")+'</textarea></div></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="appliquerRegimeContractuel(\''+id+'\')">Enregistrer</button>');
}
function appliquerRegimeContractuel(id){
  const o = contrat(id); if (!o) return;
  const regime = document.getElementById("mReg_regimeContractuel").value;
  const motif = (document.getElementById("mReg_motif").value || "").trim();
  if (regime === "DEROGATION" && !motif) { toast("Le motif de la dérogation est obligatoire.", "err"); return; }
  o.regimeContractuel = regime;
  o.motifDerogation = regime === "DEROGATION" ? motif : "";
  tracer(o, "Régime contractuel mis à jour", libelleRegime(regime));
  sauver(); fermerModale();
  toast("Régime contractuel mis à jour.", "ok");
  App.aller("fiche", {id});
}

function changerEtapeAdministrative(id, valeur){
  const o = contrat(id); if (!o) return;
  o.etapeAdministrative = valeur || "";
  tracer(o, "Étape administrative détaillée mise à jour", valeur || "Non renseignée");
  sauver();
  toast("Étape administrative mise à jour.", "ok");
  App.aller("fiche", {id});
}

/* ---- Avis juridique ---- */
function ouvrirModaleDemandeAvis(id){
  ouvrirModale("⚖ Demander un avis juridique",
    '<p class="msgInfo">La demande est adressée à la Cellule Juridique et Fiscale (CJF) et reste tracée sur le contrat jusqu\'à sa réponse.</p>' +
    '<div class="champ"><label>Motif de la demande <span class="oblig">*</span></label><textarea id="mAv_cause" rows="3" placeholder="Ex. : ambiguïté sur la clause de résiliation anticipée"></textarea></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn alerte" onclick="demanderAvisManuel(\''+id+'\')">Envoyer la demande</button>');
}
function demanderAvisManuel(id){
  const o = contrat(id); if (!o) return;
  const cause = (document.getElementById("mAv_cause").value || "").trim();
  if (!cause) { toast("Précisez le motif de la demande.", "err"); return; }
  const cjf = trouverCJF();
  o.demandesAvis.push({
    id:"AV"+Date.now(), date:new Date().toISOString(), clauseId:null, clauseLibelle:null,
    cause, destinataireId: cjf?cjf.id:null, statut:"OUVERTE", reponse:"", dateReponse:null
  });
  tracer(o, "Avis juridique demandé (manuel)", cause);
  sauver(); fermerModale();
  toast("Demande envoyée à la Cellule Juridique et Fiscale.", "ok");
  App.aller("fiche", {id, onglet:"avis"});
}
function ouvrirModaleTraiterAvis(id, avisId){
  ouvrirModale("Réponse de la Cellule Juridique et Fiscale",
    '<div class="champ"><label>Réponse <span class="oblig">*</span></label><textarea id="mTrA_reponse" rows="4"></textarea></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="traiterAvisJuridique(\''+id+'\',\''+avisId+'\')">Enregistrer la réponse</button>');
}
function traiterAvisJuridique(id, avisId){
  const o = contrat(id); if (!o) return;
  const reponse = (document.getElementById("mTrA_reponse").value || "").trim();
  if (!reponse) { toast("La réponse ne peut pas être vide.", "err"); return; }
  const d = (o.demandesAvis||[]).find(x => x.id === avisId); if (!d) return;
  d.statut = "TRAITEE"; d.reponse = reponse; d.dateReponse = auj();
  tracer(o, "Avis juridique traité", reponse.slice(0,140));
  sauver(); fermerModale();
  toast("Réponse enregistrée.", "ok");
  App.aller("fiche", {id, onglet:"avis"});
}

/* ---- Clauses SLA ---- */
function ouvrirModaleAjoutClause(id){
  ouvrirModale("Ajouter une clause suivie",
    '<div class="champ"><label>Type de clause</label><select id="mCl_type" onchange="document.getElementById(\'mCl_seuil\').value = ({' +
      Object.keys(SEUILS_CLAUSE_DEFAUT).map(k=>"'"+k+"':"+SEUILS_CLAUSE_DEFAUT[k]).join(",") + '})[this.value]">' +
      Object.values(TYPES_CLAUSE).map(t=>'<option value="'+t.code+'">'+ech(t.libelle)+' ('+ech(t.unite)+')</option>').join("") + '</select></div>' +
    '<div class="champ"><label>Seuil contractuel</label><input type="number" step="0.1" id="mCl_seuil" value="' + SEUILS_CLAUSE_DEFAUT.DELAI_LIVRAISON + '"></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="ajouterClauseManuelle(\''+id+'\')">Ajouter</button>');
}
function ajouterClauseManuelle(id){
  const o = contrat(id); if (!o) return;
  const typeCode = document.getElementById("mCl_type").value;
  const seuil = Number(document.getElementById("mCl_seuil").value);
  const t = TYPES_CLAUSE[typeCode];
  const cl = { id:o.id+"-CL"+(o.clausesSLA.length+1), typeCode, libelle:t.libelle, unite:t.unite, sens:t.sens, seuil, valeurConstatee:null, niveauManuel:null, derniereMaj:auj() };
  o.clausesSLA.push(cl);
  tracer(o, "Clause ajoutée", t.libelle + " (seuil " + seuil + " " + t.unite + ")");
  sauver(); fermerModale();
  toast("Clause ajoutée.", "ok");
  App.aller("fiche", {id, onglet:"clauses"});
}
function mettreAJourClause(id, clauseId, valeur){
  const o = contrat(id); if (!o) return;
  const cl = o.clausesSLA.find(c => c.id === clauseId); if (!cl) return;
  const ancienneCouleur = couleurClause(cl);
  cl.valeurConstatee = (valeur === "" ? null : Number(valeur));
  cl.derniereMaj = auj();
  const nouvelleCouleur = couleurClause(cl);
  tracer(o, "Clause mise à jour", cl.libelle + " : " + (cl.valeurConstatee??"—") + " " + cl.unite);
  if (nouvelleCouleur === "rouge") declencherDemandeAvis(o, cl);
  sauver();
  if (nouvelleCouleur === "rouge" && ancienneCouleur !== "rouge") {
    toast("Clause passée au rouge : demande d\'avis juridique déclenchée automatiquement.", "err", 5500);
  } else {
    toast("Clause mise à jour.", "ok");
  }
  App.aller("fiche", {id, onglet:"clauses"});
}

/* ---- Avenants ---- */
function ouvrirModaleAvenant(id){
  const o = contrat(id); if (!o) return;
  const pctActuel = cumulAvenantsPct(o);
  ouvrirModale("Ajouter un avenant",
    '<div class="champ"><label>Objet de l\'avenant <span class="oblig">*</span></label><input type="text" id="mAvt_objet" placeholder="Ex. : Prolongation de 6 mois"></div>' +
    '<div class="grille g2">' +
      '<div class="champ"><label>Date</label><input type="date" id="mAvt_date" value="' + auj() + '"></div>' +
      '<div class="champ"><label>Impact sur le montant (F CFA, 0 si aucun)</label><input type="number" id="mAvt_delta" value="0" oninput="apercuCumulAvenant(\''+id+'\')"></div>' +
    '</div>' +
    '<div class="lexiquePop" id="mAvt_apercu">Cumul actuel des avenants : <b>' + (pctActuel==null?"—":pctActuel+" %") + '</b> du montant initial.</div>' +
    '<div class="aide">Rappel (Code des marchés publics, non bloquant) : le cumul des avenants ne dépasse habituellement pas ' + REFERENTIEL_MARCHES_PUBLICS.cumulAvenantsMaxPct + ' % du montant initial du marché, sauf disposition contraire. Vous restez libre de saisir la valeur réelle.</div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="ajouterAvenantContrat(\''+id+'\')">Ajouter</button>');
}
function apercuCumulAvenant(id){
  const o = contrat(id); if (!o) return;
  const el = document.getElementById("mAvt_delta"), cible = document.getElementById("mAvt_apercu");
  if (!el || !cible) return;
  const delta = Number(el.value) || 0;
  const sommeDeltasExistants = (o.avenants||[]).reduce((s,a) => s + (a.montantDelta||0), 0);
  const montantInitial = (Number(o.montant)||0) - sommeDeltasExistants;
  const pct = montantInitial ? Math.round(((sommeDeltasExistants + delta) / montantInitial) * 1000) / 10 : null;
  const seuil = REFERENTIEL_MARCHES_PUBLICS.cumulAvenantsMaxPct;
  cible.innerHTML = pct == null ? "Impossible de calculer le cumul (montant initial nul)." :
    "Cumul projeté des avenants : <b>" + pct + " %</b> du montant initial" +
    (pct > seuil ? " <span style='color:var(--rouge)'>— au-delà du repère " + seuil + " %</span>" : "") + ".";
}
function ajouterAvenantContrat(id){
  const o = contrat(id); if (!o) return;
  const objet = (document.getElementById("mAvt_objet").value || "").trim();
  if (!objet) { toast("L\'objet de l\'avenant est obligatoire.", "err"); return; }
  const date = document.getElementById("mAvt_date").value || auj();
  const montantDelta = Number(document.getElementById("mAvt_delta").value) || 0;
  const numero = o.avenants.length + 1;
  o.avenants.push({numero, date, objet, montantDelta});
  if (montantDelta) o.montant = (Number(o.montant)||0) + montantDelta;
  tracer(o, "Avenant n°" + numero + " ajouté", objet);
  sauver(); fermerModale();
  toast("Avenant ajouté.", "ok");
  App.aller("fiche", {id, onglet:"avenants"});
}

/* ---- Revues périodiques ---- */
function ouvrirModaleRevue(id){
  ouvrirModale("Enregistrer une revue périodique",
    '<div class="champ"><label>Appréciation</label><select id="mRev_note"><option>Satisfaisante</option><option>À surveiller</option><option>Insuffisante</option></select></div>' +
    '<div class="champ"><label>Commentaire <span class="oblig">*</span></label><textarea id="mRev_commentaire" rows="3"></textarea></div>' +
    '<div class="champ"><label>Actions décidées (si nécessaire)</label><textarea id="mRev_actions" rows="2"></textarea></div>',
    '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="ajouterRevueContrat(\''+id+'\')">Enregistrer</button>');
}
function ajouterRevueContrat(id){
  const o = contrat(id); if (!o) return;
  const commentaire = (document.getElementById("mRev_commentaire").value || "").trim();
  if (!commentaire) { toast("Le commentaire est obligatoire.", "err"); return; }
  const note = document.getElementById("mRev_note").value;
  const actions = document.getElementById("mRev_actions").value || "";
  const numero = o.revues.length + 1;
  o.revues.push({date:auj(), periode:"Revue périodique " + numero, note, commentaire, actions});
  tracer(o, "Revue périodique enregistrée", note);
  sauver(); fermerModale();
  toast("Revue enregistrée.", "ok");
  App.aller("fiche", {id, onglet:"revues"});
}

/* ---- Pièces jointes ---- */
function ajouterPieces(id, files){
  const o = contrat(id); if (!o) return;
  Array.from(files).forEach(f => {
    lireFichierEnPiece(f, piece => {
      o.pieces.push(piece);
      tracer(o, "Pièce jointe ajoutée", piece.nom + (piece.avertissement ? " — " + piece.avertissement : ""));
      sauver();
      App.aller("fiche", {id, onglet:"pieces"});
    });
  });
}

/* ============================================================
   SECTION 16 — Vue : Grille fournisseur
   ============================================================ */
const VueFournisseurs = {
  rendre(){
    const idsConcernes = [...new Set(DB.contrats.filter(o => o.statut !== "BROUILLON").map(o => o.fournisseurId))];
    const lignes = idsConcernes.map(fid => {
      const f = fournisseur(fid);
      const nbActifs = DB.contrats.filter(o => o.fournisseurId===fid && estActif(o)).length;
      const score = dernierScoreFournisseur(fid);
      const evals = evaluationsFournisseur(fid);
      const tendance = evals.length>=2 ? (evals[0].total - evals[1].total) : null;
      return {fid, f, nbActifs, score, tendance, escalade:fournisseurEnEscalade(fid)};
    }).sort((a,b) => (a.score??999) - (b.score??999));

    return '' +
    '<div class="carte"><div class="tete"><h2>⚑ Grille fournisseur</h2></div><div class="corps">' +
    '<p class="muet">Cinq critères pondérés — méthode de calcul rappelée pour chaque critère, jamais une appréciation vague. Escalade automatique si le score reste sous ' +
      DB.params.seuils.scoreAlerteFournisseur + '/100 pendant ' + DB.params.seuils.periodesConsecutivesEscalade + ' périodes de suite.</p>' +
    '<table><thead><tr><th>Fournisseur</th><th>Secteur</th><th class="num">Contrats actifs</th><th class="num">Dernier score</th><th class="num">Tendance</th><th>Statut</th><th></th></tr></thead><tbody>' +
    lignes.map(l => '<tr>' +
      '<td>' + ech(l.f?l.f.nom:l.fid) + '</td>' +
      '<td>' + ech(l.f?l.f.secteur:"—") + '</td>' +
      '<td class="num">' + l.nbActifs + '</td>' +
      '<td class="num">' + (l.score==null?'<span class="muet">—</span>':l.score+' / 100') + '</td>' +
      '<td class="num">' + (l.tendance==null?'<span class="muet">—</span>':(l.tendance>=0?'▲ +':'▼ ')+l.tendance.toFixed(1)) + '</td>' +
      '<td>' + (l.escalade?'<span class="et rouge">Escalade — revue requise</span>':(l.score!=null&&l.score<DB.params.seuils.scoreAlerteFournisseur?'<span class="et orange">Sous le seuil</span>':'<span class="et vert">Normal</span>')) + '</td>' +
      '<td><button class="btn mini" onclick="ouvrirModaleFournisseur(\''+l.fid+'\')">Détail</button></td>' +
      '</tr>').join("") +
    '</tbody></table>' +
    '</div></div>' +

    '<div class="carte"><div class="tete"><h3>Méthode de notation</h3></div><div class="corps">' +
    Object.values(CRITERES_EVALUATION).map(c =>
      '<div style="margin-bottom:8px"><b>' + ech(c.libelle) + '</b> — pondération ' + Math.round(c.poids*100) + ' % <br><span class="muet">' + ech(c.methode) + '</span></div>').join("") +
    '</div></div>';
  }
};

function ouvrirModaleFournisseur(fid){
  const f = fournisseur(fid);
  const evals = evaluationsFournisseur(fid);
  const peutEvaluer = aDroit("evaluerFournisseur");
  const corps =
    '<h4>' + ech(f?f.nom:fid) + '</h4>' +
    (evals.length ? '<table><thead><tr><th>Période</th>' + Object.values(CRITERES_EVALUATION).map(c=>'<th class="num">'+ech(c.libelle)+'</th>').join("") + '<th class="num">Total</th></tr></thead><tbody>' +
      evals.map(e => '<tr><td>' + ech(e.periode) + '</td>' + Object.keys(CRITERES_EVALUATION).map(k=>'<td class="num">'+e.scores[k]+'</td>').join("") + '<td class="num"><b>' + e.total + '</b></td></tr>').join("") +
      '</tbody></table>' : '<p class="muet">Aucune évaluation enregistrée.</p>') +
    (peutEvaluer ? '<hr style="margin:14px 0;border:none;border-top:1px solid var(--gris-200)">' +
      '<h4>Nouvelle évaluation</h4>' +
      '<div class="champ"><label>Période</label><input type="text" id="mFo_periode" value="' + prochainePeriode() + '"></div>' +
      '<div class="grille g3">' + Object.keys(CRITERES_EVALUATION).map(k =>
        '<div class="champ"><label>' + ech(CRITERES_EVALUATION[k].libelle) + ' (0-100)</label><input type="number" min="0" max="100" id="mFo_'+k+'" value="80"></div>').join("") + '</div>' +
      '<div class="champ"><label>Commentaire</label><textarea id="mFo_commentaire" rows="2"></textarea></div>'
      : '');
  const pied = '<button class="btn" onclick="fermerModale()">Fermer</button>' +
    (peutEvaluer ? '<button class="btn primaire" onclick="ajouterEvaluationFournisseur(\''+fid+'\')">Enregistrer l\'évaluation</button>' : '');
  ouvrirModale("Fiche fournisseur — grille chiffrée", corps, pied);
}
function prochainePeriode(){
  const an = new Date().getFullYear(), m = new Date().getMonth()+1;
  const t = m<=3?1:m<=6?2:m<=9?3:4;
  return an + "-T" + t;
}
function ajouterEvaluationFournisseur(fid){
  const periode = (document.getElementById("mFo_periode").value || prochainePeriode()).trim();
  const scores = {};
  let invalide = false;
  Object.keys(CRITERES_EVALUATION).forEach(k => {
    const v = Number(document.getElementById("mFo_"+k).value);
    if (isNaN(v) || v<0 || v>100) invalide = true;
    scores[k] = v;
  });
  if (invalide) { toast("Chaque critère doit être un nombre entre 0 et 100.", "err"); return; }
  const total = calculerScoreEvaluation(scores);
  if (!DB.evaluations) DB.evaluations = [];
  DB.evaluations.push({id:"EV"+fid+Date.now(), fournisseurId:fid, periode, date:auj(), scores, total,
    commentaire:(document.getElementById("mFo_commentaire").value||"").trim()});
  sauver(); fermerModale();
  if (fournisseurEnEscalade(fid)) {
    toast("Évaluation enregistrée (" + total + "/100). Seuil franchi 2 périodes de suite : revue fournisseur à programmer.", "err", 6000);
  } else {
    toast("Évaluation enregistrée (" + total + "/100).", "ok");
  }
  App.aller("fournisseurs");
}

/* ============================================================
   SECTION 17 — Vue : Alertes & relances
   ============================================================ */
const VueAlertes = {
  rendre(){
    const lot = contratsVisibles().filter(o => !estClos(o));
    const retard = lot.filter(o => etatEcheance(o)==="retard").sort((a,b)=>joursRestantsPreavis(a)-joursRestantsPreavis(b));
    const proche = lot.filter(o => etatEcheance(o)==="proche").sort((a,b)=>joursRestantsPreavis(a)-joursRestantsPreavis(b));
    const nonAffectes = DB.contrats.filter(o => !o.proprietaireId && ["BROUILLON","EN_NEGOCIATION"].includes(o.statut));
    const avisOuverts = [];
    contratsVisibles().forEach(o => (o.demandesAvis||[]).filter(d=>d.statut==="OUVERTE").forEach(d => avisOuverts.push({o,d})));
    const charge = Stats.chargeParAgent(contratsVisibles()).filter(c => c.surcharge);
    const fournisseursEsc = [...new Set(DB.contrats.map(o=>o.fournisseurId))].filter(fournisseurEnEscalade);

    return '' +
    (retard.length===0 && proche.length===0 && nonAffectes.length===0 && avisOuverts.length===0 ?
      '<div class="msgOk">Aucune alerte active. Tous les contrats visibles sont dans les délais.</div>' : '') +

    blocAlerte("🔴 Préavis dépassé — escalade automatique", retard, (o) => {
      const niv = escaladeNiveau(o);
      const dest = destinataireAlerte(o);
      return '<span class="et rouge">Retard ' + Math.abs(joursRestantsPreavis(o)) + ' j ouvrés</span> ' +
        '<span class="et ' + (niv===2?"rouge":niv===1?"orange":"gris") + '">Niveau ' + niv + (dest?' — '+ech(dest.nom):'') + '</span> ' +
        '<button class="btn mini" onclick="relancerContrat(\''+o.id+'\')">Relancer</button>';
    }) +

    blocAlerte("🟠 Échéance de préavis dans les 30 jours ouvrés", proche, (o) =>
      '<span class="et orange">J-' + joursRestantsPreavis(o) + '</span> ' +
      '<button class="btn mini" onclick="relancerContrat(\''+o.id+'\')">Relancer</button>') +

    (nonAffectes.length ? '<div class="carte"><div class="tete"><h3>🟡 Contrats non affectés</h3></div><div class="corps tableauScroll">' + tableauContrats(nonAffectes) + '</div></div>' : '') +

    (avisOuverts.length ? '<div class="carte"><div class="tete"><h3>⚖ Avis juridiques en attente de réponse</h3></div><div class="corps">' +
      '<table><thead><tr><th>Contrat</th><th>Motif</th><th>Depuis</th><th></th></tr></thead><tbody>' +
      avisOuverts.map(x => '<tr><td>' + ech(numeroCourt(x.o.numero)) + ' — ' + ech(x.o.objet) + '</td><td>' + ech(x.d.cause) + '</td>' +
        '<td>' + ecartOuvres(x.d.date.slice(0,10), auj()) + ' j ouvrés</td>' +
        '<td><button class="btn mini" onclick="App.aller(\'fiche\',{id:\''+x.o.id+'\',onglet:\'avis\'})">Ouvrir</button></td></tr>').join("") +
      '</tbody></table></div></div>' : '') +

    (fournisseursEsc.length ? '<div class="carte"><div class="tete"><h3>📉 Fournisseurs en escalade (score)</h3></div><div class="corps">' +
      fournisseursEsc.map(fid => '<p>' + ech(libelleFournisseur(fid)) + ' — dernier score ' + dernierScoreFournisseur(fid) + '/100 <button class="btn mini" onclick="App.aller(\'fournisseurs\')">Voir la grille</button></p>').join("") +
      '</div></div>' : '') +

    (charge.length ? '<div class="carte"><div class="tete"><h3>📦 Surcharge (limitation de l\'en-cours)</h3></div><div class="corps">' +
      charge.map(c => '<p>' + ech(c.agent) + ' — ' + c.total + ' contrats en cours (seuil : ' + DB.params.seuils.wipMaxParAgent + ')</p>').join("") +
      '</div></div>' : '');
  }
};

function blocAlerte(titre, lot, actionsFn){
  if (!lot.length) return '';
  return '<div class="carte"><div class="tete"><h3>' + ech(titre) + ' <span class="cpt">(' + lot.length + ')</span></h3></div>' +
    '<div class="corps"><table><thead><tr><th>N°</th><th>Objet</th><th>Fournisseur</th><th>Propriétaire</th><th>Alerte</th></tr></thead><tbody>' +
    lot.map(o => '<tr>' +
      '<td style="cursor:pointer" onclick="App.aller(\'fiche\',{id:\''+o.id+'\'})">' + ech(numeroCourt(o.numero)) + '</td>' +
      '<td>' + ech(o.objet) + '</td><td>' + ech(libelleFournisseur(o.fournisseurId)) + '</td>' +
      '<td>' + (o.proprietaireId?ech(libelleAgent(o.proprietaireId)):'<span class="muet">Non affecté</span>') + '</td>' +
      '<td>' + actionsFn(o) + '</td></tr>').join("") + '</tbody></table></div></div>';
}

function relancerContrat(id){
  const o = contrat(id); if (!o) return;
  tracer(o, "Relance enregistrée", "Relance manuelle effectuée par " + moi().nom);
  sauver();
  toast("Relance enregistrée sur " + numeroCourt(o.numero) + ".", "ok");
  App.aller("alertes");
}

/* ============================================================
   SECTION 18 — Vue : Revues périodiques (vue transversale)
   ============================================================ */
const VueRevuesGlobal = {
  rendre(){
    const lot = contratsVisibles().filter(o => estActif(o));
    const aProgrammer = lot.filter(o => {
      if (dt(o.dateDebut) > dt(jMoinsGlobal(90))) return false;
      const dernieres = o.revues.slice().sort((a,b)=>a.date<b.date?1:-1);
      if (!dernieres.length) return true;
      return dt(dernieres[0].date) < dt(jMoinsGlobal(100));
    });
    const toutesRevues = [];
    lot.forEach(o => o.revues.forEach(r => toutesRevues.push({o, r})));
    toutesRevues.sort((a,b) => a.r.date < b.r.date ? 1 : -1);

    return '' +
    '<div class="carte"><div class="tete"><h3>Revues à programmer</h3></div><div class="corps">' +
      (aProgrammer.length ? tableauContrats(aProgrammer) : '<p class="msgOk">Aucune revue en retard de programmation.</p>') +
    '</div></div>' +
    '<div class="carte"><div class="tete"><h3>Historique des revues (' + toutesRevues.length + ')</h3></div><div class="corps tableauScroll">' +
      (toutesRevues.length ? '<table><thead><tr><th>Date</th><th>Contrat</th><th>Fournisseur</th><th>Appréciation</th><th>Commentaire</th></tr></thead><tbody>' +
        toutesRevues.map(x => '<tr style="cursor:pointer" onclick="App.aller(\'fiche\',{id:\''+x.o.id+'\',onglet:\'revues\'})">' +
          '<td>' + formaterDate(x.r.date) + '</td><td>' + ech(numeroCourt(x.o.numero)) + ' — ' + ech(x.o.objet) + '</td>' +
          '<td>' + ech(libelleFournisseur(x.o.fournisseurId)) + '</td>' +
          '<td><span class="et ' + (x.r.note==="Satisfaisante"?"vert":x.r.note==="À surveiller"?"orange":"rouge") + '">' + ech(x.r.note) + '</span></td>' +
          '<td>' + ech(x.r.commentaire) + '</td></tr>').join("") + '</tbody></table>'
        : '<p class="muet">Aucune revue enregistrée.</p>') +
    '</div></div>';
  }
};
function jMoinsGlobal(n){ const d = new Date(); d.setDate(d.getDate()-n); return iso(d); }

/* ============================================================
   SECTION 19 — Vue : Rapports
   ============================================================ */
const PERIODES_RAPPORT = [
  ["semaineEnCours","Semaine en cours"], ["moisEnCours","Mois en cours"], ["moisPrecedent","Mois précédent"],
  ["trimestreEnCours","Trimestre en cours"], ["trimestrePrecedent","Trimestre précédent"],
  ["semestreEnCours","Semestre en cours"], ["anneeEnCours","Année en cours"], ["personnalisee","Période personnalisée"]
];

function calculerPeriode(code, debutPerso, finPerso){
  const auj_ = new Date();
  const an = auj_.getFullYear(), mois = auj_.getMonth();
  function d(y,m,day){ return iso(new Date(y,m,day)); }
  if (code === "semaineEnCours") {
    const jr = (auj_.getDay()+6)%7;
    const deb = new Date(auj_); deb.setDate(auj_.getDate()-jr);
    return {debut:iso(deb), fin:auj(), libelle:"Semaine en cours"};
  }
  if (code === "moisEnCours") return {debut:d(an,mois,1), fin:auj(), libelle:"Mois en cours"};
  if (code === "moisPrecedent") { const mp = mois===0?11:mois-1, ap = mois===0?an-1:an; return {debut:d(ap,mp,1), fin:d(ap,mp+1,0), libelle:"Mois précédent"}; }
  if (code === "trimestreEnCours") { const t = Math.floor(mois/3); return {debut:d(an,t*3,1), fin:auj(), libelle:"Trimestre en cours"}; }
  if (code === "trimestrePrecedent") { const t = Math.floor(mois/3)-1, at = t<0?an-1:an, tt=t<0?3:t; return {debut:d(at,tt*3,1), fin:d(at,tt*3+3,0), libelle:"Trimestre précédent"}; }
  if (code === "semestreEnCours") { const s = mois<6?0:6; return {debut:d(an,s,1), fin:auj(), libelle:"Semestre en cours"}; }
  if (code === "anneeEnCours") return {debut:d(an,0,1), fin:auj(), libelle:"Année " + an};
  return {debut:debutPerso||d(an,0,1), fin:finPerso||auj(), libelle:"Période personnalisée"};
}

const VueRapports = {
  rendre(etat){
    const periode = etat.periode || "moisEnCours";
    const p = calculerPeriode(periode, etat.debutPerso, etat.finPerso);
    const lot = contratsVisibles();
    const nouveaux = lot.filter(o => o.dateEnregistrement >= p.debut && o.dateEnregistrement <= p.fin);
    const closPeriode = lot.filter(o => o.dateCloture && o.dateCloture >= p.debut && o.dateCloture <= p.fin);
    const avenantsPeriode = [];
    lot.forEach(o => o.avenants.forEach(a => { if (a.date>=p.debut && a.date<=p.fin) avenantsPeriode.push({o,a}); }));
    const s = Stats.synthese(lot);
    const sPeriodeClos = Stats.synthese(closPeriode);
    const parNature = Stats.repartition(nouveaux, "natureId", libelleNature);
    const parService = Stats.repartition(lot.filter(o=>!estClos(o)), "serviceId", libelleService);
    const perf = Stats.performanceParNature(lot);
    const charge = Stats.chargeParAgent(lot);

    const appreciation =
      sPeriodeClos.tauxRespect === null ? "Aucun contrat clôturé sur la période : l'indicateur n'est pas calculable." :
      sPeriodeClos.tauxRespect >= 95 ? "La performance est conforme à la cible. Maintenir le dispositif en l'état." :
      sPeriodeClos.tauxRespect >= 85 ? "Performance satisfaisante mais perfectible. Cibler les natures les plus en écart." :
      sPeriodeClos.tauxRespect >= 70 ? "Performance insuffisante. Analyser les causes de dépassement et renforcer le suivi." :
      "Performance critique. Une action corrective formalisée est requise.";

    return '' +
    '<div class="carte compact noPrint"><div class="corps">' +
      '<div class="grille g3">' +
        '<div class="champ" style="margin-bottom:0"><label>Période</label><select onchange="App.aller(\'rapports\',{periode:this.value})">' +
          PERIODES_RAPPORT.map(pp=>'<option value="'+pp[0]+'"'+(periode===pp[0]?" selected":"")+'>'+ech(pp[1])+'</option>').join("") + '</select></div>' +
        (periode==="personnalisee" ? '<div class="champ" style="margin-bottom:0"><label>Du</label><input type="date" value="'+(etat.debutPerso||"")+'" onchange="App.aller(\'rapports\',{debutPerso:this.value})"></div>' +
         '<div class="champ" style="margin-bottom:0"><label>Au</label><input type="date" value="'+(etat.finPerso||"")+'" onchange="App.aller(\'rapports\',{finPerso:this.value})"></div>' : '') +
      '</div>' +
      '<div class="barreActions" style="margin-top:10px">' +
        '<button class="btn primaire" onclick="window.print()">🖶 Imprimer / Enregistrer en PDF</button>' +
        '<button class="btn" onclick="exporterRegistreCSV()">⭳ Exporter les données (CSV)</button>' +
        '<button class="btn" onclick="enregistrerRapportHTML()">💾 Enregistrer le rapport (HTML autonome)</button>' +
      '</div>' +
    '</div></div>' +

    '<div id="rapportImprimable">' +
    '<div class="enteteOff">' +
      '<div class="rep">République de Côte d\'Ivoire — Ministère d\'État, Ministère de l\'Agriculture, du Développement Rural et des Productions Vivrières</div>' +
      '<div class="org">ANADER — Direction des Marchés et Moyens Généraux (D2MG)</div>' +
    '</div>' +
    '<div class="titreRapport">Rapport de suivi des contrats fournisseurs</div>' +
    '<div class="sousTitreRapport">' + ech(p.libelle) + ' (' + formaterDate(p.debut) + ' — ' + formaterDate(p.fin) + ') · édité le ' + formaterDate(auj()) + ' par ' + ech(moi().nom) + '</div>' +

    '<div class="carte"><div class="tete"><h3>1. Synthèse de la période</h3></div><div class="corps">' +
      '<div class="grille g4">' +
        kpi(nouveaux.length, "Nouveaux contrats enregistrés", "bleu") +
        kpi(closPeriode.length, "Contrats clôturés", "vert") +
        kpi(avenantsPeriode.length, "Avenants signés", "gris") +
        kpi(s.enRetard, "Contrats en retard de préavis (à date)", s.enRetard>0?"rouge":"vert") +
      '</div>' +
      '<p style="margin-top:10px"><b>Appréciation :</b> ' + appreciation + '</p>' +
    '</div></div>' +

    '<div class="carte"><div class="tete"><h3>2. Répartition et performance par nature de contrat</h3></div><div class="corps">' +
      '<div class="grille g2"><div>' + barresHtml(parNature) + '</div>' +
      '<table><thead><tr><th>Nature</th><th class="num">Total</th><th class="num">Retard</th><th class="num">Taux clôture dans les délais</th></tr></thead><tbody>' +
      perf.map(pf=>'<tr><td>'+ech(pf.nature)+'</td><td class="num">'+pf.total+'</td><td class="num">'+pf.retard+'</td><td class="num">'+(pf.taux==null?"—":pf.taux+" %")+'</td></tr>').join("") +
      '</tbody></table></div>' +
    '</div></div>' +

    '<div class="carte"><div class="tete"><h3>3. Performance par service</h3></div><div class="corps">' + barresHtml(parService) + '</div></div>' +

    '<div class="carte"><div class="tete"><h3>4. Analyse des écarts — contrats en retard de préavis</h3></div><div class="corps">' +
      (s.listeRetard.length ? tableauContrats(s.listeRetard) : '<p class="msgOk">Aucun contrat en retard de préavis à la date d\'édition.</p>') +
    '</div></div>' +

    '<div class="carte"><div class="tete"><h3>5. Charge par acheteur</h3></div><div class="corps">' +
      '<table><thead><tr><th>Acheteur</th><th class="num">Contrats en cours</th><th class="num">Dont en retard</th></tr></thead><tbody>' +
      charge.map(c=>'<tr><td>'+ech(c.agent)+'</td><td class="num">'+c.total+'</td><td class="num">'+c.retard+'</td></tr>').join("") +
      '</tbody></table></div></div>' +

    '<div class="carte"><div class="tete"><h3>6. Conclusions et actions proposées</h3></div><div class="corps">' +
      '<ul>' +
      (s.enRetard>0 ? '<li>Traiter en priorité les ' + s.enRetard + ' contrat(s) en retard de préavis listés en section 4, en commençant par ceux en escalade niveau 2.</li>' : '<li>Aucun contrat en retard de préavis à traiter dans l\'immédiat.</li>') +
      (s.nonAffectes>0 ? '<li>Affecter sans délai les ' + s.nonAffectes + ' contrat(s) non affectés (menu « À imputer »).</li>' : '') +
      (s.avisOuverts>0 ? '<li>Relancer la Cellule Juridique et Fiscale sur les ' + s.avisOuverts + ' demande(s) d\'avis juridique encore ouvertes.</li>' : '') +
      '</ul>' +
    '</div></div>' +

    '<div class="blocSignature"><div><b>Rédaction</b></div><div><b>Vérification</b></div><div><b>Approbation</b></div></div>' +
    '<div class="piedOff">ANADER — Société Anonyme au capital de 500 000 000 F CFA — Siège social : Abidjan — www.anader.ci — Page 1 / 1</div>' +
    '</div>';
  }
};

function enregistrerRapportHTML(){
  const css = document.querySelector("style") ? document.querySelector("style").innerHTML : "";
  const corps = document.getElementById("rapportImprimable").outerHTML;
  const doc = '<!doctype html><html><head><meta charset="utf-8"><title>Rapport contrats fournisseurs D2MG</title><style>' + css + '</style></head><body style="padding:20px">' + corps + '</body></html>';
  telecharger("rapport_contrats_" + auj() + ".html", doc, "text/html");
}

/* ============================================================
   SECTION 20 — Vue : Paramétrage
   Jours fériés : table PARTAGÉE entre tous les modules de la
   plateforme (jours_feries) — affichage seul depuis cette chambre,
   à corriger auprès du Pilote si besoin. Référentiels : ajout des
   destinataires institutionnels (Directeur D2MG, Cellule Juridique
   et Fiscale) et de l'affectation de service par acteur, qui
   remplacent la déduction par rôle fixe de la version d'essai
   locale — les droits d'usage sont désormais individuels, activés
   par le Directeur / Pilote depuis l'accueil D2MG Pilotage
   (arbitrage Hassan du 01/09/2026), au même titre que les autres
   modules de la plateforme.
   ============================================================ */
const VueParametrage = {
  rendre(etat){
    etat = etat || {};
    const complet = aDroit("parametrer");
    const tousOnglets = [["delais","Délais / préavis"],["seuils","Seuils d'alerte"],["feries","Jours fériés"],["referentiels","Services, acteurs, fournisseurs"],["sauvegarde","Sauvegarde"]];
    const onglets = complet ? tousOnglets : tousOnglets.filter(o => o[0]==="referentiels");
    const demande = etat.onglet || "delais";
    const onglet = onglets.some(o => o[0]===demande) ? demande : "referentiels";
    return '<div class="onglets noPrint">' +
      onglets.map(o => '<a class="'+(onglet===o[0]?"actif":"")+'" onclick="App.aller(\'parametrage\',{onglet:\''+o[0]+'\'})">'+ech(o[1])+'</a>').join("") +
    '</div>' +
    ({delais:paramDelais, seuils:paramSeuils, feries:paramFeries, referentiels:paramReferentiels, sauvegarde:paramSauvegarde}[onglet] || paramReferentiels)(etat);
  }
};

function paramDelais(){
  return '<div class="carte"><div class="tete"><h3>Grille de préavis par nature de contrat</h3></div><div class="corps">' +
    '<p class="msgInfo">Cette grille est une proposition de départ. Elle doit être arbitrée par le Directeur D2MG avant tout déploiement au-delà de l\'essai.</p>' +
    Object.values(NATURES_CONTRAT).map(n =>
      '<div class="champ"><label>' + ech(n.libelle) + '</label>' +
      '<input type="number" min="1" id="par_'+n.code+'" value="' + DB.params.preavisParNature[n.code] + '"> <span class="muet">jours ouvrés</span></div>').join("") +
    '<button class="btn primaire" onclick="enregistrerDelais()">Enregistrer la grille</button>' +
    '</div></div>';
}
function enregistrerDelais(){
  Object.keys(NATURES_CONTRAT).forEach(code => {
    const v = Number(document.getElementById("par_"+code).value);
    if (!isNaN(v) && v>0) DB.params.preavisParNature[code] = Math.round(v);
  });
  sauver();
  toast("Grille de préavis enregistrée.", "ok");
  App.aller("parametrage", {onglet:"delais"});
}

function paramSeuils(){
  const s = DB.params.seuils;
  return '<div class="carte"><div class="tete"><h3>Seuils d\'alerte et d\'escalade</h3></div><div class="corps">' +
    '<fieldset><legend>Paliers d\'alerte avant échéance de préavis</legend><div class="grille g3">' +
      '<div class="champ"><label>Premier palier (j ouvrés)</label><input type="number" id="seuil_a0" value="'+s.alertesJours[0]+'"></div>' +
      '<div class="champ"><label>Deuxième palier</label><input type="number" id="seuil_a1" value="'+s.alertesJours[1]+'"></div>' +
      '<div class="champ"><label>Dernier palier (déclenche l\'état « proche »)</label><input type="number" id="seuil_a2" value="'+s.alertesJours[2]+'"></div>' +
    '</div></fieldset>' +
    '<fieldset><legend>Escalade d\'une alerte de préavis non traitée</legend><div class="grille g2">' +
      '<div class="champ"><label>Vers le chef de service après (j ouvrés de retard)</label><input type="number" id="seuil_n1" value="'+s.joursAvantEscaladeN1+'"></div>' +
      '<div class="champ"><label>Vers le Directeur D2MG après (j ouvrés de retard)</label><input type="number" id="seuil_n2" value="'+s.joursAvantEscaladeN2+'"></div>' +
    '</div></fieldset>' +
    '<fieldset><legend>Grille fournisseur et charge</legend><div class="grille g3">' +
      '<div class="champ"><label>Score d\'alerte fournisseur (/100)</label><input type="number" id="seuil_score" value="'+s.scoreAlerteFournisseur+'"></div>' +
      '<div class="champ"><label>Périodes consécutives avant escalade</label><input type="number" id="seuil_periodes" value="'+s.periodesConsecutivesEscalade+'"></div>' +
      '<div class="champ"><label>Seuil de surcharge (contrats/acheteur)</label><input type="number" id="seuil_wip" value="'+s.wipMaxParAgent+'"></div>' +
    '</div></fieldset>' +
    '<button class="btn primaire" onclick="enregistrerSeuils()">Enregistrer les seuils</button>' +
    '</div></div>';
}
function enregistrerSeuils(){
  const g = id => Number(document.getElementById(id).value);
  const a0=g("seuil_a0"), a1=g("seuil_a1"), a2=g("seuil_a2");
  if ([a0,a1,a2].some(v=>isNaN(v)||v<=0) || !(a0>a1 && a1>a2)) {
    toast("Les paliers doivent être positifs et décroissants (ex. 90 / 60 / 30).", "err"); return;
  }
  DB.params.seuils.alertesJours = [a0,a1,a2];
  DB.params.seuils.joursAvantEscaladeN1 = g("seuil_n1");
  DB.params.seuils.joursAvantEscaladeN2 = g("seuil_n2");
  DB.params.seuils.scoreAlerteFournisseur = g("seuil_score");
  DB.params.seuils.periodesConsecutivesEscalade = Math.max(2, g("seuil_periodes"));
  DB.params.seuils.wipMaxParAgent = g("seuil_wip");
  sauver();
  toast("Seuils enregistrés.", "ok");
  App.aller("parametrage", {onglet:"seuils"});
}

function paramFeries(){
  return '<div class="carte"><div class="tete"><h3>Jours fériés</h3></div><div class="corps">' +
    '<p class="msgInfo">Liste commune à tous les modules de la plateforme D2MG Pilotage (courriers, projets, opérations, contrats). Elle n\'est pas modifiable depuis cette chambre — signalez toute correction au Directeur / Pilote.</p>' +
    (DB.params.joursFeries.length ?
      '<div class="tableauScroll"><table><thead><tr><th>Date</th></tr></thead><tbody>' +
      DB.params.joursFeries.slice().sort().map(d => '<tr><td>' + formaterDate(d) + '</td></tr>').join("") +
      '</tbody></table></div>' : '<p class="muet">Aucun jour férié enregistré.</p>') +
    '</div></div>';
}

function paramReferentiels(etat){
  etat = etat || {};
  const gere = peutGererFournisseurs();
  const complet = aDroit("parametrer");
  const lignesImport = etat.lignesImportFournisseurs || null;
  const agentsTries = DB.params.agents.slice().sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
  const optionsAgents = (sel) => '<option value="">— Aucun —</option>' +
    agentsTries.map(a=>'<option value="'+ech(a.id)+'"'+(String(a.id)===String(sel||"")?" selected":"")+'>'+ech(a.nom)+'</option>').join("");
  const optionsServices = (sel) => '<option value="">— Aucun —</option>' +
    DB.params.services.map(s=>'<option value="'+ech(s.id)+'"'+(String(s.id)===String(sel||"")?" selected":"")+'>'+ech(s.libelle)+'</option>').join("");

  return '<div class="grille g2">' +
    '<div class="carte"><div class="tete"><h3>Services</h3></div><div class="corps"><table><thead><tr><th>Service</th><th>Chef de service (escalade niveau 1)</th></tr></thead><tbody>' +
      DB.params.services.map(s => '<tr><td>' + ech(s.libelle) + '</td><td>' +
        (complet ? '<select onchange="changerChefService(\''+s.id+'\',this.value)">' + optionsAgents(s.chefId) + '</select>'
                 : ech(s.chefId ? libelleAgent(s.chefId) : "—")) +
        '</td></tr>').join("") +
      '</tbody></table></div></div>' +
    '<div class="carte"><div class="tete"><h3>Acteurs</h3></div><div class="corps"><table><thead><tr><th>Nom</th><th>Fonction</th><th>Service (portée « voir mon service »)</th></tr></thead><tbody>' +
      agentsTries.map(a => '<tr><td>' + ech(a.nom) + '</td><td>' + ech(a.fonction || a.role || "—") + '</td><td>' +
        (complet ? '<select onchange="changerServiceActeur(\''+a.id+'\',this.value)">' + optionsServices(a.serviceId) + '</select>'
                 : ech(libelleService(a.serviceId))) +
        '</td></tr>').join("") +
      '</tbody></table></div></div>' +
    '</div>' +
    (complet ? '<div class="carte"><div class="tete"><h3>Destinataires institutionnels</h3></div><div class="corps">' +
      '<p class="muet">Utilisés pour l\'escalade des retards de préavis (niveau 2) et les demandes d\'avis juridique.</p>' +
      '<div class="grille g2">' +
        '<div class="champ"><label>Directeur D2MG (escalade niveau 2)</label><select id="par_directeur">' + optionsAgents(DB.params.directeurId) + '</select></div>' +
        '<div class="champ"><label>Cellule Juridique et Fiscale</label><select id="par_cjf">' + optionsAgents(DB.params.cjfId) + '</select></div>' +
      '</div>' +
      '<button class="btn primaire" onclick="enregistrerDestinataires()">Enregistrer</button>' +
    '</div></div>' : '') +
    '<div class="carte"><div class="tete"><h3>Fournisseurs (' + DB.params.fournisseurs.length + ')</h3></div><div class="corps">' +
    (gere ? '<div class="barreActions">' +
      '<button class="btn primaire" onclick="ouvrirModaleAjoutFournisseur()">+ Ajouter un fournisseur</button>' +
      '<button class="btn" onclick="telechargerGabaritImportFournisseursCSV()">⭳ Télécharger le gabarit CSV</button>' +
      '<label class="btn">⭱ Importer une liste (CSV)<input type="file" accept=".csv" style="display:none" onchange="chargerFichierImportFournisseursCSV(this.files[0])"></label>' +
    '</div>' : '<p class="muet">Réservé aux profils ayant le droit d\'enregistrer un contrat ou de paramétrer le module.</p>') +
    '<div class="tableauScroll"><table><thead><tr><th>Nom</th><th>Secteur</th></tr></thead><tbody>' +
      DB.params.fournisseurs.map(f=>'<tr><td>'+ech(f.nom)+'</td><td>'+ech(f.secteur)+'</td></tr>').join("") + '</tbody></table></div>' +
    (lignesImport ? rendreApercuImportFournisseursCSV(lignesImport) : '') +
    '</div></div>';
}

async function changerChefService(serviceId, agentId){
  const s = service(serviceId); if (!s) return;
  s.chefId = agentId || null;
  const ok = await sauver();
  if (ok) toast("Chef de service mis à jour.", "ok");
  App.aller("parametrage", {onglet:"referentiels"});
}
async function changerServiceActeur(agentId, serviceId){
  const a = agent(agentId); if (!a) return;
  const { error } = await sb.from('acteurs').update({service_contrats_id: serviceId || null}).eq('id_acteur', agentId);
  if (error) { toast("Erreur d'enregistrement : " + error.message, "err", 6000); return; }
  a.serviceId = serviceId || null;
  toast("Service mis à jour pour " + a.nom + ".", "ok");
  App.aller("parametrage", {onglet:"referentiels"});
}
function enregistrerDestinataires(){
  DB.params.directeurId = document.getElementById("par_directeur").value || null;
  DB.params.cjfId = document.getElementById("par_cjf").value || null;
  sauver();
  toast("Destinataires institutionnels enregistrés.", "ok");
  App.aller("parametrage", {onglet:"referentiels"});
}

/* ---- Ajout unitaire d'un fournisseur ---- */
function ouvrirModaleAjoutFournisseur(){
  if (!peutGererFournisseurs()) { toast("Vous n'avez pas les droits pour ajouter un fournisseur.", "err"); return; }
  const secteurs = [...new Set(DB.params.fournisseurs.map(f=>f.secteur))].sort((a,b)=>a.localeCompare(b,"fr"));
  const corps =
    '<div class="champ"><label>Nom du fournisseur <span class="oblig">*</span></label>' +
    '<input type="text" id="mFrn_nom" placeholder="Raison sociale exacte"></div>' +
    '<div class="champ"><label>Secteur d\'activité <span class="oblig">*</span></label>' +
    '<input type="text" id="mFrn_secteur" list="dlSecteursFournisseurs" placeholder="Ex. Maintenance technique">' +
    '<datalist id="dlSecteursFournisseurs">' + secteurs.map(s=>'<option value="'+ech(s)+'">').join("") + '</datalist></div>' +
    '<p class="aide">Le référentiel bloque les doublons : un nom déjà présent (à l\'accent et à la casse près) ne peut pas être ajouté deux fois.</p>';
  const pied = '<button class="btn" onclick="fermerModale()">Annuler</button>' +
    '<button class="btn primaire" onclick="soumettreAjoutFournisseur()">Enregistrer le fournisseur</button>';
  ouvrirModale("Ajouter un fournisseur", corps, pied);
}
function soumettreAjoutFournisseur(){
  if (!peutGererFournisseurs()) { toast("Vous n'avez pas les droits pour ajouter un fournisseur.", "err"); return; }
  const nom = (document.getElementById("mFrn_nom").value||"").trim();
  const secteur = (document.getElementById("mFrn_secteur").value||"").trim();
  const erreurs = validerFournisseur(nom, secteur);
  if (erreurs.length) { toast(erreurs.map(e=>e.message).join(" "), "err", 6000); return; }
  const f = construireFournisseur(nom, secteur);
  DB.params.fournisseurs.push(f);
  sauver();
  fermerModale();
  toast("Fournisseur « " + f.nom + " » ajouté au référentiel (" + f.id + ").", "ok");
  App.aller("parametrage", {onglet:"referentiels", lignesImportFournisseurs:null});
}

/* ---- Import en masse depuis un gabarit CSV ---- */
const ENTETES_GABARIT_CSV_FOURNISSEURS = ["Nom du fournisseur","Secteur d'activité"];

function telechargerGabaritImportFournisseursCSV(){
  const exemple = ["Nouveau Fournisseur SARL", "Fournitures de bureau"];
  const lignes = [csvLigne(ENTETES_GABARIT_CSV_FOURNISSEURS), csvLigne(exemple)];
  telecharger("gabarit_import_fournisseurs_" + auj() + ".csv", lignes.join("\r\n"), "text/csv");
}

function construireLigneImportFournisseur(cols, numeroLigne, nomsDejaVus){
  const g = (i) => (cols[i]||"").trim();
  const nom = g(0), secteur = g(1);
  const erreurs = validerFournisseur(nom, secteur).map(e => e.message);
  if (nom) {
    const norm = normaliserTexte(nom);
    if (nomsDejaVus.has(norm)) erreurs.push("Doublon dans le fichier : « " + nom + " » apparaît plusieurs fois.");
    nomsDejaVus.add(norm);
  }
  return {numeroLigne, nom, secteur, erreurs};
}

function chargerFichierImportFournisseursCSV(file){
  if (!file) return;
  if (!peutGererFournisseurs()) { toast("Vous n'avez pas les droits pour importer des fournisseurs.", "err"); return; }
  const r = new FileReader();
  r.onload = () => {
    const texte = String(r.result||"").replace(/^\uFEFF/, "");
    const grille = parserCSV(texte);
    if (grille.length < 2) { toast("Le fichier CSV ne contient aucune ligne de données au-delà de l'en-tête.", "err"); return; }
    const nomsDejaVus = new Set();
    const lignes = grille.slice(1).map((cols, idx) => construireLigneImportFournisseur(cols, idx+2, nomsDejaVus));
    App.aller("parametrage", {onglet:"referentiels", lignesImportFournisseurs:lignes});
    toast(lignes.length + " ligne(s) lue(s) — vérifiez l'aperçu avant d'importer.", "info", 4500);
  };
  r.onerror = () => toast("Lecture du fichier impossible.", "err");
  r.readAsText(file, "utf-8");
}

function rendreApercuImportFournisseursCSV(lignes){
  const valides = lignes.filter(l => l.erreurs.length === 0);
  return '<hr style="margin:16px 0;border:none;border-top:1px solid var(--gris-200)">' +
    '<h3>Aperçu (' + lignes.length + ' ligne(s), ' + valides.length + ' valide(s))</h3>' +
    '<div class="tableauScroll"><table><thead><tr><th>Ligne</th><th>Statut</th><th>Nom</th><th>Secteur</th><th>Détail</th></tr></thead><tbody>' +
    lignes.map(l => '<tr>' +
      '<td>' + l.numeroLigne + '</td>' +
      '<td>' + (l.erreurs.length ? '<span class="et rouge">Erreur</span>' : '<span class="et vert">OK</span>') + '</td>' +
      '<td>' + ech(l.nom||"—") + '</td>' +
      '<td>' + ech(l.secteur||"—") + '</td>' +
      '<td style="font-size:12px">' + (l.erreurs.length ? l.erreurs.map(ech).join("<br>") : '<span class="muet">—</span>') + '</td>' +
    '</tr>').join("") +
    '</tbody></table></div>' +
    '<div class="barreActions" style="margin-top:10px">' +
      (valides.length ? '<button class="btn primaire" onclick="importerLotFournisseursCSV()">Importer les ' + valides.length + ' fournisseur(s) valide(s)</button>' : '<span class="muet">Aucune ligne valide à importer.</span>') +
      '<button class="btn" onclick="App.aller(\'parametrage\',{onglet:\'referentiels\',lignesImportFournisseurs:null})">Annuler cet import</button>' +
    '</div>';
}

function importerLotFournisseursCSV(){
  if (!peutGererFournisseurs()) { toast("Vous n'avez pas les droits pour importer des fournisseurs.", "err"); return; }
  const etat = App.etat.parametrage || {};
  const lignes = etat.lignesImportFournisseurs || [];
  const valides = lignes.filter(l => l.erreurs.length === 0);
  if (!valides.length) { toast("Aucune ligne valide à importer.", "err"); return; }
  valides.forEach(l => {
    DB.params.fournisseurs.push(construireFournisseur(l.nom, l.secteur));
  });
  sauver();
  toast(valides.length + " fournisseur(s) importé(s) avec succès.", "ok", 5000);
  App.aller("parametrage", {onglet:"referentiels", lignesImportFournisseurs:null});
}

function paramSauvegarde(){
  return '<div class="carte"><div class="tete"><h3>Sauvegarde</h3></div><div class="corps">' +
    '<p class="msgInfo">Les données de ce module sont enregistrées en continu dans la base partagée de la plateforme D2MG Pilotage (Supabase), au fil de vos actions — il n\'y a rien à sauvegarder manuellement.</p>' +
    '<p class="muet">Vous pouvez néanmoins exporter à tout moment un instantané JSON du registre (contrats, référentiels, évaluations), par exemple avant une opération sensible ou pour archivage.</p>' +
    '<div class="barreActions">' +
      '<button class="btn primaire" onclick="exporterJSON()">⭳ Exporter un instantané (JSON)</button>' +
    '</div>' +
    '</div></div>';
}

/* ============================================================
   SECTION 21 — Vue : Mode d'emploi
   ============================================================ */
const Aide = {
  rendre(){
    return '' +
    '<div class="carte"><div class="tete"><h2>Mode d\'emploi</h2></div><div class="corps">' +

    '<h3>1. Ce que fait ce module</h3>' +
    '<p>Il centralise les contrats fournisseurs de la D2MG : qui est engagé, jusqu\'à quand, à quelles conditions, et ce qu\'il reste à faire avant chaque échéance de préavis. Il ne remplace pas le contrat papier ni l\'avis d\'un juriste — il évite d\'oublier une échéance et donne une vision chiffrée de chaque fournisseur.</p>' +

    '<h3>2. Parcours conseillé</h3>' +
    '<ol style="padding-left:20px">' +
      '<li>Ouvrez le <b>Tableau de bord</b> : regardez le nombre de contrats en retard de préavis et le score fournisseur moyen.</li>' +
      '<li>Allez dans <b>Alertes & relances</b> : c\'est ici que remontent, sans qu\'on ait besoin de les chercher, les contrats à traiter en priorité.</li>' +
      '<li>Ouvrez un contrat en retard depuis cette liste, puis l\'onglet <b>Clauses SLA</b> : une valeur constatée qui fait passer une clause au rouge déclenche automatiquement une demande d\'avis juridique, visible dans l\'onglet <b>Avis juridiques</b>.</li>' +
      '<li>Passez dans <b>Enregistrer un contrat</b> : choisissez une nature, puis une date de fin — l\'échéance de préavis se calcule sous vos yeux avant même de valider.</li>' +
      '<li>Consultez la <b>Grille fournisseur</b> et les <b>Rapports</b> (essayez l\'impression en PDF).</li>' +
    '</ol>' +

    '<h3>3. Le code à trois couleurs</h3>' +
    '<p><span class="et vert">Vert</span> la clause est conforme à l\'engagement du fournisseur. ' +
    '<span class="et orange">Orange</span> l\'écart est modéré, à surveiller à la prochaine mise à jour. ' +
    '<span class="et rouge">Rouge</span> l\'engagement n\'est pas tenu — une demande d\'avis juridique est ouverte automatiquement.</p>' +
    '<p>Les termes soulignés en pointillés (comme <span class="terme" title="'+ech(LEXIQUE["préavis"])+'">préavis</span>) affichent leur explication en langage courant au survol.</p>' +

    '<h3>4. L\'escalade des retards</h3>' +
    '<p>Un contrat dont la date limite de préavis est dépassée reste d\'abord signalé à son acheteur responsable. Sans traitement, l\'alerte remonte automatiquement au chef du service porteur, puis au Directeur D2MG — destinataires et seuils réglables dans <b>Paramétrage</b> (onglets « Services, acteurs, fournisseurs » et « Seuils d\'alerte »).</p>' +

    '<h3>5. Vos accès</h3>' +
    '<p>L\'accès à ce module et à chacune de ses fonctions (enregistrer, imputer, clôturer, arbitrer, paramétrer…) est individuel et activé par le Directeur D2MG / Pilote depuis l\'accueil D2MG Pilotage, comme pour les autres modules de la plateforme (Courriers, Projets, Opérations). Si un écran ou une action vous semble manquant, demandez l\'ouverture du droit correspondant.</p>' +

    '<h3>6. Vos données</h3>' +
    '<p>Les données sont enregistrées en continu dans la base partagée de la plateforme D2MG Pilotage, au fil de vos actions — il n\'y a pas de sauvegarde locale à gérer. Un instantané JSON peut être exporté à tout moment depuis <b>Paramétrage → Sauvegarde</b>.</p>' +

    '<h3>7. Le référentiel fournisseurs</h3>' +
    '<p>Depuis <b>Paramétrage → Services, acteurs, fournisseurs</b>, les acteurs disposant du droit d\'enregistrer un contrat ou de paramétrer le module peuvent ajouter un fournisseur au référentiel (<b>+ Ajouter un fournisseur</b>) ou en importer plusieurs d\'un coup (<b>⭱ Importer une liste (CSV)</b>, avec un gabarit à télécharger). Dans les deux cas, un nom déjà présent (à l\'accent et à la casse près) est bloqué pour éviter un doublon dans le référentiel.</p>' +

    '</div></div>';
  }
};

/* ============================================================
   SECTION 22 — Registre des vues + démarrage (authentification
   Supabase réelle, alignée sur le bootstrap des autres chambres
   de la plateforme — courriers-app.js, projets-app.js…).
   ============================================================ */
const VUES = {
  dashboard: VueTableau, enregistrer: VueEnregistrer, importer: VueImporter,
  aImputer: VueAImputer, mesContrats: VueMesContrats, suivi: VueSuivi,
  registre: VueRegistre, fiche: VueFiche, fournisseurs: VueFournisseurs,
  alertes: VueAlertes, revues: VueRevuesGlobal, rapports: VueRapports,
  parametrage: VueParametrage, aide: Aide
};

async function demarrerModule(){
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = "index.html"; return; }
  const { data: { user } } = await sb.auth.getUser();
  const { data: moiActeur } = await sb.from('acteurs').select('*').eq('user_id', user.id).eq('actif', true).maybeSingle();
  if (!moiActeur) { window.location.href = "index.html"; return; }

  const { data: acces } = await sb.from('module_acces').select('role_module')
    .eq('id_acteur', moiActeur.id_acteur).eq('module', 'contrats').eq('actif', true).maybeSingle();
  if (!acces) {
    document.getElementById("ecranAcces").classList.remove("hidden");
    document.getElementById("msgAcces").textContent =
      "Votre compte (" + moiActeur.nom_prenoms + ") n'a pas accès à la chambre « Gestion des contrats fournisseurs ». Demandez son ouverture au Directeur / Pilote depuis l'accueil D2MG Pilotage.";
    return;
  }

  const { data: dr } = await sb.from('acteur_droits').select('droit_code,autorise').eq('id_acteur', moiActeur.id_acteur);
  D.droits = {};
  (dr || []).forEach(x => { if (x.autorise) D.droits[String(x.droit_code).replace(/^ctr\./,"")] = true; });

  DB.profilActif = moiActeur.id_acteur;

  await chargerReferentiels();
  await chargerContrats();
  await chargerEvaluations();

  document.getElementById("app").classList.remove("hidden");
  const quiEl = document.getElementById("qui");
  if (quiEl) quiEl.innerHTML = "<strong style=\"color:#fff\">" + ech(moiActeur.nom_prenoms) + "</strong><br>" + ech(moiActeur.fonction || moiActeur.role || "");
  const btnDeco = document.getElementById("btnDeco");
  if (btnDeco) btnDeco.addEventListener("click", async () => { await sb.auth.signOut(); window.location.href = "index.html"; });

  App.demarrer();
}

window.addEventListener("DOMContentLoaded", () => {
  demarrerModule().catch(e => {
    console.error(e);
    const cible = document.getElementById("contenu");
    if (cible) cible.innerHTML =
      '<div class="msgErreur"><b>Erreur au démarrage :</b> ' + ech(e && e.message ? e.message : e) + "<br>Essayez de recharger la page.</div>";
  });
});
