<div align="center">

[🇮🇹 Italiano](README.md) · [🇬🇧 English](README.en.md) · [🇪🇸 Español](README.es.md) · 🇫🇷 **Français** · [🇩🇪 Deutsch](README.de.md) · [🇧🇷 Português (Brasil)](README.pt-BR.md)

</div>

<div align="center">

# 👁️ Scrywall

**Plein d'écrans, un seul regard.**

Un mur de vidéos YouTube et de directs Twitch sur une seule page.
Ils démarrent tous ensemble, en muet : c'est toi qui actives le son, un à la fois.

![Stack](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-e3b95f?style=flat-square)
![Zéro dépendance](https://img.shields.io/badge/d%C3%A9pendances-z%C3%A9ro-8fb4ff?style=flat-square)
![Aucun build](https://img.shields.io/badge/build-aucun-7be0c3?style=flat-square)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-9146ff?style=flat-square)

</div>

---

## ✨ Ce que ça fait

*Scry* (anglais) : voir des lieux lointains dans une boule de cristal. Scrywall, c'est la même idée, mais avec un mur d'écrans : tu colles les liens, tu appuies sur un bouton, et tu gardes tout à l'œil en même temps.

- 🧱 **Grille automatique.** Toutes les cases ont la même taille, et le site choisit tout seul la disposition qui exploite le mieux l'écran. Trop de vidéos pour tenir ? Il passe au défilement.
- 🔇 **Tout en muet, le son à tour de rôle.** Les vidéos démarrent sans son. Le bouton sur chaque case active le son d'une seule, les autres sources restant muettes automatiquement.
- ⤢ **Bouton d'agrandissement dédié.** Chaque case a son propre bouton : il agrandit la vidéo en alignant les autres dans une colonne latérale, et le même bouton (ou la touche `Échap`) la réduit à nouveau.
- 🎬 **Contrôles natifs du lecteur.** Lecture, pause et avance sont les vrais contrôles YouTube/Twitch, utilisables directement sur chaque case, même petite.
- 🖐️ **Glisser pour réorganiser.** Maintiens l'en-tête d'une case et fais-la glisser sur une autre pour échanger leurs positions.
- ✎ **Tout gérer depuis le mur.** Ajoute une vidéo depuis la barre du haut, modifie un lien avec le crayon ou supprime-le avec ✕ (avec un "Annuler" pendant quelques secondes), sans jamais toucher aux vidéos déjà en lecture.
- ⌨️ **Raccourcis clavier.** `k` lecture/pause, `j`/`l` recul/avance de 10s, `m` muet, `,`/`.` petits ajustements, sur la vidéo survolée par la souris.
- 🔁 **Boucle réglable.** Les vidéos YouTube redémarrent toutes seules une fois terminées ; désactivable en un clic depuis la barre du haut.
- 🌍 **Interface en 6 langues.** Italien, anglais, espagnol, français, allemand et portugais (Brésil), détectée automatiquement par le navigateur ou choisie à la main.
- 🟥🟪 **YouTube et Twitch ensemble.** Vidéos, directs, Shorts et streams Twitch sur le même mur.
- 🏷️ **Titre en dehors de la vidéo.** Le titre de chaque vidéo apparaît au-dessus de la case, donc il ne cache jamais l'image. Pour Twitch, c'est le nom de la chaîne qui s'affiche.
- 🔗 **Lien à partager.** Celui qui prépare le mur copie un lien, et celui qui l'ouvre voit les mêmes vidéos. Pas de compte, pas de serveur.
- ☕🍺 **Dons.** Un bouton "Buy me a coffee or a beer" avec des montants rapides ou libres, via PayPal.me.

## 🚀 L'essayer en local

Pas d'installation ni de build. Il faut quand même un serveur local, car Twitch refuse de démarrer depuis `file://`.

```bash
# depuis le dossier du projet
python -m http.server 8000
```

Puis ouvre `http://localhost:8000`.

> **Remarque :** en ouvrant `index.html` par double-clic (adresse `file://`), les lecteurs YouTube et Twitch peuvent refuser de démarrer. Utilise toujours le serveur local.

## 🧙 Comment l'utiliser

1. Colle un lien YouTube ou Twitch dans une ligne. La ligne vide en bas se remplit pour le lien suivant.
2. Appuie sur **▶ Afficher toutes les vidéos**.
3. Active le son avec le bouton 🔇/🔊 d'une case : il se coupe tout seul sur les autres.
4. Appuie sur **⤢** sur une case pour l'agrandir, **⤡** (ou `Échap`) pour revenir à la grille. Fais glisser l'en-tête d'une carte sur une autre pour échanger leurs positions.
5. Depuis le mur, tu peux aussi : **+ Ajouter une vidéo** depuis la barre du haut, **✎** pour modifier un lien, **✕** pour le supprimer (avec "Annuler"), ou le mode **Sélectionner** pour en supprimer plusieurs d'un coup.
6. Appuie sur **🔗 Partager** pour copier un lien avec les vidéos déjà dedans.

### Liens acceptés

| Type | Exemples |
|---|---|
| YouTube | `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, ou juste l'ID à 11 caractères |
| Twitch | `twitch.tv/nomdelachaine` (aussi en variantes mobile et popout) |

## 🔗 Comment fonctionne le lien partagé

Tout est dans la partie après le `#` de l'adresse, donc ça **ne passe jamais par aucun serveur** :

```
https://tondomaine.fr/#v=dQw4w9WgXcQ,t:nomdelachaine,aBcDeFgHiJk
```

- un ID à 11 caractères est une vidéo YouTube ;
- `t:nom` est une chaîne Twitch.

## 🛠️ Sous le capot

- HTML, CSS et JavaScript purs, dans trois fichiers séparés. Pas de framework, pas de bundler.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) et [Twitch Embed](https://dev.twitch.tv/docs/embed/) pour les lecteurs.
- Un algorithme de grille qui teste toutes les combinaisons de colonnes et de lignes et choisit celle avec les plus grandes cases, en gardant le format 16:9.
- Les contrôles du lecteur sont les natifs : la vue grille garde une fine couche de sécurité qui empêche d'activer le son de plusieurs vidéos à la fois, pendant qu'une vérification en arrière-plan garde l'état du site synchronisé avec celui, réel, du lecteur, au lieu de le forcer.
- Glisser-déposer pour réorganiser ne déplace jamais l'iframe dans le DOM (ça la rechargerait entièrement) : seul l'ordre visuel change, via CSS.
- Les liens enregistrés restent dans le `localStorage` de ton navigateur. Pas de pistage, pas de cookies.

## ⚠️ À savoir

- **Combien de vidéos ?** Ça dépend de ton ordinateur et de ta connexion, pas du site : chaque case est un vrai lecteur qui télécharge un flux vidéo. Une connexion domestique normale encaisse bien quelques cases, mais le navigateur commence à peiner avec beaucoup de vidéos en même temps.
- **Certaines vidéos ne s'intègrent pas.** Si l'auteur a désactivé l'intégration, YouTube affiche une erreur dans cette case et le reste du mur continue de fonctionner.
- **Twitch n'expose pas les titres des directs.** C'est pour ça que le nom de la chaîne s'affiche à la place.
- **Lecture automatique.** Par les règles des navigateurs, les vidéos démarrent toujours en muet : le son ne s'active qu'après ton clic.

## 🤝 Avertissement

Scrywall est un projet indépendant et **n'est ni affilié ni approuvé par YouTube, Google ou Twitch**. Les vidéos sont affichées via les lecteurs officiels intégrables et restent la propriété de leurs titulaires respectifs.

## ☕🍺 Soutien

Le site est gratuit. S'il t'est utile, tu peux m'offrir un café ou une bière via le bouton dans le site.

---

<div align="center">

*Regarde loin. Regarde tout.* 👁️

</div>
