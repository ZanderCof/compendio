import type { Character } from "./types"

// Dati di esempio finché non c'è il modello Prisma.
// Quando ci sarà, basta sostituire il corpo di getCharacter con una query.
const CHARACTERS: Character[] = [
  {
    id: "1",
    name: "Lyra Ventobruno",
    player: "Alessandro",
    race: "Mezzelfa",
    className: "Chierico",
    subclass: "Dominio della Luce",
    level: 5,
    background: "Accolito",
    alignment: "Neutrale Buono",
    experience: 6500,

    abilities: { str: 10, dex: 14, con: 14, int: 12, wis: 18, cha: 13 },
    savingThrows: ["wis", "cha"],
    skills: {
      insight: "proficient",
      medicine: "proficient",
      religion: "expertise",
      perception: "proficient",
      persuasion: "proficient",
    },

    armorClass: 18,
    speed: 9,
    hitPoints: { current: 31, max: 38, temp: 5 },
    hitDice: { die: 8, total: 5, used: 1 },
    deathSaves: { successes: 0, failures: 0 },
    inspiration: true,

    attacks: [
      { name: "Mazza", ability: "str", proficient: true, damage: "1d6", damageType: "contundente" },
      { name: "Balestra leggera", ability: "dex", proficient: true, damage: "1d8", damageType: "perforante", notes: "Gittata 24/96 m" },
    ],

    spellcasting: {
      ability: "wis",
      slots: [
        { level: 1, total: 4, used: 2 },
        { level: 2, total: 3, used: 1 },
        { level: 3, total: 2, used: 0 },
      ],
      spells: [
        { name: "Fiamma Sacra", level: 0 },
        { name: "Luce", level: 0 },
        { name: "Taumaturgia", level: 0 },
        { name: "Guida", level: 0 },
        { name: "Cura Ferite", level: 1, prepared: true },
        { name: "Dardo Tracciante", level: 1, prepared: true },
        { name: "Mani Brucianti", level: 1, prepared: true },
        { name: "Scudo della Fede", level: 1, prepared: true },
        { name: "Arma Spirituale", level: 2, prepared: true },
        { name: "Sfera Infuocata", level: 2, prepared: true },
        { name: "Ristorare Inferiore", level: 2, prepared: false },
        { name: "Palla di Fuoco", level: 3, prepared: true },
        { name: "Guardiani Spirituali", level: 3, prepared: true },
        { name: "Rinascita", level: 3, prepared: false },
      ],
    },

    equipment: [
      { name: "Cotta di maglia", quantity: 1, weight: 55, equipped: true },
      { name: "Scudo", quantity: 1, weight: 6, equipped: true },
      { name: "Mazza", quantity: 1, weight: 4, equipped: true },
      { name: "Balestra leggera", quantity: 1, weight: 5 },
      { name: "Quadrelli", quantity: 20, weight: 1.5 },
      { name: "Simbolo sacro", quantity: 1, weight: 1, equipped: true },
      { name: "Dotazione da sacerdote", quantity: 1, weight: 24 },
      { name: "Pozione di guarigione", quantity: 2, weight: 0.5 },
    ],
    currency: { cp: 12, sp: 45, ep: 0, gp: 87, pp: 2 },

    features: [
      { name: "Scurovisione", source: "Razza", description: "Vedi nell'oscurità entro 18 metri come se fosse luce fioca." },
      { name: "Retaggio Fatato", source: "Razza", description: "Vantaggio ai tiri salvezza contro l'essere affascinati; la magia non può farti addormentare." },
      { name: "Incanalare Divinità (1/riposo)", source: "Classe", description: "Scacciare Non Morti oppure Radiosità dell'Alba." },
      { name: "Distruggere Non Morti (GS 1/2)", source: "Classe", description: "I non morti di GS 1/2 o inferiore che falliscono il tiro salvezza contro Scacciare vengono distrutti." },
      { name: "Lampo Interdittore", source: "Sottoclasse", description: "Reazione: imponi svantaggio al tiro per colpire di una creatura entro 9 m. Usi pari al modificatore di Saggezza." },
      { name: "Rifugio dei Fedeli", source: "Background", description: "Tu e i tuoi compagni ricevete cure e ospitalità gratuite nei templi della tua fede." },
    ],
    proficiencies: {
      armor: ["Leggere", "Medie", "Scudi"],
      weapons: ["Semplici"],
      tools: [],
      languages: ["Comune", "Elfico", "Celestiale", "Nanico"],
    },

    personality: {
      traits: "Cito sempre le scritture del mio tempio, anche quando non è il momento.",
      ideals: "Speranza. La luce trova sempre una crepa da cui entrare.",
      bonds: "Proteggerò il tempio di Lathander a Belcastello, che mi ha cresciuta.",
      flaws: "Mi fido troppo di chi dice di condividere la mia fede.",
    },
    backstory:
      "Abbandonata da neonata sui gradini di un tempio di Lathander, Lyra è cresciuta tra canti all'alba e vecchi tomi. Quando un culto di non morti ha attaccato il villaggio vicino, ha lasciato il tempio per la prima volta, decisa a riportare la luce dove si era spenta.",
  },
]

export async function getCharacter(id: string): Promise<Character | null> {
  "use cache"
  return CHARACTERS.find((c) => c.id === id) ?? null
}
