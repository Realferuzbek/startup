-- Seed data: listing amenities. Idempotent.

insert into public.amenities (slug, name_uz, name_ru, sort_order) values
  ('furniture', 'Mebel', 'Мебель', 1),
  ('air_conditioning', 'Konditsioner', 'Кондиционер', 2),
  ('washing_machine', 'Kir yuvish mashinasi', 'Стиральная машина', 3),
  ('refrigerator', 'Muzlatgich', 'Холодильник', 4),
  ('internet', 'Internet', 'Интернет', 5),
  ('tv', 'Televizor', 'Телевизор', 6),
  ('hot_water', 'Issiq suv', 'Горячая вода', 7),
  ('gas', 'Gaz', 'Газ', 8),
  ('heating', 'Isitish', 'Отопление', 9),
  ('elevator', 'Lift', 'Лифт', 10),
  ('parking', 'Avtoturargoh', 'Парковка', 11),
  ('balcony', 'Balkon', 'Балкон', 12),
  ('separate_bathroom', 'Alohida hammom', 'Отдельная ванная', 13),
  ('pets_allowed', 'Hayvonlar bilan mumkin', 'Можно с животными', 14)
on conflict (slug) do nothing;
