import type { Province, Town, UserPublic } from "@/api/types"
import { townMunicipalities } from "@/data/town-table"

// Provinces and towns are the API seed (postgres/initdb): the towns come from src/data/town-municipalities.json,
// generated from the seed. The seed only has towns for Gipuzkoa and Bizkaia: the other provinces return [].

export const provinces: Province[] = [
  { slug: "gipuzkoa", name: "Gipuzkoa" },
  { slug: "bizkaia", name: "Bizkaia" },
  { slug: "araba", name: "Araba" },
  { slug: "nafarroa", name: "Nafarroa" },
  { slug: "lapurdi", name: "Lapurdi" },
  { slug: "nafarroa-beherea", name: "Nafarroa Beherea" },
  { slug: "zuberoa", name: "Zuberoa" },
]

/** The seed's towns, from the table that maps them to the map's municipalities. */
export const townsByProvince: Record<string, Town[]> = Object.fromEntries(
  provinces.map((province) => [province.slug, townMunicipalities(province.slug).map(({ slug, name }) => ({ slug, name }))]),
)

/** The seeded user (postgres/initdb/05-users.sql). The API uses it as the mocked author of every new post. */
export const seedUser: UserPublic = {
  publicId: "12345678",
  username: "test",
  displayName: "test",
  bio: "test",
  avatarUrl: "https://www.test.com/test.png",
}

// Fake users, only for the mocks.
export const users = {
  miren: { publicId: "20000001", username: "miren", displayName: "Miren Etxeberria", bio: null, avatarUrl: null },
  jonander: { publicId: "20000002", username: "jonander", displayName: "Jon Ander Arrieta", bio: "Txirrindularia", avatarUrl: null },
  itziar: { publicId: "20000003", username: "itziar", displayName: "Itziar Goikoetxea", bio: null, avatarUrl: null },
  koldo: { publicId: "20000004", username: "koldo", displayName: "Koldo Uranga", bio: "Arrantzalea", avatarUrl: null },
  maite: { publicId: "20000005", username: "maite", displayName: "Maite Sarasola", bio: null, avatarUrl: null },
} satisfies Record<string, UserPublic>

export type SeedUserKey = keyof typeof users | "test"

/** A seed post: `minutesAgo` keeps the relative dates realistic; `replyTo` is the index of another seed post in the same room. */
export interface SeedPost {
  author: SeedUserKey
  content: string | null
  minutesAgo: number
  replyTo?: number
}

/**
 * Seed posts per room. Room key: "province" or "province/town". A reply lives in the room of the post it
 * answers and must come after it in the list; the timeline only shows the top-level posts.
 */
export const seedPosts: Record<string, SeedPost[]> = {
  gipuzkoa: [
    { author: "miren", content: "Egun on, Gipuzkoa! Zer moduz hasi da astea?", minutesAgo: 60 * 24 * 9 },
    { author: "jonander", content: "Igandean Jaizkibelera igo nintzen bizikletaz. Ikuspegi ederra!", minutesAgo: 60 * 24 * 8 },
    { author: "itziar", content: "Norbaitek badaki Tolosako azoka larunbatean egingo den?", minutesAgo: 60 * 24 * 8 - 30 },
    { author: "koldo", content: "Bai, ohi bezala, goizeko 8etatik aurrera.", minutesAgo: 60 * 24 * 8 - 45, replyTo: 2 },
    { author: "maite", content: "Gaur arratsaldean euria, berriro. Udazkena iritsi da.", minutesAgo: 60 * 24 * 7 },
    { author: "miren", content: "¿Alguien conoce un buen sitio para comer en Azpeitia?", minutesAgo: 60 * 24 * 7 - 20 },
    { author: "jonander", content: "Probatu plazako jatetxea, eguneko menua oso ona da.", minutesAgo: 60 * 24 * 7 - 10, replyTo: 5 },
    { author: "itziar", content: "Euskal Herriko Itzulia aurten ere Gipuzkoatik pasako da.", minutesAgo: 60 * 24 * 6 },
    { author: "koldo", content: null, minutesAgo: 60 * 24 * 6 - 15 },
    { author: "maite", content: "Bertsolari txapelketaren sarrerak salgai daude jada.", minutesAgo: 60 * 24 * 5 },
    { author: "miren", content: "Zorionak, Maite! Ikusiko gara Illunben.", minutesAgo: 60 * 24 * 5 - 5, replyTo: 9 },
    { author: "jonander", content: "Topo trena berandu dabil gaur goizean, kontuz.", minutesAgo: 60 * 24 * 4 },
    { author: "itziar", content: "Sagardotegi denboraldia urtarrilean hasiko da. Zenbat falta den!", minutesAgo: 60 * 24 * 4 - 60 },
    { author: "koldo", content: "Gaur goizean itsasoa bare-bare egon da. Arrain ona ekarri dugu.", minutesAgo: 60 * 24 * 3 },
    { author: "maite", content: "Liburutegian euskara mintzapraktika taldea dago asteazkenetan.", minutesAgo: 60 * 24 * 3 - 90 },
    { author: "miren", content: "Animo denoi, ostirala da ia!", minutesAgo: 60 * 24 * 2 },
    { author: "jonander", content: "Aiako Harrian lainoa zegoen, baina merezi izan zuen.", minutesAgo: 60 * 24 * 2 - 30 },
    { author: "itziar", content: "Herri kirolak larunbatean plazan. Etorri!", minutesAgo: 60 * 24 + 120 },
    { author: "koldo", content: "Mañana hay mercado de productores en la plaza.", minutesAgo: 60 * 20 },
    { author: "maite", content: "Gaur gauean izarrak ikusteko eguraldi ezin hobea.", minutesAgo: 60 * 8 },
    { author: "miren", content: "Kafe bat hartzera noa. Norbait?", minutesAgo: 60 * 3 },
    { author: "jonander", content: "Ni! Hamar minututan plazan.", minutesAgo: 60 * 3 - 5, replyTo: 20 },
    { author: "itziar", content: "Egun ona izan, kalaka!", minutesAgo: 25 },
    { author: "maite", content: "Euria ari du berriro. Aterkia ez ahaztu!", minutesAgo: 15 },
    { author: "koldo", content: "Gaur arratsaldean pilota partida frontoian.", minutesAgo: 60 * 24 * 9 + 30 },
    { author: "maite", content: "Norbaitek galdu du giltza sorta bat plazan?", minutesAgo: 60 * 24 * 10 },
    { author: "jonander", content: "Larunbatean mendi irteera Txindokira. Nor dator?", minutesAgo: 60 * 24 * 10 + 60 },
    { author: "itziar", content: "Kaixo! Berria naiz hemen.", minutesAgo: 60 * 24 * 11 },
    { author: "koldo", content: "Ni bai! Zer ordutan?", minutesAgo: 60 * 24 * 10, replyTo: 26 },
    { author: "miren", content: "Ni ere bai, eguraldiak laguntzen badu.", minutesAgo: 60 * 24 * 10 - 20, replyTo: 26 },
    { author: "jonander", content: "Goizeko 7etan, Amezketako plazan.", minutesAgo: 60 * 24 * 10 - 30, replyTo: 28 },
    { author: "itziar", content: "Ondo, han izango naiz.", minutesAgo: 60 * 24 * 10 - 40, replyTo: 30 },
    { author: "maite", content: "Ni ere banoa!", minutesAgo: 60 * 3 - 10, replyTo: 20 },
    { author: "koldo", content: "Eta baserritarrek fruta ere ekartzen dute.", minutesAgo: 60 * 24 * 8 - 50, replyTo: 2 },
    { author: "maite", content: "Zer idatzi zenuen, Koldo?", minutesAgo: 60 * 24 * 6 - 20, replyTo: 8 },
  ],
  "gipuzkoa/zarautz": [
    { author: "koldo", content: "Gaur olatu onak daude hondartzan. Surflariek pozik!", minutesAgo: 60 * 26 },
    { author: "test", content: "Malekoian paseo bat egiteko eguna.", minutesAgo: 60 * 5 },
    { author: "maite", content: "Ados! Eta gero txakolin bat Getarian?", minutesAgo: 60 * 4, replyTo: 1 },
    { author: "miren", content: null, minutesAgo: 90 },
    { author: "itziar", content: "Kontzertua dago gaur gauean Munoan. Norbait animatzen?", minutesAgo: 12 },
    { author: "miren", content: "Bihar goizean ere bai?", minutesAgo: 60 * 25, replyTo: 0 },
    { author: "koldo", content: "Baietz diote iragarpenek.", minutesAgo: 60 * 24, replyTo: 5 },
    { author: "jonander", content: "Zorte ona! Ni lanean nago.", minutesAgo: 60 * 20, replyTo: 0 },
  ],
  "gipuzkoa/donostia": [
    { author: "jonander", content: "Zinemaldiak utzitako giroa oraindik nabaritzen da Alde Zaharrean.", minutesAgo: 60 * 30 },
    { author: "itziar", content: "Kontxako Banderak iritsi dira berriro. Zein traineru da zuen faborito?", minutesAgo: 60 * 2 },
  ],
  bizkaia: [
    { author: "maite", content: "Kaixo Bizkaia! Hemen gaude zuekin berriketan.", minutesAgo: 60 * 24 * 2 },
    { author: "jonander", content: "Gernikako azoka astelehenean. Txorizoa eta piperrak!", minutesAgo: 60 * 6 },
    { author: "koldo", content: "Bermeoko portuan hegaluzea iritsi da.", minutesAgo: 40 },
  ],
  "bizkaia/bilbo": [
    { author: "miren", content: "Aste Nagusiko txosnak faltan botatzen ditut jada.", minutesAgo: 60 * 50 },
    { author: "test", content: "Guggenheimeko erakusketa berria ikusi duzue?", minutesAgo: 60 * 3 },
  ],
  araba: [{ author: "itziar", content: "Gasteizko Alde Zaharrean kalejira bat dago gaur arratsaldean.", minutesAgo: 60 * 7 }],
  nafarroa: [{ author: "maite", content: "Iruñeko Gazteluko plazan elkartuko gara?", minutesAgo: 60 * 30 }],
  lapurdi: [{ author: "koldo", content: "Donibane Lohizuneko portuan arrantza ona aurten.", minutesAgo: 60 * 12 }],
  "nafarroa-beherea": [],
  zuberoa: [{ author: "jonander", content: "Maskaradak prestatzen hasi dira herrian.", minutesAgo: 60 * 24 * 3 }],
}
