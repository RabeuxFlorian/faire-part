/* ============================================================
   Invitation Manon & Julien
   Mobile-safe : iOS exige que play() vienne d'un geste direct.
   Stratégie :
   - Intro  : play() déclenché par le tap (geste direct ✓)
   - Audio  : "déverrouillé" dès le premier tap, joué ensuite
   - Héros  : autoplay muted dans le HTML (fonctionne partout)
   - Ended  : on skip plutôt que d'attendre la fin (plus fiable)
   ============================================================ */

const PROGRAM = [
  { time: "16H00", title: "Accueil des invités",  description: "Arrivée et installation" },
  { time: "16H30", title: "Cérémonie",             description: "Échange des vœux et des alliances" },
  { time: "17H15", title: "Sortie des mariés",     description: "Haie d'honneur et photos de groupe" },
  { time: "17H30", title: "Cocktail",              description: "Vin d'honneur & animations" },
  { time: "19H30", title: "Dîner",                 description: "Ouverture de la salle et installation des invités" },
  { time: "22H30", title: "Pièce montée",          description: "Coupe du gâteau & champagne" },
  { time: "23H00", title: "Ouverture du bal",      description: "Soirée dansante" },
];

const MENU = [
  { category: "🥂 Cocktail", items: [
    "<p>Champagne Brut</p><p>Sélection de vins blancs &amp; rosés</p><p>Mini tartelettes fines aux légumes</p><p>Gougères au comté</p><p>Saumon gravlax &amp; crème citronnée</p><p>Foie gras sur brioche toastée</p>" ] },
  { category: "🍽 Entrée", items: [
    "<p><strong>Option 1 :</strong> Carpaccio de Saint-Jacques, agrumes &amp; huile d'olive vierge</p>",
    "<p><strong>Option 2 :</strong> Foie gras mi-cuit, chutney de figues &amp; pain de campagne</p>" ] },
  { category: "🍛 Plat", items: [
    "<p><strong>Option 1 :</strong> Filet de bœuf rôti, jus réduit au thym - Purée truffée &amp; légumes de saison</p><p></p><p><strong>Option 2 :</strong> Pavé de bar, beurre blanc citronné - Risotto crémeux aux asperges</p>" ] },
  { category: "🍰 Dessert", items: [
    "<p><strong>Option 1 :</strong> Entremets vanille &amp; fruits rouges</p><p></p><p><strong>Option 2 :</strong> Pièce montée traditionnelle</p>" ] },
];

const EVENT_DATE = new Date("2027-03-21T00:00:00+01:00");

/* ---------- Éléments ---------- */
const intro        = document.getElementById("intro");
const introVideo   = document.getElementById("intro-video");
const introOverlay = document.getElementById("intro-overlay");
const introSkip    = document.getElementById("intro-skip");
const invitation   = document.getElementById("invitation");
const bgAudio      = document.getElementById("bg-audio");
const soundToggle  = document.getElementById("sound-toggle");
const iconMuted    = document.getElementById("icon-muted");
const iconSound    = document.getElementById("icon-sound");
const ctaFloat     = document.getElementById("cta-float");

let introStarted = false;
let revealed     = false;
let audioUnlocked = false;

/* ------------------------------------------------------------------
   Déverrouillage audio iOS
   La première interaction utilisateur déverrouille l'élément audio.
   On le joue/pause immédiatement — après ça, bgAudio.play() marche
   même depuis un callback async.
------------------------------------------------------------------ */
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  bgAudio.volume = 0;
  bgAudio.play().then(() => {
    bgAudio.pause();
    bgAudio.currentTime = 0;
    bgAudio.volume = 0.5;
  }).catch(() => {});
}

/* ---------- Intro : tap pour lancer ---------- */
function startIntro() {
  if (introStarted) return;
  introStarted = true;

  unlockAudio();

  // iOS : joue muet d'abord, puis tente de remettre le son
  introVideo.muted = true;
  introVideo.play().then(() => {
    introVideo.muted = false;
  }).catch(() => {
    introVideo.muted = true;
    introVideo.play().catch(() => {});
  });

  // Bouton "Passer" après 1,5 s
  setTimeout(() => introSkip.classList.add("is-shown"), 1500);
}

// L'overlay ne disparaît qu'au moment où la vidéo affiche vraiment
// son premier frame — plus d'écran noir entre le tap et la lecture
introVideo.addEventListener("playing", () => {
  introOverlay.classList.add("is-gone");
}, { once: true });

introOverlay.addEventListener("click",      startIntro);
introOverlay.addEventListener("touchstart", startIntro, { passive: true });

/* la vidéo se termine → révèle l'invitation */
introVideo.addEventListener("ended", revealInvitation);

/* bouton Passer */
introSkip.addEventListener("click", revealInvitation);
introSkip.addEventListener("touchstart", (e) => {
  e.preventDefault();
  revealInvitation();
});

/* ---------- Révélation ---------- */
function revealInvitation() {
  if (revealed) return;
  revealed = true;

  try { introVideo.pause(); } catch (_) {}

  intro.classList.add("is-hidden");
  invitation.setAttribute("aria-hidden", "false");
  invitation.classList.add("is-ready");
  setTimeout(() => { intro.style.display = "none"; }, 1000);

  /* Audio : déjà déverrouillé lors du tap → play() fonctionne */
  bgAudio.volume = 0.5;
  bgAudio.play().then(() => {
    soundOn = true; setSoundIcon();
  }).catch(() => {
    soundOn = false; setSoundIcon();
  });

  startCountdown();
  initReveals();
  ctaFloat.setAttribute("aria-hidden", "false");
}

/* ---------- Son ---------- */
let soundOn = false;
function setSoundIcon() {
  iconMuted.style.display = soundOn ? "none" : "block";
  iconSound.style.display = soundOn ? "block" : "none";
  soundToggle.setAttribute("aria-label", soundOn ? "Couper le son" : "Activer le son");
}
soundToggle.addEventListener("click", () => {
  if (soundOn) { bgAudio.pause(); soundOn = false; }
  else          { bgAudio.play().catch(() => {}); soundOn = true; }
  setSoundIcon();
});
setSoundIcon();

/* ---------- Compte à rebours ---------- */
let cdTimer = null;
const pad = (n) => String(n).padStart(2, "0");
function startCountdown() {
  const e = {
    d: document.getElementById("cd-days"),
    h: document.getElementById("cd-hours"),
    m: document.getElementById("cd-mins"),
    s: document.getElementById("cd-secs"),
  };
  function tick() {
    let diff = Math.max(0, EVENT_DATE.getTime() - Date.now());
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    e.d.textContent = d; e.h.textContent = pad(h);
    e.m.textContent = pad(m); e.s.textContent = pad(s);
  }
  tick();
  if (cdTimer) clearInterval(cdTimer);
  cdTimer = setInterval(tick, 1000);
}

/* ---------- Programme ---------- */
document.getElementById("timeline").innerHTML = PROGRAM.map(p => `
  <div class="tl-item">
    <span class="tl-time">${p.time}</span>
    <div class="tl-body"><h4>${p.title}</h4><p>${p.description}</p></div>
  </div>`).join("");

/* ---------- Menu ---------- */
document.getElementById("menu").innerHTML = MENU.map(c => `
  <div class="menu__cat">
    <h3>${c.category}</h3>
    ${c.items.map(h => `<div class="menu__item">${h}</div>`).join("")}
  </div>`).join("");

/* ---------- Carrousel ---------- */
(function () {
  const track = document.getElementById("carousel-track");
  const dots  = document.getElementById("carousel-dots");
  [...track.children].forEach((_, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `Photo ${i + 1}`);
    if (i === 0) b.classList.add("is-active");
    b.addEventListener("click", () =>
      track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" }));
    dots.appendChild(b);
  });
  track.addEventListener("scroll", () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    [...dots.children].forEach((d, k) => d.classList.toggle("is-active", k === i));
  }, { passive: true });
})();

/* ---------- Révélation au scroll ---------- */
function initReveals() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
}

/* ---------- Barre de progression + bouton flottant ---------- */
const progress = document.getElementById("progress");
const rsvpForm = document.getElementById("rsvp-form");
window.addEventListener("scroll", () => {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.setProperty("--p", (h > 0 ? (window.scrollY / h) * 100 : 0) + "%");
  if (!revealed) return;
  const past    = window.scrollY > window.innerHeight * 0.8;
  const nearRSVP = rsvpForm && rsvpForm.getBoundingClientRect().top < window.innerHeight * 0.9;
  ctaFloat.classList.toggle("is-shown", past && !nearRSVP);
}, { passive: true });

ctaFloat.addEventListener("click", () =>
  rsvpForm.scrollIntoView({ behavior: "smooth", block: "start" }));

/* ---------- Pause musique quand la page perd le focus ---------- */
document.addEventListener("visibilitychange", () => {
  if (!soundOn) return;
  if (document.hidden) {
    bgAudio.pause();
  } else {
    bgAudio.play().catch(() => {});
  }
});

/* ---------- RSVP ---------- */
const form  = document.getElementById("rsvp-form");
const extra = document.getElementById("extra-fields");
form.addEventListener("change", (e) => {
  if (e.target.name === "attending") extra.hidden = e.target.value !== "yes";
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.name.value.trim()) { form.name.focus(); return; }
  if (!form.attending.value) return;
  document.getElementById("rsvp-success").hidden = false;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Merci !";
});
