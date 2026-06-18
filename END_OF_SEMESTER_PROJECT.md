# Projet de fin de semestre — Consignes détaillées (Étudiants)

## Introduction

Ce document décrit, de façon exhaustive et pédagogique, les exigences, les livrables et les consignes de soutenance pour le projet de fin de semestre. Travaillez en groupes de 3 à 5 étudiants. L'objectif est de produire un projet professionnel, testé, documenté et déployé.

---

## Jury — Membres

*Liste officielle et ordre des membres du jury :*

1. Prof. Mehdi Iraqi Houssaini (Professor of C Language Course)
2. Prof. Othman Mekouar
3. Director Mekouar Khalid
4. Administrative Director Mekouar Youssef
5. Prof. Chafik Boulealam (Professor of C Language Practical Work / TP)

---

## Contraintes techniques (obligatoires)

- **Langage principal :** Le cœur logique doit être développé en **C**. Les bindings, wrappers ou services complémentaires peuvent être en d'autres langages.
- **Architecture :** Respectez une séparation claire Backend / Frontend. Le backend (logique métier, traitements IA côté serveur si applicable) doit être indépendant du client.
- **Intégration IA (obligatoire) :** Au moins une fonctionnalité IA (chatbot, STT, reconnaissance d'images, traduction, etc.). Expliquez l'architecture IA et les APIs utilisées.
 - **Intégration IA (obligatoire, API-only) :** Au moins une fonctionnalité IA utilisant une API externe (chatbot, STT, analyse d'images, traduction, etc.). Les étudiants doivent consommer des APIs REST publiques ou cloud (ex. OpenAI, Gemini, Mistral) : le backend en C envoie des requêtes HTTP (par ex. via `libcurl`) et récupère des réponses JSON que l'application parse et utilise.
  
	- Note pédagogique : il n'est pas nécessaire de concevoir, entraîner ou déployer des modèles locaux. L'évaluation portera sur la qualité et la créativité de l'usage de l'API (conception des appels, gestion des erreurs et des limites de taux, parsing JSON, intégration UX), et non sur l'entraînement/fine-tuning de modèles.
- **Base de données :**
	- **Local (développement / portable) :** **SQLite** est requis comme base locale pour assurer portabilité et tests hors-ligne.
	- **Déploiement (production) :** les projets déployés doivent utiliser une base cloud (**Supabase** ou **MongoDB**). N'envoyez pas de credentials en clair.
- **Déploiement :** le projet doit être déployé et accessible publiquement selon la plateforme cible (voir section Déploiement).
- **GitHub & workflow :** chaque membre doit contribuer de façon visible (commits, branches, PRs). Invitez le Prof. Chafik Boulealam sur votre dépôt.

---

## Déploiement — exigences par plateforme

- **Applications Web (obligatoire pour les projets web) :** déployer sur **Vercel**. Fournir l'URL de production, le workflow CI (GitHub Actions conseillé) et les variables d'environnement configurées via le dashboard Vercel.

- **Applications Desktop :** empaqueter et distribuer via **Itch.io** (ou équivalent). Fournir l'archive/composant exécutable, instructions d'installation et page publique Itch.io.

- **Applications Mobile :** utiliser **Expo** (ou équivalent). Fournir le lien Expo/Play Store/App Store si applicable, ou le lien `expo.dev` et instructions pour tester l'APK/IPA.

Notes de packaging : indiquez les commandes de build, les dépendances et les étapes pour reproduire l'artefact.

---

## Structure recommandée du dépôt

```
project-<groupe>-<sujet>/
├─ README.md
├─ src/                # code source (C backend, frontend...) 
├─ tests/              # tests unitaires et d'intégration
├─ docs/               # documentation technique
├─ deploy/             # scripts de déploiement / Dockerfile
└─ demo/               # enregistrements, captures d'écran
```

---

## Exigences de présentation et professionnalisme

### Présentation (slides)

- **Tenue professionnelle** requise pendant la soutenance.
- **Structure recommandée des slides :**
	1. Titre, logo ESISA, noms des membres, encadrement
	2. Problématique et objectifs
	3. Architecture technique (diagramme)
	4. Démonstration technique (point focal sur le code C)
	5. Résultats, limitations, perspectives
	6. Q&A

### Démonstration technique

- La soutenance doit inclure une démonstration en direct du cœur logique (exécuter un exemple montrant la fonctionnalité en C).
- Préparez une séquence de tests de certification (scripts ou commandes) pour prouver la robustesse.

### Présence sur les réseaux / Branding professionnel

- **Enregistrement vidéo :** chaque équipe doit produire une vidéo démonstrative (5–10 minutes) montrant l'usage, l'architecture et la valeur ajoutée.
- **Publication LinkedIn :** Publiez la vidéo et un court résumé sur LinkedIn (compte d'un membre) et insérez le lien dans le `README.md`.

---

## Livrables critiques (checklist finale)

- [ ] Lien vers le dépôt public `chafik-boulealam-lab/project-<groupe>-<sujet>`
- [ ] `README.md` complet (membres, rôles, architecture, déploiement, demo link)
- [ ] Code source du backend en C (avec instructions de build)
- [ ] Tests automatisés et instructions d'exécution
- [ ] URL de déploiement (Vercel / Expo / Itch.io)
- [ ] Vidéo démonstrative hébergée et lien LinkedIn
- [ ] Documentation technique (docs/)

---

## Critères d'évaluation (résumé)

- Fonctionnalité & Qualité (20%) — Le projet fonctionne comme décrit et couvre les exigences.
- Intégration IA (20%) — Pertinence et qualité de l'intégration IA.
 - Intégration IA (20%) — Évaluée sur l'utilisation réussie et créative d'API externes : qualité des appels API, robustesse (gestion des erreurs/timeouts), parsing JSON correct et intégration dans l'application. L'entraînement ou la construction de modèles locaux n'est pas requis ni attendu.
- Qualité du code & tests (10%) — Propreté, structure, tests.
- Déploiement & accès public (10%) — Application déployée et accessible.
- Présentation & vidéo (40%) — Clarté et professionnalisme de la soutenance et du matériel (LinkedIn, Video, Branding).

---

## Durée et soutenance

- Durée du projet : 1 mois.
- Soutenance finale (date fixe) : 30/05/2026.

---

## Sécurité & bonnes pratiques

- Ne commitez jamais de secrets. Utilisez les variables d'environnement et stockez les secrets dans les services (Vercel / GitHub Secrets / Expo secrets).
- Fournissez des scripts/modes d'installation pour reproduire l'environnement local (Dockerfile ou scripts d'installation).

---

## Support

Pour toute question ou problème d'accès au dépôt/organisation, contactez le Prof. Chafik Boulealam : ch.boulealam@esisa.ac.ma

Fin des consignes étudiants.
