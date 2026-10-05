# MSF Assistant

Pomocnik do gry **Marvel Strike Force** — Angular 21 (standalone components, signals, zoneless).
Na razie działa na danych testowych (mock); integracja z [MSF API](https://developer.marvelstrikeforce.com/beta/index.html) jest przygotowana architektonicznie.

## Uruchomienie

```bash
npm install
npm start          # http://localhost:4200
npm test           # testy jednostkowe (Vitest)
npm run build
```

> `.npmrc` ustawia `legacy-peer-deps=true` — npm 10.9.x ma błąd (`reading 'edgesOut'`) przy peer deps Vitesta.

## Architektura

```
src/app/
  core/
    models/        typy odwzorowujące schematy MSF API (CharacterInfo, CharacterInstance, PlayerCard, EventInfo…)
                   + RosterEntry — płaski model widoku
    data/
      msf-data-source.ts      abstrakcja źródła danych; metody 1:1 z trasami API
      provide-msf-data.ts     JEDYNE miejsce wyboru implementacji (mock ↔ API)
      mock/                   MockMsfDataSource + dane testowe
    state/
      roster.store.ts         roster (signals): wpisy, cechy, podsumowania
      player.store.ts         karta gracza + eventy
      roster.mapper.ts        API → RosterEntry (red stars / diamenty, cechy, ISO-8)
      event.utils.ts          postęp eventu, czas do końca
  layout/shell/    sidebar + topbar, responsywne menu
  features/        widoki ładowane leniwie (lazy routes)
    dashboard/         pulpit: kafelki statystyk, top postacie, aktywne eventy
    roster/            siatka postaci z filtrami (cecha, ★, gear, ulubione) i sortowaniem
    character-detail/  szczegóły postaci: gwiazdki, gear sloty, umiejętności, ISO-8
    events/            trwające i nadchodzące eventy z postępem
    coming-soon/       placeholder (Farmienie, Sojusz, /auth/callback)
  shared/
    ui/            star-rating, character-avatar, gear-badge, stat-tile, progress-bar
    pipes/         compactNumber (8,73 mln)
public/
  privacy.html, tos.html   wymagane przez MSF Developer Portal
```

**Przepływ danych:** komponent → store (signals) → `MsfDataSource` → (mock | API).
Komponenty nie znają kształtu odpowiedzi API — operują na `RosterEntry` z mappera.

## Następny krok: MSF API

1. Klient SPA zarejestrowany w MSF Developer Portal: domena `localhost:4200`, redirect `/auth/callback`.
2. `AuthService` — OAuth2 Authorization Code + PKCE (`hydra-public.prod.m3.scopelypv.com`),
   zakresy `m3p.f.pr.pro m3p.f.pr.ros m3p.f.pr.inv m3p.f.pr.act m3p.f.ar.pro openid offline`.
   Refresh token jest jednorazowy — odświeżać z jednego miejsca (ew. `/util/v1/gatedRefresh`).
3. `HttpInterceptor` — nagłówki `x-api-key` i `Authorization: Bearer`, obsługa 344 UNCHANGED (`since`/`asOf`) i 552/553.
4. `ApiMsfDataSource` implementujące `MsfDataSource` i podmiana w `provideMsfData()`.
