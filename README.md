# MSF Assistant

Pomocnik do gry **Marvel Strike Force** — Angular 21 (standalone components, signals, zoneless).
Logowanie kontem Scopely (OAuth2 + PKCE) i dane z [MSF API](https://developer.marvelstrikeforce.com/beta/index.html),
albo tryb demo na danych testowych.

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
    config/        MSF_CONFIG: client_id, api key, adresy OAuth, zakresy
    auth/          AuthService (PKCE), interceptor, sessionGuard
    cache/         KvStore (IndexedDB) + ApiCache (meta.hashes, since/344)
    data/
      msf-data-source.ts      abstrakcja źródła danych; metody 1:1 z trasami API
      provide-msf-data.ts     HttpClient + interceptor + wybór implementacji
      session-msf-data-source.ts  API gdy zalogowany, mock w trybie demo
      api/                    ApiMsfDataSource (HttpClient)
      mock/                   MockMsfDataSource + dane testowe
    state/
      roster.store.ts         roster (signals): wpisy, cechy, podsumowania
      player.store.ts         karta gracza + eventy
      roster.mapper.ts        API → RosterEntry (red stars / diamenty, cechy, ISO-8)
      event.utils.ts          postęp eventu, czas do końca
      farming.store.ts / farming-calc.ts   cele farmienia i wyliczenia
      teams.store.ts / teams-calc.ts       meta drużyny i dopasowanie do rosteru
      game-rules.ts           limity umiejętności i gwiazdek
  layout/shell/    sidebar + topbar, responsywne menu
  features/        widoki ładowane leniwie (lazy routes)
    dashboard/         pulpit: kafelki statystyk, top postacie, aktywne eventy
    roster/            siatka postaci z filtrami (cecha, ★, gear, ulubione) i sortowaniem
    character-detail/  szczegóły postaci: gwiazdki, gear sloty, umiejętności, ISO-8
    events/            trwające i nadchodzące eventy z postępem
    teams/             meta drużyny per tryb gry dopasowane do rosteru (gotowe / brakuje 1–2)
    farming/           kalkulator: cele (gwiazdki, umiejętności) → shardy i materiały vs inwentarz
    login/             ekran logowania / wejście w tryb demo
    auth-callback/     obsługa powrotu z Scopely (wymiana code → token)
  shared/
    ui/            star-rating, character-avatar, gear-badge, stat-tile, progress-bar
    pipes/         compactNumber (8,73 mln)
public/
  privacy.html, tos.html   wymagane przez MSF Developer Portal
```

**Przepływ danych:** komponent → store (signals) → `MsfDataSource` → (mock | API).
Komponenty nie znają kształtu odpowiedzi API — operują na `RosterEntry` z mappera.

## Logowanie i MSF API

- Klient SPA w MSF Developer Portal: domena `localhost:4200`, redirect `/auth/callback`,
  polityka `/privacy.html`, regulamin `/tos.html`. Konfiguracja: `core/config/msf-config.ts`.
- `core/auth/auth.service.ts` — Authorization Code + PKCE (S256) na `hydra-public.prod.m3.scopelypv.com`.
  Tokeny w `localStorage`, synchronizowane między kartami. Refresh token jest jednorazowy,
  więc odświeżanie jest deduplikowane i idzie przez `/util/v1/gatedRefresh` (473 → bierze tokeny z innej karty).
- `core/auth/msf-api.interceptor.ts` — `x-api-key` + `Authorization: Bearer` dla `api.marvelstrikeforce.com`;
  401 kończy sesję i wraca do `/login`.
- `core/data/session-msf-data-source.ts` — zalogowany → `ApiMsfDataSource`, tryb demo → `MockMsfDataSource`.
- `sessionGuard` — strony aplikacji wymagają logowania albo trybu demo.

## Cache

- **Dane gry** (`/game/v1/characters`, `/game/v1/upgradeData`) — IndexedDB; ważne dopóki
  `meta.hashes.chars` z dowolnej odpowiedzi API się nie zmieni (bez znanego hasha: 12 h).
  `teamOrder` nie ma hasha — tylko TTL.
- **Dane gracza** (`/player/v1/roster`, `/player/v1/inventory`) — wysyłane z `since=<asOf>`;
  344 UNCHANGED zwraca kopię z cache. Czyszczone przy logowaniu i wylogowaniu.
- Przycisk **Odśwież** przeładowuje wszystko, co było już wczytane.

## Założenia do weryfikacji na prawdziwym API

- `yellowStarTotalShards` / `yellowStarTotalCosts` są skumulowane (od 0★ do N★).
- `abilityUpgradeCosts[N]` to koszt podniesienia umiejętności **do** poziomu N.
- Shard postaci to `starItems[0]` z `/game/v1/characters?starItems=full`.
- `teamOrder.total` liczy wystąpienia danej kolejności składu; różne kolejności tego samego
  składu są sumowane.
