# MSF Assistant — instrukcje dla Claude

Pomocnik do Marvel Strike Force (Angular 21, oficjalne MSF API). Użytkownik pisze po polsku.

## Zanim zaczniesz szukać

- **Najpierw przeczytaj [`docs/knowledge-base.md`](docs/knowledge-base.md)** — fakty o grze (zasady,
  meta, źródła postaci, kalendarz), o API, o środowisku i mapa kodu. Szukaj w sieci tylko tego, czego
  tam nie ma albo co jest przeterminowane; po badaniu dopisz wynik do bazy (data, źródło, pewność).
- Szczegóły MSF API: [`docs/msf-api.md`](docs/msf-api.md) i lokalna specyfikacja
  [`docs/msf-api-spec.json`](docs/msf-api-spec.json) (strona dokumentacji jest z sesji niedostępna).
- Raporty z badań (z linkami do źródeł): [`reports/`](reports). Notatki robocze `research_notes/`
  są poza gitem.
- Strony gry, marvel.church i Reddit są z sesji niedostępne — w wyszukiwarce są tylko skrawki;
  oznaczaj takie fakty. Serwera gry też nie ma — sprawdzaj na danych demo.

## Konwencje

- UI po polsku, kod i komentarze po angielsku; dopasuj się do stylu otoczenia.
- Po zmianach: `npx prettier --write src/app`, `npx ng test --watch=false`, `npx ng build`.
  Budżet stylów komponentu to 4 kB — większe sekcje wydzielaj do komponentów.
- Dane ręczne (`src/app/core/data/*.ts`) zmieniaj tylko, gdy fakty się zmieniły; każdy wpis
  `status: 'event'` w `character-sources.ts` musi mieć `until` (pilnuje test).
- Zmiany sprawdzaj w przeglądarce (Playwright, tryb demo) i opisuj użytkownikowi, co sprawdzono
  na demo, a czego nie (prawdziwe API).
