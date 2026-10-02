# Kalaka frontend — specification

Agreed with the project owner (the client) on 2026-10-02. Changes to this file
are product decisions: the frontend agent asks the owner before making them.

## 1. Scope of the first version

| Screen / feature | API | Status |
|---|---|---|
| Browse provinces and their towns | `GET /provinces`, `GET /provinces/:provinceSlug/towns` | Available |
| Publish a post in a province or town room | `POST /provinces/:provinceSlug/posts`, `POST /provinces/:provinceSlug/towns/:townSlug/posts` | Available |
| Reply to a post | `POST /posts/:postSlug/replies` | Available |
| See the posts of a room | — | **Requested** (backend issue) |
| Call the API from another origin | — | **Requested**: CORS (backend issue) |

Out of this version: login and registration (they come after the backend's
authentication task; until then the API mocks the author), likes, reposts,
quotes, editing and deleting posts, user profiles.

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
| `/` | Provinces |
| `/:provinceSlug` | Province room (its posts and composer) + list of its towns |
| `/:provinceSlug/:townSlug` | Town room (its posts and composer) |

Replying opens a composer under the post, inside the room. A dedicated post/thread page waits for a backend endpoint to read a thread.

## 7. Tests

- **Vitest + Testing Library + MSW:** every screen and the API client, with the API mocked by MSW from the same types. Fast, run on every change.
- **Playwright:** a few end-to-end flows in a real browser against the real API (test database): browse to a town, publish, reply. These also prove CORS and the contract for real.

## 8. How the work is organised

Like a frontend team inside a company:

- **Product questions** (what to build, how it should behave) → the owner, as the client. The frontend agent asks; it does not decide product on its own.
- **Contract questions** (endpoints, request and response shapes, status codes, errors) → the `backend-contracts` agent, which reads `backend/` and answers. It never writes code.
- **Something missing in the API** → a GitHub issue for the backend team (the owner): what is needed, the proposed contract and how to know it is done. The frontend never changes `backend/` and never invents an endpoint; until the issue is done it works against MSW mocks.
- The `frontend-dev` agent writes only inside `frontend/`.
