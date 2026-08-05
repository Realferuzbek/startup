-- Seed data: the 14 first-level administrative regions of Uzbekistan
-- (12 viloyatlar, 1 autonomous republic, 1 city). No districts, neighborhoods,
-- or any other geography. Idempotent.

insert into public.regions (slug, name_uz, name_ru, sort_order) values
  ('karakalpakstan', 'Qoraqalpogʻiston Respublikasi', 'Республика Каракалпакстан', 1),
  ('andijan', 'Andijon viloyati', 'Андижанская область', 2),
  ('bukhara', 'Buxoro viloyati', 'Бухарская область', 3),
  ('fergana', 'Fargʻona viloyati', 'Ферганская область', 4),
  ('jizzakh', 'Jizzax viloyati', 'Джизакская область', 5),
  ('kashkadarya', 'Qashqadaryo viloyati', 'Кашкадарьинская область', 6),
  ('khorezm', 'Xorazm viloyati', 'Хорезмская область', 7),
  ('namangan', 'Namangan viloyati', 'Наманганская область', 8),
  ('navoiy', 'Navoiy viloyati', 'Навоийская область', 9),
  ('samarkand', 'Samarqand viloyati', 'Самаркандская область', 10),
  ('sirdaryo', 'Sirdaryo viloyati', 'Сырдарьинская область', 11),
  ('surkhandarya', 'Surxondaryo viloyati', 'Сурхандарьинская область', 12),
  ('tashkent-region', 'Toshkent viloyati', 'Ташкентская область', 13),
  ('tashkent-city', 'Toshkent shahri', 'город Ташкент', 14)
on conflict (slug) do nothing;
