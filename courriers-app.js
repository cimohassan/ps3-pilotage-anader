/* =========================================================================
 * D2MG PILOTAGE — CHAMBRE « GESTION DES COURRIERS »
 * Reprise fidèle du circuit et des écrans de la version d'essai D2MG,
 * portée sur Supabase : données partagées entre tous les agents,
 * authentification réelle, droits d'usage individuels, audit central.
 * ========================================================================= */
(function () {
'use strict';

const SUPABASE_URL = 'https://tcirboephslicjmhokbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaXJib2VwaHNsaWNqbWhva2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjYxNjUsImV4cCI6MjEwMDg0MjE2NX0.e3f1B__NmDVL5G1Cze1p115ya2Rs-ErzzTUr25UCKEg';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ech = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nl2br = s => ech(s).replace(/\n/g, '<br>');
function toast(m, t) { const e = document.createElement('div'); e.className = 'toast ' + (t || ''); e.textContent = m; $('#toasts').appendChild(e); setTimeout(() => e.remove(), 4300); }
function iso(d) { return d.toISOString().slice(0, 10); }
function auj() { return iso(new Date()); }
function frDate(d) { if (!d) return '—'; try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR'); } catch (e) { return d; } }

/* ------------------------------------------------------- constantes métier */
const SOURCES = {
  EXT:  { code: 'EXT',  libelle: 'Externe ANADER',              court: 'Externe',       couleur: 'bleu',   desc: "Courrier provenant d'une entité extérieure à l'ANADER (ministères, fournisseurs, partenaires, usagers)." },
  INT:  { code: 'INT',  libelle: 'Interne ANADER (hors D2MG)',  court: 'Interne ANADER', couleur: 'vert',  desc: "Courrier provenant d'une autre direction, direction régionale ou zone de l'ANADER." },
  D2MG: { code: 'D2MG', libelle: 'Interne D2MG',               court: 'Interne D2MG',  couleur: 'orange', desc: 'Courrier circulant entre les divisions et services de la D2MG.' }
};
const STATUTS = [
  { code: 'ENREGISTRE',    libelle: 'Enregistré',        court: 'Enregistré', couleur: 'gris',   ordre: 1, desc: "Reçu au bureau d'ordre, en attente de qualification." },
  { code: 'QUALIFIE',      libelle: 'Qualifié',          court: 'Qualifié',   couleur: 'bleu',   ordre: 2, desc: 'Nature, urgence et délai déterminés — prêt à être imputé.' },
  { code: 'IMPUTE',        libelle: 'Imputé',            court: 'Imputé',     couleur: 'bleu',   ordre: 3, desc: 'Affecté à un service et à un responsable, non encore pris en main.' },
  { code: 'EN_TRAITEMENT', libelle: 'En traitement',     court: 'Traitement', couleur: 'orange', ordre: 4, desc: 'Pris en main par le responsable.' },
  { code: 'REPONSE',       libelle: 'Réponse rédigée',   court: 'Réponse',    couleur: 'orange', ordre: 5, desc: 'Réponse ou suite produite, en attente de signature/transmission.' },
  { code: 'CLOTURE',       libelle: 'Clôturé',           court: 'Clôturé',    couleur: 'vert',   ordre: 6, desc: 'Traitement achevé et tracé.' },
  { code: 'SANS_SUITE',    libelle: 'Classé sans suite', court: 'Sans suite', couleur: 'gris',   ordre: 7, desc: 'Aucune action requise — classé avec motif.' }
];
const ST = {}; STATUTS.forEach(s => ST[s.code] = s);
const PRIORITES = {
  URGENT:     { code: 'URGENT',     libelle: 'Urgent',     facteur: 0.5, couleur: 'rouge' },
  NORMAL:     { code: 'NORMAL',     libelle: 'Normal',     facteur: 1,   couleur: 'bleu' },
  NON_URGENT: { code: 'NON_URGENT', libelle: 'Non urgent', facteur: 1.5, couleur: 'gris' }
};
const estClos = c => c.statut === 'CLOTURE' || c.statut === 'SANS_SUITE';

/* --------------------------------------------------- moteur jours ouvrés */
let feries = new Set();
async function chargerFeries() {
  const { data } = await sb.from('jours_feries').select('date_ferie');
  feries = new Set((data || []).map(f => f.date_ferie));
}
function ouvre(d) { const j = new Date(d + 'T00:00:00').getDay(); return j !== 0 && j !== 6 && !feries.has(d); }
function ajoutOuvres(depart, n) {
  let d = new Date(depart + 'T00:00:00'), r = n, sens = n >= 0 ? 1 : -1, g = 0;
  while (r !== 0 && g++ < 4000) { d.setDate(d.getDate() + sens); if (ouvre(iso(d))) r -= sens; }
  return iso(d);
}
function ecartOuvres(de, a) {
  if (!de || !a) return null;
  const sens = a >= de ? 1 : -1;
  let d = new Date(de + 'T00:00:00'), n = 0, g = 0;
  while (iso(d) !== a && g++ < 4000) { d.setDate(d.getDate() + sens); if (ouvre(iso(d))) n += sens; }
  return n;
}
function joursRestants(c) { return c.echeance ? ecartOuvres(auj(), c.echeance) : null; }
function etatEcheance(c) {
  if (estClos(c) || !c.echeance) return '';
  const n = joursRestants(c);
  return n < 0 ? 'retard' : n <= 2 ? 'proche' : 'ok';
}

/* ------------------------------------------------------------------ état */
const D = {
  moi: null, droits: {}, agents: [], services: [], natures: [], entites: [],
  courriers: [], seuils: [], vue: 'tableau', etat: {}
};
const aDroit = c => D.droits[c] === true;
const monService = () => D.moi ? D.moi.service_courrier_id : null;

function nomAgent(id) { const a = D.agents.find(x => x.id_acteur === id); return a ? a.nom_prenoms : '—'; }
function nomService(id) { const s = D.services.find(x => String(x.id) === String(id)); return s ? s.libelle : '—'; }
function libNature(id) { const n = D.natures.find(x => String(x.id) === String(id)); return n ? n.libelle : '—'; }
function agentObj(id) { return D.agents.find(x => x.id_acteur === id); }

/* Visibilité : gérée aussi côté serveur par RLS, rappelée ici pour l'affichage */
function visibles() {
  if (aDroit('cou.voir_tous')) return D.courriers;
  if (aDroit('cou.voir_service') && monService())
    return D.courriers.filter(c => String(c.service_affecte_id) === String(monService()) || c.agent_id === D.moi.id_acteur);
  return D.courriers.filter(c => c.agent_id === D.moi.id_acteur || c.created_by === D.moi.id_acteur);
}
const Compteurs = {
  aImputer: () => visibles().filter(c => c.statut === 'ENREGISTRE' || c.statut === 'QUALIFIE').length,
  mesEnCours: () => visibles().filter(c => c.agent_id === D.moi.id_acteur && !estClos(c)).length,
  alertes: () => visibles().filter(c => !estClos(c) && etatEcheance(c) === 'retard').length
};

/* ------------------------------------------------------------ statistiques */
const Stats = {
  synthese(lot) {
    const total = lot.length;
    const clos = lot.filter(estClos).length;
    const enCours = lot.filter(c => !estClos(c)).length;
    const retard = lot.filter(c => !estClos(c) && etatEcheance(c) === 'retard').length;
    const clot = lot.filter(c => c.statut === 'CLOTURE' && c.date_cloture && c.echeance);
    const dansDelai = clot.filter(c => c.date_cloture <= c.echeance).length;
    const delais = lot.filter(c => c.date_cloture && c.date_reception)
      .map(c => ecartOuvres(c.date_reception, c.date_cloture)).filter(n => n !== null);
    return {
      total, clos, enCours, retard,
      tauxCloture: total ? Math.round(clos / total * 100) : null,
      tauxRespect: clot.length ? Math.round(dansDelai / clot.length * 100) : null,
      delaiMoyen: delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : null
    };
  },
  parCle(lot, f) {
    const m = {};
    lot.forEach(c => { const k = f(c) || '—'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  },
  parMois(lot) {
    const m = {};
    lot.forEach(c => { if (!c.date_reception) return; const k = c.date_reception.slice(0, 7); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-8);
  }
};

/* ======================================================== démarrage / menu */
async function demarrer() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'portail.html'; return; }
  const { data: { user } } = await sb.auth.getUser();
  const { data: moi } = await sb.from('acteurs').select('*').eq('user_id', user.id).eq('actif', true).maybeSingle();
  if (!moi) { window.location.href = 'portail.html'; return; }
  D.moi = moi;

  const { data: acc } = await sb.from('module_acces').select('role_module')
    .eq('id_acteur', moi.id_acteur).eq('module', 'courriers').eq('actif', true).maybeSingle();
  if (!acc) {
    $('#ecranAcces').classList.remove('hidden');
    $('#msgAcces').textContent = `Votre compte (${moi.nom_prenoms}) n'a pas accès à la chambre « Gestion des courriers ». Demandez son ouverture au Pilote depuis l'accueil D2MG Pilotage.`;
    return;
  }
  const { data: dr } = await sb.from('acteur_droits').select('droit_code,autorise').eq('id_acteur', moi.id_acteur);
  D.droits = {}; (dr || []).forEach(x => D.droits[x.droit_code] = x.autorise);

  await chargerFeries();
  await chargerReferentiels();
  await chargerCourriers();

  $('#app').classList.remove('hidden');
  $('#qui').innerHTML = `<strong style="color:#fff">${ech(moi.nom_prenoms)}</strong><br>${ech(moi.fonction || moi.role)}`
    + (monService() ? `<br><span style="opacity:.8">${ech(nomService(monService()))}</span>` : '');
  $('#btnDeco').addEventListener('click', async () => { await sb.auth.signOut(); window.location.href = 'portail.html'; });
  $('#modFermer').addEventListener('click', fermerModale);
  aller('tableau');
}

async function chargerReferentiels() {
  const [ag, sv, na, en, se] = await Promise.all([
    sb.from('acteurs').select('id_acteur,nom_prenoms,role,fonction,service_courrier_id').eq('actif', true).order('nom_prenoms'),
    sb.from('courrier_services').select('*').order('ordre'),
    sb.from('courrier_natures').select('*').order('libelle'),
    sb.from('courrier_entites').select('*').order('libelle'),
    sb.from('seuils_charge').select('id_acteur,seuil').eq('module', 'courriers')
  ]);
  D.agents = ag.data || []; D.services = sv.data || []; D.natures = na.data || [];
  D.entites = en.data || []; D.seuils = se.data || [];
}
async function chargerCourriers() {
  const { data, error } = await sb.from('courriers').select('*').order('created_at', { ascending: false });
  if (error) { toast('Erreur de chargement : ' + error.message, 'err'); return; }
  D.courriers = data || [];
}
function seuilDe(id) { const s = D.seuils.find(x => x.id_acteur === id); return s ? s.seuil : 5; }

const VUES = [
  { grp: 'Traitement du courrier' },
  { id: 'tableau',    lib: 'Tableau de bord',  ic: '◧' },
  { id: 'nouveau',    lib: 'Enregistrer',      ic: '✎', droit: 'cou.enregistrer' },
  { id: 'imputation', lib: 'À imputer',        ic: '➔', badge: () => Compteurs.aImputer() },
  { id: 'mes',        lib: 'Mes courriers',    ic: '☑', badge: () => Compteurs.mesEnCours() },
  { id: 'suivi',      lib: 'Suivi (kanban)',   ic: '▤' },
  { id: 'registre',   lib: 'Registre général', ic: '≡' },
  { grp: 'Pilotage' },
  { id: 'alertes',    lib: 'Alertes & relances', ic: '⚑', badge: () => Compteurs.alertes() },
  { id: 'rapports',   lib: 'Rapports',         ic: '▦', droit: 'cou.rapport' },
  { grp: 'Configuration' },
  { id: 'parametrage', lib: 'Paramétrage',     ic: '⚙', droit: 'cou.parametrer' },
  { id: 'aide',       lib: "Mode d'emploi",    ic: '?' }
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
  tableau: vueTableau, nouveau: vueSaisie, imputation: vueImputation, mes: vueMes,
  suivi: vueKanban, registre: vueRegistre, alertes: vueAlertes, rapports: vueRapports,
  parametrage: vueParametrage, aide: vueAide
};
function aller(v) { D.vue = v; construireMenu(); (RENDU[v] || vueTableau)(); window.scrollTo(0, 0); }
async function rafraichir() { await chargerCourriers(); aller(D.vue); }

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

/* ======================================================== TABLEAU DE BORD */
function vueTableau() {
  const lot = visibles();
  const s = Stats.synthese(lot);
  const nonImp = lot.filter(c => c.statut === 'ENREGISTRE' || c.statut === 'QUALIFIE').length;
  const parStatut = STATUTS.map(st => ({ st, n: lot.filter(c => c.statut === st.code).length }));
  const maxSt = Math.max(1, ...parStatut.map(x => x.n));
  const mois = Stats.parMois(lot);
  const maxM = Math.max(1, ...mois.map(m => m[1]));
  const parSource = Object.values(SOURCES).map(src => ({ src, n: lot.filter(c => c.source === src.code).length }));

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Tableau de bord</h1>
      <p>Vue d'ensemble du courrier de la D2MG : volume, respect des délais contractuels et points de blocage.</p></div></div>
    <div class="kpis">
      <div class="kpi"><div class="lib">Courriers enregistrés</div><div class="val">${s.total}</div><div class="sub">${s.enCours} en cours</div></div>
      <div class="kpi ${nonImp ? 'al' : 'ok'}"><div class="lib">En attente d'imputation</div><div class="val">${nonImp}</div><div class="sub">à traiter sous 24 h</div></div>
      <div class="kpi ${s.retard ? 'ko' : 'ok'}"><div class="lib">Courriers en retard</div><div class="val">${s.retard}</div><div class="sub">délai contractuel dépassé</div></div>
      <div class="kpi ${s.tauxRespect === null ? '' : s.tauxRespect >= 85 ? 'ok' : 'ko'}"><div class="lib">Respect des délais</div>
        <div class="val">${s.tauxRespect === null ? '—' : s.tauxRespect + '%'}</div><div class="sub">sur les courriers clôturés</div></div>
      <div class="kpi"><div class="lib">Taux de clôture</div><div class="val">${s.tauxCloture === null ? '—' : s.tauxCloture + '%'}</div><div class="sub">${s.clos} clôturés</div></div>
      <div class="kpi"><div class="lib">Délai moyen de traitement</div><div class="val">${s.delaiMoyen === null ? '—' : s.delaiMoyen}</div><div class="sub">jours ouvrés</div></div>
    </div>
    <div class="deux">
      <div class="carte"><h3>Répartition par statut</h3>
        <div class="barreG">${parStatut.map(x => `<div class="l"><span>${ech(x.st.libelle)}</span>
          <span class="zn"><i style="width:${x.n / maxSt * 100}%"></i></span><span style="text-align:right"><b>${x.n}</b></span></div>`).join('')}</div>
      </div>
      <div class="carte"><h3>Volume mensuel (8 derniers mois)</h3>
        ${mois.length ? `<div class="colonnesG">${mois.map(m => `<div class="c">
            <span style="font-size:10.5px;font-weight:700;color:var(--vert-fonce)">${m[1]}</span>
            <div class="bt" style="height:${Math.round(m[1] / maxM * 92)}px"></div>
            <span class="lg">${m[0].slice(5)}/${m[0].slice(2, 4)}</span></div>`).join('')}</div>`
          : '<p class="gris">Pas encore de données mensuelles.</p>'}
      </div>
    </div>
    <div class="deux">
      <div class="carte"><h3>Par source</h3>
        <div class="tw" style="max-height:none"><table><thead><tr><th>Source</th><th class="centre">Volume</th><th class="centre">Part</th><th class="centre">En retard</th></tr></thead><tbody>
        ${parSource.map(x => {
          const sous = lot.filter(c => c.source === x.src.code);
          const ss = Stats.synthese(sous);
          return `<tr><td>${ech(x.src.libelle)}</td><td class="centre">${x.n}</td>
            <td class="centre">${lot.length ? Math.round(x.n / lot.length * 100) : 0}%</td>
            <td class="centre">${ss.retard ? `<b style="color:var(--rouge)">${ss.retard}</b>` : '0'}</td></tr>`;
        }).join('')}</tbody></table></div>
      </div>
      <div class="carte"><h3>Charge par agent (courriers ouverts)</h3>
        ${chargeAgentsHtml(lot)}
      </div>
    </div>`;
}
function chargeAgentsHtml(lot) {
  const m = {};
  lot.filter(c => !estClos(c) && c.agent_id).forEach(c => m[c.agent_id] = (m[c.agent_id] || 0) + 1);
  const e = Object.entries(m).sort((a, b) => b[1] - a[1]);
  if (!e.length) return '<p class="gris">Aucun courrier ouvert affecté.</p>';
  const max = Math.max(...e.map(x => x[1]));
  return `<div class="barreG">${e.map(([id, n]) => {
    const sur = n > seuilDe(id);
    return `<div class="l"><span title="${ech(nomAgent(id))}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ech(nomAgent(id))}</span>
      <span class="zn"><i style="width:${n / max * 100}%;background:${sur ? 'var(--rouge)' : 'var(--vert)'}"></i></span>
      <span style="text-align:right"><b>${n}</b></span></div>`;
  }).join('')}</div>
  <p class="aide">La limite d'en-cours par agent est paramétrable. Au-delà du seuil, la barre passe au rouge : le délai de traitement se dégrade sans gain de production.</p>`;
}

/* ============================================================ ENREGISTRER */
function vueSaisie() {
  if (!aDroit('cou.enregistrer')) { refus(); return; }
  const e = D.etat.saisie || (D.etat.saisie = { etape: 1, v: { source: 'EXT', priorite: 'NORMAL', date_reception: auj() } });
  const v = e.v;
  const etapes = ['Origine', 'Identification', 'Qualification', 'Contrôle'];

  let corps = '';
  if (e.etape === 1) {
    corps = `<fieldset><legend>Provenance du courrier</legend>
      ${Object.values(SOURCES).map(s => `<label style="display:flex;gap:9px;align-items:flex-start;padding:9px;border:1px solid var(--line);border-radius:9px;margin-bottom:8px;cursor:pointer;background:${v.source === s.code ? 'var(--vert-clair)' : '#fff'}">
        <input type="radio" name="src" value="${s.code}" ${v.source === s.code ? 'checked' : ''} style="width:auto;margin-top:3px">
        <span><strong>${ech(s.libelle)}</strong><br><span class="gris" style="font-size:11.5px">${ech(s.desc)}</span></span></label>`).join('')}
      </fieldset>`;
  } else if (e.etape === 2) {
    corps = `<fieldset><legend>Identification du courrier</legend><div class="champs">
      <div class="full"><label>Objet du courrier <span style="color:var(--rouge)">*</span></label><input type="text" id="f_objet" value="${ech(v.objet || '')}"></div>
      <div><label>Entité émettrice</label><input type="text" id="f_entite" list="dlE" value="${ech(v.entite_emettrice || '')}">
        <datalist id="dlE">${D.entites.map(x => `<option value="${ech(x.libelle)}">`).join('')}</datalist></div>
      <div><label>Référence externe (n° du courrier reçu)</label><input type="text" id="f_ref" value="${ech(v.reference_externe || '')}"></div>
      <div><label>Date du courrier</label><input type="date" id="f_dc" value="${v.date_courrier || ''}"></div>
      <div><label>Date de réception <span style="color:var(--rouge)">*</span></label><input type="date" id="f_dr" value="${v.date_reception || auj()}"></div>
      </div></fieldset>`;
  } else if (e.etape === 3) {
    corps = `<fieldset><legend>Qualification et délai de traitement</legend><div class="champs">
      <div><label>Nature du courrier</label><select id="f_nature"><option value="">—</option>
        ${D.natures.filter(n => n.actif).map(n => `<option value="${n.id}" ${String(v.nature_id) === String(n.id) ? 'selected' : ''}>${ech(n.libelle)} — ${n.delai_jours} j</option>`).join('')}</select></div>
      <div><label>Priorité</label><select id="f_prio">
        ${Object.values(PRIORITES).map(p => `<option value="${p.code}" ${v.priorite === p.code ? 'selected' : ''}>${ech(p.libelle)} (× ${p.facteur})</option>`).join('')}</select></div>
      <div><label>Délai de traitement (jours ouvrés)</label><input type="number" id="f_delai" min="1" value="${v.delai_jours || 5}"></div>
      <div><label>Échéance calculée</label><input type="text" id="f_ech" readonly value=""></div>
      <div class="full"><label>Commentaire / instruction du bureau d'ordre</label><textarea id="f_com">${ech(v.commentaire || '')}</textarea></div>
      </div>
      <p class="aide">Le délai proposé provient de la grille de la nature choisie, pondérée par la priorité (urgent × 0,5 ; non urgent × 1,5). L'échéance est calculée en jours ouvrés, jours fériés déduits.</p>
      </fieldset>`;
  } else {
    const ech2 = ajoutOuvres(v.date_reception || auj(), Number(v.delai_jours) || 5);
    corps = `<div class="msgOk">Vérifiez les informations avant enregistrement. Le numéro d'ordre sera attribué automatiquement.</div>
      <div class="tw" style="max-height:none"><table><tbody>
      <tr><th style="width:38%">Source</th><td>${ech(SOURCES[v.source].libelle)}</td></tr>
      <tr><th>Objet</th><td><b>${ech(v.objet || '')}</b></td></tr>
      <tr><th>Entité émettrice</th><td>${ech(v.entite_emettrice || '—')}</td></tr>
      <tr><th>Référence externe</th><td>${ech(v.reference_externe || '—')}</td></tr>
      <tr><th>Date du courrier</th><td>${frDate(v.date_courrier)}</td></tr>
      <tr><th>Date de réception</th><td>${frDate(v.date_reception)}</td></tr>
      <tr><th>Nature</th><td>${ech(v.nature_id ? libNature(v.nature_id) : '—')}</td></tr>
      <tr><th>Priorité</th><td>${ech(PRIORITES[v.priorite].libelle)}</td></tr>
      <tr><th>Délai contractuel</th><td>${v.delai_jours || 5} jours ouvrés</td></tr>
      <tr><th>Échéance de traitement</th><td><b>${frDate(ech2)}</b></td></tr>
      <tr><th>Commentaire</th><td>${v.commentaire ? nl2br(v.commentaire) : '—'}</td></tr>
      </tbody></table></div>`;
  }

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Enregistrer un courrier</h1>
      <p>Saisie guidée en quatre étapes, du bureau d'ordre à la qualification du délai contractuel.</p></div></div>
    <div class="etapes">${etapes.map((t, i) => `<span class="e ${e.etape === i + 1 ? 'actif' : ''}"><span class="n">${i + 1}</span>${t}</span>`).join('')}</div>
    <div class="carte">${corps}
      <div class="barre" style="margin:16px 0 0">
        ${e.etape > 1 ? '<button class="btn" id="prec">← Précédent</button>' : ''}
        ${e.etape < 4 ? '<button class="btn primaire" id="suiv">Suivant →</button>'
                      : '<button class="btn primaire" id="valid">Enregistrer le courrier</button>'}
        <button class="btn danger" id="annul">Tout effacer</button>
      </div>
    </div>`;

  if (e.etape === 3) {
    const maj = () => {
      const n = D.natures.find(x => String(x.id) === $('#f_nature').value);
      const f = PRIORITES[$('#f_prio').value].facteur;
      if (n) $('#f_delai').value = Math.max(1, Math.round(n.delai_jours * f));
      $('#f_ech').value = frDate(ajoutOuvres(v.date_reception || auj(), Number($('#f_delai').value) || 5));
    };
    $('#f_nature').addEventListener('change', maj);
    $('#f_prio').addEventListener('change', maj);
    $('#f_delai').addEventListener('input', () => { $('#f_ech').value = frDate(ajoutOuvres(v.date_reception || auj(), Number($('#f_delai').value) || 5)); });
    $('#f_ech').value = frDate(ajoutOuvres(v.date_reception || auj(), Number(v.delai_jours) || 5));
  }

  const lire = () => {
    if (e.etape === 1) { const r = $('input[name=src]:checked'); if (r) v.source = r.value; }
    if (e.etape === 2) {
      v.objet = $('#f_objet').value.trim(); v.entite_emettrice = $('#f_entite').value.trim() || null;
      v.reference_externe = $('#f_ref').value.trim() || null;
      v.date_courrier = $('#f_dc').value || null; v.date_reception = $('#f_dr').value || auj();
    }
    if (e.etape === 3) {
      v.nature_id = $('#f_nature').value ? Number($('#f_nature').value) : null;
      v.priorite = $('#f_prio').value; v.delai_jours = Number($('#f_delai').value) || 5;
      v.commentaire = $('#f_com').value.trim() || null;
    }
  };
  const p = $('#prec'); if (p) p.addEventListener('click', () => { lire(); e.etape--; vueSaisie(); });
  const s = $('#suiv'); if (s) s.addEventListener('click', () => {
    lire();
    if (e.etape === 2 && !v.objet) { toast("L'objet du courrier est obligatoire.", 'err'); return; }
    e.etape++; vueSaisie();
  });
  const a = $('#annul'); if (a) a.addEventListener('click', () => { D.etat.saisie = null; vueSaisie(); });
  const val = $('#valid'); if (val) val.addEventListener('click', async () => {
    const p2 = {
      source: v.source, entite_emettrice: v.entite_emettrice, nature_id: v.nature_id,
      nature: v.nature_id ? libNature(v.nature_id) : null, objet: v.objet,
      reference_externe: v.reference_externe, date_courrier: v.date_courrier,
      date_reception: v.date_reception || auj(), priorite: v.priorite,
      delai_jours: v.delai_jours || 5,
      echeance: ajoutOuvres(v.date_reception || auj(), v.delai_jours || 5),
      statut: v.nature_id ? 'QUALIFIE' : 'ENREGISTRE',
      date_qualification: v.nature_id ? auj() : null,
      commentaire: v.commentaire, created_by: D.moi.id_acteur
    };
    const { data, error } = await sb.from('courriers').insert(p2).select().single();
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await mouvement(data.id_courrier, 'ENREGISTREMENT', 'Courrier enregistré au bureau d\'ordre');
    if (v.nature_id) await mouvement(data.id_courrier, 'QUALIFICATION', `Nature « ${libNature(v.nature_id)} », délai ${p2.delai_jours} j ouvrés`);
    toast(`Courrier ${data.id_courrier} enregistré.`, 'ok');
    D.etat.saisie = null;
    await chargerCourriers(); aller('imputation');
  });
}
function refus() {
  $('#zone').innerHTML = `<div class="tete"><div><h1>Accès restreint</h1></div></div>
    <div class="carte"><p class="gris">Ce droit d'usage ne vous a pas été attribué. Le Pilote peut l'activer depuis l'accueil D2MG Pilotage, onglet de votre profil.</p></div>`;
}

async function mouvement(id, type, com) {
  await sb.from('courrier_mouvements').insert({ id_courrier: id, type_action: type, commentaire: com || null, acteur_id: D.moi.id_acteur });
}

/* ============================================================= IMPUTATION */
function vueImputation() {
  const lot = visibles().filter(c => c.statut === 'ENREGISTRE' || c.statut === 'QUALIFIE');
  const peutImputer = aDroit('cou.imputer');
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Courriers à imputer</h1>
      <p>${lot.length} courrier(s) en attente d'affectation à un service et à un agent traitant. L'imputation devrait intervenir dans les 24 heures suivant l'enregistrement.</p></div></div>
    ${!peutImputer ? '<div class="carte"><p class="gris">Vous pouvez consulter cette file mais le droit d\'imputation ne vous a pas été attribué.</p></div>' : ''}
    ${lot.length ? lot.map(c => carteImputation(c, peutImputer)).join('') : '<div class="carte"><p class="gris">Aucun courrier en attente. La file est à jour.</p></div>'}`;
  $$('[data-imp]').forEach(b => b.addEventListener('click', async () => {
    const bloc = b.closest('.carte');
    const svc = bloc.querySelector('.s_svc').value;
    const ag = bloc.querySelector('.s_ag').value;
    if (!ag) { toast('Choisissez un agent traitant.', 'err'); return; }
    const { error } = await sb.from('courriers').update({
      service_affecte_id: svc || null, agent_id: ag, statut: 'IMPUTE',
      date_imputation: auj(), updated_at: new Date().toISOString()
    }).eq('id_courrier', b.dataset.imp);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await mouvement(b.dataset.imp, 'IMPUTATION', `Affecté à ${nomAgent(ag)}${svc ? ' — ' + nomService(svc) : ''}`);
    toast('Courrier imputé.', 'ok'); await rafraichir();
  }));
  $$('[data-fiche]').forEach(b => b.addEventListener('click', () => ouvrirFiche(b.dataset.fiche)));
}
function carteImputation(c, peutImputer) {
  const nat = c.nature_id ? libNature(c.nature_id) : (c.nature || '—');
  return `<div class="carte">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div><span class="mono">${ech(c.id_courrier)}</span> · <strong>${ech(c.objet)}</strong>
        <div class="gris" style="font-size:11.5px">${ech(SOURCES[c.source] ? SOURCES[c.source].court : c.source)} · ${ech(c.entite_emettrice || '—')}
          · reçu le ${frDate(c.date_reception)} · nature : ${ech(nat)} · échéance <b>${frDate(c.echeance)}</b></div></div>
      <div style="display:flex;gap:6px;align-items:flex-start">
        <span class="et ${PRIORITES[c.priorite] ? PRIORITES[c.priorite].couleur : 'gris'}">${ech(PRIORITES[c.priorite] ? PRIORITES[c.priorite].libelle : c.priorite)}</span>
        <span class="et ${ST[c.statut].couleur}">${ech(ST[c.statut].libelle)}</span>
        <button class="btn sm" data-fiche="${ech(c.id_courrier)}">Fiche</button></div>
    </div>
    ${peutImputer ? `<div class="champs" style="margin-top:10px">
      <div><label>Service destinataire</label><select class="s_svc"><option value="">—</option>
        ${D.services.filter(s => s.actif).map(s => `<option value="${s.id}">${ech(s.libelle)}</option>`).join('')}</select></div>
      <div><label>Agent traitant</label><select class="s_ag"><option value="">—</option>
        ${D.agents.map(a => { const n = D.courriers.filter(x => x.agent_id === a.id_acteur && !estClos(x)).length;
          return `<option value="${ech(a.id_acteur)}">${ech(a.nom_prenoms)} (${n} en cours)</option>`; }).join('')}</select></div>
      </div>
      <button class="btn primaire sm" data-imp="${ech(c.id_courrier)}" style="margin-top:10px">Imputer</button>` : ''}
  </div>`;
}

/* =========================================================== MES COURRIERS */
function vueMes() {
  const lot = visibles().filter(c => c.agent_id === D.moi.id_acteur && !estClos(c))
    .sort((a, b) => (a.echeance || '9') < (b.echeance || '9') ? -1 : 1);
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Mes courriers</h1>
      <p>${lot.length} courrier(s) ouverts à votre nom, classés par échéance la plus proche.</p></div></div>
    ${lot.length ? `<div class="tw"><table><thead><tr>
      <th>N° d'ordre</th><th>Objet</th><th>Source</th><th>Nature</th><th class="centre">Échéance</th><th class="centre">Reste</th><th>Statut</th><th></th>
    </tr></thead><tbody>${lot.map(c => {
      const n = joursRestants(c); const et = etatEcheance(c);
      return `<tr><td class="mono">${ech(c.id_courrier)}</td><td>${ech(c.objet)}</td>
        <td>${ech(SOURCES[c.source] ? SOURCES[c.source].court : c.source)}</td>
        <td>${ech(c.nature_id ? libNature(c.nature_id) : (c.nature || '—'))}</td>
        <td class="centre">${frDate(c.echeance)}</td>
        <td class="centre">${n === null ? '—' : `<b style="color:${et === 'retard' ? 'var(--rouge)' : et === 'proche' ? 'var(--orange)' : 'var(--vert)'}">${n < 0 ? '+' + Math.abs(n) + ' j' : n + ' j'}</b>`}</td>
        <td><span class="et ${ST[c.statut].couleur}">${ech(ST[c.statut].libelle)}</span></td>
        <td><button class="btn sm" data-fiche="${ech(c.id_courrier)}">Ouvrir</button></td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="carte"><p class="gris">Aucun courrier ouvert à votre nom.</p></div>'}`;
  $$('[data-fiche]').forEach(b => b.addEventListener('click', () => ouvrirFiche(b.dataset.fiche)));
}

/* ================================================================= KANBAN */
function vueKanban() {
  const f = D.etat.kanban || (D.etat.kanban = { service: '', agent: '', source: '' });
  let lot = visibles();
  if (f.service) lot = lot.filter(c => String(c.service_affecte_id) === f.service);
  if (f.agent) lot = lot.filter(c => c.agent_id === f.agent);
  if (f.source) lot = lot.filter(c => c.source === f.source);

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Suivi du courrier (kanban)</h1>
      <p>Circuit complet, de l'enregistrement au classement. Le liseré coloré signale l'état de l'échéance : rouge en retard, orange sous 2 jours ouvrés.</p></div></div>
    <div class="barre">
      <div style="min-width:190px"><label>Service</label><select id="f_svc"><option value="">Tous</option>
        ${D.services.map(s => `<option value="${s.id}" ${f.service === String(s.id) ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}</select></div>
      <div style="min-width:190px"><label>Agent</label><select id="f_ag"><option value="">Tous</option>
        ${D.agents.map(a => `<option value="${ech(a.id_acteur)}" ${f.agent === a.id_acteur ? 'selected' : ''}>${ech(a.nom_prenoms)}</option>`).join('')}</select></div>
      <div style="min-width:170px"><label>Source</label><select id="f_src"><option value="">Toutes</option>
        ${Object.values(SOURCES).map(s => `<option value="${s.code}" ${f.source === s.code ? 'selected' : ''}>${ech(s.court)}</option>`).join('')}</select></div>
      <span class="gris" style="font-size:11.5px;padding-bottom:9px">${lot.length} courrier(s)</span>
    </div>
    <div class="kanban">${STATUTS.map(st => {
      const items = lot.filter(c => c.statut === st.code);
      const r = items.filter(c => etatEcheance(c) === 'retard').length;
      return `<div class="kcol"><h4 title="${ech(st.desc)}"><span>${ech(st.court)}</span>
        <span>${items.length}${r ? ` · <b style="color:var(--rouge)">${r}</b>` : ''}</span></h4>
        ${items.map(c => `<div class="fiche ${etatEcheance(c)}" data-fiche="${ech(c.id_courrier)}">
          <span class="mono">${ech(c.id_courrier)}</span><br><strong>${ech((c.objet || '').slice(0, 58))}</strong><br>
          <span class="gris">${ech(c.agent_id ? nomAgent(c.agent_id) : 'non affecté')}${c.echeance ? ' · ' + frDate(c.echeance) : ''}</span></div>`).join('')
          || '<div class="gris" style="font-size:11px;padding:5px">—</div>'}
      </div>`;
    }).join('')}</div>`;

  $('#f_svc').addEventListener('change', e => { f.service = e.target.value; vueKanban(); });
  $('#f_ag').addEventListener('change', e => { f.agent = e.target.value; vueKanban(); });
  $('#f_src').addEventListener('change', e => { f.source = e.target.value; vueKanban(); });
  $$('[data-fiche]').forEach(b => b.addEventListener('click', () => ouvrirFiche(b.dataset.fiche)));
}

/* =============================================================== REGISTRE */
function vueRegistre() {
  const f = D.etat.registre || (D.etat.registre = { q: '', statut: '', source: '', service: '', tri: 'date_reception', sens: -1 });
  let lot = visibles();
  if (f.q) { const q = f.q.toLowerCase();
    lot = lot.filter(c => [c.id_courrier, c.objet, c.entite_emettrice, c.reference_externe, c.nature].some(x => (x || '').toLowerCase().includes(q))); }
  if (f.statut) lot = lot.filter(c => c.statut === f.statut);
  if (f.source) lot = lot.filter(c => c.source === f.source);
  if (f.service) lot = lot.filter(c => String(c.service_affecte_id) === f.service);
  lot = lot.slice().sort((a, b) => ((a[f.tri] || '') < (b[f.tri] || '') ? -1 : 1) * f.sens);

  const col = (k, l) => `<th class="tri" data-tri="${k}">${l}${f.tri === k ? (f.sens > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Registre général des courriers</h1>
      <p>Registre unique et traçable de la D2MG. ${lot.length} courrier(s) affiché(s) sur ${visibles().length} visibles.</p></div>
      ${aDroit('cou.exporter') ? '<button class="btn" id="btnCsv">Exporter en CSV</button>' : ''}</div>
    <div class="barre">
      <div style="min-width:260px"><label>Recherche</label><input type="text" id="f_q" value="${ech(f.q)}" placeholder="Objet, entité, référence, n° d'ordre..."></div>
      <div style="min-width:170px"><label>Statut</label><select id="f_st"><option value="">Tous</option>
        ${STATUTS.map(s => `<option value="${s.code}" ${f.statut === s.code ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}</select></div>
      <div style="min-width:160px"><label>Source</label><select id="f_so"><option value="">Toutes</option>
        ${Object.values(SOURCES).map(s => `<option value="${s.code}" ${f.source === s.code ? 'selected' : ''}>${ech(s.court)}</option>`).join('')}</select></div>
      <div style="min-width:180px"><label>Service</label><select id="f_sv"><option value="">Tous</option>
        ${D.services.map(s => `<option value="${s.id}" ${f.service === String(s.id) ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}</select></div>
    </div>
    <div class="tw"><table><thead><tr>
      ${col('id_courrier', "N° d'ordre")}${col('objet', 'Objet')}${col('source', 'Source')}
      <th>Entité</th>${col('date_reception', 'Reçu le')}${col('echeance', 'Échéance')}
      <th>Service</th><th>Agent</th>${col('statut', 'Statut')}<th></th>
    </tr></thead><tbody>${lot.map(c => `<tr>
      <td class="mono">${ech(c.id_courrier)}</td><td>${ech(c.objet)}</td>
      <td>${ech(SOURCES[c.source] ? SOURCES[c.source].court : c.source)}</td>
      <td>${ech(c.entite_emettrice || '—')}</td><td>${frDate(c.date_reception)}</td>
      <td>${frDate(c.echeance)}${etatEcheance(c) === 'retard' ? ' <span class="et rouge">retard</span>' : ''}</td>
      <td>${ech(c.service_affecte_id ? nomService(c.service_affecte_id) : '—')}</td>
      <td>${ech(c.agent_id ? nomAgent(c.agent_id) : '—')}</td>
      <td><span class="et ${ST[c.statut].couleur}">${ech(ST[c.statut].court)}</span></td>
      <td><button class="btn sm" data-fiche="${ech(c.id_courrier)}">Ouvrir</button></td></tr>`).join('')}
    </tbody></table>${lot.length ? '' : '<div class="vide">Aucun courrier ne correspond à ces critères.</div>'}</div>`;

  $('#f_q').addEventListener('input', e => { f.q = e.target.value; clearTimeout(D._t); D._t = setTimeout(vueRegistre, 260); });
  $('#f_st').addEventListener('change', e => { f.statut = e.target.value; vueRegistre(); });
  $('#f_so').addEventListener('change', e => { f.source = e.target.value; vueRegistre(); });
  $('#f_sv').addEventListener('change', e => { f.service = e.target.value; vueRegistre(); });
  $$('[data-tri]').forEach(th => th.addEventListener('click', () => {
    if (f.tri === th.dataset.tri) f.sens = -f.sens; else { f.tri = th.dataset.tri; f.sens = 1; }
    vueRegistre();
  }));
  $$('[data-fiche]').forEach(b => b.addEventListener('click', () => ouvrirFiche(b.dataset.fiche)));
  const cs = $('#btnCsv');
  if (cs) cs.addEventListener('click', () => {
    const head = ["N° d'ordre", 'Source', 'Entité émettrice', 'Référence externe', 'Objet', 'Nature', 'Priorité',
      'Date courrier', 'Date réception', 'Délai (j)', 'Échéance', 'Service', 'Agent', 'Statut', 'Date clôture'];
    const l = [head.join(';')].concat(lot.map(c => [c.id_courrier, SOURCES[c.source] ? SOURCES[c.source].libelle : c.source,
      c.entite_emettrice || '', c.reference_externe || '', c.objet, c.nature_id ? libNature(c.nature_id) : (c.nature || ''),
      PRIORITES[c.priorite] ? PRIORITES[c.priorite].libelle : c.priorite, c.date_courrier || '', c.date_reception || '',
      c.delai_jours || '', c.echeance || '', c.service_affecte_id ? nomService(c.service_affecte_id) : '',
      c.agent_id ? nomAgent(c.agent_id) : '', ST[c.statut].libelle, c.date_cloture || '']
      .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')));
    const b = new Blob(['﻿' + l.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = 'registre_courriers_D2MG_' + auj() + '.csv'; a.click(); URL.revokeObjectURL(u);
    toast('Registre exporté.', 'ok');
  });
}

/* =============================================== FICHE COURRIER (volet) */
async function ouvrirFiche(id) {
  const c = D.courriers.find(x => x.id_courrier === id);
  if (!c) return;
  const { data: mvt } = await sb.from('courrier_mouvements').select('*').eq('id_courrier', id).order('created_at', { ascending: false });
  const { data: rel } = await sb.from('courrier_relances').select('*').eq('id_courrier', id).order('created_at', { ascending: false });

  const voile = document.createElement('div'); voile.className = 'voile'; voile.id = 'voile';
  voile.addEventListener('click', fermerFiche); document.body.appendChild(voile);

  const v = document.createElement('div'); v.className = 'volet'; v.id = 'volet';
  const n = joursRestants(c);
  v.innerHTML = `<button class="fermer" id="fFerm">✕</button>
    <h2 style="color:var(--vert-fonce);font-size:16px;margin:0 0 3px" class="mono">${ech(c.id_courrier)}</h2>
    <p style="margin:0 0 10px;font-size:14px"><strong>${ech(c.objet)}</strong></p>
    <div style="margin-bottom:12px">
      <span class="et ${ST[c.statut].couleur}">${ech(ST[c.statut].libelle)}</span>
      <span class="et ${PRIORITES[c.priorite] ? PRIORITES[c.priorite].couleur : 'gris'}">${ech(PRIORITES[c.priorite] ? PRIORITES[c.priorite].libelle : c.priorite)}</span>
      ${!estClos(c) && n !== null ? `<span class="et ${n < 0 ? 'rouge' : n <= 2 ? 'orange' : 'vert'}">${n < 0 ? 'retard de ' + Math.abs(n) + ' j ouvrés' : 'reste ' + n + ' j ouvrés'}</span>` : ''}
    </div>
    <div class="tw" style="max-height:none;margin-bottom:14px"><table><tbody>
      <tr><th style="width:42%">Source</th><td>${ech(SOURCES[c.source] ? SOURCES[c.source].libelle : c.source)}</td></tr>
      <tr><th>Entité émettrice</th><td>${ech(c.entite_emettrice || '—')}</td></tr>
      <tr><th>Référence externe</th><td>${ech(c.reference_externe || '—')}</td></tr>
      <tr><th>Nature</th><td>${ech(c.nature_id ? libNature(c.nature_id) : (c.nature || '—'))}</td></tr>
      <tr><th>Date du courrier</th><td>${frDate(c.date_courrier)}</td></tr>
      <tr><th>Date de réception</th><td>${frDate(c.date_reception)}</td></tr>
      <tr><th>Délai contractuel</th><td>${c.delai_jours || '—'} jours ouvrés</td></tr>
      <tr><th>Échéance</th><td><b>${frDate(c.echeance)}</b></td></tr>
      <tr><th>Service destinataire</th><td>${ech(c.service_affecte_id ? nomService(c.service_affecte_id) : '—')}</td></tr>
      <tr><th>Agent traitant</th><td>${ech(c.agent_id ? nomAgent(c.agent_id) : '—')}</td></tr>
      ${c.date_cloture ? `<tr><th>Clôturé le</th><td>${frDate(c.date_cloture)}</td></tr>` : ''}
      ${c.motif ? `<tr><th>Motif</th><td>${nl2br(c.motif)}</td></tr>` : ''}
      ${c.commentaire ? `<tr><th>Commentaire initial</th><td>${nl2br(c.commentaire)}</td></tr>` : ''}
    </tbody></table></div>
    <div id="actionsFiche" style="margin-bottom:14px"></div>
    <h3 style="color:var(--vert-fonce);font-size:13px;margin-bottom:8px">Historique du traitement</h3>
    <ul class="chrono">${(mvt || []).map(m => `<li><div class="q">${new Date(m.created_at).toLocaleString('fr-FR')} — ${ech(nomAgent(m.acteur_id))}</div>
      <strong>${ech(libAction(m.type_action))}</strong>${m.commentaire ? '<br>' + nl2br(m.commentaire) : ''}</li>`).join('')
      || '<li class="gris">Aucun mouvement enregistré.</li>'}</ul>
    ${(rel || []).length ? `<h3 style="color:var(--vert-fonce);font-size:13px;margin:16px 0 8px">Relances (${rel.length})</h3>
      <ul class="chrono">${rel.map(r => `<li><div class="q">${new Date(r.created_at).toLocaleString('fr-FR')} — ${ech(nomAgent(r.acteur_id))}</div>
        Relance adressée à ${ech(nomAgent(r.destinataire_id))}</li>`).join('')}</ul>` : ''}`;
  document.body.appendChild(v);
  $('#fFerm').addEventListener('click', fermerFiche);
  construireActionsFiche(c);
}
function libAction(t) {
  return { ENREGISTREMENT: 'Enregistrement', QUALIFICATION: 'Qualification', IMPUTATION: 'Imputation',
    PRISE_EN_MAIN: 'Prise en main', REPONSE: 'Réponse rédigée', CLOTURE: 'Clôture',
    SANS_SUITE: 'Classement sans suite', REOUVERTURE: 'Réouverture', COMMENTAIRE: 'Commentaire',
    RELANCE: 'Relance' }[t] || t;
}
function fermerFiche() { const a = $('#voile'), b = $('#volet'); if (a) a.remove(); if (b) b.remove(); }

function construireActionsFiche(c) {
  const z = $('#actionsFiche'); if (!z) return;
  const estMien = c.agent_id === D.moi.id_acteur;
  const acts = [];
  if (c.statut === 'ENREGISTRE' && aDroit('cou.qualifier')) acts.push({ id: 'qualifier', lib: 'Qualifier (nature & délai)', cl: 'primaire' });
  if ((c.statut === 'ENREGISTRE' || c.statut === 'QUALIFIE') && aDroit('cou.imputer')) acts.push({ id: 'imputer', lib: 'Imputer', cl: 'primaire' });
  if (c.statut === 'IMPUTE' && (estMien || aDroit('cou.imputer')) && aDroit('cou.traiter')) acts.push({ id: 'prendre', lib: 'Prendre en main', cl: 'primaire' });
  if (c.statut === 'EN_TRAITEMENT' && (estMien || aDroit('cou.repondre')) && aDroit('cou.repondre')) acts.push({ id: 'reponse', lib: 'Réponse rédigée', cl: '' });
  if (['EN_TRAITEMENT', 'REPONSE'].includes(c.statut) && aDroit('cou.cloturer')) acts.push({ id: 'cloturer', lib: 'Clôturer', cl: 'primaire' });
  if (!estClos(c) && aDroit('cou.sans_suite')) acts.push({ id: 'sansSuite', lib: 'Classer sans suite', cl: '' });
  if (estClos(c) && aDroit('cou.rouvrir')) acts.push({ id: 'rouvrir', lib: 'Rouvrir', cl: '' });
  if (!estClos(c) && c.agent_id && aDroit('cou.relancer')) acts.push({ id: 'relancer', lib: 'Relancer l\'agent', cl: 'doux' });
  if (aDroit('cou.traiter') || aDroit('cou.qualifier')) acts.push({ id: 'commenter', lib: 'Ajouter un commentaire', cl: 'doux' });
  if (aDroit('cou.supprimer')) acts.push({ id: 'supprimer', lib: 'Supprimer', cl: 'danger' });

  z.innerHTML = acts.length
    ? `<div class="barre" style="margin:0">${acts.map(a => `<button class="btn sm ${a.cl}" data-act="${a.id}">${ech(a.lib)}</button>`).join('')}</div>`
    : '<p class="gris" style="font-size:11.5px">Aucune action disponible avec vos droits d\'usage à ce stade du circuit.</p>';
  $$('[data-act]', z).forEach(b => b.addEventListener('click', () => actionFiche(c, b.dataset.act)));
}

async function majCourrier(c, patch, typeMvt, com) {
  patch.updated_at = new Date().toISOString();
  const { error } = await sb.from('courriers').update(patch).eq('id_courrier', c.id_courrier);
  if (error) { toast('Erreur : ' + error.message, 'err'); return false; }
  if (typeMvt) await mouvement(c.id_courrier, typeMvt, com);
  return true;
}

function actionFiche(c, act) {
  if (act === 'prendre') return void (async () => {
    if (await majCourrier(c, { statut: 'EN_TRAITEMENT' }, 'PRISE_EN_MAIN', 'Courrier pris en main'))
    { toast('Courrier pris en main.', 'ok'); fermerFiche(); await rafraichir(); }
  })();
  if (act === 'reponse') return void modaleTexte('Réponse rédigée', 'Référence / objet de la réponse produite', async t => {
    if (await majCourrier(c, { statut: 'REPONSE', date_reponse: auj(), reponse_reference: t }, 'REPONSE', t))
    { toast('Réponse enregistrée.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
  });
  if (act === 'cloturer') return void modaleTexte('Clôturer le courrier', 'Suite donnée / preuve de traitement', async t => {
    if (await majCourrier(c, { statut: 'CLOTURE', date_cloture: auj() }, 'CLOTURE', t))
    { toast('Courrier clôturé.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
  });
  if (act === 'sansSuite') return void modaleTexte('Classer sans suite', 'Motif du classement (obligatoire)', async t => {
    if (!t) { toast('Le motif est obligatoire.', 'err'); return; }
    if (await majCourrier(c, { statut: 'SANS_SUITE', motif: t, date_cloture: auj() }, 'SANS_SUITE', t))
    { toast('Courrier classé sans suite.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
  }, 1);
  if (act === 'rouvrir') return void modaleTexte('Rouvrir le courrier', 'Motif de la réouverture', async t => {
    if (await majCourrier(c, { statut: 'EN_TRAITEMENT', date_cloture: null }, 'REOUVERTURE', t))
    { toast('Courrier rouvert.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
  });
  if (act === 'commenter') return void modaleTexte('Ajouter un commentaire', 'Commentaire de suivi', async t => {
    if (!t) return;
    await mouvement(c.id_courrier, 'COMMENTAIRE', t);
    await sb.from('courriers').update({ updated_at: new Date().toISOString() }).eq('id_courrier', c.id_courrier);
    toast('Commentaire ajouté.', 'ok'); fermerModale(); fermerFiche(); await rafraichir();
  }, 1);
  if (act === 'relancer') return void relancerUn(c);
  if (act === 'qualifier') return void modaleQualifier(c);
  if (act === 'imputer') return void modaleImputer(c);
  if (act === 'supprimer') return void (async () => {
    if (!confirm('Supprimer définitivement ce courrier et son historique ?')) return;
    const { error } = await sb.from('courriers').delete().eq('id_courrier', c.id_courrier);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    toast('Courrier supprimé.', 'ok'); fermerFiche(); await rafraichir();
  })();
}

function modaleTexte(titre, label, cb, req) {
  ouvrirModale(titre, `<label>${ech(label)}${req ? ' <span style="color:var(--rouge)">*</span>' : ''}</label><textarea id="mt" rows="4"></textarea>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale }, { lib: 'Valider', cl: 'primaire', act: () => cb($('#mt').value.trim()) }]);
}
function modaleQualifier(c) {
  ouvrirModale('Qualifier le courrier', `<div class="champs">
    <div><label>Nature</label><select id="q_nat"><option value="">—</option>
      ${D.natures.filter(n => n.actif).map(n => `<option value="${n.id}">${ech(n.libelle)} — ${n.delai_jours} j</option>`).join('')}</select></div>
    <div><label>Priorité</label><select id="q_prio">${Object.values(PRIORITES).map(p => `<option value="${p.code}" ${c.priorite === p.code ? 'selected' : ''}>${ech(p.libelle)}</option>`).join('')}</select></div>
    <div><label>Délai (jours ouvrés)</label><input type="number" id="q_del" min="1" value="${c.delai_jours || 5}"></div>
    <div><label>Nouvelle échéance</label><input type="text" id="q_ech" readonly></div></div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Qualifier', cl: 'primaire', act: async () => {
        const nid = $('#q_nat').value ? Number($('#q_nat').value) : null;
        const del = Number($('#q_del').value) || 5;
        const p = { nature_id: nid, nature: nid ? libNature(nid) : null, priorite: $('#q_prio').value,
          delai_jours: del, echeance: ajoutOuvres(c.date_reception, del), statut: 'QUALIFIE', date_qualification: auj() };
        if (await majCourrier(c, p, 'QUALIFICATION', `Nature « ${nid ? libNature(nid) : '—'} », délai ${del} j ouvrés, échéance ${frDate(p.echeance)}`))
        { toast('Courrier qualifié.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
      } }]);
  const maj = () => {
    const n = D.natures.find(x => String(x.id) === $('#q_nat').value);
    const f = PRIORITES[$('#q_prio').value].facteur;
    if (n) $('#q_del').value = Math.max(1, Math.round(n.delai_jours * f));
    $('#q_ech').value = frDate(ajoutOuvres(c.date_reception, Number($('#q_del').value) || 5));
  };
  $('#q_nat').addEventListener('change', maj); $('#q_prio').addEventListener('change', maj);
  $('#q_del').addEventListener('input', maj); maj();
}
function modaleImputer(c) {
  ouvrirModale('Imputer le courrier', `<div class="champs">
    <div><label>Service destinataire</label><select id="i_svc"><option value="">—</option>
      ${D.services.filter(s => s.actif).map(s => `<option value="${s.id}" ${String(c.service_affecte_id) === String(s.id) ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}</select></div>
    <div><label>Agent traitant</label><select id="i_ag"><option value="">—</option>
      ${D.agents.map(a => { const n = D.courriers.filter(x => x.agent_id === a.id_acteur && !estClos(x)).length;
        return `<option value="${ech(a.id_acteur)}" ${c.agent_id === a.id_acteur ? 'selected' : ''}>${ech(a.nom_prenoms)} (${n} en cours${n > seuilDe(a.id_acteur) ? ' — surcharge' : ''})</option>`; }).join('')}</select></div>
    <div class="full"><label>Instruction d'imputation</label><textarea id="i_com" rows="3"></textarea></div></div>`,
    [{ lib: 'Annuler', cl: '', act: fermerModale },
     { lib: 'Imputer', cl: 'primaire', act: async () => {
        const ag = $('#i_ag').value; if (!ag) { toast('Choisissez un agent traitant.', 'err'); return; }
        const p = { service_affecte_id: $('#i_svc').value || null, agent_id: ag, statut: 'IMPUTE', date_imputation: auj() };
        if (await majCourrier(c, p, 'IMPUTATION', `Affecté à ${nomAgent(ag)}` + ($('#i_com').value.trim() ? ' — ' + $('#i_com').value.trim() : '')))
        { toast('Courrier imputé.', 'ok'); fermerModale(); fermerFiche(); await rafraichir(); }
      } }]);
}

/* ==================================================== ALERTES & RELANCES */
function vueAlertes() {
  const lot = visibles().filter(c => !estClos(c));
  const retard = lot.filter(c => etatEcheance(c) === 'retard');
  const proche = lot.filter(c => etatEcheance(c) === 'proche');
  const nonImp = lot.filter(c => c.statut === 'ENREGISTRE' || c.statut === 'QUALIFIE');
  const dormants = lot.filter(c => c.updated_at && ecartOuvres(c.updated_at.slice(0, 10), auj()) >= 7);
  const sansAgent = lot.filter(c => !c.agent_id);
  const charge = {}; lot.filter(c => c.agent_id).forEach(c => charge[c.agent_id] = (charge[c.agent_id] || 0) + 1);
  const surcharge = Object.keys(charge).filter(id => charge[id] > seuilDe(id));

  const ligne = c => {
    const n = joursRestants(c);
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--line)">
      <div><span class="mono">${ech(c.id_courrier)}</span> <strong>${ech(c.objet)}</strong>
        <div class="gris" style="font-size:11.5px">${ech(c.agent_id ? nomAgent(c.agent_id) : 'non affecté')} · échéance ${frDate(c.echeance)}
        ${n !== null && n < 0 ? ` · <b style="color:var(--rouge)">retard de ${Math.abs(n)} j ouvrés</b>` : ''}</div></div>
      <div style="display:flex;gap:5px">
        <button class="btn sm" data-fiche="${ech(c.id_courrier)}">Fiche</button>
        ${c.agent_id && aDroit('cou.relancer') ? `<button class="btn sm doux" data-rel="${ech(c.id_courrier)}">Relancer</button>` : ''}</div>
    </div>`;
  };
  const bloc = (t, arr, aide) => `<div class="carte"><h3>${t} <span class="et ${arr.length ? 'rouge' : 'vert'}">${arr.length}</span></h3>
    ${arr.length ? arr.map(ligne).join('') : '<p class="gris">Rien à signaler.</p>'}
    ${aide ? `<p class="aide">${aide}</p>` : ''}</div>`;

  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Alertes & relances</h1>
      <p>Pilotage par exception : ce qui dépasse le délai, ce qui va le dépasser, ce qui n'avance plus. Les délais sont comptés en jours ouvrés, jours fériés déduits.</p></div>
      ${aDroit('cou.relancer') && (retard.length || proche.length) ? '<button class="btn primaire" id="btnRelGrp">Relance groupée par agent</button>' : ''}</div>
    <div class="kpis">
      <div class="kpi ${retard.length ? 'ko' : 'ok'}"><div class="lib">Courriers en retard</div><div class="val">${retard.length}</div></div>
      <div class="kpi ${proche.length ? 'al' : 'ok'}"><div class="lib">Échéance sous 2 j ouvrés</div><div class="val">${proche.length}</div></div>
      <div class="kpi ${nonImp.length ? 'al' : 'ok'}"><div class="lib">Non imputés</div><div class="val">${nonImp.length}</div></div>
      <div class="kpi ${sansAgent.length ? 'al' : 'ok'}"><div class="lib">Sans agent traitant</div><div class="val">${sansAgent.length}</div></div>
      <div class="kpi ${dormants.length ? 'al' : 'ok'}"><div class="lib">Dormants (7 j ouvrés sans mouvement)</div><div class="val">${dormants.length}</div></div>
      <div class="kpi ${surcharge.length ? 'ko' : 'ok'}"><div class="lib">Agents en surcharge</div><div class="val">${surcharge.length}</div></div>
    </div>
    ${bloc('Courriers en retard', retard, "Priorité absolue : relancer le responsable et fixer une date de traitement ferme.")}
    ${bloc('Échéance proche', proche)}
    ${bloc('En attente d\'imputation', nonImp, "L'imputation devrait intervenir dans les 24 heures suivant l'enregistrement.")}
    ${bloc('Courriers dormants', dormants, "Aucun mouvement depuis 7 jours ouvrés : vérifier qu'il n'y a pas de blocage silencieux.")}
    ${surcharge.length ? `<div class="carte"><h3>Charge de travail</h3>
      ${surcharge.map(id => `<p style="margin:0 0 6px">⚠️ <strong>${ech(nomAgent(id))}</strong> porte ${charge[id]} courriers ouverts, au-delà du seuil paramétré (${seuilDe(id)}).</p>`).join('')}
      <p class="aide">Limiter l'en-cours par agent est un principe lean : au-delà du seuil, le délai moyen de traitement se dégrade sans que le volume traité n'augmente.</p></div>` : ''}`;

  $$('[data-fiche]').forEach(b => b.addEventListener('click', () => ouvrirFiche(b.dataset.fiche)));
  $$('[data-rel]').forEach(b => b.addEventListener('click', () => relancerUn(D.courriers.find(c => c.id_courrier === b.dataset.rel))));
  const g = $('#btnRelGrp'); if (g) g.addEventListener('click', () => relanceGroupee(retard.concat(proche)));
}

function texteRelance(c) {
  const n = joursRestants(c);
  return `Objet : Relance — courrier ${c.id_courrier} : ${c.objet}

Bonjour ${nomAgent(c.agent_id)},

Le courrier ci-dessous, qui vous a été imputé, appelle votre attention :

  N° d'ordre       : ${c.id_courrier}
  Objet            : ${c.objet}
  Émetteur         : ${c.entite_emettrice || '—'}
  Reçu le          : ${frDate(c.date_reception)}
  Échéance         : ${frDate(c.echeance)}${n !== null && n < 0 ? ` (dépassée de ${Math.abs(n)} jour(s) ouvré(s))` : n !== null ? ` (dans ${n} jour(s) ouvré(s))` : ''}
  Statut actuel    : ${ST[c.statut].libelle}

Merci de me faire retour sur l'état d'avancement du traitement et, le cas échéant, sur les difficultés rencontrées.

Cordialement,
${D.moi.nom_prenoms}
${D.moi.fonction || ''}`;
}
async function relancerUn(c) {
  const t = texteRelance(c);
  ouvrirModale('Relance — ' + c.id_courrier,
    `<p class="aide" style="margin:0 0 9px">Texte prêt à être copié dans votre messagerie. La relance sera tracée dans l'historique du courrier.</p>
     <textarea id="txtRel" rows="16" style="font-family:'Courier New',monospace;font-size:11.5px">${ech(t)}</textarea>`,
    [{ lib: 'Fermer', cl: '', act: fermerModale },
     { lib: 'Copier et tracer', cl: 'primaire', act: async () => {
        copier($('#txtRel').value);
        await sb.from('courrier_relances').insert({ id_courrier: c.id_courrier, destinataire_id: c.agent_id, texte: $('#txtRel').value, acteur_id: D.moi.id_acteur });
        await mouvement(c.id_courrier, 'RELANCE', 'Relance adressée à ' + nomAgent(c.agent_id));
        fermerModale(); fermerFiche(); await rafraichir();
      } }]);
}
function relanceGroupee(lot) {
  const par = {};
  lot.filter(c => c.agent_id).forEach(c => (par[c.agent_id] = par[c.agent_id] || []).push(c));
  const ids = Object.keys(par);
  if (!ids.length) { toast('Aucune relance à générer.', 'ok'); return; }
  ouvrirModale('Relance groupée par agent',
    ids.map(id => `<div class="carte" style="margin-bottom:10px"><h3>${ech(nomAgent(id))} — ${par[id].length} courrier(s)</h3>
      <ul style="margin:0 0 9px;padding-left:18px;font-size:12px">${par[id].map(c => `<li><span class="mono">${ech(c.id_courrier)}</span> ${ech(c.objet)} — échéance ${frDate(c.echeance)}</li>`).join('')}</ul>
      <button class="btn sm doux" data-relg="${ech(id)}">Copier et tracer</button></div>`).join(''),
    [{ lib: 'Fermer', cl: '', act: fermerModale }]);
  $$('[data-relg]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.relg;
    const t = `Objet : Point de situation — courriers en attente de traitement

Bonjour ${nomAgent(id)},

Les courriers suivants, qui vous ont été imputés, arrivent à échéance ou l'ont dépassée :

${par[id].map(c => { const n = joursRestants(c);
  return `  - ${c.id_courrier} : ${c.objet}\n    échéance ${frDate(c.echeance)}${n !== null && n < 0 ? ` — dépassée de ${Math.abs(n)} j ouvrés` : ''} — statut : ${ST[c.statut].libelle}`;
}).join('\n')}

Merci de me transmettre l'état d'avancement de chacun d'eux.

Cordialement,
${D.moi.nom_prenoms}
${D.moi.fonction || ''}`;
    copier(t);
    for (const c of par[id]) {
      await sb.from('courrier_relances').insert({ id_courrier: c.id_courrier, destinataire_id: id, texte: t, acteur_id: D.moi.id_acteur });
      await mouvement(c.id_courrier, 'RELANCE', 'Relance groupée adressée à ' + nomAgent(id));
    }
    toast('Relance copiée et tracée sur ' + par[id].length + ' courrier(s).', 'ok');
  }));
}
function copier(t) {
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(t).then(() => toast('Texte copié dans le presse-papiers.', 'ok'), () => toast('Copie impossible.', 'err'));
  else toast('Copie automatique non supportée par ce navigateur.', 'err');
}

/* =============================================================== RAPPORTS */
function periodes() {
  const d = new Date(), a = d.getFullYear(), m = d.getMonth(), t = Math.floor(m / 3);
  const f = x => iso(x);
  return {
    SEMAINE:   { lib: 'Semaine en cours',    debut: f(new Date(a, m, d.getDate() - ((d.getDay() + 6) % 7))), fin: auj() },
    MOIS:      { lib: 'Mois en cours',       debut: f(new Date(a, m, 1)),      fin: auj() },
    MOIS_PREC: { lib: 'Mois précédent',      debut: f(new Date(a, m - 1, 1)),  fin: f(new Date(a, m, 0)) },
    TRIMESTRE: { lib: 'Trimestre en cours',  debut: f(new Date(a, t * 3, 1)),  fin: auj() },
    TRIM_PREC: { lib: 'Trimestre précédent', debut: f(new Date(a, t * 3 - 3, 1)), fin: f(new Date(a, t * 3, 0)) },
    SEMESTRE:  { lib: 'Semestre en cours',   debut: f(new Date(a, m < 6 ? 0 : 6, 1)), fin: auj() },
    ANNEE:     { lib: 'Année en cours',      debut: f(new Date(a, 0, 1)),      fin: auj() },
    PERSO:     { lib: 'Période personnalisée', debut: '', fin: '' }
  };
}
function vueRapports() {
  if (!aDroit('cou.rapport')) { refus(); return; }
  const st = D.etat.rapports || (D.etat.rapports = { type: 'MOIS', debut: '', fin: '', service: '', source: '', genere: false });
  const P = periodes();
  $('#zone').innerHTML = `
    <div class="tete noPrint"><div><h1>Rapports périodiques</h1>
      <p>Rapport institutionnel au format attendu pour le bilan d'animation du processus PS3 : synthèse, performance par source et par service, analyse des écarts, charge, conclusions.</p></div></div>
    <div class="carte noPrint"><h3>Paramètres du rapport</h3>
      <div class="barre">
        <div style="min-width:200px"><label>Période</label><select id="r_type">
          ${Object.entries(P).map(([k, v]) => `<option value="${k}" ${st.type === k ? 'selected' : ''}>${ech(v.lib)}</option>`).join('')}</select></div>
        <div style="min-width:150px"><label>Du</label><input type="date" id="r_debut" value="${st.debut || P[st.type].debut}"></div>
        <div style="min-width:150px"><label>Au</label><input type="date" id="r_fin" value="${st.fin || P[st.type].fin || auj()}"></div>
        <div style="min-width:180px"><label>Service</label><select id="r_svc"><option value="">Tous les services</option>
          ${D.services.map(s => `<option value="${s.id}" ${st.service === String(s.id) ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}</select></div>
        <div style="min-width:170px"><label>Source</label><select id="r_src"><option value="">Toutes</option>
          ${Object.values(SOURCES).map(s => `<option value="${s.code}" ${st.source === s.code ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}</select></div>
        <button class="btn primaire" id="r_gen">Générer le rapport</button>
      </div>
    </div>
    <div id="zoneRapport">${st.genere ? construireRapport(st) : '<div class="carte"><p class="gris">Choisissez une période puis cliquez sur « Générer le rapport ».</p></div>'}</div>`;

  $('#r_type').addEventListener('change', e => {
    st.type = e.target.value;
    if (st.type !== 'PERSO') { $('#r_debut').value = P[st.type].debut; $('#r_fin').value = P[st.type].fin || auj(); }
  });
  $('#r_gen').addEventListener('click', () => {
    st.type = $('#r_type').value; st.debut = $('#r_debut').value; st.fin = $('#r_fin').value;
    st.service = $('#r_svc').value; st.source = $('#r_src').value;
    if (!st.debut || !st.fin) { toast('Renseignez les deux bornes de la période.', 'err'); return; }
    if (st.debut > st.fin) { toast('La date de début est postérieure à la date de fin.', 'err'); return; }
    st.genere = true;
    $('#zoneRapport').innerHTML = construireRapport(st);
    brancherRapport();
    toast('Rapport généré.', 'ok');
  });
  if (st.genere) brancherRapport();
}
function brancherRapport() {
  const i = $('#r_imprimer'); if (i) i.addEventListener('click', () => window.print());
}
function construireRapport(st) {
  let lot = visibles().filter(c => c.date_reception >= st.debut && c.date_reception <= st.fin);
  if (st.service) lot = lot.filter(c => String(c.service_affecte_id) === st.service);
  if (st.source) lot = lot.filter(c => c.source === st.source);
  const s = Stats.synthese(lot);
  const P = periodes();
  const libPer = st.type === 'PERSO' ? `Période du ${frDate(st.debut)} au ${frDate(st.fin)}`
    : `${P[st.type].lib} (${frDate(st.debut)} – ${frDate(st.fin)})`;

  const appreciation = s.tauxRespect === null
    ? "Aucun courrier clôturé sur la période : l'indicateur de respect des délais n'est pas calculable."
    : s.tauxRespect >= 95 ? "La performance de traitement est conforme à la cible. Maintenir le dispositif en l'état."
    : s.tauxRespect >= 85 ? "La performance est satisfaisante mais perfectible. Cibler les natures de courrier les plus en écart."
    : s.tauxRespect >= 70 ? "La performance est insuffisante. Analyser les causes de dépassement et renforcer le suivi des imputations."
    : "La performance est critique. Une action corrective formalisée est requise (revue des délais, redistribution de charge, rappel des règles d'imputation).";

  let h = `<div class="barre noPrint" style="margin-bottom:12px"><button class="btn primaire" id="r_imprimer">Imprimer / Enregistrer en PDF</button></div>
  <div class="rapport">
    <div class="enteteInst">
      <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br><span class="gris">Union — Discipline — Travail</span><br>
      <strong>AGENCE NATIONALE D'APPUI AU DÉVELOPPEMENT RURAL (ANADER)</strong><br>
      Direction marchés et moyens généraux (D2MG)<br>
      <span class="gris">Processus support PS3 — Gérer le patrimoine</span>
      <div class="t">RAPPORT PÉRIODIQUE DE GESTION DES COURRIERS</div>
      <div style="font-size:11.5px">${ech(libPer)}${st.service ? ' · ' + ech(nomService(st.service)) : ''}${st.source ? ' · ' + ech(SOURCES[st.source].libelle) : ''}
      <br>Édité le ${frDate(auj())} par ${ech(D.moi.nom_prenoms)}</div>
    </div>

    <h3>1. Synthèse de la période</h3>
    <div class="tw" style="max-height:none"><table><tbody>
      <tr><th>Courriers enregistrés</th><td><b>${s.total}</b></td><th>Courriers clôturés</th><td><b>${s.clos}</b> (${s.tauxCloture === null ? '—' : s.tauxCloture + ' %'})</td></tr>
      <tr><th>Courriers en cours</th><td>${s.enCours}</td><th>dont en retard</th><td>${s.retard ? `<b style="color:var(--rouge)">${s.retard}</b>` : '0'}</td></tr>
      <tr><th>Taux de respect des délais</th><td><b>${s.tauxRespect === null ? '—' : s.tauxRespect + ' %'}</b></td>
          <th>Délai moyen de traitement</th><td><b>${s.delaiMoyen === null ? '—' : s.delaiMoyen + ' jours ouvrés'}</b></td></tr>
    </tbody></table></div>
    <p><b>Appréciation :</b> ${ech(appreciation)}</p>

    <h3>2. Répartition et performance par source</h3>
    <div class="tw" style="max-height:none"><table><thead><tr><th>Source</th><th class="centre">Volume</th><th class="centre">Part</th>
      <th class="centre">Clôturés</th><th class="centre">En retard</th><th class="centre">Respect délai</th><th class="centre">Délai moyen</th></tr></thead><tbody>
      ${Object.values(SOURCES).map(src => { const sous = lot.filter(c => c.source === src.code); const ss = Stats.synthese(sous);
        return `<tr><td>${ech(src.libelle)}</td><td class="centre">${sous.length}</td>
          <td class="centre">${lot.length ? Math.round(sous.length / lot.length * 100) : 0} %</td>
          <td class="centre">${ss.clos}</td><td class="centre">${ss.retard}</td>
          <td class="centre">${ss.tauxRespect === null ? '—' : ss.tauxRespect + ' %'}</td>
          <td class="centre">${ss.delaiMoyen === null ? '—' : ss.delaiMoyen + ' j'}</td></tr>`; }).join('')}
      <tr style="background:var(--vert-clair);font-weight:700"><td>TOTAL</td><td class="centre">${lot.length}</td><td class="centre">100 %</td>
        <td class="centre">${s.clos}</td><td class="centre">${s.retard}</td>
        <td class="centre">${s.tauxRespect === null ? '—' : s.tauxRespect + ' %'}</td>
        <td class="centre">${s.delaiMoyen === null ? '—' : s.delaiMoyen + ' j'}</td></tr>
    </tbody></table></div>

    <h3>3. Performance par service destinataire</h3>
    <div class="tw" style="max-height:none"><table><thead><tr><th>Service</th><th class="centre">Reçus</th><th class="centre">Clôturés</th>
      <th class="centre">En cours</th><th class="centre">En retard</th><th class="centre">Respect délai</th><th class="centre">Délai moyen</th></tr></thead><tbody>
      ${D.services.map(sv => { const sous = lot.filter(c => String(c.service_affecte_id) === String(sv.id)); if (!sous.length) return '';
        const ss = Stats.synthese(sous);
        return `<tr><td>${ech(sv.libelle)}</td><td class="centre">${sous.length}</td><td class="centre">${ss.clos}</td>
          <td class="centre">${ss.enCours}</td><td class="centre">${ss.retard ? '<b>' + ss.retard + '</b>' : '0'}</td>
          <td class="centre">${ss.tauxRespect === null ? '—' : ss.tauxRespect + ' %'}</td>
          <td class="centre">${ss.delaiMoyen === null ? '—' : ss.delaiMoyen + ' j'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="gris">Aucun courrier imputé à un service sur la période.</td></tr>'}
    </tbody></table></div>

    <h3>4. Natures de courrier les plus fréquentes</h3>
    <div class="tw" style="max-height:none"><table><thead><tr><th>Nature</th><th class="centre">Volume</th>
      <th class="centre">Délai contractuel</th><th class="centre">Respect délai</th></tr></thead><tbody>
      ${Stats.parCle(lot, c => c.nature_id ? libNature(c.nature_id) : (c.nature || '—')).slice(0, 10).map(([lib, n]) => {
        const sous = lot.filter(c => (c.nature_id ? libNature(c.nature_id) : (c.nature || '—')) === lib);
        const ss = Stats.synthese(sous);
        const nt = D.natures.find(x => x.libelle === lib);
        return `<tr><td>${ech(lib)}</td><td class="centre">${n}</td>
          <td class="centre">${nt ? nt.delai_jours + ' j' : '—'}</td>
          <td class="centre">${ss.tauxRespect === null ? '—' : ss.tauxRespect + ' %'}</td></tr>`;
      }).join('') || '<tr><td colspan="4" class="gris">Aucune donnée.</td></tr>'}
    </tbody></table></div>

    <h3>5. Analyse des écarts — courriers hors délai</h3>`;

  const horsDelai = lot.filter(c => c.statut === 'CLOTURE' && c.date_cloture && c.echeance && c.date_cloture > c.echeance);
  const enRetardVif = lot.filter(c => !estClos(c) && etatEcheance(c) === 'retard');
  if (!horsDelai.length && !enRetardVif.length) {
    h += "<p>Aucun écart constaté sur la période : l'ensemble des courriers a été traité dans les délais contractuels.</p>";
  } else {
    h += `<div class="tw" style="max-height:none"><table><thead><tr><th>N° d'ordre</th><th>Objet</th><th>Service</th><th>Responsable</th>
      <th class="centre">Échéance</th><th class="centre">Écart</th><th>Situation</th></tr></thead><tbody>
      ${enRetardVif.concat(horsDelai).slice(0, 40).map(c => {
        const e = c.date_cloture ? ecartOuvres(c.echeance, c.date_cloture) : Math.abs(joursRestants(c));
        return `<tr><td class="mono">${ech(c.id_courrier)}</td><td>${ech(c.objet)}</td>
          <td>${ech(c.service_affecte_id ? nomService(c.service_affecte_id) : '—')}</td>
          <td>${ech(c.agent_id ? nomAgent(c.agent_id) : '—')}</td>
          <td class="centre">${frDate(c.echeance)}</td><td class="centre"><b>+${e} j</b></td>
          <td>${c.date_cloture ? 'Clôturé hors délai' : 'En cours, délai dépassé'}</td></tr>`;
      }).join('')}</tbody></table></div>
      <p><b>Causes récurrentes à investiguer :</b> imputation tardive du courrier, absence de responsable désigné, surcharge d'un agent,
      attente d'un avis externe (DFC, Direction juridique, fournisseur), délai contractuel inadapté à la nature du courrier.</p>`;
  }

  const parAgent = {};
  lot.forEach(c => { if (c.agent_id) { const o = parAgent[c.agent_id] = parAgent[c.agent_id] || { recus: 0, clos: 0, retard: 0 };
    o.recus++; if (estClos(c)) o.clos++; if (!estClos(c) && etatEcheance(c) === 'retard') o.retard++; } });
  h += `<h3>6. Charge de traitement par agent</h3>
    <div class="tw" style="max-height:none"><table><thead><tr><th>Agent</th><th>Service</th><th class="centre">Courriers traités</th>
      <th class="centre">Clôturés</th><th class="centre">En retard</th></tr></thead><tbody>
      ${Object.entries(parAgent).sort((a, b) => b[1].recus - a[1].recus).map(([id, o]) => {
        const ag = agentObj(id);
        return `<tr><td>${ech(nomAgent(id))}</td><td>${ech(ag && ag.service_courrier_id ? nomService(ag.service_courrier_id) : '—')}</td>
          <td class="centre">${o.recus}</td><td class="centre">${o.clos}</td><td class="centre">${o.retard || '0'}</td></tr>`;
      }).join('') || '<tr><td colspan="5" class="gris">Aucun courrier affecté sur la période.</td></tr>'}
    </tbody></table></div>`;

  h += '<h3>7. Conclusions et actions proposées</h3><ul>';
  if (s.retard > 0) h += `<li>Résorber les <b>${s.retard} courrier(s) en retard</b> : relance des responsables et point de situation hebdomadaire jusqu'à extinction.</li>`;
  const nonImp = lot.filter(c => c.statut === 'ENREGISTRE' || c.statut === 'QUALIFIE').length;
  if (nonImp > 0) h += `<li>Réduire le stock de <b>${nonImp} courrier(s) non imputé(s)</b> : tenir l'imputation dans les 24 heures suivant l'enregistrement.</li>`;
  const svcFaible = D.services.map(sv => { const ss = Stats.synthese(lot.filter(c => String(c.service_affecte_id) === String(sv.id)));
    return { nom: sv.libelle, taux: ss.tauxRespect, n: ss.total }; })
    .filter(x => x.taux !== null && x.taux < 85 && x.n >= 3).sort((a, b) => a.taux - b.taux);
  if (svcFaible.length) h += `<li>Accompagner <b>${ech(svcFaible[0].nom)}</b> (respect des délais : ${svcFaible[0].taux} %) : analyse des causes en revue de processus.</li>`;
  h += `<li>Maintenir l'enregistrement systématique de tout courrier au bureau d'ordre — condition de fiabilité des indicateurs.</li>`;
  h += `<li>Verser ce rapport au dossier de preuve du processus PS3 pour la prochaine revue de processus.</li></ul>`;

  h += `<div class="blocSignature">
      <div class="cs"><b>Rédaction</b>${ech(D.moi.nom_prenoms)}<br><small>${ech(D.moi.fonction || '')}</small></div>
      <div class="cs"><b>Vérification</b><br><small>Nom, date, visa</small></div>
      <div class="cs"><b>Approbation</b>CISSE MOUSTAPHA HASSAN<br><small>Pilote du processus PS3</small></div>
    </div>
    <p style="text-align:center;font-size:11px;color:var(--gris);margin-top:22px;border-top:1px solid var(--line);padding-top:8px">
      ANADER — Société Anonyme au capital de 500 000 000 F CFA — Siège social : Abidjan — www.anader.ci</p>
  </div>`;
  return h;
}

/* ============================================================ PARAMÉTRAGE */
function vueParametrage() {
  if (!aDroit('cou.parametrer')) { refus(); return; }
  const o = D.etat.param || (D.etat.param = { tab: 'natures' });
  const tabs = [['natures', 'Natures & délais'], ['services', 'Services'], ['entites', 'Entités émettrices'],
                ['agents', 'Agents & services'], ['seuils', 'Seuils de charge'], ['feries', 'Jours fériés']];
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Paramétrage</h1>
      <p>Grille des délais contractuels, organisation des services, rattachement des agents et calendrier ouvré. Ces paramètres pilotent tout le calcul des échéances.</p></div></div>
    <div class="onglets">${tabs.map(t => `<button data-tab="${t[0]}" class="${o.tab === t[0] ? 'active' : ''}">${ech(t[1])}</button>`).join('')}</div>
    <div id="pz"></div>`;
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => { o.tab = b.dataset.tab; vueParametrage(); }));
  ({ natures: pNatures, services: pServices, entites: pEntites, agents: pAgents, seuils: pSeuils, feries: pFeries }[o.tab] || pNatures)();
}

function pNatures() {
  $('#pz').innerHTML = `<div class="carte"><h3>Ajouter une nature de courrier</h3>
    <div class="champs"><div><label>Libellé</label><input type="text" id="n_lib"></div>
      <div><label>Délai contractuel (jours ouvrés)</label><input type="number" id="n_del" value="5" min="1"></div></div>
    <button class="btn primaire sm" id="n_add" style="margin-top:9px">Ajouter</button>
    <p class="aide">Le délai de la nature sert de base au calcul de l'échéance, pondéré par la priorité retenue à la qualification.</p></div>
    <div class="tw"><table><thead><tr><th>Nature</th><th class="centre">Délai</th><th class="centre">Actif</th><th></th></tr></thead><tbody>
    ${D.natures.map(n => `<tr><td>${ech(n.libelle)}</td>
      <td class="centre"><input type="number" class="n_d" data-id="${n.id}" value="${n.delai_jours}" style="width:76px;text-align:center"></td>
      <td class="centre"><input type="checkbox" class="n_a" data-id="${n.id}" ${n.actif ? 'checked' : ''} style="width:auto"></td>
      <td><button class="btn sm danger" data-nd="${n.id}">✕</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#n_add').addEventListener('click', async () => {
    const l = $('#n_lib').value.trim(); if (!l) { toast('Libellé obligatoire.', 'err'); return; }
    const { error } = await sb.from('courrier_natures').insert({ libelle: l, delai_jours: Number($('#n_del').value) || 5 });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); toast('Nature ajoutée.', 'ok'); vueParametrage();
  });
  $$('.n_d').forEach(i => i.addEventListener('change', async () => {
    await sb.from('courrier_natures').update({ delai_jours: Number(i.value) || 5 }).eq('id', i.dataset.id);
    await chargerReferentiels(); toast('Délai mis à jour.', 'ok');
  }));
  $$('.n_a').forEach(i => i.addEventListener('change', async () => {
    await sb.from('courrier_natures').update({ actif: i.checked }).eq('id', i.dataset.id);
    await chargerReferentiels();
  }));
  $$('[data-nd]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer cette nature ?')) return;
    await sb.from('courrier_natures').delete().eq('id', b.dataset.nd);
    await chargerReferentiels(); vueParametrage();
  }));
}
function pServices() {
  $('#pz').innerHTML = `<div class="carte"><h3>Ajouter un service</h3>
    <div class="champs"><div><label>Code</label><input type="text" id="s_code"></div>
      <div><label>Libellé</label><input type="text" id="s_lib"></div></div>
    <button class="btn primaire sm" id="s_add" style="margin-top:9px">Ajouter</button></div>
    <div class="tw"><table><thead><tr><th>Code</th><th>Libellé</th><th class="centre">Actif</th><th></th></tr></thead><tbody>
    ${D.services.map(s => `<tr><td class="mono">${ech(s.code)}</td><td>${ech(s.libelle)}</td>
      <td class="centre"><input type="checkbox" class="s_a" data-id="${s.id}" ${s.actif ? 'checked' : ''} style="width:auto"></td>
      <td><button class="btn sm danger" data-sd="${s.id}">✕</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#s_add').addEventListener('click', async () => {
    const c = $('#s_code').value.trim(), l = $('#s_lib').value.trim();
    if (!c || !l) { toast('Code et libellé obligatoires.', 'err'); return; }
    const { error } = await sb.from('courrier_services').insert({ code: c, libelle: l, ordre: D.services.length + 1 });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); vueParametrage();
  });
  $$('.s_a').forEach(i => i.addEventListener('change', async () => {
    await sb.from('courrier_services').update({ actif: i.checked }).eq('id', i.dataset.id); await chargerReferentiels();
  }));
  $$('[data-sd]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Supprimer ce service ?')) return;
    await sb.from('courrier_services').delete().eq('id', b.dataset.sd); await chargerReferentiels(); vueParametrage();
  }));
}
function pEntites() {
  $('#pz').innerHTML = `<div class="carte"><h3>Ajouter une entité émettrice</h3>
    <label>Libellé</label><input type="text" id="e_lib" style="max-width:420px">
    <button class="btn primaire sm" id="e_add" style="margin-top:9px">Ajouter</button>
    <p class="aide">Ces entités alimentent la liste de suggestion à la saisie du courrier.</p></div>
    <div class="tw"><table><thead><tr><th>Entité</th><th></th></tr></thead><tbody>
    ${D.entites.map(e => `<tr><td>${ech(e.libelle)}</td><td><button class="btn sm danger" data-ed="${e.id}">✕</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#e_add').addEventListener('click', async () => {
    const l = $('#e_lib').value.trim(); if (!l) return;
    await sb.from('courrier_entites').insert({ libelle: l });
    await chargerReferentiels(); vueParametrage();
  });
  $$('[data-ed]').forEach(b => b.addEventListener('click', async () => {
    await sb.from('courrier_entites').delete().eq('id', b.dataset.ed); await chargerReferentiels(); vueParametrage();
  }));
}
function pAgents() {
  $('#pz').innerHTML = `<div class="carte"><h3>Rattachement des agents aux services</h3>
    <p class="aide" style="margin:0">Ce rattachement conditionne le droit « Voir les courriers de mon service ». Les comptes eux-mêmes se gèrent dans le module PS3.</p></div>
    <div class="tw"><table><thead><tr><th>Agent</th><th>Fonction</th><th>Service de rattachement</th></tr></thead><tbody>
    ${D.agents.map(a => `<tr><td><strong>${ech(a.nom_prenoms)}</strong></td><td class="gris">${ech(a.fonction || a.role)}</td>
      <td><select class="a_svc" data-id="${ech(a.id_acteur)}"><option value="">—</option>
        ${D.services.map(s => `<option value="${s.id}" ${String(a.service_courrier_id) === String(s.id) ? 'selected' : ''}>${ech(s.libelle)}</option>`).join('')}
      </select></td></tr>`).join('')}
    </tbody></table></div>`;
  $$('.a_svc').forEach(sl => sl.addEventListener('change', async () => {
    const { error } = await sb.from('acteurs').update({ service_courrier_id: sl.value || null }).eq('id_acteur', sl.dataset.id);
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerReferentiels(); toast('Rattachement enregistré.', 'ok');
  }));
}
function pSeuils() {
  $('#pz').innerHTML = `<div class="carte"><h3>Limite d'en-cours par agent</h3>
    <p class="aide" style="margin:0">Nombre de courriers ouverts au-delà duquel l'agent est signalé en surcharge dans les alertes et à l'imputation.</p></div>
    <div class="tw"><table><thead><tr><th>Agent</th><th class="centre">Seuil</th><th class="centre">En cours actuellement</th><th></th></tr></thead><tbody>
    ${D.agents.map(a => { const n = D.courriers.filter(c => c.agent_id === a.id_acteur && !estClos(c)).length;
      return `<tr><td>${ech(a.nom_prenoms)}</td>
        <td class="centre"><input type="number" class="sv" data-id="${ech(a.id_acteur)}" value="${seuilDe(a.id_acteur)}" style="width:76px;text-align:center"></td>
        <td class="centre"><b style="color:${n > seuilDe(a.id_acteur) ? 'var(--rouge)' : 'var(--vert)'}">${n}</b></td>
        <td><button class="btn sm" data-sk="${ech(a.id_acteur)}">Enregistrer</button></td></tr>`; }).join('')}
    </tbody></table></div>`;
  $$('[data-sk]').forEach(b => b.addEventListener('click', async () => {
    const v = Number($(`.sv[data-id="${b.dataset.sk}"]`).value) || 5;
    const { error } = await sb.from('seuils_charge').upsert({ module: 'courriers', id_acteur: b.dataset.sk, seuil: v }, { onConflict: 'module,id_acteur' });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    const s = D.seuils.find(x => x.id_acteur === b.dataset.sk);
    if (s) s.seuil = v; else D.seuils.push({ id_acteur: b.dataset.sk, seuil: v });
    toast('Seuil enregistré.', 'ok');
  }));
}
async function pFeries() {
  const { data } = await sb.from('jours_feries').select('*').order('date_ferie');
  $('#pz').innerHTML = `<div class="carte"><h3>Calendrier des jours fériés</h3>
    <div class="champs"><div><label>Date</label><input type="date" id="j_d"></div>
      <div><label>Libellé</label><input type="text" id="j_l"></div></div>
    <button class="btn primaire sm" id="j_add" style="margin-top:9px">Ajouter</button>
    <p class="aide">Ce calendrier est partagé avec le module Gestion de projet : tous les délais des deux modules sont calculés en jours ouvrés sur cette base.</p></div>
    <div class="tw"><table><thead><tr><th>Date</th><th>Libellé</th><th></th></tr></thead><tbody>
    ${(data || []).map(f => `<tr><td>${frDate(f.date_ferie)}</td><td>${ech(f.libelle || '')}</td>
      <td><button class="btn sm danger" data-jd="${f.id}">✕</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#j_add').addEventListener('click', async () => {
    const d = $('#j_d').value; if (!d) return;
    const { error } = await sb.from('jours_feries').insert({ date_ferie: d, libelle: $('#j_l').value.trim() || null });
    if (error) { toast('Erreur : ' + error.message, 'err'); return; }
    await chargerFeries(); vueParametrage();
  });
  $$('[data-jd]').forEach(b => b.addEventListener('click', async () => {
    await sb.from('jours_feries').delete().eq('id', b.dataset.jd); await chargerFeries(); vueParametrage();
  }));
}

/* ============================================================ MODE D'EMPLOI */
function vueAide() {
  $('#zone').innerHTML = `
    <div class="tete"><div><h1>Mode d'emploi</h1>
      <p>Le circuit du courrier à la D2MG, de l'arrivée au classement, et ce que chaque écran permet de faire.</p></div></div>

    <div class="carte">
      <h3>Manuel d'utilisation</h3>
      <p class="aide" style="margin:0 0 12px">La description ci-dessous couvre l'essentiel. Pour le détail complet, écran par écran, consultez ou téléchargez le manuel d'utilisation du module.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="Manuel_Utilisation_Gestion_des_Courriers_D2MG.pdf" target="_blank" rel="noopener" class="btn primaire" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">📖 Consulter le manuel (PDF)</a>
        <a href="Manuel_Utilisation_Gestion_des_Courriers_D2MG.pdf" download class="btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:7px">⬇ Télécharger le manuel (PDF)</a>
      </div>
    </div>

    <div class="carte"><h3>Le circuit en six étapes</h3>
      ${STATUTS.map((s, i) => `<div style="display:flex;gap:11px;padding:9px 0;border-bottom:${i < STATUTS.length - 1 ? '1px solid var(--line)' : 'none'}">
        <span class="et ${s.couleur}" style="height:fit-content;min-width:88px;text-align:center">${ech(s.libelle)}</span>
        <span style="font-size:12.5px">${ech(s.desc)}</span></div>`).join('')}
    </div>

    <div class="deux">
      <div class="carte"><h3>Les trois sources de courrier</h3>
        ${Object.values(SOURCES).map(s => `<p style="margin:0 0 9px"><strong>${ech(s.libelle)}</strong><br>
          <span class="gris" style="font-size:12px">${ech(s.desc)}</span></p>`).join('')}
      </div>
      <div class="carte"><h3>Comment se calcule l'échéance</h3>
        <p style="font-size:12.5px">Chaque nature de courrier porte un <strong>délai contractuel en jours ouvrés</strong>, défini dans le paramétrage.
        Ce délai est pondéré par la priorité retenue à la qualification :</p>
        <ul style="font-size:12.5px;margin:0 0 9px;padding-left:19px">
          ${Object.values(PRIORITES).map(p => `<li><strong>${ech(p.libelle)}</strong> : délai × ${p.facteur}</li>`).join('')}
        </ul>
        <p style="font-size:12.5px">L'échéance est ensuite calculée à partir de la date de réception, en <strong>ne comptant que les jours ouvrés</strong>,
        samedis, dimanches et jours fériés déduits du calendrier partagé.</p>
      </div>
    </div>

    <div class="carte"><h3>Vos droits d'usage sur ce module</h3>
      <p class="aide" style="margin:0 0 10px">Chaque agent dispose de droits d'usage individuels, attribués par le Pilote depuis l'accueil D2MG Pilotage.</p>
      <div id="zDroits"></div>
    </div>

    <div class="carte"><h3>Bonnes pratiques</h3>
      <ul style="font-size:12.5px;line-height:1.7;margin:0;padding-left:19px">
        <li><strong>Tout courrier passe par le bureau d'ordre.</strong> Un courrier non enregistré est un courrier invisible : il fausse tous les indicateurs et n'est opposable à personne.</li>
        <li><strong>Imputer dans les 24 heures.</strong> Le temps passé en file d'attente d'imputation est du délai consommé pour rien.</li>
        <li><strong>Tracer chaque mouvement.</strong> L'historique du courrier constitue la preuve du traitement en cas de contrôle ou d'audit interne.</li>
        <li><strong>Clôturer explicitement.</strong> Un courrier traité mais non clôturé continue de compter comme en retard.</li>
        <li><strong>Classer sans suite avec un motif.</strong> C'est une décision de gestion, elle doit être justifiée et traçable.</li>
        <li><strong>Surveiller la charge par agent.</strong> Au-delà de la limite d'en-cours, le délai se dégrade sans gain de production.</li>
      </ul>
    </div>`;

  sb.from('ref_droits').select('*').eq('module', 'courriers').order('ordre').then(({ data }) => {
    const z = $('#zDroits'); if (!z) return;
    const grp = {};
    (data || []).forEach(d => (grp[d.groupe] = grp[d.groupe] || []).push(d));
    z.innerHTML = Object.keys(grp).map(g => `<h4 style="color:var(--vert);font-size:11.5px;text-transform:uppercase;margin:12px 0 5px">${ech(g)}</h4>
      ${grp[g].map(d => `<div style="display:flex;gap:9px;align-items:flex-start;padding:4px 0;font-size:12.5px">
        <span class="et ${aDroit(d.code) ? 'vert' : 'gris'}" style="min-width:92px;text-align:center">${aDroit(d.code) ? 'Autorisé' : 'Non autorisé'}</span>
        <span><strong>${ech(d.libelle)}</strong> — <span class="gris">${ech(d.description || '')}</span></span></div>`).join('')}`).join('');
  });
}

demarrer();
})();
