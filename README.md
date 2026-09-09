# qr-visit-tracker
Tenhle projekt vznikl z jednoduché potřeby (aneb napadlo nás to U Kruhu u 🍺):
- zjistit, kolik lidí skutečně otevře stránku přes QR kód – a ideálně to udělat bez Google Analytics, bez cookies, bez složitostí a bez backend serveru.

Cílem bylo vytvořit něco, co:
- je rychlé,
- je bezpečné,
- nevyžaduje žádnou databázi,
- dá se nasadit během pár minut,
- bude mít edukační dosah,
- a přesto poskytuje užitečné statistiky.

Výsledkem je QR Visit Tracker - malý, čistý a serverless projekt postavený na Cloudflare Pages.
Frontend je obyčejná statická stránka, která po načtení:
- vytvoří jednoduchý fingerprint návštěvníka,
- zjistí, jestli je na mobilu nebo desktopu,
- pošle to na API endpoint,
- a zobrazí aktuální počítadlo návštěv.

Backend běží jako Pages Functions, což znamená, že žádný server neudržuješ – Cloudflare spustí funkci jen ve chvíli, kdy přijde požadavek.
Data se ukládají do KV Storage, což je extrémně rychlé key‑value úložiště, ideální pro malé projekty a jednoduché statistiky.

Díky tomu projekt:
- nevyužívá cookies,
- nesleduje uživatele napříč weby,
- neobsahuje žádné externí trackery,
- a přesto poskytuje přehled o tom, kolik lidí QR kód skutečně použilo.

Je to takový „mini‑analytics“ nástroj, který si můžeš vzít kamkoliv — na plakát, leták, vizitku, event, prezentaci nebo produkt.
A protože je to celé open‑source a bez vendor lock‑inu, můžeš si to upravit přesně podle sebe.

Živá ukázka:
- https://neskenuj.me/
- https://scanresponsibly.it/

