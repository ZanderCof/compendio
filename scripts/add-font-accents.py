"""Completa le vocali accentate italiane in Nodesto Caps Condensed.

Il font originale non ha à ì ò ù (in nessuno stile) e nel Bold/Italic anche è, é, È, É sono
senza accento. Qui si costruiscono componendo lettera base + accento grave del font
(l'acuto è il grave specchiato). Le lettere che hanno già un accento vero non si toccano.

Misure prese dalla Regular, dove "è" ed "È" sono corrette:
- l'accento sta 43 unità sopra le minuscole e 67 sopra le maiuscole
- nei corsivi si sposta a destra seguendo l'inclinazione (~12°, il file dichiara 0)

Uso: python add_graves.py <file.otf> [...]
"""
import math
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

# nome glifo: (lettera base, accento, codepoint)
TARGETS = {
    "agrave": ("a", "grave", 0xE0),
    "egrave": ("e", "grave", 0xE8),
    "eacute": ("e", "acute", 0xE9),
    "igrave": ("i", "grave", 0xEC),
    "ograve": ("o", "grave", 0xF2),
    "ugrave": ("u", "grave", 0xF9),
    "Agrave": ("A", "grave", 0xC0),
    "Egrave": ("E", "grave", 0xC8),
    "Eacute": ("E", "acute", 0xC9),
    "Igrave": ("I", "grave", 0xCC),
    "Ograve": ("O", "grave", 0xD2),
    "Ugrave": ("U", "grave", 0xD9),
}
GAP_LOWER = 43
GAP_UPPER = 67
ITALIC_SLANT = math.tan(math.radians(12))


def bounds(glyph_set, name):
    pen = BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    return pen.bounds  # (xMin, yMin, xMax, yMax) oppure None se vuoto


def main(path):
    font = TTFont(path)
    glyph_set = font.getGlyphSet()
    top = font["CFF "].cff.topDictIndex[0]
    char_strings = top.CharStrings
    order = font.getGlyphOrder()
    hmtx = font["hmtx"]
    italic = "italic" in font["name"].getDebugName(4).lower()

    gx0, gy0, gx1, gy1 = bounds(glyph_set, "grave")
    done = []
    for name, (base, accent, codepoint) in TARGETS.items():
        bx0, by0, bx1, by1 = bounds(glyph_set, base)
        if name in order:
            current = bounds(glyph_set, name)
            # Ha già un accento vero (sporge sopra la lettera base): si lascia com'è
            if current and current[3] > by1 + 20:
                continue

        gap = GAP_UPPER if base.isupper() else GAP_LOWER
        dy = by1 + gap - gy0
        dx = (bx0 + bx1) / 2 - (gx0 + gx1) / 2
        if italic:
            # Più in alto = più a destra, come il resto della lettera inclinata
            dx += ITALIC_SLANT * ((gy0 + gy1) / 2 + dy - (by0 + by1) / 2)

        # Acuto = grave specchiato sul proprio centro
        cx = (gx0 + gx1) / 2
        transform = (-1, 0, 0, 1, 2 * cx + dx, dy) if accent == "acute" else (1, 0, 0, 1, dx, dy)

        width = hmtx[base][0]
        pen = T2CharStringPen(width, glyph_set)
        glyph_set[base].draw(pen)
        glyph_set["grave"].draw(TransformPen(pen, transform))
        charstring = pen.getCharString(private=top.Private, globalSubrs=top.GlobalSubrs)

        if name in order:
            char_strings[name] = charstring
        else:
            char_strings.charStringsIndex.append(charstring)
            char_strings.charStrings[name] = len(char_strings.charStringsIndex) - 1
            top.charset.append(name)
            order.append(name)
        hmtx[name] = (width, hmtx[base][1])
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[codepoint] = name
        done.append(name)

    font.setGlyphOrder(order)
    font.save(path)
    print(f"{path}: {', '.join(done) or 'niente da fare'}")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        main(arg)
