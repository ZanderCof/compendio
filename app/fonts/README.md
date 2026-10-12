# Nodesto Caps Condensed

Font di **Solbera** dalla raccolta [solbera-dnd-fonts](https://github.com/jonathonf/solbera-dnd-fonts),
licenza [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Modifiche

I file originali non hanno tutte le vocali accentate italiane: mancano à, ì, ò, ù (e le maiuscole)
e negli stili Bold/Italic anche è, é, È, É sono senza accento.

Questi file sono stati modificati aggiungendo i glifi mancanti, composti dalla lettera base e
dall'accento grave del font stesso (l'acuto è il grave specchiato). Le lettere che avevano già
un accento sono rimaste invariate. Come richiesto dalla licenza, i file modificati restano
sotto CC BY-SA 4.0.

Per rifarlo sugli originali: `pip install fonttools` e poi
`python scripts/add-font-accents.py app/fonts/*.otf`.
