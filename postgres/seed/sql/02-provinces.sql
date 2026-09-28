--
-- PostgreSQL database dump
--

\restrict wgRzeDC3QHtOBt7W2Rx93P08QS7x5roclShZ7WkxrPQL4rOjhPFjuTNywMiF44m

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: provinces; Type: TABLE DATA; Schema: public; Owner: izeta
--

INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1, 'gipuzkoa', 'Gipuzkoa', 1, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');
INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (2, 'bizkaia', 'Bizkaia', 2, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');
INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (3, 'araba', 'Araba', 3, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');
INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (4, 'nafarroa', 'Nafarroa', 4, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');
INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (5, 'lapurdi', 'Lapurdi', 5, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');
INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (6, 'nafarroa-beherea', 'Nafarroa Beherea', 6, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');
INSERT INTO public.provinces (id, slug, name, room_id, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (7, 'zuberoa', 'Zuberoa', 7, '2026-09-28 08:23:51.236372+00', '2026-09-28 08:23:51.236372+00');


--
-- Name: provinces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: izeta
--

SELECT pg_catalog.setval('public.provinces_id_seq', 7, true);


--
-- PostgreSQL database dump complete
--

\unrestrict wgRzeDC3QHtOBt7W2Rx93P08QS7x5roclShZ7WkxrPQL4rOjhPFjuTNywMiF44m

