INSERT INTO public.users(public_id, username, display_name, bio, avatar_url, email, email_verified_at, town_id) OVERRIDING SYSTEM VALUE VALUES ('12345678', 'test', 'test', 'test', 'https://www.test.com/test.png', 'test@test.com', now(), 82);

SELECT pg_catalog.setval('public.users_id_seq', 1, true);
