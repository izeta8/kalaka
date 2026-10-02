# Kalaka — frontend

> **Outside the study scope. All the code in `frontend/` is written by AI.**
>
> Kalaka is the anchor project of a self-taught course. The backend, the
> infrastructure and the authentication are written by hand as learning work.
> The frontend is not part of that learning: it is written entirely by an AI
> agent, reviewed by the project owner as a client would. Do not read this
> folder as a sample of the owner's frontend skills.

A web client for the Kalaka API: rooms for every province and town of Euskal
Herria, with short posts and replies. Basque first, Spanish optional.

The full specification is in [SPEC.md](SPEC.md).

## Run it

The frontend and the API live on **different origins** on purpose, in
development as in production. The browser calls the API directly (no dev proxy),
so the API must allow this origin with CORS.

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev            # http://localhost:5173
```

The API must be running (see `../backend`) with `http://localhost:5173` in its
allowed origins.
