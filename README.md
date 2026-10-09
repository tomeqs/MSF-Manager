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
    data/known-meta.ts  lista drużyn z poradników (fallback dla drużyn) — do ręcznej edycji
    data/key-characters.ts  postacie uniwersalne z poradników — do ręcznej edycji
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
      advisor(.store).ts                    ranking opłacalności farmienia (cały roster)
      key-characters(.store).ts             kluczowe postacie: status rozwoju i miejsce w rankingu
      today.ts                              lista „Co farmić dziś”
      game-rules.ts           limity umiejętności i gwiazdek
  layout/shell/    sidebar + topbar, responsywne menu
  features/        widoki ładowane leniwie (lazy routes)
    dashboard/         pulpit: „Co farmić dziś”, kafelki statystyk, top postacie, aktywne eventy
    roster/            siatka postaci z filtrami (cecha, ★, gear, ulubione) i sortowaniem
    character-detail/  szczegóły postaci: gwiazdki, gear sloty, umiejętności, ISO-8
    events/            trwające i nadchodzące eventy z postępem
    teams/             drużyny per tryb gry dopasowane do rosteru (gotowe / brakuje 1–2);
                       źródło: analiza MSF API, a gdy ta nie działa — lista z poradników
    key-characters/    postacie uniwersalne (plug-and-play) i ich priorytet farmienia
    farming/           ranking „Co się najbardziej opłaca” + kalkulator: cele (gwiazdki, umiejętności) → shardy i materiały vs inwentarz
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
- **Sesja przetrwa przeładowania i przebudowy**: tokeny są w `localStorage` (per adres — otwieraj
  zawsze `http://localhost:4200`). Token jest odświeżany 5 min przed wygaśnięciem, gdy karta jest
  widoczna, oraz po powrocie do karty i sieci. Przy 401 aplikacja odświeża token i ponawia
  zapytanie. Sesja kończy się tylko, gdy Scopely odrzuci token (400/401/403) — błędy sieci/5xx
  jej nie kasują. Powód zakończenia sesji jest pokazywany na ekranie logowania.

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

## Drużyny: fallback

`/game/v1/analysis/teamOrder` (per tryb i zbiorczo) zwraca obecnie 500. Wtedy widok drużyn
używa `core/data/known-meta.ts` — imiennych składów z poradników i oficjalnych postów
(stan na 9.10.2026: Crucible sezon 25, raid Trepidation z Iron Raiders zamiast Hellfire Club,
Boss Raid; dawne drużyny raidowe zostały jako „legacy”/Blitz), z linkiem do źródła i poziomem
S/A/B przy każdej drużynie. Badanie opierało się na wynikach wyszukiwania (strony poradników
były niedostępne), więc poziomy to dobrze poinformowane szacunki. Slot `"A|B"` = A albo B,
jeśli A nie posiadasz. Nazwy postaci, których nie ma w danych gry, są wypisywane pod listą — wystarczy
poprawić pisownię w pliku. Przycisk „Sprawdź API ponownie” wraca do danych z API, gdy zadziała.

## Docelowa moc drużyn

Dla każdego członka drużyny `/game/v1/characterInstances/{id}` zwraca moc przy 7★, maks.
gearze i umiejętnościach dla **poziomu gracza** (postać nie przekroczy poziomu gracza), z
obecnymi czerwonymi gwiazdkami/diamentami i aktywną klasą ISO-8 na maks. Suma = moc docelowa
drużyny; różnica z obecną mocą = „brakuje”. Wyniki są cache'owane (hash `chars`), zapytania
idą po maks. 4 naraz (`PotentialStore`). „Farmuj” tworzy cel: odblokowanie albo 7★ + docelowe
poziomy umiejętności. Farmienie dzieli cele na „Do odblokowania” i „Do ulepszenia”.
Gear (G→G) jest pokazywany jako brak, ale kalkulator materiałów gearu jeszcze go nie liczy.

## Kiedy przestać farmić

Status rozwoju postaci względem maks. mocy na poziomie gracza (`potential-calc.ts`):
**wymaksowana** (100%), **optymalna** (7★ i ≥ `OPTIMAL_POWER_SHARE` = 95% — ostatnie procenty
kosztują nieproporcjonalnie dużo, można przestać farmić), **w rozwoju**, **zablokowana**.
Widoczny w Drużynach (✓ przy postaci, „drużyna optymalnie rozwinięta”), w Farmieniu (sekcja
„Gotowe — możesz przestać farmić”) i w szczegółach postaci.

## Blitz i Wieża

Zakładki Blitz i Wieża zaczynają od trwających i zapowiedzianych eventów tego typu
(`/player/v1/events`, pola `blitz.requirements` / `tower.requirements`). Dla każdego eventu
(`requirements.ts`): opis wymagań, Twoje najmocniejsze rozłączne składy spełniające wymagania
(Blitz: do 3, Wieża: 1) i postacie, które pasują cechami, ale nie spełniają minimów
(gwiazdki, gear, poziom, czerwone gwiazdki, ISO-8) — z „Farmuj” do wymaganych gwiazdek.
Cechy porównywane są łącznie z niewidocznymi i eventowymi (`traitKeys`).

## Ranking opłacalności

`advisor.ts` układa ruchy w kolejności „co się teraz najbardziej opłaca”. Wynik ruchu to
**wartość × zysk ÷ koszt**. Zasada: zasoby rzadkie (shardy, gear ponad Twój etap, T4) idą
tylko tam, gdzie zwrot jest największy.

### Twój etap gry (`progression.ts`)

Trudność gearu zależy od konta, więc liczę ją z rosteru: ile z Twoich 60 najsilniejszych
postaci ma dany poziom gearu. **Etap** (frontier) to najwyższy poziom, który ma ≥ 20% z nich.
Koszt poziomu = 0,3 ÷ zasięg² (maks. 60 jednostek): poziom, który ma większość — tani; który ma
1 na 7 — ~15 jednostek (~75 shardów); którego prawie nikt nie ma — ~300 shardów. Etykiety:
łatwy / średni / trudny / ekstremalny. Ulepszenia celują najpierw w Twój etap, a postać już na
nim dostaje jeden **osobny, drogi** krok wyżej (np. „G16→G17 (G17: trudny)”). Dalsze poziomy
nie są proponowane — ich materiałów zwykle jeszcze nie zdobywasz.

### Składniki

- **Wartość** — Σ po drużynach z `known-meta.ts`: waga × (gotowość² + premia za kompletowanie).
  - Waga = poziom drużyny w mecie (S 1, A 0,75, B 0,5) × (1 + 0,15 na każdy dodatkowy tryb),
    ×2 dla drużyn z **fokusu**.
  - Gotowość = średnia z pozostałych członków: gotowy na Twój etap 1, posiadany w rozwoju
    0,75, brak 0. Drużyny, których prawie nie masz, praktycznie się nie liczą.
  - Kompletowanie: odblokowanie ostatniego brakującego członka +1,5 × gotowość, przedostatniego
    +0,5 × gotowość. Postać kluczowa dostaje +0,5.
- **Zysk** — udział mocy maks. (7★, poziom gracza), który ruch dodaje. Gear tylko do
  realnego celu zamyka proporcjonalną część luki.
- **Koszt** (`EFFORT`, 5 shardów = 1 jednostka): shardy do 7★ (0→7★ to ~810), gear według etapu,
  umiejętności według **materiałów w inwentarzu** (brak części materiałów → do +10 jednostek),
  brakujące poziomy postaci 0,5, nowa postać — budowa do Twojego etapu. Bazowo 1.

Każda posiadana postać ma do dwóch ruchów: **Ulepszenia** (poziomy, gear do realnego celu,
umiejętności — zysk z mocy maks. przy obecnych gwiazdkach, `characterInstances` z `yellow`) i
**Shardy** (do 7★). Zablokowana ma **Odblokowanie** — opis rozdziela shardy na odblokowanie
(wtedy drużyna jest już kompletna) i resztę do 7★.

**Kiedy przestać**: postać 7★ z maks. poziomem i umiejętnościami, z gearem na krok ponad Twój
etap (albo optymalna/wymaksowana), jest „gotowa na Twój etap” i wypada z rankingu — dalsze
poziomy gearu są poza zasięgiem. Dopóki moc maks. się wczytuje, zysk jest szacowany.

### Fokus (`team-plans.ts`)

Typowy błąd to rozkładanie rzadkich zasobów na wiele drużyn. Fokus to maks. 3 drużyny
najbliższe zbudowania: waga (poziom × tryby) × postęp² (średni udział mocy członków), bez
drużyn już gotowych, z literówkami w nazwach albo zbudowanych < 35%. Ich członkowie liczą się
w rankingu podwójnie. Na Farmieniu każda drużyna fokusu pokazuje członków z ich najlepszym
ruchem i miejscem w rankingu, a „Farmuj drużynę” zapisuje cele dla całej drużyny. Pulpit pokazuje
fokus i Twój etap gearu.

**Drużyny do skompletowania** (Farmienie) — drużyny z listy, którym brakuje 1–2 postaci:
shardy na odblokowanie każdej brakującej (z inwentarzem), „Możesz skompletować teraz” i
„Farmuj brakujące”. Kolejność: gotowe teraz → mniej brakujących → mniej shardów → mocniejsza.

Ranking jest na Farmieniu („Farmuj” zapisuje cel: same umiejętności dla ulepszeń, 7★ dla
shardów/odblokowania). Cele w grupach są sortowane według rankingu.

## Kluczowe postacie

`core/data/key-characters.ts` — postacie, które poradniki dokładają do wielu składów
(Professor Xavier, Blue Marvel, Silver Surfer (Breaker), Magik (Breaker), Annihilus, Quasar,
Knull, Mephisto, Odin, The Destroyer, Toxin, Captain Britain, Sentry), z krótkim
uzasadnieniem i źródłem.
Zakładka **Kluczowe** pokazuje dla każdej: status rozwoju, drużyny i tryby, miejsce w rankingu
opłacalności i najlepszy ruch. Optymalne i wymaksowane trafiają do „Gotowe”.

## Co farmić dziś

Karta na Pulpicie (`today.ts`), maks. 6 pozycji, jedna na postać, w kolejności:

1. **Awansuj teraz** — masz już shardy na kolejną gwiazdkę albo odblokowanie (cele i postacie
   z rankingu; koszt złota nie jest sprawdzany),
2. **Cel gotowy** — w inwentarzu jest wszystko na cały cel,
3. **Ranking opłacalności** — najlepszy ruch każdej postaci (Ulepsz / Shardy / Odblokuj).

Karta celu w Farmieniu pokazuje też postęp do następnej gwiazdki („Do 6★: 88 / 100”).
