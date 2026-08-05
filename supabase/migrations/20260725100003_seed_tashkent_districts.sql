-- Seed data: the 12 districts (tumanlar) of Tashkent city. No districts for any
-- other region. Idempotent.

insert into public.districts (region_id, slug, name_uz, name_ru, sort_order)
select
  (select id from public.regions where slug = 'tashkent-city'),
  d.slug, d.name_uz, d.name_ru, d.sort_order
from (values
  ('bektemir', 'Bektemir tumani', 'Бектемирский район', 1),
  ('chilonzor', 'Chilonzor tumani', 'Чиланзарский район', 2),
  ('mirobod', 'Mirobod tumani', 'Мирабадский район', 3),
  ('mirzo-ulugbek', 'Mirzo Ulugʻbek tumani', 'Мирзо-Улугбекский район', 4),
  ('olmazor', 'Olmazor tumani', 'Алмазарский район', 5),
  ('sergeli', 'Sergeli tumani', 'Сергелийский район', 6),
  ('shayxontohur', 'Shayxontohur tumani', 'Шайхантахурский район', 7),
  ('uchtepa', 'Uchtepa tumani', 'Учтепинский район', 8),
  ('yakkasaroy', 'Yakkasaroy tumani', 'Яккасарайский район', 9),
  ('yangihayot', 'Yangihayot tumani', 'Янгихаётский район', 10),
  ('yashnobod', 'Yashnobod tumani', 'Яшнабадский район', 11),
  ('yunusobod', 'Yunusobod tumani', 'Юнусабадский район', 12)
) as d(slug, name_uz, name_ru, sort_order)
on conflict (slug) do nothing;
