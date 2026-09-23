// Dashboard affiché sur la TV : interroge le serveur régulièrement et
// ne redessine la page que si les données ont changé.

const INTERVALLE_RAFRAICHISSEMENT = 10000; // ms
const GRADUATIONS = [0.25, 0.5, 0.75]; // repères en % de l'objectif annuel
const MAX_CDP_SUR_2_COLONNES = 16; // au-delà, la liste (hors podium) passe à 3 colonnes

let dernieresDonnees = null;
let versionServeur = null;

async function rafraichir() {
  try {
    const reponse = await fetch('/api/donnees', { cache: 'no-store' });
    const { donnees, version_serveur } = await reponse.json();

    // Le serveur a redémarré (mise à jour du code) : on recharge la page entière.
    if (versionServeur && version_serveur !== versionServeur) {
      window.location.reload();
      return;
    }
    versionServeur = version_serveur;

    const texte = JSON.stringify(donnees);
    if (texte !== dernieresDonnees) {
      dernieresDonnees = texte;
      afficher(donnees);
    }
  } catch (e) {
    console.error('Serveur injoignable', e);
  }
}

function afficher(d) {
  document.title = d.titre;
  document.getElementById('titre').textContent = d.titre;
  document.getElementById('mis-a-jour-le').textContent = dateHeure(d.mis_a_jour_le);
  document.body.classList.toggle('sans-animation', !d.animations);
  afficherJauge(d);
  afficherClassement(d.chefs_projet);
}

function afficherJauge(d) {
  const objectif = d.objectif_annuel;
  const pourcent = (valeur) => Math.min(100, (valeur / objectif) * 100);

  document.getElementById('ca-total').textContent = euros(d.chiffre_affaire_total);
  document.getElementById('pourcentage').textContent =
    ((d.chiffre_affaire_total / objectif) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  document.getElementById('objectif-annuel').textContent = 'Objectif : ' + euros(objectif);
  document.getElementById('remplissage').style.height = pourcent(d.chiffre_affaire_total) + '%';

  const graduations = GRADUATIONS.map((part) => `
    <div class="graduation" style="bottom:${part * 100}%"></div>
    <div class="graduation-libelle" style="bottom:${part * 100}%">${kiloEuros(objectif * part)}</div>
  `);

  const objectifs = d.objectifs.filter((o) => o.valeur > 0).map((o) => {
    const position = pourcent(o.valeur);
    // Près du haut, le libellé passe sous la ligne pour rester visible.
    const classe = position > 90 ? 'objectif-libelle dessous' : 'objectif-libelle';
    return `
      <div class="objectif-ligne" style="bottom:${position}%; color:${o.couleur}"></div>
      <div class="${classe}" style="bottom:${position}%; color:${o.couleur}">
        ${echapper(o.nom)} (${kiloEuros(o.valeur)})
      </div>`;
  });

  document.getElementById('reperes').innerHTML = graduations.join('') + objectifs.join('');
}

function afficherClassement(chefsProjet) {
  const classes = [...chefsProjet].sort((a, b) =>
    b.chiffre_affaire - a.chiffre_affaire || a.prenom.localeCompare(b.prenom));

  document.getElementById('podium').innerHTML = classes.slice(0, 3).map((cdp, i) => `
    <div class="podium-place rang-${i + 1}">
      <div class="badge-rang">${i + 1}</div>
      ${avatar(cdp, 'avatar-podium')}
      <div class="podium-nom">${echapper(cdp.prenom)} ${echapper(cdp.nom)}</div>
      <div class="montant">${euros(cdp.chiffre_affaire)}</div>
    </div>
  `).join('');

  const suite = classes.slice(3);
  const liste = document.getElementById('liste');
  // 2 colonnes, sauf si l'équipe est trop grande pour tenir en hauteur.
  const colonnes = suite.length > MAX_CDP_SUR_2_COLONNES ? 3 : 2;
  liste.style.setProperty('--lignes', Math.max(1, Math.ceil(suite.length / colonnes)));
  liste.innerHTML = suite.map((cdp, i) => `
    <div class="ligne-cdp">
      <span class="rang">${i + 4}</span>
      ${avatar(cdp, 'avatar-liste')}
      <span class="nom">${echapper(cdp.prenom)} ${echapper(cdp.nom)}</span>
      <span class="montant">${euros(cdp.chiffre_affaire)}</span>
    </div>
  `).join('');
}

rafraichir();
setInterval(rafraichir, INTERVALLE_RAFRAICHISSEMENT);
