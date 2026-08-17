/* =========================================================================
 * MODULE PROJETS — PS3 Pilotage ANADER
 * -------------------------------------------------------------------------
 * Fichier autonome, additif : ne modifie ni ne dépend d'aucune variable
 * interne du script principal de index.html. Il crée sa propre connexion
 * Supabase (qui réutilise automatiquement la session déjà ouverte, car
 * supabase-js persiste la session dans localStorage sous une clé liée au
 * projet, partagée par toute instance de client créée avec la même URL).
 *
 * Intégration : charger ce fichier via
 *   <script src="projets.js"></script>
 * juste avant la fermeture de </body>, APRÈS le script principal.
 *
 * Pré-requis HTML (voir projets-integration.html) :
 *   - un bouton de nav  <button data-view="projets">Projets</button>
 *   - une section       <section id="projets" class="view">...</section>
 *   - les modales pjModalProjet, pjModalEquipeMembre, pjModalActivite,
 *     pjModalRapport
 *   - le conteneur #toastStack (déjà présent dans l'appli existante)
 * ========================================================================= */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Connexion Supabase dédiée au module (mêmes identifiants que l'appli)
  // ------------------------------------------------------------------
  const SUPABASE_URL = 'https://tcirboephslicjmhokbh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaXJib2VwaHNsaWNqbWhva2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjYxNjUsImV4cCI6MjEwMDg0MjE2NX0.e3f1B__NmDVL5G1Cze1p115ya2Rs-ErzzTUr25UCKEg';

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[Module Projets] Librairie supabase-js introuvable : vérifier que le script CDN est chargé avant projets.js.');
    return;
  }
  const pjClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ------------------------------------------------------------------
  // État du module
  // ------------------------------------------------------------------
  const state = {
    currentActeur: null,      // { id_acteur, nom_prenoms, role }
    acteurs: [],               // référentiel des acteurs actifs
    projets: [],                // projets visibles (filtrés par RLS)
    activitesParProjet: {},    // cache { id_projet: [activites] } pour la liste
    projetCourant: null,       // fiche projet ouverte
    equipeCourante: [],
    activitesCourantes: [],
    rapportsCourants: [],
    pjTabActif: 'presentation'
  };

  const STATUTS_ACTIVITE = ['À faire', 'En cours', 'Réalisé'];
  const METEO_EMOJI = { Vert: '🟢', Orange: '🟠', Rouge: '🔴' };

  // ------------------------------------------------------------------
  // Utilitaires DOM / UI
  // ------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d) return '—';
    try {
      const dt = new Date(d + (String(d).length <= 10 ? 'T00:00:00' : ''));
      return dt.toLocaleDateString('fr-FR');
    } catch (e) { return d; }
  }

  function toastP(message, type) {
    type = type || 'info';
    const stack = document.getElementById('toastStack');
    if (!stack) { console.log('[Projets]', type, message); return; }
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'ok' ? 'ok' : type === 'error' ? 'error' : 'info');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () { el.remove(); }, 4200);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
  }

  // Ouverture/fermeture générique de modales (redondant avec un éventuel
  // gestionnaire délégué déjà présent dans l'appli : sans effet si celui-ci
  // existe déjà, indispensable sinon).
  document.addEventListener('click', function (e) {
    const openBtn = e.target.closest('[data-open-modal]');
    if (openBtn && openBtn.dataset.openModal && openBtn.dataset.openModal.indexOf('pjModal') === 0) {
      openModal(openBtn.dataset.openModal);
    }
    const closeBtn = e.target.closest('#pjModalProjet [data-close-modal], #pjModalEquipeMembre [data-close-modal], #pjModalActivite [data-close-modal], #pjModalRapport [data-close-modal]');
    if (closeBtn) {
      const modal = closeBtn.closest('.modal');
      if (modal) modal.classList.remove('show');
    }
  });

  function acteurNom(id) {
    const a = state.acteurs.find(function (x) { return x.id_acteur === id; });
    return a ? a.nom_prenoms : (id || '—');
  }

  function isPiloteOuCopilote() {
    return !!state.currentActeur && ['Pilote', 'Co-pilote'].indexOf(state.currentActeur.role) !== -1;
  }

  function peutGererProjet(projet) {
    return isPiloteOuCopilote() || (state.currentActeur && projet.responsable_id === state.currentActeur.id_acteur);
  }

  // ------------------------------------------------------------------
  // Génération d'identifiants : entièrement déléguée au serveur (triggers
  // pj_set_id_projet / pj_set_id_activite / pj_set_id_rapport, adossés à
  // un compteur atomique projets_compteurs). Cela évite toute collision
  // entre deux acteurs qui ne voient pas les mêmes projets sous RLS et ne
  // pourraient donc pas calculer un même "prochain numéro" en sécurité
  // depuis le client. Le formulaire n'envoie donc jamais d'id à la
  // création : il est toujours généré et renvoyé par la base.
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Chargement des référentiels
  // ------------------------------------------------------------------
  async function chargerActeurCourant() {
    const { data: authData } = await pjClient.auth.getUser();
    const user = authData && authData.user;
    if (!user) { state.currentActeur = null; return; }
    const { data, error } = await pjClient
      .from('acteurs')
      .select('id_acteur,nom_prenoms,role')
      .eq('user_id', user.id)
      .eq('actif', true)
      .maybeSingle();
    if (error) { console.error(error); }
    state.currentActeur = data || null;
  }

  async function chargerActeurs() {
    const { data, error } = await pjClient
      .from('acteurs')
      .select('id_acteur,nom_prenoms,role')
      .eq('actif', true)
      .order('nom_prenoms');
    if (error) { console.error(error); return; }
    state.acteurs = data || [];
  }

  function remplirSelectActeurs(select, includeEmpty) {
    if (!select) return;
    select.innerHTML = (includeEmpty ? '<option value="">—</option>' : '') +
      state.acteurs.map(function (a) {
        return '<option value="' + escapeHtml(a.id_acteur) + '">' + escapeHtml(a.nom_prenoms) + '</option>';
      }).join('');
  }

  // ------------------------------------------------------------------
  // Vue « Mes projets » (liste)
  // ------------------------------------------------------------------
  async function chargerProjets() {
    const grid = document.getElementById('pjListeGrid');
    if (grid) grid.innerHTML = '<p class="muted">Chargement…</p>';

    const { data: projets, error } = await pjClient
      .from('projets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toastP('Erreur de chargement des projets : ' + error.message, 'error'); return; }
    state.projets = projets || [];

    const ids = state.projets.map(function (p) { return p.id_projet; });
    let activites = [];
    if (ids.length) {
      const { data: actData, error: actErr } = await pjClient
        .from('projet_activites')
        .select('id_projet,statut')
        .in('id_projet', ids);
      if (actErr) console.error(actErr);
      activites = actData || [];
    }
    state.activitesParProjet = {};
    activites.forEach(function (a) {
      (state.activitesParProjet[a.id_projet] = state.activitesParProjet[a.id_projet] || []).push(a);
    });

    renderProjetsListe();
  }

  function progressionProjet(idProjet) {
    const acts = state.activitesParProjet[idProjet] || [];
    if (!acts.length) return { pct: 0, total: 0, realisees: 0 };
    const realisees = acts.filter(function (a) { return a.statut === 'Réalisé'; }).length;
    return { pct: Math.round((realisees / acts.length) * 100), total: acts.length, realisees: realisees };
  }

  function renderProjetsListe() {
    const grid = document.getElementById('pjListeGrid');
    if (!grid) return;
    if (!state.projets.length) {
      grid.innerHTML = '<div class="card"><p class="muted">Aucun projet pour le moment. Utilisez « + Nouveau projet » pour en créer un.</p></div>';
      return;
    }
    grid.innerHTML = state.projets.map(function (p) {
      const prog = progressionProjet(p.id_projet);
      return (
        '<div class="card pj-projet-card" data-id="' + escapeHtml(p.id_projet) + '">' +
          '<div class="section-title">' +
            '<div>' +
              '<h3>' + (METEO_EMOJI[p.appreciation_avancement] || '') + ' ' + escapeHtml(p.denomination) + '</h3>' +
              '<p class="muted">Responsable : ' + escapeHtml(acteurNom(p.responsable_id)) + '</p>' +
            '</div>' +
            '<span class="badge ' + (p.statut === 'Clôturé' ? 'ok' : p.statut === 'Suspendu' ? 'bad' : 'neutral') + '">' + escapeHtml(p.statut) + '</span>' +
          '</div>' +
          '<div class="stats"><span class="muted">Avancement activités</span><strong>' + prog.pct + '%</strong></div>' +
          '<div class="progress"><span style="width:' + prog.pct + '%"></span></div>' +
          '<div class="toolbar" style="margin-top:12px">' +
            '<button class="btn secondary" type="button" data-pj-open-fiche="' + escapeHtml(p.id_projet) + '">Ouvrir la fiche</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    $all('[data-pj-open-fiche]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () { ouvrirFicheProjet(btn.dataset.pjOpenFiche); });
    });
  }

  // ------------------------------------------------------------------
  // Création / édition d'un projet
  // ------------------------------------------------------------------
  function ouvrirModaleNouveauProjet() {
    const form = document.getElementById('pjFormProjet');
    if (!form) return;
    form.reset();
    form.dataset.mode = 'create';
    form.dataset.id = '';
    remplirSelectActeurs(document.getElementById('pjProjetResponsable'));
    const respSelect = document.getElementById('pjProjetResponsable');
    if (respSelect) {
      if (isPiloteOuCopilote()) {
        respSelect.disabled = false;
      } else {
        respSelect.value = state.currentActeur ? state.currentActeur.id_acteur : '';
        respSelect.disabled = true;
      }
    }
    document.getElementById('pjModalProjetTitre').textContent = 'Nouveau projet';
    document.getElementById('pjProjetStatut').value = 'Non démarré';
    document.getElementById('pjProjetMeteo').value = 'Vert';
    openModal('pjModalProjet');
  }

  function ouvrirModaleEditionProjet(p) {
    const form = document.getElementById('pjFormProjet');
    if (!form) return;
    form.reset();
    form.dataset.mode = 'edit';
    form.dataset.id = p.id_projet;
    remplirSelectActeurs(document.getElementById('pjProjetResponsable'));
    document.getElementById('pjModalProjetTitre').textContent = 'Modifier le projet';
    document.getElementById('pjProjetDenomination').value = p.denomination || '';
    document.getElementById('pjProjetContexte').value = p.contexte || '';
    document.getElementById('pjProjetObjectif').value = p.objectif_projet || '';
    document.getElementById('pjProjetResponsable').value = p.responsable_id || '';
    document.getElementById('pjProjetResponsable').disabled = !isPiloteOuCopilote();
    document.getElementById('pjProjetDateDebut').value = p.date_debut || '';
    document.getElementById('pjProjetDateFinPrevue').value = p.date_fin_prevue || '';
    document.getElementById('pjProjetStatut').value = p.statut || 'Non démarré';
    document.getElementById('pjProjetMeteo').value = p.appreciation_avancement || 'Vert';
    document.getElementById('pjProjetPointsAttention').value = p.points_attention || '';
    document.getElementById('pjProjetBudget').value = p.budget_prevu || '';
    openModal('pjModalProjet');
  }

  async function soumettreFormulaireProjet(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      denomination: document.getElementById('pjProjetDenomination').value.trim(),
      contexte: document.getElementById('pjProjetContexte').value.trim() || null,
      objectif_projet: document.getElementById('pjProjetObjectif').value.trim() || null,
      responsable_id: document.getElementById('pjProjetResponsable').value,
      date_debut: document.getElementById('pjProjetDateDebut').value || null,
      date_fin_prevue: document.getElementById('pjProjetDateFinPrevue').value || null,
      statut: document.getElementById('pjProjetStatut').value,
      appreciation_avancement: document.getElementById('pjProjetMeteo').value,
      points_attention: document.getElementById('pjProjetPointsAttention').value.trim() || null,
      budget_prevu: document.getElementById('pjProjetBudget').value ? Number(document.getElementById('pjProjetBudget').value) : null,
      updated_at: new Date().toISOString()
    };
    if (!payload.denomination || !payload.responsable_id) {
      toastP('Dénomination et responsable sont obligatoires.', 'error');
      return;
    }

    try {
      if (form.dataset.mode === 'edit' && form.dataset.id) {
        const { error } = await pjClient.from('projets').update(payload).eq('id_projet', form.dataset.id);
        if (error) throw error;
        toastP('Projet mis à jour.', 'ok');
      } else {
        const { data: authData } = await pjClient.auth.getUser();
        payload.created_by = authData && authData.user ? authData.user.id : null;
        const { data: inserted, error } = await pjClient.from('projets').insert(payload).select().single();
        if (error) throw error;
        const id = inserted.id_projet;
        // Le responsable est automatiquement membre de l'équipe
        await pjClient.from('projet_equipe').insert({
          id_projet: id, acteur_id: payload.responsable_id, role_equipe: 'Responsable'
        });
        toastP('Projet créé (' + id + ').', 'ok');
      }
      closeModal('pjModalProjet');
      await chargerProjets();
      if (state.projetCourant) await ouvrirFicheProjet(state.projetCourant.id_projet);
    } catch (err) {
      toastP('Erreur : ' + err.message, 'error');
    }
  }

  // ------------------------------------------------------------------
  // Fiche projet (détail)
  // ------------------------------------------------------------------
  async function ouvrirFicheProjet(idProjet) {
    const { data: projet, error } = await pjClient.from('projets').select('*').eq('id_projet', idProjet).maybeSingle();
    if (error || !projet) { toastP('Impossible de charger ce projet.', 'error'); return; }
    state.projetCourant = projet;

    const [{ data: equipe }, { data: activites }, { data: rapports }] = await Promise.all([
      pjClient.from('projet_equipe').select('*').eq('id_projet', idProjet),
      pjClient.from('projet_activites').select('*').eq('id_projet', idProjet).order('ordre', { ascending: true, nullsFirst: false }),
      pjClient.from('projet_rapports').select('*').eq('id_projet', idProjet).order('date_rapport', { ascending: false })
    ]);
    state.equipeCourante = equipe || [];
    state.activitesCourantes = activites || [];
    state.rapportsCourants = rapports || [];

    document.getElementById('pjVueListe').classList.add('hidden');
    document.getElementById('pjVueFiche').classList.remove('hidden');

    renderFicheEntete();
    renderKanban();
    renderEquipe();
    renderRapports();
    renderDashboard();
    renderFiche5Blocs();
    activerOnglet(state.pjTabActif || 'presentation');
  }

  function fermerFicheProjet() {
    state.projetCourant = null;
    document.getElementById('pjVueFiche').classList.add('hidden');
    document.getElementById('pjVueListe').classList.remove('hidden');
    chargerProjets();
  }

  function renderFicheEntete() {
    const p = state.projetCourant;
    const titre = document.getElementById('pjFicheTitre');
    if (titre) {
      titre.innerHTML =
        '<h2>' + (METEO_EMOJI[p.appreciation_avancement] || '') + ' ' + escapeHtml(p.denomination) + '</h2>' +
        '<p class="muted">' + escapeHtml(p.id_projet) + ' · Responsable : ' + escapeHtml(acteurNom(p.responsable_id)) +
        ' · Statut : ' + escapeHtml(p.statut) + '</p>';
    }
    const editBtn = document.getElementById('pjBtnEditerProjet');
    if (editBtn) editBtn.style.display = peutGererProjet(p) ? '' : 'none';

    const presentation = document.getElementById('pjTabPresentation');
    if (presentation) {
      presentation.innerHTML =
        '<div class="two-col">' +
          '<div class="card">' +
            '<h3>Présentation</h3>' +
            '<p><strong>Contexte :</strong> ' + (escapeHtml(p.contexte) || '<span class="muted">Non renseigné</span>') + '</p>' +
            '<p><strong>Objectif du projet :</strong> ' + (escapeHtml(p.objectif_projet) || '<span class="muted">Non renseigné</span>') + '</p>' +
            '<p><strong>Période :</strong> ' + fmtDate(p.date_debut) + ' → ' + fmtDate(p.date_fin_prevue) +
              (p.date_fin_reelle ? ' (clôturé le ' + fmtDate(p.date_fin_reelle) + ')' : '') + '</p>' +
            (p.budget_prevu ? '<p><strong>Budget prévu :</strong> ' + Number(p.budget_prevu).toLocaleString('fr-FR') + '</p>' : '') +
            '<p><strong>Points d’attention actuels :</strong> ' + (escapeHtml(p.points_attention) || '<span class="muted">RAS</span>') + '</p>' +
          '</div>' +
          '<div class="card">' +
            '<h3>Équipe projet</h3>' +
            '<div id="pjEquipeListe" class="list"></div>' +
            (peutGererProjet(p) ? '<button class="btn ghost" type="button" id="pjBtnAjouterMembre" style="margin-top:10px">+ Ajouter un membre</button>' : '') +
          '</div>' +
        '</div>';
      const addBtn = document.getElementById('pjBtnAjouterMembre');
      if (addBtn) addBtn.addEventListener('click', ouvrirModaleAjoutMembre);
    }
  }

  function renderEquipe() {
    const list = document.getElementById('pjEquipeListe');
    if (!list) return;
    if (!state.equipeCourante.length) {
      list.innerHTML = '<p class="muted">Aucun membre enregistré.</p>';
      return;
    }
    const p = state.projetCourant;
    list.innerHTML = state.equipeCourante.map(function (m) {
      return (
        '<div class="list-item" style="display:flex;justify-content:space-between;align-items:center">' +
          '<span>' + escapeHtml(acteurNom(m.acteur_id)) + ' <span class="badge neutral">' + escapeHtml(m.role_equipe) + '</span></span>' +
          (peutGererProjet(p) ? '<button class="icon-btn" type="button" data-pj-retirer-membre="' + m.id + '">✕</button>' : '') +
        '</div>'
      );
    }).join('');
    $all('[data-pj-retirer-membre]', list).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const { error } = await pjClient.from('projet_equipe').delete().eq('id', btn.dataset.pjRetirerMembre);
        if (error) { toastP('Erreur : ' + error.message, 'error'); return; }
        await ouvrirFicheProjet(state.projetCourant.id_projet);
      });
    });
  }

  function ouvrirModaleAjoutMembre() {
    remplirSelectActeurs(document.getElementById('pjMembreActeur'));
    document.getElementById('pjFormEquipeMembre').reset();
    openModal('pjModalEquipeMembre');
  }

  async function soumettreAjoutMembre(e) {
    e.preventDefault();
    const acteurId = document.getElementById('pjMembreActeur').value;
    const roleEquipe = document.getElementById('pjMembreRole').value;
    if (!acteurId) { toastP('Choisissez un acteur.', 'error'); return; }
    const { error } = await pjClient.from('projet_equipe').insert({
      id_projet: state.projetCourant.id_projet, acteur_id: acteurId, role_equipe: roleEquipe
    });
    if (error) { toastP('Erreur : ' + error.message, 'error'); return; }
    closeModal('pjModalEquipeMembre');
    toastP('Membre ajouté.', 'ok');
    await ouvrirFicheProjet(state.projetCourant.id_projet);
  }

  // ------------------------------------------------------------------
  // Kanban des activités (À faire / En cours / Réalisé)
  // ------------------------------------------------------------------
  function renderKanban() {
    const board = document.getElementById('pjTabKanban');
    if (!board) return;
    const parProjet = state.activitesCourantes;
    const colonnes = STATUTS_ACTIVITE.map(function (statut) {
      const cartes = parProjet.filter(function (a) { return a.statut === statut; });
      return (
        '<div class="card pj-kanban-col">' +
          '<div class="section-title"><h3>' + statut + '</h3><span class="badge neutral">' + cartes.length + '</span></div>' +
          '<div class="list">' +
            (cartes.length ? cartes.map(renderKanbanCarte).join('') : '<p class="muted">Aucune activité.</p>') +
          '</div>' +
        '</div>'
      );
    }).join('');

    board.innerHTML =
      '<div class="toolbar" style="margin-bottom:14px">' +
        '<button class="btn primary" type="button" id="pjBtnNouvelleActivite">+ Nouvelle activité</button>' +
      '</div>' +
      '<div class="grid pj-kanban-board">' + colonnes + '</div>';

    const addBtn = document.getElementById('pjBtnNouvelleActivite');
    if (addBtn) addBtn.addEventListener('click', ouvrirModaleNouvelleActivite);

    $all('[data-pj-move]', board).forEach(function (btn) {
      btn.addEventListener('click', function () { deplacerActivite(btn.dataset.pjActId, parseInt(btn.dataset.pjMove, 10)); });
    });
    $all('[data-pj-edit-act]', board).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const act = state.activitesCourantes.find(function (a) { return a.id_activite === btn.dataset.pjEditAct; });
        if (act) ouvrirModaleEditionActivite(act);
      });
    });
    $all('[data-pj-del-act]', board).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer cette activité ?')) return;
        const { error } = await pjClient.from('projet_activites').delete().eq('id_activite', btn.dataset.pjDelAct);
        if (error) { toastP('Erreur : ' + error.message, 'error'); return; }
        await ouvrirFicheProjet(state.projetCourant.id_projet);
      });
    });
  }

  function renderKanbanCarte(a) {
    const idx = STATUTS_ACTIVITE.indexOf(a.statut);
    const peut = peutGererProjet(state.projetCourant);
    return (
      '<div class="list-item">' +
        '<strong>' + escapeHtml(a.denomination) + '</strong>' +
        (a.responsable_id ? '<div class="muted" style="font-size:12.5px">Resp. ' + escapeHtml(acteurNom(a.responsable_id)) + '</div>' : '') +
        (a.date_prevue ? '<div class="muted" style="font-size:12.5px">Échéance ' + fmtDate(a.date_prevue) + '</div>' : '') +
        '<span class="badge ' + (a.priorite === 'Critique' || a.priorite === 'Haute' ? 'warn' : 'neutral') + '" style="margin-top:6px">' + escapeHtml(a.priorite) + '</span>' +
        (peut ? (
          '<div class="ordre-btns" style="margin-top:8px">' +
            (idx > 0 ? '<button type="button" data-pj-move="-1" data-pj-act-id="' + a.id_activite + '" title="Reculer">◀</button>' : '') +
            (idx < STATUTS_ACTIVITE.length - 1 ? '<button type="button" data-pj-move="1" data-pj-act-id="' + a.id_activite + '" title="Avancer">▶</button>' : '') +
            '<button type="button" data-pj-edit-act="' + a.id_activite + '" title="Modifier">✎</button>' +
            '<button type="button" data-pj-del-act="' + a.id_activite + '" title="Supprimer">🗑</button>' +
          '</div>'
        ) : '') +
      '</div>'
    );
  }

  async function deplacerActivite(idActivite, direction) {
    const act = state.activitesCourantes.find(function (a) { return a.id_activite === idActivite; });
    if (!act) return;
    const idx = STATUTS_ACTIVITE.indexOf(act.statut) + direction;
    if (idx < 0 || idx >= STATUTS_ACTIVITE.length) return;
    const nouveauStatut = STATUTS_ACTIVITE[idx];
    const payload = { statut: nouveauStatut, updated_at: new Date().toISOString() };
    if (nouveauStatut === 'Réalisé') payload.date_realisation = new Date().toISOString().slice(0, 10);
    const { error } = await pjClient.from('projet_activites').update(payload).eq('id_activite', idActivite);
    if (error) { toastP('Erreur : ' + error.message, 'error'); return; }
    await ouvrirFicheProjet(state.projetCourant.id_projet);
  }

  function ouvrirModaleNouvelleActivite() {
    const form = document.getElementById('pjFormActivite');
    form.reset();
    form.dataset.mode = 'create';
    form.dataset.id = '';
    remplirSelectActeurs(document.getElementById('pjActiviteResponsable'), true);
    document.getElementById('pjModalActiviteTitre').textContent = 'Nouvelle activité';
    document.getElementById('pjActivitePriorite').value = 'Moyenne';
    document.getElementById('pjActiviteStatut').value = 'À faire';
    openModal('pjModalActivite');
  }

  function ouvrirModaleEditionActivite(a) {
    const form = document.getElementById('pjFormActivite');
    form.reset();
    form.dataset.mode = 'edit';
    form.dataset.id = a.id_activite;
    remplirSelectActeurs(document.getElementById('pjActiviteResponsable'), true);
    document.getElementById('pjModalActiviteTitre').textContent = 'Modifier l’activité';
    document.getElementById('pjActiviteDenomination').value = a.denomination || '';
    document.getElementById('pjActiviteDescription').value = a.description || '';
    document.getElementById('pjActiviteResponsable').value = a.responsable_id || '';
    document.getElementById('pjActivitePriorite').value = a.priorite || 'Moyenne';
    document.getElementById('pjActiviteStatut').value = a.statut || 'À faire';
    document.getElementById('pjActiviteDatePrevue').value = a.date_prevue || '';
    document.getElementById('pjActiviteCommentaire').value = a.commentaire || '';
    document.getElementById('pjActivitePreuve').value = a.preuve || '';
    openModal('pjModalActivite');
  }

  async function soumettreFormulaireActivite(e) {
    e.preventDefault();
    const form = e.target;
    const denomination = document.getElementById('pjActiviteDenomination').value.trim();
    if (!denomination) { toastP('La dénomination est obligatoire.', 'error'); return; }
    const payload = {
      denomination: denomination,
      description: document.getElementById('pjActiviteDescription').value.trim() || null,
      responsable_id: document.getElementById('pjActiviteResponsable').value || null,
      priorite: document.getElementById('pjActivitePriorite').value,
      statut: document.getElementById('pjActiviteStatut').value,
      date_prevue: document.getElementById('pjActiviteDatePrevue').value || null,
      commentaire: document.getElementById('pjActiviteCommentaire').value.trim() || null,
      preuve: document.getElementById('pjActivitePreuve').value.trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      if (form.dataset.mode === 'edit' && form.dataset.id) {
        const { error } = await pjClient.from('projet_activites').update(payload).eq('id_activite', form.dataset.id);
        if (error) throw error;
        toastP('Activité mise à jour.', 'ok');
      } else {
        payload.id_projet = state.projetCourant.id_projet;
        payload.ordre = state.activitesCourantes.length + 1;
        const { data: authData } = await pjClient.auth.getUser();
        payload.created_by = authData && authData.user ? authData.user.id : null;
        const { error } = await pjClient.from('projet_activites').insert(payload);
        if (error) throw error;
        toastP('Activité ajoutée.', 'ok');
      }
      closeModal('pjModalActivite');
      await ouvrirFicheProjet(state.projetCourant.id_projet);
    } catch (err) {
      toastP('Erreur : ' + err.message, 'error');
    }
  }

  // ------------------------------------------------------------------
  // Rapports d'avancement
  // ------------------------------------------------------------------
  function renderRapports() {
    const container = document.getElementById('pjTabRapports');
    if (!container) return;
    const p = state.projetCourant;
    container.innerHTML =
      '<div class="toolbar" style="margin-bottom:14px">' +
        (peutGererProjet(p) || (state.currentActeur && state.equipeCourante.some(function (m) { return m.acteur_id === state.currentActeur.id_acteur; }))
          ? '<button class="btn primary" type="button" id="pjBtnNouveauRapport">+ Nouveau rapport d’avancement</button>' : '') +
      '</div>' +
      '<div class="list">' +
        (state.rapportsCourants.length ? state.rapportsCourants.map(function (r) {
          return (
            '<div class="card">' +
              '<div class="section-title">' +
                '<div><h3>' + (METEO_EMOJI[r.appreciation_avancement] || '') + ' ' + fmtDate(r.date_rapport) + (r.periode_libelle ? ' — ' + escapeHtml(r.periode_libelle) : '') + '</h3>' +
                '<p class="muted">Par ' + escapeHtml(acteurNom(r.auteur_id)) + (r.taux_avancement !== null && r.taux_avancement !== undefined ? ' · Avancement estimé ' + r.taux_avancement + '%' : '') + '</p></div>' +
              '</div>' +
              (r.synthese ? '<p><strong>Synthèse :</strong> ' + escapeHtml(r.synthese) + '</p>' : '') +
              (r.points_attention ? '<p><strong>Points d’attention :</strong> ' + escapeHtml(r.points_attention) + '</p>' : '') +
            '</div>'
          );
        }).join('') : '<p class="muted">Aucun rapport enregistré pour l’instant.</p>') +
      '</div>';

    const btn = document.getElementById('pjBtnNouveauRapport');
    if (btn) btn.addEventListener('click', ouvrirModaleNouveauRapport);
  }

  function ouvrirModaleNouveauRapport() {
    const form = document.getElementById('pjFormRapport');
    form.reset();
    document.getElementById('pjRapportDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('pjRapportMeteo').value = state.projetCourant.appreciation_avancement || 'Vert';
    document.getElementById('pjRapportTaux').value = progressionProjet(state.projetCourant.id_projet).pct;
    document.getElementById('pjRapportPointsAttention').value = state.projetCourant.points_attention || '';
    openModal('pjModalRapport');
  }

  async function soumettreFormulaireRapport(e) {
    e.preventDefault();
    const payload = {
      id_projet: state.projetCourant.id_projet,
      date_rapport: document.getElementById('pjRapportDate').value || new Date().toISOString().slice(0, 10),
      periode_libelle: document.getElementById('pjRapportPeriode').value.trim() || null,
      appreciation_avancement: document.getElementById('pjRapportMeteo').value,
      taux_avancement: document.getElementById('pjRapportTaux').value ? Number(document.getElementById('pjRapportTaux').value) : null,
      synthese: document.getElementById('pjRapportSynthese').value.trim() || null,
      points_attention: document.getElementById('pjRapportPointsAttention').value.trim() || null,
      auteur_id: state.currentActeur ? state.currentActeur.id_acteur : null
    };
    try {
      const { error } = await pjClient.from('projet_rapports').insert(payload);
      if (error) throw error;
      // Le rapport met à jour l'état courant du projet (météo + points d'attention)
      await pjClient.from('projets').update({
        appreciation_avancement: payload.appreciation_avancement,
        points_attention: payload.points_attention,
        updated_at: new Date().toISOString()
      }).eq('id_projet', state.projetCourant.id_projet);
      toastP('Rapport enregistré.', 'ok');
      closeModal('pjModalRapport');
      await ouvrirFicheProjet(state.projetCourant.id_projet);
    } catch (err) {
      toastP('Erreur : ' + err.message, 'error');
    }
  }

  // ------------------------------------------------------------------
  // Tableau de bord (mini-KPI du projet)
  // ------------------------------------------------------------------
  function renderDashboard() {
    const container = document.getElementById('pjTabDashboard');
    if (!container) return;
    const acts = state.activitesCourantes;
    const total = acts.length;
    const aFaire = acts.filter(function (a) { return a.statut === 'À faire'; }).length;
    const enCours = acts.filter(function (a) { return a.statut === 'En cours'; }).length;
    const realisees = acts.filter(function (a) { return a.statut === 'Réalisé'; }).length;
    const pct = total ? Math.round((realisees / total) * 100) : 0;
    const p = state.projetCourant;
    let joursRestants = '—';
    if (p.date_fin_prevue) {
      const diff = Math.ceil((new Date(p.date_fin_prevue) - new Date()) / (1000 * 60 * 60 * 24));
      joursRestants = diff >= 0 ? diff + ' j' : ('En retard de ' + Math.abs(diff) + ' j');
    }
    container.innerHTML =
      '<div class="grid kpis">' +
        '<div class="card kpi"><div class="label">Activités totales</div><div class="value">' + total + '</div></div>' +
        '<div class="card kpi"><div class="label">À faire</div><div class="value">' + aFaire + '</div></div>' +
        '<div class="card kpi"><div class="label">En cours</div><div class="value">' + enCours + '</div></div>' +
        '<div class="card kpi"><div class="label">Réalisées</div><div class="value">' + realisees + '</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px">' +
        '<div class="section-title"><h3>Avancement global</h3></div>' +
        '<div class="progress" style="height:16px"><span style="width:' + pct + '%"></span></div>' +
        '<div class="stats" style="margin-top:8px"><span class="muted">' + pct + '% des activités réalisées</span><span class="muted">Échéance : ' + fmtDate(p.date_fin_prevue) + ' (' + joursRestants + ')</span></div>' +
      '</div>';
  }

  // ------------------------------------------------------------------
  // Fiche d'état d'avancement — 5 blocs (+ export PDF via impression)
  // ------------------------------------------------------------------
  function listeActivitesHtml(statut) {
    const items = state.activitesCourantes.filter(function (a) { return a.statut === statut; });
    if (!items.length) return '<p class="muted">Aucune activité dans cet état.</p>';
    return '<ul>' + items.map(function (a) {
      return '<li>' + escapeHtml(a.denomination) +
        (a.responsable_id ? ' — <em>' + escapeHtml(acteurNom(a.responsable_id)) + '</em>' : '') +
        (a.date_prevue ? ' (échéance ' + fmtDate(a.date_prevue) + ')' : '') +
        '</li>';
    }).join('') + '</ul>';
  }

  function fiche5BlocsHtml() {
    const p = state.projetCourant;
    const prog = progressionProjet(p.id_projet);
    return (
      '<h2 style="margin-bottom:2px">' + escapeHtml(p.denomination) + '</h2>' +
      '<p class="muted" style="margin-top:0">' + escapeHtml(p.id_projet) + ' · Fiche d’état d’avancement · ' + fmtDate(new Date().toISOString().slice(0, 10)) + '</p>' +

      '<div class="pj-bloc5"><h3>1. Présentation et appréciation générale</h3>' +
        '<p><strong>Météo du projet : ' + (METEO_EMOJI[p.appreciation_avancement] || '') + ' ' + escapeHtml(p.appreciation_avancement) + '</strong> — avancement des activités : ' + prog.pct + '%</p>' +
        '<p><strong>Responsable :</strong> ' + escapeHtml(acteurNom(p.responsable_id)) + '</p>' +
        '<p><strong>Contexte :</strong> ' + (escapeHtml(p.contexte) || 'Non renseigné') + '</p>' +
        '<p><strong>Objectif du projet :</strong> ' + (escapeHtml(p.objectif_projet) || 'Non renseigné') + '</p>' +
        '<p><strong>Période :</strong> ' + fmtDate(p.date_debut) + ' → ' + fmtDate(p.date_fin_prevue) + '</p>' +
      '</div>' +

      '<div class="pj-bloc5"><h3>2. À faire</h3>' + listeActivitesHtml('À faire') + '</div>' +
      '<div class="pj-bloc5"><h3>3. En cours</h3>' + listeActivitesHtml('En cours') + '</div>' +
      '<div class="pj-bloc5"><h3>4. Réalisé</h3>' + listeActivitesHtml('Réalisé') + '</div>' +

      '<div class="pj-bloc5"><h3>5. Points d’attention</h3>' +
        '<p>' + (escapeHtml(p.points_attention) || 'RAS').replace(/\n/g, '<br>') + '</p>' +
      '</div>'
    );
  }

  function renderFiche5Blocs() {
    const container = document.getElementById('pjTabFiche5');
    if (!container) return;
    const html = fiche5BlocsHtml();
    container.innerHTML =
      '<div class="toolbar" style="margin-bottom:14px">' +
        '<button class="btn primary" type="button" id="pjBtnExportPdf">Exporter la fiche en PDF</button>' +
      '</div>' +
      '<div class="card" id="pjFiche5Contenu">' + html + '</div>';

    const printArea = document.getElementById('pjPrintArea');
    if (printArea) printArea.innerHTML = html;

    const btn = document.getElementById('pjBtnExportPdf');
    if (btn) btn.addEventListener('click', exporterFiche5Pdf);
  }

  function exporterFiche5Pdf() {
    const printArea = document.getElementById('pjPrintArea');
    if (printArea) printArea.innerHTML = fiche5BlocsHtml();
    document.body.classList.add('pj-printing');
    window.print();
  }
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('pj-printing');
  });

  // ------------------------------------------------------------------
  // Onglets internes de la fiche projet
  // ------------------------------------------------------------------
  function activerOnglet(tab) {
    state.pjTabActif = tab;
    $all('.pj-subview').forEach(function (v) { v.classList.remove('active'); });
    $all('[data-pjtab]').forEach(function (b) { b.classList.remove('active'); });
    const view = document.getElementById('pjTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-pjtab="' + tab + '"]');
    if (btn) btn.classList.add('active');
  }

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------
  async function initModuleProjets() {
    const navBtn = document.querySelector('.nav button[data-view="projets"]');
    const view = document.getElementById('projets');
    if (!navBtn || !view) {
      console.warn('[Module Projets] Marquage HTML introuvable (bouton de nav ou section #projets manquants).');
      return;
    }

    // Bascule de vue autonome (sans dépendre du routeur principal)
    navBtn.addEventListener('click', async function () {
      $all('.nav button[data-view]').forEach(function (b) { b.classList.remove('active'); });
      $all('.view').forEach(function (v) { v.classList.remove('active'); });
      navBtn.classList.add('active');
      view.classList.add('active');
      await chargerActeurCourant();
      await chargerActeurs();
      await chargerProjets();
    });

    const btnNouveau = document.getElementById('pjBtnNouveauProjet');
    if (btnNouveau) btnNouveau.addEventListener('click', ouvrirModaleNouveauProjet);

    const btnRetour = document.getElementById('pjBtnRetourListe');
    if (btnRetour) btnRetour.addEventListener('click', fermerFicheProjet);

    const btnEditer = document.getElementById('pjBtnEditerProjet');
    if (btnEditer) btnEditer.addEventListener('click', function () { ouvrirModaleEditionProjet(state.projetCourant); });

    $all('[data-pjtab]').forEach(function (b) {
      b.addEventListener('click', function () { activerOnglet(b.dataset.pjtab); });
    });

    const formProjet = document.getElementById('pjFormProjet');
    if (formProjet) formProjet.addEventListener('submit', soumettreFormulaireProjet);

    const formEquipe = document.getElementById('pjFormEquipeMembre');
    if (formEquipe) formEquipe.addEventListener('submit', soumettreAjoutMembre);

    const formActivite = document.getElementById('pjFormActivite');
    if (formActivite) formActivite.addEventListener('submit', soumettreFormulaireActivite);

    const formRapport = document.getElementById('pjFormRapport');
    if (formRapport) formRapport.addEventListener('submit', soumettreFormulaireRapport);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModuleProjets);
  } else {
    initModuleProjets();
  }
})();
