# D2MG Pilotage — version test (v2 + v2.1)

Cette version répond aux cinq demandes d'amélioration initiales : découplage réel des espaces, droits d'usage par utilisateur, module de gestion de projet complet, retour à la version d'origine des courriers, et thèmes de couleur par espace. La v2.1 ajoute une bande latérale au portail (Accueil / Profil / Paramètres / Aide) et déplace la gestion des utilisateurs de PS3 vers le portail.

## 0. Nouveauté v2.1 — bande latérale du portail

L'écran d'accueil (`portail.html`) a désormais une bande latérale gauche avec quatre entrées :

- **Accueil** — les cartes des espaces qui vous sont ouverts (inchangé).
- **Profil** — vos informations personnelles, le récapitulatif de vos droits par espace, et le changement de votre mot de passe.
- **Paramètres** — visible uniquement pour le Pilote et les Co-pilotes, avec deux onglets : **Gestion des utilisateurs** (ajouter/modifier/retirer un acteur — remplace le bouton « Ajouter un membre » qui était dans PS3) et **Gestion des accès et droits d'usage** (l'écran d'administration déjà en place, simplement déplacé ici).
- **Aide** — mode d'emploi du portail.

Tout nouvel utilisateur créé depuis Paramètres → Gestion des utilisateurs reçoit désormais **automatiquement** un accès de base aux trois espaces (via un déclencheur en base de données) : plus besoin de basculer les trois interrupteurs à la main après la création.

Dans `index.html`, la carte « Équipe PS3 » reste visible en lecture seule (référentiel des acteurs) mais ne permet plus d'ajouter, modifier ou retirer un membre — un renvoi vers le portail y a été ajouté.

## 1. Découplage réel des espaces

Chaque espace est désormais une application distincte, avec sa propre page, son propre menu et son propre thème.

| Espace | Fichier | Thème |
|---|---|---|
| Accueil (porte d'entrée + salon) | `portail.html` | Bleu institutionnel (inchangé) |
| PS3 — Pilotage du processus | `index.html` | Bleu (inchangé) |
| Gestion de projet | `projets.html` + `projets-app.js` | Corail / saumon |
| Gestion des courriers | `courriers.html` + `courriers-app.js` | Vert (palette d'origine restaurée) |

L'onglet « Projets » a été retiré de `index.html` : la chambre PS3 ne contient plus que PS3 et ses sous-modules. Le module Gestion de projet vit entièrement dans sa propre page. Le titre « Maison » a disparu partout au profit de **D2MG Pilotage**.

## 2. Droits d'usage par utilisateur

Le principe change : **tous les agents accèdent aux trois espaces**, ce qui les différencie est le droit d'usage action par action.

Un catalogue de **52 droits** a été créé, réparti par espace et par groupe fonctionnel :

- **PS3** — 14 droits (Consultation, Pilotage, Qualité, Administration)
- **Gestion de projet** — 22 droits (Consultation, Cadrage, Planification, Maîtrise, Reporting, Clôture, Administration)
- **Gestion des courriers** — 16 droits (Consultation, Traitement, Pilotage, Administration)

Dans **Paramètres → Gestion des accès et droits d'usage** (bande latérale du portail), en tant que Pilote, vous disposez d'un **onglet par agent**. Vous sélectionnez l'agent, puis l'espace, et vous basculez chaque droit sur **Autorisé** ou **Non autorisé**. Deux boutons permettent d'autoriser ou de retirer tout un espace d'un coup. Chaque modification est enregistrée immédiatement et tracée dans le journal d'audit.

Une répartition initiale a été appliquée selon le rôle PS3 (Pilote et Co-pilote : tous les droits ; Ressource : socle large hors administration ; Acteur du processus : socle opérationnel). Elle est entièrement modifiable.

## 3. Gestion de projet — structure générique PMP

Le module a été entièrement reconstruit à partir de la structure de votre fichier de pilotage, mais rendue **générique et applicable à tout type de projet**. À la création, vous choisissez un modèle de découpage : générique PMP (5 groupes de processus), travaux/réhabilitation (6 phases), acquisition/marché, ou projet d'organisation en DMAIC. Les phases sont ensuite entièrement modifiables.

Écrans disponibles :

**Cadrage** — Charte de projet (contexte, objectif SMART, périmètre inclus/exclu, livrable final, critères de succès, contraintes, hypothèses, gouvernance, commanditaire, budget de référence), équipe projet, cartographie des parties prenantes (influence/intérêt), matrice RACI cliquable.

**Planification** — Phases avec dérives début/fin calculées automatiquement, jalons avec écart et preuve de réalisation, activités en WBS avec kanban (chemin critique, charge, avancement déclaré, blocages), planning visuel type Gantt (prévu vs réel, trait « aujourd'hui »), livrables par phase.

**Maîtrise** — Budget et variations (base/avenant, prévu/actuel/engagé/payé, écarts, approbation), registre des risques coté Probabilité × Impact avec matrice de criticité, stratégie de réponse, plan préventif, signal déclencheur et plan de contingence ; registre des décisions avec impact coût-délai ; réserves de réception ; journal lean des obstacles avec cause racine et âge.

**Pilotage** — Tableau de bord avec avancement réel vs prévu, **SPI** (tenue du planning), dérive budgétaire, activités en retard dont chemin critique, jalons atteints, risques critiques, livrables en retard, obstacles, réserves critiques, indicateurs en alerte, avancement par phase et prochaines échéances. Indicateurs de projet avec méthode de calcul, cible et seuil. Alertes & relances avec relance individuelle ou groupée par responsable. Rapports d'avancement. Fiche d'état d'avancement 5 blocs exportable en PDF.

**Clôture** — RETEX et leçons apprises.

Les délais sont calculés en **jours ouvrés**, jours fériés déduits, sur le calendrier partagé avec le module Courriers.

Votre projet existant « Rénovation des bureaux du PCA » a été doté des 6 phases correspondant à votre fichier, avec leurs dates prévues, pour que vous puissiez tester sur un cas réel. Supprimez-les si vous préférez repartir de zéro.

## 4. Gestion des courriers — retour à la version d'origine

Vous aviez raison : ma première version avait appauvri le module. J'ai restauré la version d'origine, à l'identique sur le fond et la forme, et je détaille ci-dessous ce qui avait été perdu puis rétabli, et ce que la version Supabase apporte réellement en plus.

### Ce qui avait été perdu et qui est rétabli

- Les **7 statuts du circuit d'origine** : Enregistré → Qualifié → Imputé → En traitement → Réponse rédigée → Clôturé (+ Classé sans suite). J'avais supprimé les étapes « Qualifié » et « Réponse rédigée », qui sont pourtant les deux moments où se décide le délai et où se produit la valeur.
- Les **trois sources détaillées** (Externe ANADER, Interne ANADER hors D2MG, Interne D2MG) avec leur description.
- La **saisie guidée en quatre étapes** (Origine, Identification, Qualification, Contrôle) au lieu d'un formulaire unique.
- Le **menu groupé** (Traitement du courrier / Pilotage / Configuration) avec icônes et pastilles de compteur.
- Le **mode d'emploi** intégré.
- Le **rapport institutionnel en 7 sections** avec en-tête République/ANADER, appréciation automatique selon le taux de respect, performance par source, par service et par nature, analyse des écarts avec causes à investiguer, charge par agent, conclusions et bloc de signatures.
- Les **relances groupées par agent**, le graphique de **volume mensuel**, le tri des colonnes du registre, la fiche courrier en volet latéral avec chronologie complète.
- La **palette verte** d'origine (`#0B6E4F`), y compris le bandeau latéral vert foncé.

### Ce que la version Supabase apporte en plus

- **Données partagées** entre tous les agents. La version d'origine stockait tout dans le navigateur : chaque poste avait son propre registre, invisible des autres, et un vidage du cache effaçait tout. C'est le point qui rendait la mise en service impossible en l'état.
- **Authentification réelle**. La version d'origine reposait sur une liste déroulante « profil actif » : n'importe qui pouvait se déclarer Directeur. Ici chaque agent se connecte avec son compte.
- **Droits d'usage individuels** au lieu de 6 rôles figés : deux chefs de division peuvent avoir des droits différents.
- **Traçabilité centrale** : toutes les écritures remontent dans le journal d'audit du processus PS3, avec l'auteur réel.
- **Numérotation sans collision** : les numéros d'ordre sont attribués par la base, deux agents qui enregistrent en même temps ne peuvent pas obtenir le même numéro.
- **Calendrier des jours fériés partagé** avec le module Gestion de projet.
- **Rattachement des agents aux services**, qui rend opérant le droit « voir les courriers de mon service ».

## 5. Comment tester

1. Ouvrez **`portail.html`** (double-clic).
2. Connectez-vous avec vos identifiants habituels.
3. Le salon présente les trois espaces, chacun avec sa couleur. Cliquez pour entrer.
4. En bas de l'accueil : **Gestion des accès et des droits d'usage**, avec un onglet par agent.
5. Dans chaque espace, le bouton « Retour à l'accueil » ramène au salon.

Comme précédemment, ceci pointe vers la vraie base de données : pensez à supprimer les courriers ou projets de test que vous créerez.

## Points restant à arbitrer avec vous

- **Pièces jointes** : toujours non gérées (il faudrait activer le stockage de fichiers Supabase). À décider si c'est nécessaire pour la mise en service.
- **Rattachement des agents aux services** : à renseigner dans Courriers → Paramétrage → Agents & services, sinon le droit « voir mon service » reste sans effet.
- **Modèle de phases par défaut** : quatre modèles sont proposés ; dites-moi s'il en faut d'autres propres à la D2MG.

## Avant la bascule en production

Rien n'a été poussé sur GitHub/Netlify. Après votre validation, les fichiers à committer sont :
`portail.html`, `index.html`, `projets.html`, `projets-app.js`, `courriers.html`, `courriers-app.js`, et la suppression de `projets.js` (remplacé par `projets-app.js`).
