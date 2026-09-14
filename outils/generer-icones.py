"""
Génère le jeu d'icônes du FMS Trucks UCODIS à partir du logo fourni.

Même nomenclature que le jeu de référence, adaptée à UCODIS :
    galana.webp  ->  ucodis.webp
    favicon.ico / favicon.png / apple-touch-icon.png  ->  inchangés

Deux traitements distincts :
  - la marque seule, rouge sur fond transparent, pour l'application ;
  - une tuile rouge à marque blanche pour les icônes système, qui doit
    rester lisible à 16 pixels.
"""
from PIL import Image, ImageDraw
import numpy as np
import os

SOURCE = 'outils/logo-source.png'
SORTIE = 'public'
os.makedirs(SORTIE, exist_ok=True)

SS = 8                          # suréchantillonnage, pour des bords nets
ROUGE = (232, 69, 60)           # #E8453C, la primaire du design system

# ── 1. Détourage du logo ──────────────────────────────────────────
# Le fichier fourni est une marque rouge sur un fond gris très clair.
# On mesure la distance de chaque pixel au fond pour en tirer un alpha,
# ce qui conserve l'antialiasing des courbes.
im = Image.open(SOURCE).convert('RGB')
a = np.asarray(im).astype(float)

fond = np.array([247, 247, 247], float)
marque = np.array([238, 70, 59], float)

alpha = np.clip(np.linalg.norm(a - fond, axis=2) / np.linalg.norm(marque - fond), 0, 1)
alpha[alpha < 0.06] = 0                       # on efface le bruit du fond
alpha = np.clip((alpha - 0.06) / 0.94, 0, 1)

h, w = alpha.shape
rgba = np.zeros((h, w, 4), np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = ROUGE
rgba[..., 3] = (alpha * 255).astype(np.uint8)

MARQUE_ROUGE = Image.fromarray(rgba, 'RGBA')
MARQUE_BLANCHE = Image.new('RGBA', MARQUE_ROUGE.size, (255, 255, 255, 255))
MARQUE_BLANCHE.putalpha(MARQUE_ROUGE.getchannel('A'))

RATIO = MARQUE_ROUGE.height / MARQUE_ROUGE.width


# ── 2. Tuile pour les icônes système ──────────────────────────────
def tuile(taille: int, largeur: float, rayon: float = 0.20) -> Image.Image:
    """
    Tuile rouge à coins arrondis, marque blanche au centre.

    `largeur` est exprimée en fraction du côté : au-delà de 1, la marque
    déborde et se retrouve rognée par la tuile. C'est ce qui permet
    d'épaissir les traits sur les petites tailles sans les rendre flous.
    """
    S = taille * SS

    masque = Image.new('L', (S, S), 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * rayon), fill=255)

    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(Image.new('RGBA', (S, S), (*ROUGE, 255)), (0, 0), masque)

    lw = int(S * largeur)
    lh = round(lw * RATIO)
    couche = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    couche.alpha_composite(MARQUE_BLANCHE.resize((lw, lh), Image.LANCZOS),
                           ((S - lw) // 2, (S - lh) // 2))
    # La marque ne doit pas dépasser des coins arrondis
    couche.putalpha(Image.composite(couche.getchannel('A'), Image.new('L', (S, S), 0), masque))
    canvas.alpha_composite(couche)

    return canvas.resize((taille, taille), Image.LANCZOS)


# Correction optique : plus l'icône est petite, plus la marque est agrandie,
# sinon les traits deviennent des cheveux illisibles.
LARGEURS = {512: 0.88, 180: 0.90, 64: 1.02, 48: 1.08, 32: 1.10, 16: 1.05}

# Les coins sont un peu moins arrondis sur les petites tailles, sinon la
# tuile perd sa forme dans le pixel.
RAYONS = {512: 0.20, 180: 0.20, 64: 0.19, 48: 0.18, 32: 0.17, 16: 0.15}


def t(taille: int) -> Image.Image:
    return tuile(taille, LARGEURS[taille], RAYONS[taille])


# ── 3. Écriture des fichiers ──────────────────────────────────────
t(180).save(f'{SORTIE}/apple-touch-icon.png')
t(32).save(f'{SORTIE}/favicon.png')

# Le .ico embarque les trois tailles historiques, comme le jeu de référence
t(48).save(f'{SORTIE}/favicon.ico', format='ICO',
           sizes=[(16, 16), (32, 32), (48, 48)],
           append_images=[t(32), t(16)])

# Marque de l'application : rouge sur transparent, carré de 240
carre = Image.new('RGBA', (240, 240), (0, 0, 0, 0))
lw = int(240 * 0.92)
carre.alpha_composite(MARQUE_ROUGE.resize((lw, round(lw * RATIO)), Image.LANCZOS),
                      ((240 - lw) // 2, (240 - round(lw * RATIO)) // 2))
carre.save(f'{SORTIE}/ucodis.webp', 'WEBP', lossless=True, quality=100)

# Logo horizontal détouré, pour la barre de navigation et l'écran de connexion
MARQUE_ROUGE.save(f'{SORTIE}/logo-ucodis.png')

for f in sorted(os.listdir(SORTIE)):
    print(f, os.path.getsize(f'{SORTIE}/{f}'), 'o')
