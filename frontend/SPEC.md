# Kalaka frontend — specification

Agreed with the project owner (the client) on 2026-10-02. Changes to this file
are product decisions: the frontend agent asks the owner before making them.

## 1. Scope of the first version

| Screen / feature | API | Status |
|---|---|---|
| Browse provinces and their towns, on a map and in a searchable list | `GET /provinces`, `GET /provinces/:provinceSlug/towns` | Available |
| Publish a post in a province or town room | `POST /provinces/:provinceSlug/posts`, `POST /provinces/:provinceSlug/towns/:townSlug/posts` | Available |
| Reply to a post (deleted posts included) | `POST /posts/:postSlug/replies` | Available |
| See the posts of a room (top-level only) | Proposed: `GET /provinces/:provinceSlug/posts`, `GET /provinces/:provinceSlug/towns/:townSlug/posts` | **Requested** (backend issue) |
| See a post | Proposed: `GET /posts/:postSlug` | **Requested** (backend issue) |
| See a post's direct replies | Proposed: `GET /posts/:postSlug/replies` | **Requested** (backend issue) |
| Call the API from another origin | — | **Requested**: CORS (backend issue) |

Proposed contracts (the frontend works against MSW mocks of them until they exist):

- Lists (room posts, replies): newest first, `?limit=20&before=<cursor>` → `{ posts: PostPublic[], nextCursor: string | null }`. A room lists only its top-level posts; replies lists only the direct replies.
- `GET /posts/:postSlug` → 200 `PostPublic`; 404 `{ "error": "the post does not exist" }`; 400 for an invalid slug, as in the replies route.
- Optional `replyCount: number` in `PostPublic` (direct replies). The interface works without it.

Out of this version: login and registration (they come after the backend's
authentication task; until then the API mocks the author), likes, reposts,
quotes, editing and deleting posts, user profiles.

### Threads

Like Twitter. A room's timeline shows only top-level posts. To see the replies
you open the post: its page shows the post, a reply composer and its direct
replies, newest first, with "load more". Each reply opens its own page, so you
can go as deep as the conversation goes; a post that is a reply links to its
parent.

A deleted post keeps its place: its content is replaced by a translated
placeholder, its author stays visible, and it can still be replied to.

## 2. Stack

- React + Vite + TypeScript (strict).
- React Router for the routes, TanStack Query for server state.
- Tailwind CSS + shadcn/ui (components copied into the repo), Lucide icons.
- i18next + react-i18next for the interface texts.
- Vitest + Testing Library + MSW for components; Playwright for end-to-end.
- oxlint (from the Vite template) and Prettier.

## 3. Origins and API access

- The frontend and the API are **separate origins**. Development: `http://localhost:5173` → `http://localhost:3000`. No dev proxy: CORS is part of the design, not something to hide.
- The API base URL comes from `VITE_API_URL`. Nothing else about the API is hardcoded.
- Production layout (subdomains or separate domains) is decided in the deployment task (TLS, domain and public link). Note for that decision: separate *sites* block third-party cookies, which affects the future session design.
- One API client module (`src/api/`) wraps `fetch`: base URL, JSON, and turning non-2xx responses into typed errors. Components never call `fetch` directly.
- API types are written from the contract that the backend-contracts agent reports, not guessed.

## 4. Languages

- Interface in **Basque by default**, Spanish optional. A switch `eu | es` in the header; the choice is remembered in `localStorage` and sets `<html lang>`.
- Only the interface is translated. Place names and posts are shown exactly as the API returns them (the backend is single-language on purpose).
- Dates are formatted in the browser with `Intl` (`eu`, `es`): relative for recent posts ("duela 5 min"), short date after a day. The API keeps sending ISO dates.
- API errors are never shown raw (they are English developer messages). The client maps the HTTP status — and the stable error `code` once the backend sends it — to translated messages.

## 5. Visual style

**Personality:** close and easy-going, like a chat in the town square. The warmth lives in the colour and in the tone of the texts, not in decoration.

**Palette "Cantábrico"** — petrol blue brand, cool neutrals, sand accent. Light and dark from day one; follows the system setting, with a manual switch.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#F7F9FA` | `#0E1A1F` | Page |
| `card` | `#FFFFFF` | `#15262D` | Posts, composer |
| `foreground` | `#1B2A30` | `#E6EEF0` | Text |
| `muted-foreground` | `#5B6B71` | `#93A6AD` | Meta: user, time, breadcrumbs |
| `border` | `#DCE3E6` | `#24363E` | Hairlines |
| `primary` (brand) | `#0F4C5C` | `#4FA3B8` | Logo, main button, links |
| `primary-foreground` | `#FFFFFF` | `#06181E` | Text on brand |
| `accent` | `#E9C46A` | `#E9C46A` | Avatars, highlights (sparingly) |
| `accent-foreground` | `#5A4310` | `#3A2B06` | Text on accent |
| `destructive` | `#B42318` | `#F97066` | Errors |

All text pairs must pass WCAG AA contrast; check them when the tokens go into the Tailwind theme.

**Typography:** Outfit for the logo and headings, Inter for everything else. Both cover Basque and Spanish characters.

**Shape:** soft — radius 6–8 px (`--radius: 0.5rem`) on cards, inputs and buttons; avatars are circles.

**Logo:** text only, `kalaka` in lowercase, Outfit, brand colour.

**Layout:** one column, mobile first. On desktop the same column, centred, max ~640 px wide.

**Tone of the texts:** short, friendly, verb first ("Argitaratu", "Erantzun"). Errors say what happened and what to do ("Ezin izan da argitaratu. Saiatu berriro.").

## 6. Routes

| Route | Screen |
|---|---|
| `/` | Provinces: map of the 7 herrialdeak + list |
| `/:provinceSlug` | Map of its municipalities + searchable list of its towns, then the province room (its posts and composer) |
| `/:provinceSlug/:townSlug` | Town room (its posts and composer) |
| `/posts/:postSlug` | Post page: the post, a link to its room, its reply composer and its direct replies |

`posts` is a static segment, so `/posts/:postSlug` never clashes with a province or town route.
The reply action in a timeline opens the post page with the reply composer focused.

### Maps

Navigation by a real map of the official boundaries, drawn as SVG with d3-geo
(no tiles, no third-party services), in the Cantábrico colours, light and dark.

- `/`: the 7 herrialdeak. Clicking one opens its province.
- `/:provinceSlug`: the province's municipalities. A municipality is a link to
  its town when the API has that town; the rest (and shared land such as
  parzonerías or Bardenas Reales) are drawn muted and are not clickable, so the
  shape stays complete.
- Accessibility: map regions that are links are focusable, named and open with
  Enter; under the map there is always a list (searchable on the province page,
  accent-insensitive), with a skip link from the map to it.
- Boundaries are the official ones, at full IGN resolution simplified to about
  20 m (80 m on the Euskal Herria overview). One exception, decided by the owner
  on 2026-10-02: **Trebiñu and La Puebla de Arganzón** (Burgos) are drawn inside
  Araba, as muted municipalities, so Araba has no hole. Other enclaves (Valle
  de Villaverde, Cantabria, inside Bizkaia) stay outside.
- A municipality that exists but is not in the API's seed (Usansolo, split from
  Galdakao in 2022) is drawn muted until the seed has it.
- Lapurdi, Nafarroa Beherea and Zuberoa are historical provinces, not
  administrative units: each is drawn as the union of its communes, from a
  reviewable assignment file with its sources.
- **Water** (owner's request, 2026-10-02): the main rivers (named courses of at
  least 14 km; 60 km on the overview) as thin lines, the rías as thicker lines
  (OpenStreetMap maps them as river lines because its coastline runs up the
  estuary), and reservoirs, lakes and wide rivers as surfaces. A water colour of
  its own (`--map-water`), bluer than the brand. Not interactive.
- **Names on the map**, calm on purpose: small text with a soft halo of the page
  colour, never a link or a tab stop (the regions already are). Herrialdeak are
  always named on the overview. On a province map the capital goes first and a
  little bigger, then municipalities by population; a name is drawn only if it
  fits inside its municipality and touches no other name. Towns of 20,000+
  people may stick out of their (often small) municipality. Sizes are kept in
  screen pixels, so a phone shows fewer names, not smaller ones. Towns use the
  API's name; other municipalities their Basque name.

Data and licences (attributed in the footer):

| Area | Source | Licence |
|---|---|---|
| Araba, Bizkaia, Gipuzkoa, Nafarroa | IGN/CNIG, INSPIRE WFS "Unidades administrativas" (full-resolution municipalities, INE codes); `es-atlas` only to place shared land in its province | CC BY 4.0 |
| Lapurdi, Nafarroa Beherea, Zuberoa | IGN France Admin Express through geo.api.gouv.fr (Etalab), communes of département 64 (INSEE codes) | Licence Ouverte 2.0 |
| Rivers, rías, lakes | OpenStreetMap through the Overpass API | ODbL |
| Population and Basque names (labels) | Wikidata SPARQL, by INE / INSEE code | CC0 |

`scripts/build-maps.mjs` builds the maps into `src/data/maps/` (TopoJSON, one
file per screen, lazy-loaded) and the table that links each town of the API
seed to its municipality code (`src/data/town-municipalities.json`). A test
checks that every town in the seed has exactly one polygon.

## 7. Tests

- **Vitest + Testing Library + MSW:** every screen and the API client, with the API mocked by MSW from the same types. Fast, run on every change.
- **Playwright:** a few end-to-end flows in a real browser against the real API (test database): browse to a town, publish, reply. These also prove CORS and the contract for real.

## 8. How the work is organised

Like a frontend team inside a company:

- **Product questions** (what to build, how it should behave) → the owner, as the client. The frontend agent asks; it does not decide product on its own.
- **Contract questions** (endpoints, request and response shapes, status codes, errors) → the `backend-contracts` agent, which reads `backend/` and answers. It never writes code.
- **Something missing in the API** → a GitHub issue for the backend team (the owner): what is needed, the proposed contract and how to know it is done. The frontend never changes `backend/` and never invents an endpoint; until the issue is done it works against MSW mocks.
- The `frontend-dev` agent writes only inside `frontend/`.
