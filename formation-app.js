/* =========================================================================
 * D2MG PILOTAGE — ESPACE « FORMATION » — Mon parcours SMQ (V0.1)
 * Parcours en ligne des acteurs du PS3 : déblocage progressif, quiz notés
 * par la base, capsule, support, fiche, carnet, évaluations de départ et de
 * sortie, test de certification, certificat ou attestation.
 * Toutes les règles (ouverture des étapes, notes, tentatives, délais,
 * documents) sont appliquées par les fonctions Supabase formation_* :
 * le navigateur n'a jamais accès aux bonnes réponses du test.
 * ========================================================================= */
(function(){
'use strict';
const SUPABASE_URL = 'https://tcirboephslicjmhokbh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaXJib2VwaHNsaWNqbWhva2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjYxNjUsImV4cCI6MjEwMDg0MjE2NX0.e3f1B__NmDVL5G1Cze1p115ya2Rs-ErzzTUr25UCKEg';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PARCOURS = 'SMQ-PS3';
const BUCKET = 'formation';
const URL_VERIF = 'https://d2mgpilotage.netlify.app/verification.html?code=';
const FICHES = {"M01": {"titre": "Pourquoi la qualité nous concerne", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>La qualité<\/strong>, c'est satisfaire des exigences : celles du client, de la loi et de l'ANADER. Et pouvoir le prouver.<\/li><li><strong>Le SMQ<\/strong> (système de management de la qualité) est notre façon organisée de travailler : des processus, des rôles, des règles écrites, des preuves et une amélioration continue.<\/li><li><strong>La norme ISO 9001:2015<\/strong> fixe les exigences d'un SMQ. C'est le référentiel choisi par l'ANADER.<\/li><li><strong>L'ANADER<\/strong> a lancé sa démarche en janvier 2021. Au diagnostic d'avril 2021, sa conformité était de 34 %. Le périmètre de certification couvre le Siège, la DRSO et ses zones. Le PSD 2026-2030 prévoit l'audit de certification ISO 9001 (programme P.5.3.1).<\/li><li><strong>Trois audits<\/strong> : l'audit interne (nous nous vérifions), l'audit à blanc (la répétition générale avant la certification), l'audit de certification (un organisme extérieur décide).<\/li><\/ol><h4>Les mots clés<\/h4><table><thead><tr><th>Mot<\/th><th>Ce qu'il veut dire<\/th><\/tr><\/thead><tbody><tr><td>Exigence<\/td><td>Ce qui est attendu : par un client, par la loi, par une procédure de l'ANADER<\/td><\/tr><tr><td>Client interne<\/td><td>Le collègue ou le service qui reçoit le résultat de mon travail<\/td><\/tr><tr><td>Preuve<\/td><td>Un document ou un enregistrement qui montre que c'est fait : PV signé, bon de sortie, liste de présence<\/td><\/tr><tr><td>Audit à blanc<\/td><td>Un audit d'entraînement, dans les conditions réelles, pour corriger les écarts à temps<\/td><\/tr><tr><td>Certification<\/td><td>La reconnaissance, par un organisme extérieur, que notre SMQ respecte la norme<\/td><\/tr><\/tbody><\/table><h4>Le PS3, concrètement<\/h4><ul><li>Sa finalité, inscrite dans la FIP : <em>améliorer les conditions de travail en optimisant la gestion du patrimoine<\/em>.<\/li><li>Ses clients : tous les processus de l'ANADER. Ils attendent qu'on mette à disposition le patrimoine approprié, qu'on les aide à l'utiliser et qu'on l'entretienne.<\/li><li>Ce qu'il produit : bons de distribution et de sortie, courriers réponses, rapports de suivi et d'inventaire, fiches d'immobilisation.<\/li><\/ul><h4>Pourquoi cela me concerne<\/h4><p>L'audit interne de septembre-octobre 2026 relève une sensibilisation insuffisante au SMQ à la DRSO et en zones, et cite le PS3. En mai 2025, les auditeurs constataient déjà qu'en région et en zone la FIP, le logigramme et les canevas étaient peu connus. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Dans quel processus travaillez-vous, quelle est sa finalité, et quel est votre rôle ? »<\/p><p>Réponse type : « Je travaille dans le PS3, Gérer le patrimoine. Sa finalité est d'améliorer les conditions de travail en optimisant la gestion du patrimoine. Mon rôle est de […], et la preuve que je produis est […]. »<\/p>"}, "M02": {"titre": "Les fondements", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>Le PDCA<\/strong> : Planifier (fixer l'objectif, trouver les causes, choisir les actions), Réaliser, Vérifier (mesurer et comparer), Agir (corriger ou généraliser). Puis on recommence avec un nouvel objectif : c'est l'amélioration continue.<\/li><li><strong>Les 7 principes de management de la qualité<\/strong> : orientation client ; leadership ; implication du personnel ; approche processus ; amélioration ; prise de décision fondée sur des preuves ; management des relations avec les parties intéressées.<\/li><li><strong>L'approche processus<\/strong> : on obtient des résultats plus sûrs quand on gère les activités comme des processus reliés entre eux, qui forment un système.<\/li><li><strong>Les 4 règles du support ANADER<\/strong> : le client, c'est la vie ; fonctionner de manière efficace ; client interne et client externe sont les mêmes ; le fournisseur est au service de son client.<\/li><li><strong>L'approche par les risques<\/strong> : repérer à l'avance ce qui peut empêcher d'atteindre les objectifs, l'évaluer, agir avant l'incident (exigence 6.1 de la norme).<\/li><\/ol><h4>Les mots clés<\/h4><table><thead><tr><th>Mot<\/th><th>Ce qu'il veut dire<\/th><\/tr><\/thead><tbody><tr><td>Processus<\/td><td>Une suite d'activités qui transforme des éléments d'entrée (un besoin) en éléments de sortie (un bien mis à disposition)<\/td><\/tr><tr><td>Client interne<\/td><td>Le collègue ou le service qui reçoit le résultat de mon activité<\/td><\/tr><tr><td>Risque<\/td><td>Ce qui peut empêcher d'atteindre un objectif<\/td><\/tr><tr><td>Opportunité<\/td><td>Ce qui peut aider à mieux atteindre un objectif<\/td><\/tr><tr><td>Amélioration continue<\/td><td>Le PDCA qui recommence, objectif après objectif<\/td><\/tr><\/tbody><\/table><h4>Le PS3, concrètement<\/h4><ul><li>Le logigramme enchaîne les activités, de la réception des besoins jusqu'à la suite donnée aux rapports d'inventaire.<\/li><li>L'étape « Suivre et évaluer l'utilisation du patrimoine » nourrit le « Vérifier » : fiche et rapport de suivi, fiche et rapport d'inventaire, demande de réparation, devis approuvé, attestation de service fait.<\/li><li>Le PS3 a 5 risques et 1 opportunité inscrits à son registre (module 8).<\/li><\/ul><h4>Pourquoi cela me concerne<\/h4><p>L'audit interne d'avril 2026 relève l'absence de plan de surveillance et de maintenance du patrimoine (exigence 7.1.3). Le diagnostic du PSD 2026-2030 note, lui aussi, l'absence de maintenance préventive. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Comment savez-vous que votre activité atteint son résultat, et que faites-vous quand ce n'est pas le cas ? »<\/p><p>Réponse type : « Je vérifie avec [la fiche de suivi, le rapport…]. Quand un écart apparaît, je le signale au pilote ou au co-pilote, et une action est décidée. »<\/p>"}, "M03": {"titre": "La norme ISO 9001 en clair", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>La norme ISO 9001:2015<\/strong> compte dix chapitres : les chapitres 1 à 3 la présentent (domaine d'application, références, termes) ; les chapitres 4 à 10 contiennent les exigences.<\/li><li><strong>Les exigences suivent le PDCA<\/strong> (tableau ci-dessous).<\/li><li><strong>Le vocabulaire de l'auditeur<\/strong> : une exigence est ce qui est attendu ; la conformité, c'est la satisfaire ; une non-conformité, c'est ne pas la satisfaire.<\/li><li><strong>Information documentée<\/strong> : information que l'ANADER doit maîtriser et tenir à jour, avec son support. <strong>Enregistrement<\/strong> : document qui fait état de résultats obtenus ou prouve qu'une activité a été réalisée (procédure DQ1-PM2-V01).<\/li><li><strong>Une exclusion<\/strong> : l'exigence 8.3 « Conception et développement » ne concerne pas l'ANADER, qui ne fait pas de conception.<\/li><\/ol><table><thead><tr><th>Chapitre<\/th><th>Thème<\/th><th>Place dans le PDCA<\/th><th>Exemple à l'ANADER<\/th><\/tr><\/thead><tbody><tr><td>4<\/td><td>Contexte de l'organisme<\/td><td>Cadre du système<\/td><td>Enjeux, parties intéressées, les 10 processus (PM1)<\/td><\/tr><tr><td>5<\/td><td>Leadership<\/td><td>Au centre du cycle<\/td><td>Politique qualité, désignation et missions des pilotes (PM1)<\/td><\/tr><tr><td>6<\/td><td>Planification<\/td><td>Planifier<\/td><td>Risques et opportunités, objectifs qualité (tous les processus)<\/td><\/tr><tr><td>7<\/td><td>Support<\/td><td>Réaliser<\/td><td>Ressources, infrastructures (PS3), compétences, sensibilisation, informations documentées<\/td><\/tr><tr><td>8<\/td><td>Réalisation des activités opérationnelles<\/td><td>Réaliser<\/td><td>Prestataires externes (PS3), projets et programmes (PO2, PO3)<\/td><\/tr><tr><td>9<\/td><td>Évaluation des performances<\/td><td>Vérifier<\/td><td>Suivi-évaluation (PM2), audit interne, revue de direction<\/td><\/tr><tr><td>10<\/td><td>Amélioration<\/td><td>Agir<\/td><td>Non-conformités, actions correctives, amélioration continue<\/td><\/tr><\/tbody><\/table><p><strong>Le PS3, concrètement<\/strong> (Livrables ISO 9001 du SMQ ANADER, novembre 2024)<\/p><table><thead><tr><th>Exigence<\/th><th>Ce que le PS3 doit pouvoir montrer<\/th><\/tr><\/thead><tbody><tr><td>7.1.3 Infrastructure<\/td><td>L'inventaire du patrimoine, son plan de surveillance et son plan de maintenance<\/td><\/tr><tr><td>7.1.5.2 Traçabilité de la mesure (avec PO2)<\/td><td>L'inventaire, la surveillance et la maintenance des équipements de mesure : GPS, balances, pesons<\/td><\/tr><tr><td>8.4 Maîtrise des prestataires externes<\/td><td>Le répertoire des experts et son protocole, la procédure d'achat, les TDR, les contrats<\/td><\/tr><tr><td>8.5.3 Propriété des clients ou des prestataires externes<\/td><td>Les contrats, rapports de réception et rapports de conformité du matériel des partenaires<\/td><\/tr><\/tbody><\/table><p>Comme tous les processus, le PS3 répond aussi aux exigences 6.1 (risques et opportunités), 6.2 (objectifs), 10.2 (non-conformités) et 10.3 (amélioration continue).<\/p><h4>Pourquoi cela me concerne<\/h4><p>L'audit interne d'avril 2026 relève, pour le PS3 : pas de plan de surveillance et de maintenance du patrimoine (7.1.3) ni des équipements de mesure (7.1.5) ; pas de protocole de gestion du matériel reçu des partenaires (8.5.3) ; des compétences techniques insuffisantes chez les agents de zone chargés des stocks (8.5.4). (Constats à actualiser à chaque session.)<\/p><p><strong>Bon à savoir.<\/strong> Une nouvelle édition, ISO 9001:2026, est parue le 16 septembre 2026, avec trois ans de transition. Le PDCA, l'approche processus et l'approche par les risques restent au cœur de la norme (LRQA).<\/p><h4>La question de l'auditeur<\/h4><p>« Montrez-moi la preuve que le dernier bien reçu dans votre service était conforme. »<\/p><p>Réponse type : « Voici le PV de réception signé et le rapport de conformité ; ils sont classés [à tel endroit]. »<\/p>"}, "M04": {"titre": "Le SMQ de l'ANADER", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>Le SMQ de l'ANADER compte 10 processus<\/strong>, répartis en trois familles (tableau ci-dessous).<\/li><li><strong>Le PS3 est un processus support.<\/strong> Ses clients sont tous les processus ; ses fournisseurs sont la gouvernance (PM1), les ressources humaines (PS1) et les ressources financières (PS5).<\/li><li><strong>Chacun a un rôle.<\/strong> La Direction s'engage et fournit les ressources ; l'équipe qualité (DSEQ) accompagne, outille et forme ; le pilote et les co-pilotes animent le processus ; les acteurs appliquent, remontent les difficultés et mettent en œuvre les améliorations.<\/li><li><strong>La démarche<\/strong> a démarré en janvier 2021. Le diagnostic d'avril 2021 donnait 34 % de conformité. Fin 2023, la planification était achevée et la mise en œuvre a commencé. Le périmètre de certification couvre le Siège, la DRSO et ses zones.<\/li><li><strong>Le pilotage du SMQ<\/strong> s'appuie sur le comité de suivi-évaluation et management de la qualité (DGA-OT), un comité par processus, et des comités de DR et de zone (PSE 2026-2030).<\/li><\/ol><table><thead><tr><th>Famille<\/th><th>Code<\/th><th>Processus<\/th><\/tr><\/thead><tbody><tr><td>Management<\/td><td>PM1<\/td><td>Assurer la gouvernance<\/td><\/tr><tr><td>Management<\/td><td>PM2<\/td><td>Assurer le suivi-évaluation<\/td><\/tr><tr><td>Opérationnels<\/td><td>PO1<\/td><td>Mobiliser les ressources financières<\/td><\/tr><tr><td>Opérationnels<\/td><td>PO2<\/td><td>Gérer les projets et programmes de développement agricole et rural<\/td><\/tr><tr><td>Opérationnels<\/td><td>PO3<\/td><td>Gérer les projets et programmes de santé communautaire<\/td><\/tr><tr><td>Supports<\/td><td>PS1<\/td><td>Gérer les ressources humaines<\/td><\/tr><tr><td>Supports<\/td><td>PS2<\/td><td>Gérer la documentation et la capitalisation<\/td><\/tr><tr><td>Supports<\/td><td>PS3<\/td><td>Gérer le patrimoine<\/td><\/tr><tr><td>Supports<\/td><td>PS4<\/td><td>Gérer la communication interne et le marketing<\/td><\/tr><tr><td>Supports<\/td><td>PS5<\/td><td>Optimiser la gestion des ressources financières<\/td><\/tr><\/tbody><\/table><p><strong>Le PS3, concrètement<\/strong> (FIP-PS3-V1)<\/p><table><thead><tr><th>Sens<\/th><th>Processus<\/th><th>Ce qui est attendu<\/th><\/tr><\/thead><tbody><tr><td>Le PS3 sert<\/td><td>Tous les processus<\/td><td>Mettre à disposition le patrimoine approprié, aider à l'utiliser, l'entretenir<\/td><\/tr><tr><td>Le PS3 reçoit de<\/td><td>Assurer la gouvernance (PM1)<\/td><td>Les orientations, les instructions et les moyens nécessaires<\/td><\/tr><tr><td>Le PS3 reçoit de<\/td><td>Gérer les ressources humaines (PS1)<\/td><td>Les ressources humaines nécessaires<\/td><\/tr><tr><td>Le PS3 reçoit de<\/td><td>Optimiser la gestion des ressources financières (PS5)<\/td><td>Les ressources financières<\/td><\/tr><\/tbody><\/table><p>Le PS3 dépasse la D2MG : sa FIP cite aussi les secrétariats, les chauffeurs, les fournisseurs, la DFC, la DCG, le CJF, la DG, les directions centrales et les centres de responsabilité concernés.<\/p><p><strong>La politique qualité.<\/strong> C'est un « autre document qualité » rattaché au PM1. Son texte en vigueur est projeté en séance (document à fournir par la DSEQ).<\/p><h4>Pourquoi cela me concerne<\/h4><p>L'audit interne de septembre-octobre 2026 conclut qu'il faut renforcer la sensibilisation des acteurs au SMQ, et que les pilotes doivent s'engager davantage dans l'animation de leur processus. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Dans quel processus se situe votre activité, et avec quels autres processus travaillez-vous ? »<\/p><p>Réponse type : « Je travaille dans le PS3, un processus support. Je sers [tel processus ou tel agent] et je reçois [tel élément] de [tel processus]. »<\/p>"}, "M05": {"titre": "Ce qui n'est pas écrit n'existe pas", "html": "<p><strong>L'essentiel en 5 points<\/strong> (procédure DQ1-PM2-V01)<\/p><ol><li><strong>Trois types de documents<\/strong> : EN, enregistrement (rapports, formulaires renseignés) ; IT, instruction de travail (fiches d'identité processus) ; DQ, autre document qualité (plan stratégique, politique qualité, manuel de procédures).<\/li><li><strong>Le code<\/strong> réunit le type, un numéro d'ordre, le processus et la version. EN8-PS3-V01 se lit : 8e enregistrement du PS3, version 1, le canevas du rapport de revue de processus.<\/li><li><strong>Les 11 canevas codifiés du PS3<\/strong> existent déjà (tableau ci-dessous) : on les utilise, on n'en invente pas.<\/li><li><strong>Le serveur de fichiers SMQ<\/strong> : un répertoire « SMQ » au Siège, sauvegardé chaque jour sur place et sur un site externe ; un sous-répertoire par processus (plan de classement 700-799 pour le PS3) ; dans chacun, quatre dossiers : enregistrements, instructions de travail, autres documents qualité, documents nécessaires. Le pilote et les co-pilotes en sont responsables ; le pilote attribue les droits d'accès avec l'appui de la DISI.<\/li><li><strong>Le circuit d'un canevas<\/strong> : l'acteur exprime le besoin ; le pilote ou un co-pilote l'analyse ; le pilote décide ; l'acteur crée et codifie ; le pilote soumet à la DSEQ, qui valide le format et l'annonce par courriel ; la version en vigueur est diffusée sur le serveur. Une version nouvelle annule la précédente, que le pilote retire du serveur.<\/li><\/ol><table><thead><tr><th>Code<\/th><th>Canevas du PS3<\/th><th>Prise d'effet<\/th><\/tr><\/thead><tbody><tr><td>EN1-PS3-V01<\/td><td>Rapport de mission de supervision<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN2-PS3-V01<\/td><td>Procès-verbal<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN3-PS3-V01<\/td><td>Compte rendu Comité de Direction, réunions de Direction, zones et CF<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN4-PS3-V01<\/td><td>Comité technique<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN5-PS3-V01<\/td><td>Compte rendu atelier avec partenaire<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN6-PS3-V01<\/td><td>Compte rendu atelier avec partenaire<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN7-PS3-V01<\/td><td>Rapport de participation aux salons et foires<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN8-PS3-V01<\/td><td>Rapport de revue de processus<\/td><td>21/04/2023<\/td><\/tr><tr><td>EN9-PS3-V01<\/td><td>Rapport des points focaux<\/td><td>24/10/2024<\/td><\/tr><tr><td>EN10-PS3-V01<\/td><td>PV de distribution d'équipement de travail et engagement du bénéficiaire<\/td><td>25/02/2025<\/td><\/tr><tr><td>EN11-PS3-V01<\/td><td>Plan d'actions et de suivi des écarts issus des audits qualité interne<\/td><td>11/09/2025<\/td><\/tr><\/tbody><\/table><h4>Règles à retenir<\/h4><ul><li>Fiches d'identité processus et autres documents qualité : Arial Narrow 12, interligne simple, marges de 2,5 cm. Courriers : Trébuchet MS 12.<\/li><li>Compte rendu de réunion de Direction ou de zone : introduction, ordre du jour, déroulement, recommandations et diligences, annexes (dont la liste de présence).<\/li><li>Un document prend effet à sa date de diffusion.<\/li><\/ul><h4>Pourquoi cela me concerne<\/h4><p>En mai 2025, l'audit a relevé une non-conformité sur le PS3 : canevas codifiés peu utilisés et pas de compte rendu codifié de la séance de partage des documents. En septembre-octobre 2026, l'audit relève encore, pour le PS3, une application insuffisante de la procédure (canevas, règles graphiques et typographiques) et une transmission tardive de ses documents. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Montrez-moi le compte rendu de votre dernière réunion et sa liste de présence. »<\/p><p>Réponse type : « Le voici, sur le canevas EN3-PS3-V01, avec la liste de présence en annexe. Il est classé dans le dossier des enregistrements du PS3, sur le serveur. »<\/p>"}, "M06": {"titre": "Le PS3 de A à Z", "html": "<p><strong>L'essentiel en 5 points<\/strong> (FIP-PS3-V1)<\/p><ol><li><strong>La finalité<\/strong> du PS3 : améliorer les conditions de travail en optimisant la gestion du patrimoine.<\/li><li><strong>Une donnée d'entrée<\/strong> : la fiche des besoins réceptionnée. <strong>Huit données de sortie<\/strong> : bon de distribution, bon de sortie, courrier réponse, rapport de suivi, rapport d'inventaire, fiche d'immobilisation, notes, courrier du DG.<\/li><li><strong>Treize activités et quatre points de décision<\/strong> : le besoin peut-il être satisfait ? le bien est-il disponible ? est-il conforme ? le rapport est-il validé ?<\/li><li><strong>Chaque activité a ses acteurs et sa preuve<\/strong> (tableau ci-dessous).<\/li><li><strong>Des ressources dédiées<\/strong> : les équipes de la D2MG et leurs partenaires (DFC, DCG, CJF, DG, directions et centres de responsabilité concernés) ; locaux, magasins et entrepôts ; matériel roulant, informatique et technique ; logiciels SAGE 1000, CAR Policy, Google Maps, plateformes de gestion des stocks et de réforme ; instruments de mesure (thermomètre, hygromètre, balance, peson).<\/li><\/ol><table><thead><tr><th>N°<\/th><th>Activité<\/th><th>Qui agit (extrait de la FIP)<\/th><th>Preuve<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>Réceptionner les besoins en patrimoine<\/td><td>Secrétariat D2MG, DR ou CZ<\/td><td>Fiche d'expression des besoins reçue, fiche d'imputation<\/td><\/tr><tr><td>2<\/td><td>Analyser les besoins réceptionnés<\/td><td>Chef de division Patrimoine, CSRFMG, AAC<\/td><td>Rapport d'analyse ; courrier réponse si le besoin ne peut être satisfait<\/td><\/tr><tr><td>3<\/td><td>Acquérir le patrimoine<\/td><td>Divisions Approvisionnement et Marchés, DCG, COJO, SFMG, CGR, AAC<\/td><td>Bon de commande, facture proforma<\/td><\/tr><tr><td>4<\/td><td>Réceptionner le patrimoine<\/td><td>Divisions Logistique et Patrimoine, SFMG, AAC, service technique, comité de réception<\/td><td>Bon de livraison déchargé, PV de réception, rapport de conformité<\/td><\/tr><tr><td>5<\/td><td>Traiter le patrimoine non conforme<\/td><td>Chef de division Logistique ou Patrimoine, SFMG, AAC<\/td><td>PV de réception signé, selon la procédure Achats et moyens généraux<\/td><\/tr><tr><td>6<\/td><td>Sauvegarder le patrimoine<\/td><td>Chef de division Logistique ou Patrimoine, SFMG, AAC<\/td><td>Étiquettes, fiche d'immobilisation, code d'immobilisation<\/td><\/tr><tr><td>7<\/td><td>Attribuer le patrimoine<\/td><td>D2MG, chef de division Logistique ou Patrimoine, SFMG, AAC<\/td><td>État d'attribution, fiche de mise à disposition<\/td><\/tr><tr><td>8<\/td><td>Mettre le patrimoine à disposition<\/td><td>Chef de division Logistique, SFMG, AAC<\/td><td>Bon de distribution, bon de sortie<\/td><\/tr><tr><td>9<\/td><td>Suivre et évaluer l'utilisation du patrimoine<\/td><td>Divisions Logistique et Patrimoine, équipe d'inventaire, SFMG, AAC, services utilisateurs, D2MG, DR, CZ<\/td><td>Fiches et rapports de suivi et d'inventaire, demande de réparation, devis approuvé, contrat de prestation, attestation de service fait<\/td><\/tr><tr><td>10<\/td><td>Produire le rapport de suivi et/ou d'inventaire<\/td><td>Divisions Logistique et Patrimoine, équipe d'inventaire (AAC, SFMG, DAICG, DFC)<\/td><td>Rapport de suivi, rapport d'inventaire<\/td><\/tr><tr><td>11<\/td><td>Transmettre le rapport pour validation<\/td><td>DCG, D2MG<\/td><td>Courriel avec accusé de réception, soit-transmis<\/td><\/tr><tr><td>12<\/td><td>Lever les réserves<\/td><td>Chef de division Patrimoine ou Logistique, D2MG<\/td><td>Rapport mis à jour<\/td><\/tr><tr><td>13<\/td><td>Donner suite aux rapports<\/td><td>D2MG, DG<\/td><td>Notes, courrier du DG ; pour une réforme, correspondance du DG au PCA<\/td><\/tr><\/tbody><\/table><h4>Le PS3, concrètement<\/h4><ul><li>Le rapport de suivi est validé par le D2MG ; le rapport d'inventaire est transmis au DG pour validation. S'il y a des réserves, le rapport est repris puis transmis à nouveau.<\/li><li>Ce que le PS3 doit aux autres processus : mettre à disposition le patrimoine approprié, aider à l'utiliser, l'entretenir (module 4).<\/li><\/ul><h4>Pourquoi cela me concerne<\/h4><p>En mai 2025, l'audit a relevé qu'en région et en zone la FIP et le logigramme étaient peu connus, et que la plateforme numérique d'expression des besoins n'était encore intégrée ni à la procédure Achats et moyens généraux ni au logigramme. En avril 2026, il a relevé l'absence de plan de surveillance et de maintenance du patrimoine (7.1.3) : l'étape 9 reste à outiller. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Montrez-moi où se situe votre activité dans le logigramme, et la preuve que vous produisez. »<\/p><p>Réponse type : « J'interviens à l'étape [numéro et nom]. Je reçois [tel élément] de [tel acteur], je produis [telle preuve], que je transmets à [tel acteur]. »<\/p>"}, "M07": {"titre": "Objectifs et indicateurs du PS3", "html": "<p><strong>L'essentiel en 5 points<\/strong> (FIP-PS3-V1)<\/p><ol><li><strong>Un objectif stratégique<\/strong> : porter à 80 % la part des agents satisfaits de la gestion administrative, des conditions de travail et du bien-être social. Mesure : enquête d'opinion annuelle, par la DRH. L'échéance inscrite, 2024, est à actualiser.<\/li><li><strong>Huit objectifs opérationnels<\/strong>, un indicateur chacun (tableau ci-dessous).<\/li><li><strong>Un indicateur<\/strong>, c'est une méthode de calcul, une cible, une fréquence, une source de vérification et un responsable. Si une donnée manque, il ne se calcule pas.<\/li><li><strong>Le tableau de bord<\/strong> consolide les mesures. Selon le support ANADER, il sert à visualiser, analyser, décider et communiquer.<\/li><li><strong>Le plan d'actions face aux objectifs<\/strong> (27/02/2025) décline chaque objectif en activités : élaborer le PPM, l'exécuter, suivre son exécution ; pour les sites, compléter la documentation, demander puis retirer les ACD.<\/li><\/ol><table><thead><tr><th>N°<\/th><th>Objectif opérationnel<\/th><th>Indicateur et méthode de calcul<\/th><th>Cible<\/th><th>Fréquence (FIP)<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>Acquérir le matériel roulant<\/td><td>Taux d'acquisition : nombre acquis ÷ prévisions d'acquisition<\/td><td>100 %<\/td><td>Trimestrielle<\/td><\/tr><tr><td>2<\/td><td>Renouveler le matériel roulant à réformer<\/td><td>Taux de renouvellement : nombre renouvelé ÷ nombre à renouveler<\/td><td>100 %<\/td><td>Annuelle<\/td><\/tr><tr><td>3<\/td><td>Acquérir le mobilier de bureau et le matériel de travail<\/td><td>Taux d'acquisition : nombre acquis ÷ nombre prévu<\/td><td>100 %<\/td><td>Trimestrielle<\/td><\/tr><tr><td>4<\/td><td>Renouveler le mobilier et le matériel à réformer<\/td><td>Taux de renouvellement : nombre renouvelé ÷ nombre à renouveler<\/td><td>100 %<\/td><td>Trimestrielle<\/td><\/tr><tr><td>5<\/td><td>Acquérir le matériel informatique<\/td><td>Taux d'acquisition : nombre acquis ÷ nombre prévu<\/td><td>100 %<\/td><td>Trimestrielle<\/td><\/tr><tr><td>6<\/td><td>Renouveler le matériel informatique à réformer<\/td><td>Taux de renouvellement : nombre renouvelé ÷ nombre à renouveler<\/td><td>100 %<\/td><td>Trimestrielle<\/td><\/tr><tr><td>7<\/td><td>Établir les titres de propriété de 8 sites au nom de l'ANADER<\/td><td>Nombre de sites titrés, par dénombrement ; preuve : ACD<\/td><td>8<\/td><td>Semestrielle<\/td><\/tr><tr><td>8<\/td><td>Optimiser la gestion du matériel roulant<\/td><td>Nombre de manuels ou procédures de gestion du matériel actualisés<\/td><td>1<\/td><td>Annuelle<\/td><\/tr><\/tbody><\/table><p>Sources de vérification prévues : PPM, factures, PV de mise en service ou de réception, rapports d'inventaire, fichier des immobilisations, ACD.<\/p><p><strong>Le PS3, concrètement<\/strong> (tableau de bord SMQ PS3, 2025)<\/p><table><thead><tr><th>Indicateur<\/th><th>Ce que montre le tableau de bord<\/th><\/tr><\/thead><tbody><tr><td>Renouvellement du matériel roulant<\/td><td>584 sur 1 199, soit 48,7 % pour une cible de 100 %<\/td><\/tr><tr><td>Renouvellement du mobilier et du matériel<\/td><td>83 sur 2 714 en mars, soit 3,1 % ; pas de mesure ensuite<\/td><\/tr><tr><td>Renouvellement du matériel informatique<\/td><td>1 183 sur 1 005 en mars, soit 117,7 % : à vérifier<\/td><\/tr><tr><td>Acquisitions (roulant, mobilier, informatique)<\/td><td>Prévisions non saisies : taux non calculable<\/td><\/tr><tr><td>Sites titrés<\/td><td>2 en décembre, pour une cible de 8<\/td><\/tr><tr><td>Manuel de gestion du matériel actualisé<\/td><td>Aucune mesure saisie<\/td><\/tr><\/tbody><\/table><p>(Chiffres à confirmer et à actualiser à chaque session.)<\/p><h4>Pourquoi cela me concerne<\/h4><p>L'audit d'avril 2026 relève des indicateurs insuffisamment mesurés (9.1). En septembre-octobre 2026, l'audit note l'absence de plan d'actions pour l'appropriation des procédures de gestion du matériel roulant (6.2), alors que le plan d'actions de 2025 prévoyait d'en élaborer un pour l'objectif 8. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Comment mesurez-vous l'atteinte de vos objectifs, et quelle est la dernière valeur de votre indicateur ? »<\/p><p>Réponse type : « Notre indicateur est [nom], calculé ainsi : [méthode]. La dernière mesure est de [valeur] pour une cible de [cible] ; l'écart s'explique par [cause], et l'action décidée est [action]. »<\/p>"}, "M08": {"titre": "Risques, réclamations, non-conformités", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>Risque et opportunité<\/strong> : un risque peut empêcher d'atteindre un objectif ; une opportunité peut aider à l'atteindre. Chacun est rattaché à une étape du logigramme et classé par sa criticité : plus elle est élevée, plus il faut agir vite.<\/li><li><strong>Le registre du PS3 compte 5 risques et 1 opportunité<\/strong> (tableau ci-dessous). Trois risques sont prioritaires ; les autres sont sous surveillance.<\/li><li><strong>Chaque risque prioritaire a son plan d'actions<\/strong> : une note sur l'usage de la plateforme d'expression des besoins et une formation ; une démarche d'analyse des besoins ; une démarche de mouvement du patrimoine, l'actualisation de la procédure Achats et moyens généraux et la sensibilisation des utilisateurs. L'opportunité prévoit une démarche de gestion du patrimoine mis à disposition par les partenaires.<\/li><li><strong>Réclamation, non-conformité, correction, action corrective<\/strong> : quatre notions à ne pas confondre (mots clés).<\/li><li><strong>Rien n'est clos sans preuve<\/strong> : une réclamation, avec la preuve et la validation du pilote ; une non-conformité, avec en plus la cause racine, l'action corrective et la vérification de son efficacité ; un écart d'audit, par son plan d'actions EN11-PS3-V01.<\/li><\/ol><table><thead><tr><th>Étape du logigramme<\/th><th>Risque ou opportunité<\/th><th>Criticité<\/th><th>Statut au registre<\/th><\/tr><\/thead><tbody><tr><td>Réceptionner les besoins en patrimoine<\/td><td>Non-exhaustivité des besoins exprimés au niveau de la D2MG<\/td><td>10<\/td><td>Prioritaire<\/td><\/tr><tr><td>Analyser les besoins réceptionnés<\/td><td>Mauvaise analyse des besoins<\/td><td>6<\/td><td>Prioritaire<\/td><\/tr><tr><td>Suivre et évaluer l'utilisation du patrimoine<\/td><td>Inadéquation entre la base de données des biens et la réalité de leur localisation<\/td><td>12<\/td><td>Prioritaire<\/td><\/tr><tr><td>Traiter le patrimoine non conforme<\/td><td>Traitement inapproprié du bien non conforme<\/td><td>1,2<\/td><td>Sous surveillance<\/td><\/tr><tr><td>Suivre et évaluer ; Sauvegarder<\/td><td>Diminution du patrimoine<\/td><td>1,2<\/td><td>Sous surveillance<\/td><\/tr><tr><td>Suivre et évaluer l'utilisation du patrimoine<\/td><td>Augmentation du patrimoine (opportunité)<\/td><td>—<\/td><td>Sous surveillance<\/td><\/tr><\/tbody><\/table><h4>Les mots clés<\/h4><table><thead><tr><th>Mot<\/th><th>Ce qu'il veut dire<\/th><\/tr><\/thead><tbody><tr><td>Réclamation<\/td><td>L'expression d'une insatisfaction par un client : agent, service, partenaire<\/td><\/tr><tr><td>Non-conformité<\/td><td>Une exigence non satisfaite (module 3)<\/td><\/tr><tr><td>Correction<\/td><td>L'action qui traite l'écart constaté : on répare l'effet<\/td><\/tr><tr><td>Action corrective<\/td><td>L'action qui supprime la cause, pour que l'écart ne revienne pas<\/td><\/tr><tr><td>Criticité<\/td><td>La note qui classe les risques par ordre de priorité<\/td><\/tr><\/tbody><\/table><h4>Le PS3, concrètement<\/h4><ul><li>Les réclamations et les non-conformités du PS3 s'enregistrent dans leurs registres (Cadre de travail V3.2, onglets 3.1 et 3.2), avec un identifiant du type RECLA-2026-001 ou NC-2026-001.<\/li><li>Leur statut avance d'« Ouverte » à « En cours », puis « Traitée » et « Clôturée ».<\/li><li>Les écarts d'audit sont suivis sur le canevas EN11-PS3-V01, plan d'actions et de suivi des écarts issus des audits qualité interne.<\/li><\/ul><h4>Pourquoi cela me concerne<\/h4><p>L'audit d'avril 2026 relève, pour le PS3, des outils de gestion des risques et opportunités mal maîtrisés (6.1), un mécanisme de gestion des réclamations mal connu (9.1.2) et l'absence de protocole pour le matériel reçu des partenaires (8.5.3). En septembre-octobre 2026, l'audit note qu'aucune action n'a été engagée pour traiter les écarts d'avril 2026 du PS3 (9.2). (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Quel est le principal risque de votre activité, et que faites-vous pour le maîtriser ? »<\/p><p>Réponse type : « Le risque principal est [risque], de criticité [valeur]. Pour le maîtriser, nous [action du plan] ; la preuve est [document]. Quand un écart survient, je le signale à [co-pilote] et il est enregistré. »<\/p>"}, "M09": {"titre": "Chaque acteur compte", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>Quatre familles d'acteurs<\/strong> pilotent les processus de l'ANADER : la Direction, l'équipe qualité, le pilote et les co-pilotes, les acteurs (tableau ci-dessous).<\/li><li><strong>Au PS3<\/strong> : le pilote est Hassan CISSE, Directeur de la D2MG ; les co-pilotes sont Seydyn CISSE et Oumar CISSE ; la personne ressource est Siaka KAMARA, chef de la Division Patrimoine ; les points focaux relaient le processus en région et en zone.<\/li><li><strong>Trois rendez-vous<\/strong> (Cadre de travail V3.2) : la réunion technique PS3, chaque mois ; la revue de processus, chaque trimestre ou selon le programme ; le suivi des audits, chaque semestre ou selon le programme.<\/li><li><strong>La revue de processus<\/strong>, animée par le pilote avec les acteurs clés, est le « Vérifier » du PDCA ; ses décisions nourrissent le « Agir ». On y rappelle les objectifs, on suit les actions décidées, on examine les résultats (indicateurs, remontées du terrain, réclamations, audits) et on décide des actions. Son compte rendu, sur le canevas EN8-PS3-V01, dit qui conduit chaque action.<\/li><li><strong>Le jour de l'audit<\/strong> : répondre à la question posée ; montrer ou situer la preuve ; dire « je ne sais pas, je vais chercher » plutôt qu'improviser ; signaler ensuite ce qui a manqué.<\/li><\/ol><table><thead><tr><th>Acteur<\/th><th>Ce qu'il fait (support ANADER)<\/th><\/tr><\/thead><tbody><tr><td>La Direction<\/td><td>Assume la responsabilité de l'efficacité du SMQ, établit la politique et les objectifs qualité, fournit les ressources, promeut l'approche processus, l'approche par les risques et l'amélioration<\/td><\/tr><tr><td>L'équipe qualité<\/td><td>Planifie avec les pilotes, accompagne la mise en œuvre, met à disposition les outils, forme les acteurs, soutient la production de la documentation<\/td><\/tr><tr><td>Le pilote<\/td><td>Décrit le processus, identifie les risques et opportunités, pilote les revues, analyse les résultats et décide des améliorations, élabore les plans d'actions, rend compte<\/td><\/tr><tr><td>Le co-pilote<\/td><td>Contribue à la description du processus et aux risques, propose le plan d'actions après audit, prépare et organise les revues, suit les indicateurs et commente les tableaux de bord, suit les plans d'actions, veille à la cohérence des documents<\/td><\/tr><tr><td>La personne ressource (Cadre V3.2)<\/td><td>Appuie la consolidation des données, le suivi des actions et la préparation des revues<\/td><\/tr><tr><td>Les acteurs et correspondants<\/td><td>Participent aux réunions et aux revues, font remonter les difficultés et proposent des améliorations, mettent en œuvre et suivent les actions décidées<\/td><\/tr><\/tbody><\/table><h4>Ma check-list de préparation à l'audit<\/h4><ul><li>Je sais dire dans quel processus je travaille, sa finalité et mon rôle (modules 1 et 4)<\/li><li>Je situe mon activité dans le logigramme et je connais la preuve que je produis (module 6)<\/li><li>Mes dernières preuves sont sur le bon canevas, signées, datées et rangées sur le serveur SMQ (module 5)<\/li><li>Je connais l'indicateur auquel je contribue et la donnée que je fournis (module 7)<\/li><li>Je connais le principal risque de mon activité et ce que je fais pour le maîtriser (module 8)<\/li><li>Je sais enregistrer une réclamation ou signaler un écart (module 8)<\/li><li>Je sais où trouver la FIP et les canevas du PS3 (module 5)<\/li><li>Je sais qui appeler si je bloque : co-pilote, personne ressource ou point focal<\/li><\/ul><h4>Pourquoi cela me concerne<\/h4><p>En mai 2025, l'audit a relevé qu'aucune revue ni aucun bilan d'animation du PS3 n'étaient prouvés pour 2024 : les échanges sur WhatsApp ne suffisaient pas. En septembre-octobre 2026, l'audit demande aux pilotes de s'engager davantage dans l'animation de leur processus et relève une transmission tardive des documents du PS3. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« Quand a eu lieu la dernière revue du PS3, qu'y a-t-on décidé, et quelle action vous concerne ? »<\/p><p>Réponse type : « La dernière revue a eu lieu le [date] ; son compte rendu, sur le canevas EN8-PS3-V01, est sur le serveur. L'action qui me concerne est [action], pour le [délai] ; elle est [état d'avancement]. »<\/p>"}, "M10": {"titre": "Mon engagement, du PS3 au PSD 2026-2030", "html": "<h4>L'essentiel en 5 points<\/h4><ol><li><strong>Le PSD 2026-2030<\/strong> est le troisième plan stratégique de l'ANADER : 3 piliers, 5 axes, 18 domaines, 52 programmes. Sa vision : « ANADER, le leader du développement rural, du conseil agropastoral et halieutique ».<\/li><li><strong>Le PS3 s'inscrit dans l'axe 4<\/strong> : « Amélioration de la gestion administrative, financière et comptable ainsi que des conditions de travail et du bien-être social des agents », domaine 4.3 « infrastructures et équipements de services ». L'effet attendu 4.4 porte sur la gestion du patrimoine : matériels et équipements, parc auto-moto, système informatique, infrastructures.<\/li><li><strong>La D2MG pilote trois programmes du domaine 4.3<\/strong> et contribue à deux autres (tableau ci-dessous).<\/li><li><strong>La conformité ISO 9001 est un résultat attendu du PSD<\/strong> : l'audit de certification est inscrit au programme P.5.3.1 « Gouvernance de l'entreprise ».<\/li><li><strong>Trois niveaux d'indicateurs à ne pas confondre<\/strong> : l'impact du PSD, les résultats de ses programmes, les indicateurs opérationnels du PS3 inscrits dans la FIP. Le PS3 nourrit le PSD ; il ne le remplace pas.<\/li><\/ol><table><thead><tr><th>Programme du PSD<\/th><th>Pilote (fiche)<\/th><th>Ce qu'il vise, entre autres<\/th><\/tr><\/thead><tbody><tr><td>P.4.3.1 Sécurisation du patrimoine immobilier<\/td><td>CJF<\/td><td>201 ACD et 97 certificats fonciers ou baux emphytéotiques<\/td><\/tr><tr><td>P.4.3.2 Acquisition des équipements<\/td><td>D2MG<\/td><td>Tous les centres de responsabilité équipés, tous les agents dotés de kits<\/td><\/tr><tr><td>P.4.3.3 Construction, réhabilitation, rénovation<\/td><td>D2MG<\/td><td>Construire, réhabiliter et rénover le siège, des DR, des zones et des centres de formation<\/td><\/tr><tr><td>P.4.3.4 Gestion des équipements et des infrastructures, matériel roulant<\/td><td>D2MG<\/td><td>Un plan de gestion des équipements et des infrastructures ; 100 % du parc fonctionnel<\/td><\/tr><tr><td>P.4.3.5 Informatisation<\/td><td>DISI, avec la D2MG et la DFD<\/td><td>Connecter les centres de responsabilité et renouveler le matériel informatique<\/td><\/tr><tr><td>P.5.3.1 Gouvernance de l'entreprise<\/td><td>DG<\/td><td>L'audit de certification ISO 9001, parmi d'autres résultats<\/td><\/tr><\/tbody><\/table><h4>Le PS3, concrètement : un fil du bureau au PSD<\/h4><table><thead><tr><th>Niveau<\/th><th>Exemple<\/th><\/tr><\/thead><tbody><tr><td>Mon geste<\/td><td>Je mets à jour la localisation d'un bien après chaque déplacement<\/td><\/tr><tr><td>Le PS3<\/td><td>Étape 9 du logigramme ; le risque le plus élevé du registre, l'écart entre la base et la réalité, est maîtrisé<\/td><\/tr><tr><td>Le PSD<\/td><td>Programme P.4.3.4 ; résultat attendu « gestion du patrimoine améliorée » (axe 4)<\/td><\/tr><tr><td>La preuve<\/td><td>Une base à jour, un rapport d'inventaire sans écart<\/td><\/tr><\/tbody><\/table><h4>Pourquoi cela me concerne<\/h4><p>Le diagnostic du PSD relève, pour le patrimoine, l'absence de maintenance préventive, des sites peu valorisés ou occupés illégalement et des sites sans titre. En septembre-octobre 2026, l'audit interne note l'absence de plan d'actions pour l'appropriation des procédures de gestion du matériel roulant (6.2). Le PS3 est en première ligne sur ces trois chantiers. (Constats à actualiser à chaque session.)<\/p><h4>La question de l'auditeur<\/h4><p>« En quoi votre activité contribue-t-elle aux objectifs de l'ANADER ? »<\/p><p>Réponse type : « Mon activité, [tel geste], sert l'étape [numéro] du PS3 et son indicateur [nom]. Elle contribue à l'axe 4 du PSD 2026-2030, en particulier au programme [P.4.3.x]. La preuve en est [document]. »<\/p>"}};
const LOGO = 'data:image/jpeg;base64,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';

const TYPES = {
  eval_depart:{ic:'🧭', lib:'Évaluation de départ', aide:'20 questions pour mesurer votre point de départ. Elle n\'est pas éliminatoire.'},
  quiz_entree:{ic:'❓', lib:'Quiz d\'entrée', aide:'5 questions avant la capsule. Non éliminatoire.'},
  capsule:{ic:'🎬', lib:'Capsule vidéo', aide:'Regardez au moins 90 % de l\'épisode.'},
  support:{ic:'🖼️', lib:'Support de la séance', aide:'Faites défiler toutes les diapositives.'},
  fiche:{ic:'📄', lib:'Fiche apprenant', aide:'Lisez la fiche, puis confirmez.'},
  carnet:{ic:'✍️', lib:'Mon carnet de parcours', aide:'Remplissez chaque rubrique.'},
  quiz_sortie:{ic:'✅', lib:'Quiz de sortie', aide:'3 bonnes réponses sur 5 pour ouvrir le module suivant.'},
  eval_sortie:{ic:'📊', lib:'Évaluation de sortie', aide:'Les 20 questions du départ, pour mesurer votre progression, et votre avis.'},
  test_certif:{ic:'🎓', lib:'Test de certification', aide:'20 questions, 14/20 pour obtenir le certificat.'}
};

let moi = null, etat = null, gest = false, vue = 'parcours', ouverts = {};
const $ = s => document.querySelector(s);
const ech = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFr = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'}) : '—';
const dateHeureFr = d => d ? new Date(d).toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '—';
function toast(m, t){ const e = document.createElement('div'); e.className = 'toast ' + (t || ''); e.textContent = m; $('#toasts').appendChild(e); setTimeout(() => e.remove(), 4800); }
async function rpc(nom, args){ const { data, error } = await sb.rpc(nom, args); if (error) throw new Error(error.message); return data; }
const contenu = () => $('#contenu');

/* ------------------------------------------------------------ démarrage */
async function demarrer(){
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = 'index.html'; return; }
  const { data: { user } } = await sb.auth.getUser();
  const { data: a } = await sb.from('acteurs').select('*').eq('user_id', user.id).eq('actif', true).maybeSingle();
  if (!a) { location.href = 'index.html'; return; }
  moi = a;
  await rechargerEtat();
  $('#ecranChargement').classList.add('hidden');
  if (!etat.inscrit && !gest) {
    $('#ecranAcces').classList.remove('hidden');
    $('#msgAcces').textContent = moi.nom_prenoms + ', vous n\'êtes pas encore inscrit(e) au parcours « Mon parcours SMQ ». L\'inscription est faite par le Pilote ou un co-pilote du PS3.';
    return;
  }
  $('#app').classList.remove('hidden');
  $('#qui').innerHTML = '<strong>' + ech(moi.nom_prenoms) + '</strong>' + ech(moi.fonction || moi.role || '');
  dessinerMenu();
  const v = new URLSearchParams(location.search).get('vue');
  aller(v || (etat.inscrit ? 'parcours' : 'suivi'));
}
async function rechargerEtat(){ etat = await rpc('formation_etat', { p_parcours: PARCOURS }); gest = !!etat.gestionnaire; }

function dessinerMenu(){
  const items = [];
  items.push(['parcours', '🗺️', 'Mon parcours']);
  if (etat.inscrit) { items.push(['carnet', '✍️', 'Mon carnet']); items.push(['documents', '🏅', 'Mes documents']); }
  let h = items.map(i => '<li><a data-vue="' + i[0] + '">' + i[1] + ' ' + i[2] + '</a></li>').join('');
  if (gest) h += '<li class="sep">Pilotage</li><li><a data-vue="suivi">📋 Suivi des apprenants</a></li><li><a data-vue="inscriptions">➕ Inscriptions</a></li>';
  h += '<li class="sep">Aide</li><li><a data-vue="aide">❔ Règles du parcours</a></li>';
  $('#menu').innerHTML = h;
}
function marquerMenu(){ document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('actif', a.dataset.vue === vue)); }

function aller(v, arg){
  vue = v; marquerMenu(); window.scrollTo(0, 0);
  arreterVideo();
  const f = { parcours: vueParcours, carnet: vueCarnetGlobal, documents: vueDocuments, suivi: vueSuivi, inscriptions: vueInscriptions, aide: vueAide, etape: vueEtape }[v] || vueParcours;
  Promise.resolve(f(arg)).catch(e => { console.error(e); contenu().innerHTML = '<div class="encadre ko"><b>Erreur :</b> ' + ech(e.message) + '</div>'; });
}

/* ------------------------------------------------------------ helpers étapes */
const etapes = () => etat.etapes || [];
const etapeParId = id => etapes().find(e => e.id === Number(id));
const moduleDe = r => (etat.modules || []).find(m => m.rang === r);
function prochaineEtape(){ return etapes().find(e => e.ouverte && !e.validee); }
function pastilleEtape(e){
  if (e.validee) return '<span class="pastille ok">Validée' + (e.derniere_note != null && e.type !== 'test_certif' ? ' · ' + fmtNote(e.derniere_note) + '/' + e.sur : '') + '</span>';
  if (e.ouverte) return '<span class="pastille go">À faire</span>';
  return '<span class="pastille lock">🔒 Verrouillée</span>';
}
const fmtNote = n => (Math.round(Number(n) * 10) / 10).toString().replace('.', ',');
function ligneEtape(e, seul){
  const t = TYPES[e.type];
  let bouton = '';
  if (e.ouverte && !e.validee) bouton = '<button class="btn prim sm" data-etape="' + e.id + '">' + (e.essais > 0 ? 'Reprendre' : 'Commencer') + '</button>';
  else if (e.validee && ['capsule', 'support', 'fiche', 'carnet'].includes(e.type)) bouton = '<button class="btn sm" data-etape="' + e.id + '">Revoir</button>';
  else if (e.validee && e.type === 'quiz_sortie') bouton = '<button class="btn sm" data-etape="' + e.id + '">Refaire</button>';
  const titre = e.type === 'capsule' ? e.titre : t.lib;
  return '<div class="ligne' + (seul ? ' seul' : '') + '"><span class="ic">' + t.ic + '</span><div class="lib">' + ech(titre) + '<small>' + ech(t.aide) + '</small></div>' + pastilleEtape(e) + bouton + '</div>';
}

/* ------------------------------------------------------------ vue : parcours */
function vueParcours(){
  if (!etat.inscrit) {
    contenu().innerHTML = '<div class="entete-page"><div><h1>Mon parcours SMQ</h1><p>Vous n\'êtes pas inscrit(e) à ce parcours.</p></div></div>' +
      '<div class="encadre info">En tant que Pilote ou co-pilote, vous pouvez vous inscrire vous-même depuis « Inscriptions » pour suivre le parcours comme un apprenant.</div>';
    return;
  }
  const E = etapes(), nb = E.length, ok = E.filter(e => e.validee).length, pct = Math.round(ok * 100 / nb);
  const ins = etat.inscription, c = etat.certification, p = etat.parcours, suiv = prochaineEtape();
  let h = '<div class="entete-page"><div><h1>Mon parcours SMQ</h1><p>' + ech(p.description || '') + '</p></div>' +
    (suiv ? '<button class="btn prim" data-etape="' + suiv.id + '">▶ Continuer : ' + ech(libEtapeCourt(suiv)) + '</button>' : '') + '</div>';
  h += '<div class="carte"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>Progression : ' + ok + ' étapes sur ' + nb + '</b><span class="mini">Inscrit(e) le ' + dateFr(ins.date_inscription) + (ins.cycle > 1 ? ' · reprise du parcours (cycle ' + ins.cycle + ')' : '') + '</span></div>' +
    '<div class="prog" style="margin-top:8px"><i style="width:' + pct + '%"></i></div>';
  if (ins.statut === 'certifie') h += '<div class="encadre ok" style="margin:14px 0 0">🎓 <b>Félicitations, vous êtes certifié(e).</b> Votre certificat est dans « Mes documents ».</div>';
  else if (c.tentatives > 0) h += '<div class="encadre att" style="margin:14px 0 0">Test de certification : ' + c.tentatives + ' tentative(s) sur ' + p.nb_tentatives + ', meilleure note ' + fmtNote(c.meilleure) + '/20. ' +
    (c.restantes > 0 ? 'Il vous reste ' + c.restantes + ' tentative(s) jusqu\'au ' + dateFr(c.date_limite) + (c.prochaine_possible && new Date(c.prochaine_possible) > new Date() ? ', la prochaine à partir du ' + dateHeureFr(c.prochaine_possible) : '') + '.' : '') + '</div>';
  h += '</div>';
  const dep = E.find(e => e.type === 'eval_depart');
  h += '<div class="module ' + (dep.validee ? 'fait' : 'encours') + '"><div class="tete" style="cursor:default"><div class="num">0</div><div><h3>Pour commencer</h3><div class="ep">Votre point de départ</div></div></div><div class="corps">' + ligneEtape(dep) + '</div></div>';
  (etat.modules || []).forEach(m => {
    const es = E.filter(e => e.module_rang === m.rang), fait = es.every(e => e.validee), encours = !fait && es.some(e => e.ouverte);
    const nOk = es.filter(e => e.validee).length;
    const deplie = ouverts[m.rang] != null ? ouverts[m.rang] : encours;
    h += '<div class="module ' + (fait ? 'fait' : encours ? 'encours' : '') + '"><div class="tete" data-plier="' + m.rang + '"><div class="num">' + (fait ? '✓' : m.rang) + '</div><div><h3>Module ' + m.rang + ' — ' + ech(m.titre) + '</h3><div class="ep">Capsule : ' + ech(m.episode) + '</div></div><div class="etat">' +
      (fait ? 'Terminé' : encours ? nOk + '/6 étapes' : '🔒 Verrouillé') + ' ' + (deplie ? '▴' : '▾') + '</div></div>' +
      (deplie ? '<div class="corps">' + es.map(e => ligneEtape(e)).join('') + '</div>' : '') + '</div>';
  });
  const fin = E.filter(e => e.module_rang == null && e.type !== 'eval_depart');
  h += '<div class="module ' + (fin.every(e => e.validee) ? 'fait' : fin.some(e => e.ouverte) ? 'encours' : '') + '"><div class="tete" style="cursor:default"><div class="num">🎓</div><div><h3>Pour finir</h3><div class="ep">Évaluation de sortie et test de certification</div></div></div><div class="corps">' + fin.map(e => ligneEtape(e)).join('') + '</div></div>';
  contenu().innerHTML = h;
}
function libEtapeCourt(e){ return (e.module_rang ? 'module ' + e.module_rang + ', ' : '') + (e.type === 'capsule' ? 'capsule' : TYPES[e.type].lib.toLowerCase()); }

/* ------------------------------------------------------------ vue : une étape */
function filEtape(e){
  const m = e.module_rang ? moduleDe(e.module_rang) : null;
  return '<div class="fil"><a data-vue="parcours">Mon parcours</a> › ' + (m ? 'Module ' + m.rang + ' — ' + ech(m.titre) + ' › ' : '') + ech(TYPES[e.type].lib) + '</div>';
}
async function vueEtape(id){
  const e = etapeParId(id);
  if (!e) return aller('parcours');
  if (!e.ouverte) { toast('Cette étape n\'est pas encore ouverte.', 'err'); return aller('parcours'); }
  if (['eval_depart', 'quiz_entree', 'quiz_sortie', 'eval_sortie'].includes(e.type)) return vueQuiz(e);
  if (e.type === 'test_certif') return vueTest(e);
  if (e.type === 'capsule') return vueCapsule(e);
  if (e.type === 'support') return vueSupport(e);
  if (e.type === 'fiche') return vueFiche(e);
  if (e.type === 'carnet') return vueCarnet(e);
}
async function apresValidation(e){
  await rechargerEtat();
  const s = prochaineEtape();
  if (s) aller('etape', s.id); else aller('parcours');
}
function boutonsSuite(){ return '<div class="liens" style="margin-top:14px"><button class="btn prim" data-act="suite">Étape suivante →</button><button class="btn" data-vue="parcours">Retour au parcours</button></div>'; }

/* ---- questionnaires ---- */
function htmlQuestions(qs, corr){
  const cmap = {}; (corr || []).forEach(c => cmap[c.id] = c);
  let n = 0, avisTitre = false;
  return qs.map(q => {
    let tete = '';
    if (q.questionnaire === 'satisfaction' && !avisTitre) { avisTitre = true; tete = '<h3 style="margin:18px 0 8px">Votre avis sur le parcours (non noté)</h3>'; }
    if (q.notee) n++;
    const c = cmap[q.id];
    return tete + '<div class="question" data-q="' + q.id + '"><div class="enonce">' + (q.notee ? n + '. ' : '') + ech(q.enonce) + '</div>' +
      q.choix.map((ch, i) => {
        let cl = '';
        if (c) { if (i === c.bonne) cl = 'bonne'; else if (i === c.votre) cl = 'fausse'; }
        return '<label class="' + cl + '"><input type="radio" name="q' + q.id + '" value="' + i + '"' + (c ? ' disabled' + (i === c.votre ? ' checked' : '') : '') + '> <span>' + String.fromCharCode(65 + i) + '. ' + ech(ch) + '</span></label>';
      }).join('') +
      (c && c.explication ? '<div class="expl">' + ech(c.explication) + '</div>' : '') + '</div>';
  }).join('');
}
function lireReponses(qs){
  const r = {}; let manque = 0;
  qs.forEach(q => { const x = document.querySelector('input[name="q' + q.id + '"]:checked'); if (x) r[q.id] = Number(x.value); else if (q.notee) manque++; });
  return { r, manque };
}
async function vueQuiz(e){
  const t = TYPES[e.type];
  contenu().innerHTML = filEtape(e) + '<p>Chargement des questions…</p>';
  const qs = await rpc('formation_questions_etape', { p_etape: e.id });
  let intro = t.aide;
  if (e.type === 'quiz_sortie') intro = 'Cinq questions sur le module. Il faut au moins ' + etat.parcours.seuil_quiz_sortie + ' bonnes réponses pour ouvrir le module suivant ; sinon, vous revoyez la capsule puis vous recommencez. Les essais ne sont pas limités.';
  contenu().innerHTML = filEtape(e) + '<div class="entete-page"><div><h1>' + t.ic + ' ' + ech(t.lib) + '</h1><p>' + ech(intro) + '</p></div></div>' +
    '<div id="qs">' + htmlQuestions(qs) + '</div><div class="liens"><button class="btn prim" id="btnSoumettre">Valider mes réponses</button><button class="btn" data-vue="parcours">Annuler</button></div>';
  $('#btnSoumettre').onclick = async () => {
    const { r, manque } = lireReponses(qs);
    if (manque) { toast('Répondez à toutes les questions (' + manque + ' sans réponse).', 'err'); return; }
    $('#btnSoumettre').disabled = true;
    try {
      const res = await rpc('formation_soumettre', { p_etape: e.id, p_reponses: r });
      let bandeau;
      if (e.type === 'quiz_sortie' && !res.reussi)
        bandeau = '<div class="encadre ko"><div class="score">' + fmtNote(res.note) + ' / ' + res.sur + '</div>' + (res.deja_valide ? 'Ce module reste validé. Revoyez les points ci-dessous.' : 'Il faut ' + etat.parcours.seuil_quiz_sortie + ' bonnes réponses. Revoyez la capsule de ce module, puis refaites le quiz. Les bonnes réponses sont en vert.') + '</div>';
      else if (e.type === 'quiz_sortie') bandeau = '<div class="encadre ok"><div class="score">' + fmtNote(res.note) + ' / ' + res.sur + '</div>Bravo, le module est validé.</div>';
      else if (e.type === 'eval_sortie') bandeau = '<div class="encadre ok"><div class="score">' + fmtNote(res.note) + ' / ' + res.sur + '</div>' + comparaisonDepart(res.note) + ' Le test de certification est maintenant ouvert.</div>';
      else bandeau = '<div class="encadre info"><div class="score">' + fmtNote(res.note) + ' / ' + res.sur + '</div>C\'est votre point de départ. Cette note ne bloque rien : elle sert à mesurer vos progrès.</div>';
      const corr = res.correction;
      contenu().innerHTML = filEtape(e) + '<h1>' + t.ic + ' ' + ech(t.lib) + ' — résultat</h1>' + bandeau +
        (corr ? '<h3>Correction</h3>' + htmlQuestions(qs.filter(q => q.notee), corr) : '') +
        (e.type === 'quiz_sortie' && !res.reussi && !res.deja_valide ? '<div class="liens"><button class="btn prim" data-act="capsule" data-m="' + e.module_rang + '">Revoir la capsule</button><button class="btn" data-vue="parcours">Retour au parcours</button></div>' : boutonsSuite());
      await rechargerEtat();
    } catch (err) { toast(err.message, 'err'); $('#btnSoumettre').disabled = false; }
  };
}
function comparaisonDepart(note){
  const dep = etapes().find(x => x.type === 'eval_depart');
  if (!dep || dep.derniere_note == null) return '';
  const g = Number(note) - Number(dep.derniere_note);
  return 'Au départ : ' + fmtNote(dep.derniere_note) + '/20, soit ' + (g >= 0 ? '+' : '') + fmtNote(g) + ' point(s).';
}

/* ---- test de certification ---- */
async function vueTest(e){
  const p = etat.parcours, c = etat.certification;
  if (etat.inscription.statut === 'certifie') { contenu().innerHTML = filEtape(e) + '<div class="encadre ok">Vous êtes déjà certifié(e). Votre certificat est dans « Mes documents ».</div>'; return; }
  const attente = c.prochaine_possible && new Date(c.prochaine_possible) > new Date();
  contenu().innerHTML = filEtape(e) + '<div class="entete-page"><div><h1>🎓 Test de certification</h1><p>20 questions sur l\'ensemble du parcours, différentes de celles des évaluations.</p></div></div>' +
    '<div class="carte"><h3>Les règles</h3><ul>' +
    '<li>Il faut <b>' + p.seuil_certification + '/20</b> pour obtenir le certificat, valable ' + p.validite_mois + ' mois.</li>' +
    '<li><b>' + p.nb_tentatives + ' tentatives</b> au maximum, dans les ' + p.delai_jours + ' jours qui suivent la première, avec ' + p.delai_entre_heures + ' heures entre deux tentatives. La meilleure note est retenue.</li>' +
    '<li>Le corrigé n\'est pas communiqué : seule votre note s\'affiche.</li>' +
    '<li>Après ' + p.nb_tentatives + ' tentatives sans atteindre ' + p.seuil_certification + '/20, vous recevez une attestation de participation et le parcours recommence au module 1.</li></ul>' +
    '<p><b>Tentatives utilisées : ' + c.tentatives + ' / ' + p.nb_tentatives + '</b>' + (c.meilleure != null ? ' · meilleure note : ' + fmtNote(c.meilleure) + '/20' : '') + (c.date_limite ? ' · date limite : ' + dateFr(c.date_limite) : '') + '</p>' +
    (attente ? '<div class="encadre att">Prochaine tentative possible le ' + dateHeureFr(c.prochaine_possible) + '.</div>' : '<button class="btn prim" id="btnGo">Commencer la tentative ' + (c.tentatives + 1) + '</button>') + '</div>';
  if (attente) return;
  $('#btnGo').onclick = async () => {
    let qs;
    try { qs = await rpc('formation_questions_etape', { p_etape: e.id }); } catch (err) { toast(err.message, 'err'); return; }
    contenu().innerHTML = filEtape(e) + '<h1>🎓 Test de certification — tentative ' + (c.tentatives + 1) + '</h1><div class="encadre info">Prenez votre temps. Vos réponses ne sont envoyées que lorsque vous cliquez sur « Remettre ma copie ».</div>' +
      htmlQuestions(qs) + '<div class="liens"><button class="btn prim" id="btnRemettre">Remettre ma copie</button></div>';
    $('#btnRemettre').onclick = async () => {
      const { r, manque } = lireReponses(qs);
      if (manque) { toast('Répondez à toutes les questions (' + manque + ' sans réponse).', 'err'); return; }
      if (!confirm('Remettre votre copie ? Cette tentative sera comptée.')) return;
      $('#btnRemettre').disabled = true;
      try {
        const res = await rpc('formation_soumettre', { p_etape: e.id, p_reponses: r });
        await rechargerEtat(); dessinerMenu(); marquerMenu();
        let h = filEtape(e) + '<h1>🎓 Résultat du test</h1>';
        if (res.reussi) h += '<div class="encadre ok"><div class="score">' + fmtNote(res.note) + ' / 20</div><b>Félicitations, vous êtes certifié(e).</b> Votre certificat n° ' + ech(res.document.numero) + ' est prêt.</div><div class="liens"><button class="btn vert" data-doc="' + ech(res.document.numero) + '">Afficher mon certificat</button><button class="btn" data-vue="parcours">Retour au parcours</button></div>';
        else if (res.restantes > 0) h += '<div class="encadre att"><div class="score">' + fmtNote(res.note) + ' / 20</div>Il faut ' + etat.parcours.seuil_certification + '/20. Il vous reste ' + res.restantes + ' tentative(s). Prochaine tentative possible le ' + dateHeureFr(res.prochaine_possible) + '. Revoyez les fiches et votre carnet d\'ici là.</div><div class="liens"><button class="btn" data-vue="parcours">Retour au parcours</button></div>';
        else h += '<div class="encadre ko"><div class="score">' + fmtNote(res.note) + ' / 20</div>Les ' + etat.parcours.nb_tentatives + ' tentatives sont utilisées. Une attestation de participation (n° ' + ech(res.document.numero) + ') vous est délivrée, et le parcours recommence au module 1 pour une nouvelle chance.</div><div class="liens"><button class="btn" data-doc="' + ech(res.document.numero) + '">Afficher mon attestation</button><button class="btn prim" data-vue="parcours">Reprendre le parcours</button></div>';
        contenu().innerHTML = h;
      } catch (err) { toast(err.message, 'err'); $('#btnRemettre').disabled = false; }
    };
  };
}

/* ---- capsule ---- */
let videoEnCours = null, minuterie = null;
function arreterVideo(){ if (minuterie) { clearInterval(minuterie); minuterie = null; } if (videoEnCours) { try { videoEnCours.pause(); } catch (x) {} videoEnCours = null; } }
async function urlSignee(chemin){
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(chemin, 4 * 3600);
  if (error) throw new Error('Média introuvable (' + chemin + '). Il n\'a peut-être pas encore été déposé dans l\'espace de stockage.');
  return data.signedUrl;
}
async function vueCapsule(e){
  contenu().innerHTML = filEtape(e) + '<div class="entete-page"><div><h1>🎬 ' + ech(e.titre) + '</h1><p>Suivez Salma dans ce nouvel épisode. L\'étape est validée quand vous avez regardé au moins 90 % de la vidéo.</p></div></div><div id="zoneVideo"><p>Chargement de la vidéo…</p></div>';
  let src, affiche = null;
  try { src = await urlSignee(e.contenu.video); } catch (err) { $('#zoneVideo').innerHTML = '<div class="encadre ko">' + ech(err.message) + '</div>'; return; }
  try { affiche = await urlSignee(e.contenu.affiche); } catch (x) {}
  $('#zoneVideo').innerHTML = '<video id="vid" controls playsinline preload="metadata"' + (affiche ? ' poster="' + ech(affiche) + '"' : '') + ' src="' + ech(src) + '"></video>' +
    '<div style="max-width:900px;margin-top:10px"><div style="display:flex;justify-content:space-between"><span id="txtVu" class="mini"></span><span class="mini">90 % requis</span></div><div class="prog"><i id="barVu" style="width:0"></i></div></div><div id="suiteVid"></div>';
  const v = $('#vid'); videoEnCours = v;
  let dejaValidee = e.validee, envoye = Number(e.part_video) || 0;
  const part = () => { if (!v.duration) return 0; let s = 0; for (let i = 0; i < v.played.length; i++) s += v.played.end(i) - v.played.start(i); return Math.min(1, s / v.duration); };
  const affich = () => { const p = Math.max(part(), envoye); $('#txtVu').textContent = 'Visionné : ' + Math.round(p * 100) + ' %'; $('#barVu').style.width = Math.round(p * 100) + '%'; };
  const envoyer = async () => {
    const p = part(); if (p <= envoye + 0.01 && !(p >= 0.9 && !dejaValidee)) return;
    try {
      const r = await rpc('formation_enregistrer', { p_etape: e.id, p_donnees: { part: Math.round(p * 1000) / 1000 } });
      envoye = Math.max(envoye, p);
      if (r.validee && !dejaValidee) { dejaValidee = true; toast('Capsule validée.', 'ok'); $('#suiteVid').innerHTML = boutonsSuite(); }
    } catch (err) { console.warn(err); }
  };
  v.addEventListener('timeupdate', affich);
  v.addEventListener('pause', envoyer); v.addEventListener('ended', envoyer);
  minuterie = setInterval(envoyer, 15000);
  affich();
  if (dejaValidee) $('#suiteVid').innerHTML = boutonsSuite();
}

/* ---- support ---- */
async function vueSupport(e){
  const nb = e.contenu.nb, dos = e.contenu.dossier;
  const vues = new Set((e.diapos_vues || []).map(Number));
  contenu().innerHTML = filEtape(e) + '<div class="entete-page"><div><h1>🖼️ Support de la séance</h1><p>Faites défiler les ' + nb + ' diapositives. L\'étape est validée quand toutes ont été vues.</p></div></div><div id="zoneDiapo"><p>Chargement…</p></div>';
  const chemins = []; for (let i = 1; i <= nb; i++) chemins.push(dos + '/' + String(i).padStart(2, '0') + '.jpg');
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(chemins, 4 * 3600);
  if (error || !data || data.some(d => d.error)) { $('#zoneDiapo').innerHTML = '<div class="encadre ko">Diapositives introuvables dans l\'espace de stockage (' + ech(dos) + '). Elles n\'ont peut-être pas encore été déposées.</div>'; return; }
  const urls = data.map(d => d.signedUrl);
  let cour = 1, valide = e.validee, attente = null;
  const envoyer = () => {
    clearTimeout(attente);
    attente = setTimeout(async () => {
      try { const r = await rpc('formation_enregistrer', { p_etape: e.id, p_donnees: { vues: Array.from(vues) } });
        if (r.validee && !valide) { valide = true; toast('Support validé.', 'ok'); dessine(); } } catch (err) { console.warn(err); }
    }, 600);
  };
  const dessine = () => {
    vues.add(cour);
    $('#zoneDiapo').innerHTML = '<div class="diapo"><img src="' + ech(urls[cour - 1]) + '" alt="Diapositive ' + cour + '"></div>' +
      '<div class="liens" style="margin-top:10px;align-items:center"><button class="btn" id="dPrec"' + (cour === 1 ? ' disabled' : '') + '>← Précédente</button><b>' + cour + ' / ' + nb + '</b><button class="btn prim" id="dSuiv"' + (cour === nb ? ' disabled' : '') + '>Suivante →</button><span class="mini">Vues : ' + vues.size + '/' + nb + '</span></div>' +
      '<div class="vignettes">' + urls.map((u, i) => '<button class="' + (i + 1 === cour ? 'cour' : vues.has(i + 1) ? 'vue' : '') + '" data-d="' + (i + 1) + '">' + (i + 1) + '</button>').join('') + '</div>' +
      (valide ? boutonsSuite() : '');
    $('#dPrec').onclick = () => { cour--; dessine(); };
    $('#dSuiv').onclick = () => { cour++; dessine(); };
    document.querySelectorAll('.vignettes [data-d]').forEach(b => b.onclick = () => { cour = Number(b.dataset.d); dessine(); });
    envoyer();
  };
  dessine();
  document.onkeydown = ev => { if (vue !== 'etape' || !$('#dSuiv')) return; if (ev.key === 'ArrowRight' && cour < nb) { cour++; dessine(); } if (ev.key === 'ArrowLeft' && cour > 1) { cour--; dessine(); } };
}

/* ---- fiche ---- */
function vueFiche(e){
  const f = FICHES[e.contenu.cle] || { titre: '', html: '<p>Fiche introuvable.</p>' };
  contenu().innerHTML = filEtape(e) + '<div class="entete-page"><div><h1>📄 Fiche apprenant — ' + ech(f.titre) + '</h1><p>À lire attentivement : elle prépare le quiz de sortie et le test de certification.</p></div></div>' +
    '<div class="carte fiche">' + f.html + '</div>' +
    (e.validee ? boutonsSuite() : '<button class="btn prim" id="btnLu">J\'ai lu cette fiche</button>');
  if (!e.validee) $('#btnLu').onclick = async () => {
    try { await rpc('formation_enregistrer', { p_etape: e.id, p_donnees: { lu: true } }); toast('Fiche validée.', 'ok'); await apresValidation(e); } catch (err) { toast(err.message, 'err'); }
  };
}

/* ---- carnet ---- */
function vueCarnet(e){
  const rub = e.contenu.rubriques || [], deja = (etat.carnets || {})[String(e.module_rang)] || [];
  contenu().innerHTML = filEtape(e) + '<div class="entete-page"><div><h1>✍️ Mon carnet de parcours — module ' + e.module_rang + '</h1><p>Vos réponses forment votre préparation personnelle à l\'audit. Elles restent consultables dans « Mon carnet ».</p></div></div>' +
    '<div class="carte carnet">' + rub.map((r, i) => '<label for="r' + i + '">' + ech(r) + '</label><textarea id="r' + i + '" maxlength="1200">' + ech(deja[i] || '') + '</textarea>').join('') +
    (e.contenu.action ? '<div class="encadre info" style="margin-top:16px"><b>Mon action avant la prochaine séance :</b> ' + ech(e.contenu.action) + '</div>' : '') +
    '<button class="btn prim" id="btnCarnet">Enregistrer mon carnet</button></div>';
  $('#btnCarnet').onclick = async () => {
    const rep = rub.map((r, i) => $('#r' + i).value.trim());
    const court = rep.findIndex(x => x.length < 10);
    if (court >= 0) { toast('Complétez la rubrique « ' + rub[court] + ' » (10 caractères au moins).', 'err'); $('#r' + court).focus(); return; }
    try { await rpc('formation_enregistrer', { p_etape: e.id, p_donnees: { reponses: rep } }); toast('Carnet enregistré.', 'ok'); await apresValidation(e); } catch (err) { toast(err.message, 'err'); }
  };
}

/* ------------------------------------------------------------ vue : carnet complet */
function vueCarnetGlobal(){
  const cs = etat.carnets || {};
  let h = '<div class="entete-page"><div><h1>✍️ Mon carnet de parcours</h1><p>Vos réponses, module par module. Relisez-les avant l\'audit.</p></div><button class="btn" data-act="imprimerCarnet">Imprimer</button></div>';
  const blocs = (etat.modules || []).map(m => {
    const e = etapes().find(x => x.module_rang === m.rang && x.type === 'carnet'), rep = cs[String(m.rang)];
    if (!rep) return '';
    return '<div class="carte"><h3>Module ' + m.rang + ' — ' + ech(m.titre) + '</h3><table class="liste">' + (e.contenu.rubriques || []).map((r, i) => '<tr><th style="width:38%;position:static">' + ech(r) + '</th><td>' + ech(rep[i] || '') + '</td></tr>').join('') + '</table></div>';
  }).join('');
  contenu().innerHTML = h + (blocs || '<div class="encadre info">Votre carnet est encore vide : il se remplit à la fin de chaque module.</div>');
}

/* ------------------------------------------------------------ documents */
function vueDocuments(){
  const docs = etat.documents || [];
  let h = '<div class="entete-page"><div><h1>🏅 Mes documents</h1><p>Certificat de réussite ou attestation de participation, à afficher et imprimer.</p></div></div>';
  if (!docs.length) h += '<div class="encadre info">Aucun document pour l\'instant. Le certificat est délivré dès que vous obtenez ' + etat.parcours.seuil_certification + '/20 au test de certification.</div>';
  else h += '<div class="defile"><table class="liste"><tr><th>Document</th><th>Numéro</th><th>Délivré le</th><th>Validité</th><th>Statut</th><th></th></tr>' + docs.map(d =>
    '<tr><td>' + (d.type === 'certificat' ? '🎓 Certificat' : '📜 Attestation de participation') + '</td><td>' + ech(d.numero) + '</td><td>' + dateFr(d.date_emission) + '</td><td>' + (d.date_echeance ? 'jusqu\'au ' + dateFr(d.date_echeance) : '—') + '</td><td>' + (d.statut === 'annule' ? '<span class="pastille ko">Annulé</span>' : '<span class="pastille ok">Valide</span>') + '</td><td><button class="btn sm prim" data-doc="' + ech(d.numero) + '">Afficher</button></td></tr>').join('') + '</table></div>';
  contenu().innerHTML = h;
}
async function afficherDocument(numero){
  let d;
  try { d = await rpc('formation_document', { p_numero: numero }); } catch (err) { toast(err.message, 'err'); return; }
  arreterVideo();
  contenu().innerHTML = '<div class="fil"><a data-vue="' + (vue === 'suivi' ? 'suivi' : 'documents') + '">Retour</a></div><div class="entete-page"><div><h1>' + (d.type === 'certificat' ? '🎓 Certificat' : '📜 Attestation de participation') + ' n° ' + ech(d.numero) + '</h1><p>Imprimez sur une page A4 paysage, ou enregistrez en PDF depuis la fenêtre d\'impression.</p></div><button class="btn prim" data-act="imprimer">🖨️ Imprimer / PDF</button></div>' +
    '<div class="apercu-doc"><div id="apercuDoc"></div></div>';
  const html = htmlDocument(d);
  $('#impression').innerHTML = html;
  $('#apercuDoc').innerHTML = html;
  [$('#impression'), $('#apercuDoc')].forEach(z => { const q = z.querySelector('.qr'); if (q && window.QRCode) new QRCode(q, { text: URL_VERIF + d.code_verification, width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M }); });
  const ap = $('#apercuDoc .doc-a4'), larg = $('.apercu-doc').clientWidth - 32, ech2 = Math.min(1, larg / ap.offsetWidth);
  ap.style.transform = 'scale(' + ech2 + ')'; $('#apercuDoc').style.height = (ap.offsetHeight * ech2) + 'px';
}
function htmlDocument(d){
  const cert = d.type === 'certificat', fct = [d.fonction, d.entite].filter(Boolean).join(' — ');
  const corps = cert
    ? '<div class="doc-titre" style="font-size:36pt">CERTIFICAT</div><div class="doc-sous">Mon parcours SMQ — Formation des acteurs du processus PS3 « Gérer le patrimoine »</div>' +
      '<div class="doc-c">Le Pilote du processus PS3 « Gérer le patrimoine » certifie que</div><div class="doc-nom">' + ech(d.nom) + '</div><div class="doc-fct">' + ech(fct) + '</div>' +
      '<div class="doc-c">a suivi les dix modules du parcours et réussi le test de certification avec la note de <b>' + fmtNote(d.note) + ' / 20</b>, le ' + dateFr(d.date_emission) + '.</div>' +
      '<div class="doc-note">Il ou elle connaît les exigences du système de management de la qualité de l\'ANADER et son rôle dans le processus PS3.</div>'
    : '<div class="doc-titre" style="font-size:30pt">ATTESTATION DE PARTICIPATION</div><div class="doc-sous">Mon parcours SMQ — Formation des acteurs du processus PS3 « Gérer le patrimoine »</div>' +
      '<div class="doc-c">Le Pilote du processus PS3 « Gérer le patrimoine » atteste que</div><div class="doc-nom">' + ech(d.nom) + '</div><div class="doc-fct">' + ech(fct) + '</div>' +
      '<div class="doc-c">a suivi les dix modules du parcours « Mon parcours SMQ » du ' + dateFr(d.date_debut) + ' au ' + dateFr(d.date_emission) + ',</div><div class="doc-c">et s\'est présenté(e) au test de certification.</div>' +
      '<div class="doc-note">La présente attestation ne vaut pas certificat. Le parcours reste ouvert pour une nouvelle tentative.</div>';
  const refs = cert ? [['Numéro', d.numero], ['Délivré le', dateFr(d.date_emission)], ['Valable jusqu\'au', dateFr(d.date_echeance) + ' (36 mois)']]
                    : [['Numéro', d.numero], ['Délivrée le', dateFr(d.date_emission)], ['Parcours', 'Mon parcours SMQ, 10 modules']];
  return '<div class="doc-a4">' + (d.statut === 'annule' ? '<div class="doc-annule">ANNULÉ</div>' : '') + '<div class="doc-cadre">' +
    '<div class="doc-tete"><div>MINISTÈRE D\'ÉTAT<br>MINISTÈRE DE L\'AGRICULTURE, DU DÉVELOPPEMENT RURAL<br>ET DES PRODUCTIONS VIVRIÈRES</div><div><img src="' + LOGO + '" alt="ANADER">AGENCE NATIONALE D\'APPUI AU DÉVELOPPEMENT RURAL</div><div>RÉPUBLIQUE DE CÔTE D\'IVOIRE<br><i style="font-weight:400">Union - Discipline - Travail</i></div></div>' +
    corps +
    '<div class="doc-pied"><div class="doc-qr"><div class="qr"></div>Vérifier l\'authenticité : scanner ce code<br>ou saisir le code <b>' + ech(d.code_verification) + '</b> sur D2MG Pilotage</div>' +
    '<table class="doc-ref">' + refs.map(r => '<tr><td>' + r[0] + '</td><td>' + ech(r[1]) + '</td></tr>').join('') + '</table>' +
    '<div class="doc-sign">Fait à Abidjan, le ' + dateFr(d.date_emission) + '<br><b>Le Pilote du processus PS3 « Gérer le patrimoine »</b><div class="nom">' + ech(d.signataire_nom || '') + '</div><div style="color:#595959">' + ech(d.signataire_fonction || '') + '</div></div></div>' +
    '<div class="doc-bas">Société Anonyme : Capital 500 000 000 de F CFA – Siège Social Abidjan – www.anader.ci – Système de management de la qualité ISO 9001:2015</div>' +
    '</div></div>';
}

/* ------------------------------------------------------------ gestionnaire : suivi */
let suiviCache = [];
async function vueSuivi(){
  contenu().innerHTML = '<h1>📋 Suivi des apprenants</h1><p>Chargement…</p>';
  suiviCache = await rpc('formation_suivi', { p_parcours: PARCOURS });
  const L = suiviCache.filter(x => x.statut !== 'desinscrit');
  const cert = L.filter(x => x.statut === 'certifie').length;
  const att = L.filter(x => (x.documents || []).some(d => d.type === 'attestation' && d.statut === 'valide')).length;
  const gains = L.filter(x => x.note_depart != null && x.note_sortie != null).map(x => x.note_sortie - x.note_depart);
  const moyGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null;
  const debut = L.filter(x => x.validees > 0).length;
  let h = '<div class="entete-page"><div><h1>📋 Suivi des apprenants</h1><p>Parcours « Mon parcours SMQ » — situation en direct.</p></div><div class="liens"><button class="btn" data-act="csv">Exporter (CSV)</button><button class="btn prim" data-vue="inscriptions">➕ Inscrire des acteurs</button></div></div>' +
    '<div class="kpis"><div class="kpi"><div class="v">' + L.length + '</div><div class="l">Inscrits</div></div><div class="kpi"><div class="v">' + debut + '</div><div class="l">Ont commencé</div></div>' +
    '<div class="kpi"><div class="v">' + cert + '</div><div class="l">Certifiés</div></div><div class="kpi"><div class="v">' + att + '</div><div class="l">Attestations délivrées</div></div>' +
    '<div class="kpi"><div class="v">' + (moyGain == null ? '—' : (moyGain >= 0 ? '+' : '') + fmtNote(moyGain)) + '</div><div class="l">Gain moyen départ → sortie (/20)</div></div></div>';
  if (!suiviCache.length) h += '<div class="encadre info" style="margin-top:14px">Aucun acteur inscrit pour l\'instant.</div>';
  else h += '<div class="defile" style="margin-top:12px"><table class="liste"><tr><th>Apprenant</th><th>Statut</th><th>Progression</th><th>Module</th><th>Départ</th><th>Sortie</th><th>Certification</th><th>Dernière activité</th><th>Documents</th><th></th></tr>' +
    suiviCache.map(x => {
      const pct = Math.round(x.validees * 100 / x.total);
      const st = x.statut === 'certifie' ? '<span class="pastille ok">Certifié</span>' : x.statut === 'desinscrit' ? '<span class="pastille lock">Désinscrit</span>' : x.validees === 0 ? '<span class="pastille lock">Pas commencé</span>' : '<span class="pastille go">En cours</span>';
      return '<tr><td><b>' + ech(x.nom) + '</b><div class="mini">' + ech([x.fonction, x.entite].filter(Boolean).join(' · ')) + '</div></td><td>' + st + (x.cycle > 1 ? '<div class="mini">cycle ' + x.cycle + '</div>' : '') + '</td>' +
        '<td style="min-width:120px"><div class="prog"><i style="width:' + pct + '%"></i></div><div class="mini">' + x.validees + '/' + x.total + ' étapes</div></td>' +
        '<td>' + (x.module_courant || (x.validees === x.total ? '—' : 'final')) + '</td><td>' + (x.note_depart == null ? '—' : fmtNote(x.note_depart)) + '</td><td>' + (x.note_sortie == null ? '—' : fmtNote(x.note_sortie)) + '</td>' +
        '<td>' + (x.tentatives_certif ? fmtNote(x.meilleure_certif) + '/20 <span class="mini">(' + x.tentatives_certif + ' tent.)</span>' : '—') + '</td><td class="mini">' + dateHeureFr(x.derniere_activite) + '</td>' +
        '<td>' + (x.documents || []).map(d => '<a href="#" data-doc="' + ech(d.numero) + '" style="' + (d.statut === 'annule' ? 'text-decoration:line-through;color:#999' : '') + '">' + ech(d.numero) + '</a>' + (d.statut !== 'annule' ? ' <a href="#" class="mini" data-annuler="' + d.id + '" data-num="' + ech(d.numero) + '">annuler</a>' : '')).join('<br>') + '</td>' +
        '<td style="white-space:nowrap">' + (x.statut !== 'desinscrit' ? '<button class="btn sm" data-raz="' + x.inscription + '" data-nom="' + ech(x.nom) + '">Remise à zéro</button> <button class="btn sm" data-desinscrire="' + x.inscription + '" data-nom="' + ech(x.nom) + '">Désinscrire</button>' : '<button class="btn sm" data-reinscrire="' + ech(x.id_acteur) + '">Réinscrire</button>') + '</td></tr>';
    }).join('') + '</table></div>';
  contenu().innerHTML = h;
}
function exporterCsv(){
  const t = [['Apprenant', 'Fonction', 'Entité', 'Statut', 'Cycle', 'Étapes validées', 'Total', 'Module en cours', 'Note de départ', 'Note de sortie', 'Meilleure note certification', 'Tentatives', 'Documents', 'Dernière activité']];
  suiviCache.forEach(x => t.push([x.nom, x.fonction, x.entite, x.statut, x.cycle, x.validees, x.total, x.module_courant, x.note_depart, x.note_sortie, x.meilleure_certif, x.tentatives_certif, (x.documents || []).map(d => d.numero + (d.statut === 'annule' ? ' (annulé)' : '')).join(' ; '), x.derniere_activite]));
  const csv = '﻿' + t.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'Suivi_Mon_parcours_SMQ_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
}

/* ------------------------------------------------------------ gestionnaire : inscriptions */
async function vueInscriptions(){
  contenu().innerHTML = '<h1>➕ Inscriptions</h1><p>Chargement…</p>';
  const [{ data: acts, error }, suivi] = await Promise.all([
    sb.from('acteurs').select('id_acteur,nom_prenoms,fonction,entite,role,actif').eq('actif', true).order('nom_prenoms'),
    rpc('formation_suivi', { p_parcours: PARCOURS })
  ]);
  if (error) throw new Error(error.message);
  const inscrits = new Set(suivi.filter(x => x.statut !== 'desinscrit').map(x => x.id_acteur));
  const libres = (acts || []).filter(a => !inscrits.has(a.id_acteur) && a.id_acteur !== 'ACT-DEMO');
  contenu().innerHTML = '<div class="entete-page"><div><h1>➕ Inscriptions</h1><p>Seuls les acteurs inscrits par le Pilote ou un co-pilote suivent le parcours. ' + inscrits.size + ' acteur(s) déjà inscrit(s).</p></div></div>' +
    (libres.length ? '<div class="carte"><label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" id="tout"> <b>Tout sélectionner</b></label><div class="defile"><table class="liste"><tr><th></th><th>Acteur</th><th>Fonction</th><th>Entité</th><th>Rôle</th></tr>' +
      libres.map(a => '<tr><td><input type="checkbox" class="ca" value="' + ech(a.id_acteur) + '"></td><td><b>' + ech(a.nom_prenoms) + '</b></td><td>' + ech(a.fonction || '') + '</td><td>' + ech(a.entite || '') + '</td><td>' + ech(a.role || '') + '</td></tr>').join('') +
      '</table></div><div class="liens" style="margin-top:12px"><button class="btn prim" id="btnInscrire">Inscrire la sélection</button></div></div>'
      : '<div class="encadre ok">Tous les acteurs actifs sont inscrits.</div>');
  if (!libres.length) return;
  $('#tout').onchange = ev => document.querySelectorAll('.ca').forEach(c => c.checked = ev.target.checked);
  $('#btnInscrire').onclick = async () => {
    const ids = Array.from(document.querySelectorAll('.ca:checked')).map(c => c.value);
    if (!ids.length) { toast('Cochez au moins un acteur.', 'err'); return; }
    try { const n = await rpc('formation_inscrire', { p_parcours: PARCOURS, p_acteurs: ids }); toast(n + ' acteur(s) inscrit(s).', 'ok');
      if (ids.includes(moi.id_acteur)) { await rechargerEtat(); dessinerMenu(); }
      aller('suivi'); } catch (err) { toast(err.message, 'err'); }
  };
}

/* ------------------------------------------------------------ aide */
function vueAide(){
  const p = etat.parcours;
  contenu().innerHTML = '<h1>❔ Règles du parcours</h1><div class="carte"><ol>' +
    '<li>Le parcours compte <b>10 modules</b>, encadrés par une évaluation de départ et une évaluation de sortie (les mêmes 20 questions), puis le <b>test de certification</b>.</li>' +
    '<li>Chaque module se suit dans l\'ordre : quiz d\'entrée, capsule (90 % au moins), support (toutes les diapositives), fiche apprenant, carnet, quiz de sortie. Chaque étape ouvre la suivante.</li>' +
    '<li>Le module suivant s\'ouvre avec au moins <b>' + p.seuil_quiz_sortie + '/5</b> au quiz de sortie. Sinon, la capsule est à revoir avant de refaire le quiz, sans limite d\'essais.</li>' +
    '<li>Le test de certification : <b>' + p.seuil_certification + '/20</b> pour réussir, <b>' + p.nb_tentatives + ' tentatives</b> au maximum dans les <b>' + p.delai_jours + ' jours</b> qui suivent la première, <b>' + p.delai_entre_heures + ' h</b> entre deux tentatives ; la meilleure note est retenue ; le corrigé n\'est pas communiqué.</li>' +
    '<li>Réussite : un <b>certificat</b> signé du Pilote, valable <b>' + p.validite_mois + ' mois</b>, vérifiable par son code QR.</li>' +
    '<li>Après ' + p.nb_tentatives + ' tentatives sans réussite, ou ' + p.delai_jours + ' jours écoulés : une <b>attestation de participation</b>, puis retour au module 1 pour une nouvelle chance.</li>' +
    '<li>Seuls les acteurs inscrits par le Pilote ou un co-pilote suivent le parcours.</li></ol>' +
    '<p class="mini">Une question, une difficulté ? Contactez le Pilote ou un co-pilote du PS3.</p></div>';
}

/* ------------------------------------------------------------ événements */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-vue],[data-etape],[data-plier],[data-act],[data-doc],[data-raz],[data-desinscrire],[data-reinscrire],[data-annuler]');
  if (!t) return;
  if (t.tagName === 'A') ev.preventDefault();
  try {
    if (t.dataset.vue) return aller(t.dataset.vue);
    if (t.dataset.etape) return aller('etape', t.dataset.etape);
    if (t.dataset.plier) { const r = Number(t.dataset.plier), m = etapes().filter(e => e.module_rang === r); const cur = ouverts[r] != null ? ouverts[r] : (!m.every(e => e.validee) && m.some(e => e.ouverte)); ouverts[r] = !cur; return vueParcours(); }
    if (t.dataset.doc) return afficherDocument(t.dataset.doc);
    if (t.dataset.raz) { if (!confirm('Remettre à zéro le parcours de ' + t.dataset.nom + ' ? Il ou elle recommencera au début (les notes passées restent dans l\'historique).')) return; await rpc('formation_remettre_a_zero', { p_inscription: Number(t.dataset.raz) }); toast('Parcours remis à zéro.', 'ok'); return vueSuivi(); }
    if (t.dataset.desinscrire) { if (!confirm('Désinscrire ' + t.dataset.nom + ' du parcours ?')) return; await rpc('formation_desinscrire', { p_inscription: Number(t.dataset.desinscrire) }); toast('Acteur désinscrit.', 'ok'); return vueSuivi(); }
    if (t.dataset.reinscrire) { await rpc('formation_inscrire', { p_parcours: PARCOURS, p_acteurs: [t.dataset.reinscrire] }); toast('Acteur réinscrit.', 'ok'); return vueSuivi(); }
    if (t.dataset.annuler) { const m = prompt('Motif de l\'annulation du document ' + t.dataset.num + ' :'); if (!m) return; await rpc('formation_annuler_document', { p_document: Number(t.dataset.annuler), p_motif: m }); toast('Document annulé.', 'ok'); return vueSuivi(); }
    const a = t.dataset.act;
    if (a === 'accueil') location.href = 'index.html';
    else if (a === 'deconnexion') { await sb.auth.signOut(); location.href = 'index.html'; }
    else if (a === 'suite') { await rechargerEtat(); const s = prochaineEtape(); s ? aller('etape', s.id) : aller('parcours'); }
    else if (a === 'capsule') { const c = etapes().find(e => e.module_rang === Number(t.dataset.m) && e.type === 'capsule'); aller('etape', c.id); }
    else if (a === 'imprimer') window.print();
    else if (a === 'imprimerCarnet') { $('#impression').innerHTML = '<div style="padding:12mm;font-family:Arial">' + contenu().innerHTML.replace(/<button[^>]*>.*?<\/button>/g, '') + '</div>'; window.print(); }
    else if (a === 'csv') exporterCsv();
  } catch (err) { toast(err.message, 'err'); }
});

window.addEventListener('DOMContentLoaded', () => {
  demarrer().catch(e => { console.error(e); $('#ecranChargement').innerHTML = '<div class="boiteEcran"><h2>Erreur au démarrage</h2><p>' + ech(e.message) + '</p><p><a href="index.html">Retour à l\'accueil</a></p></div>'; });
});
})();
