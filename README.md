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
    data/character-sources.ts  skąd shardy każdej postaci i czy źródło jest otwarte (z raportu)
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
      event-rewards.ts                      shardy z nagród trwających/nadchodzących eventów (API)
      sources.ts                            dostępność źródeł → koszt shardów, blokada drużyn
      game-rules.ts           limity umiejętności i gwiazdek
  layout/shell/    sidebar + topbar, responsywne menu
  features/        widoki ładowane leniwie (lazy routes)
    dashboard/         pulpit: „Co farmić dziś”, kafelki statystyk, top postacie, aktywne eventy
    roster/            siatka postaci z filtrami (cecha, ★, gear, ulubione) i sortowaniem
    character-detail/  szczegóły postaci: gwiazdki, gear sloty, umiejętności, ISO-8
    events/            trwające i nadchodzące eventy z postępem
    teams/             drużyny per tryb gry dopasowane do rosteru (gotowe / brakuje 1–2);
                       źródło: analiza MSF API, a gdy ta nie działa — lista z poradników
    squads/            asystent składów per tryb: następny skład do zapisania (z ustawieniem),
                       kolejne propozycje tylko z wolnych postaci, Twoje składy z podpowiedziami
                       zamian, pozostałe wolne postacie z partnerami (synergia z pasywek)
    analysis/          analiza 60 najsilniejszych postaci: potencjał mocy, ISO-8 i kolejność
                       umiejętności vs wybory graczy, mechaniki z opisów umiejętności
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
- `/player/v1/squads` (zakres `m3p.f.pr.ros`) zwraca `{tabs: {arena: [[id…]…], …}, maxSquads}`;
  API pozwala składy tylko **czytać** — zapisać je trzeba w grze.
- `/game/v1/characters?abilityKits=max` zwraca opis każdej umiejętności na najwyższym poziomie
  (`abilityKit.<umiejętność>.levels.<n>.description`); strony po 40 postaci, by zmieścić się w
  limicie 472 kB.
- `charAdoption=full` dodaje `iso8ClassAdoption` i `abilityAdoption` („procenty” — wartości
  > 1 czytam jako 0–100; klasy ISO-8 normalizuję do sumy 1, T4 nie).

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
idą po maks. 4 naraz (`PotentialStore`). „Farmuj” dodaje do celu postaci wszystkie jej
polecane akcje (albo maks. rozwój, gdy postaci nie ma w rankingu — dopiero gdy moc maks. się
wczyta). Farmienie dzieli cele na „Do odblokowania” i „Do ulepszenia”. Cel z gearem lub
poziomem pokazuje te kroki, ale kalkulator materiałów gearu jeszcze ich nie liczy, więc taki
cel nigdy nie jest oznaczony jako „gotowy do ulepszenia”.

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

## Wykrywanie z danych gry (`auto-sources.ts`, `news.ts`)

Ręczne tabele uzupełniają tylko to, czego API nie mówi. Resztę aplikacja odczytuje sama:

- **Eventy całej gry** — `/game/v1/events` (zaplanowane i trwające dla wszystkich, nie tylko
  te, do których się kwalifikujesz). Strona Eventy pokazuje je z oznaczeniem „nie kwalifikujesz
  się (jeszcze)” i z shardami, które dają (progi nagród oraz węzły kampanii eventowych).
  Ranking wycenia shardy z nich po stawce eventu.
- **Gdzie dropią shardy** — przejście przez kampanie (`/game/v1/episodics/campaign/…` z
  `nodeRewards=full`), kampanie eventowe, do których prowadzą eventy (`episodic.ids`), i orby
  spotkane w tych nagrodach (`/game/v1/orbRewards/{id}`; orb rozpoznaję po „orb” w id, błędny
  strzał kończy się NOT_FOUND). Cache do zmiany hasha `nodes`; za duży epizod (472) czytam po
  rozdziałach. Szczegóły postaci pokazują znalezione węzły i orby.
- **Status źródła = badania poprawione przez dane gry**: trwająca kampania eventowa z jej
  shardami → „event teraz” do końca eventu; powtarzalny węzeł kampanii → „stałe źródło”; orb →
  „losowe orby”. Dane gry zastępują „brak danych”, „okno minęło”, „niedostępna” i „do
  sprawdzenia”, a w pozostałych przypadkach wygrywają, gdy są tańsze. Progi nagród eventów nie
  zmieniają statusu (wycenia je osobno ranking). Zegar odświeża statusy co godzinę.
- **Nowości** (Pulpit) — migawka gry w przeglądarce: nowe postacie, zmienione opisy
  umiejętności (przeróbki; z drużynami, których ocena może być nieaktualna), nowe eventy i nowe
  cechy drużynowe (cecha 3–10 postaci, poza pochodzeniem, rolą i stroną). „Oznacz jako
  przeczytane” zapamiętuje stan; pierwsza wizyta tylko zapamiętuje.
- **Drużyny po cechach** — gdy lista drużyny w `known-meta.ts` zawiera postać, której nie ma w
  danych gry (np. przed premierą), skład bierze się z cechy nazwanej jak drużyna, jeśli gra ją
  ma („Savage Land” → SavageLand).

Ręcznie zostają: sklepy i płatne oferty (API ich nie zwraca), reguły Wojny i oceny drużyn.

## Składy (`squads.ts`, `synergy.ts`)

Strona „Składy” łączy trzy źródła: drużyny z poradników (`known-meta.ts`, tier S/A/B),
najczęstsze składy graczy (`teamOrder` z API) i **Twoje zapisane składy** (`/player/v1/squads`).

**Synergia z umiejętności.** Opisy umiejętności (pasywka waży najwięcej, ultimate/special
0,6, basic 0,4) są przeszukiwane pod kątem nazw cech i postaci. „Symbiote allies gain…” łączy
postać z każdym Symbiote, „when Toxin is an ally” — z Toxinem (najmocniejsze powiązanie).
Rzadkie cechy ważą więcej niż pospolite (rzadkość = ln(N/liczba)/ln(N); Hero, Villain itp.
poniżej 0,2 są pomijane). Wzmianki o przeciwnikach („against Mystic enemies”) i „non-…” się
nie liczą. Wspólna rzadka cecha daje mały bonus nawet bez wzmianki — gdy opisów nie ma, tylko
to zostaje. Synergia składu = średnia par przeskalowana do 0–100%.

**Asystent składów** (`squad-assistant.ts`). Dla każdego trybu proponuje **następny skład do
zapisania** i kolejne, wyłącznie z postaci, których nie ma jeszcze w żadnym Twoim składzie
tego trybu (z opcją „postać tylko w jednym składzie we wszystkich trybach”). Kolejność
propozycji: znane i popularne składy, które możesz wystawić (ocena = moc / najmocniejszy skład
× siła w mecie: tier S 1 / A 0,85 / B 0,72, popularny 0,7–0,95, bez poparcia 0,65 × (0,75 +
0,25 × synergia)), potem pełne składy zbudowane z synergii wokół najsilniejszych wolnych postaci
(z 60 najmocniejszych; z resztek mniejszych niż 5 nie składa). „Zapisałem w grze” od razu
zabiera postacie z propozycji (zapamiętane w przeglądarce, osobno dla konta i demo, do czasu
aż skład pojawi się w `/player/v1/squads` — „Wczytaj składy z gry” odświeża listę); „Inna
propozycja” pokazuje następną (pominięty skład z synergii oddaje swój pierwszy wybór).
**Gotowe i do dofarmienia.** „Gotowe — zapisz teraz” to składy, w których każda postać jest
odblokowana, ma 7★ i gear co najmniej o jeden poziom niższy od Twojego etapu (frontier);
składy z synergii budowane są tylko z takich postaci. „Do dofarmienia” to znane i popularne
składy z wolnych postaci, którym brakuje niewiele (najwyżej 2 nieodblokowane i 3 postacie do
pracy): przy każdej postaci co zrobić („odblokuj — masz 20/50 shardów”, „5★→7★, brakuje 460
shardów”, „G14→G16”), ułożone według siły w mecie × udziału gotowych; „Farmuj brakujące” dodaje
cele dla nich.
**Wojna: obrona i atak.** Osobne plany: najpierw obrona (ile drużyn — wybierasz, domyślnie 3),
potem atak z postaci, których nie ma na obronie. Drużyny z rolą w `known-meta.ts` (`war`) trafiają
tylko na swoją stronę: obrona — Timeless Eternals, Hellfire Club; atak — West Coast Avengers,
Omen, Secret Warriors, Nightreavers, Menace, Savage Land; reszta na obie. „Zapisałem” zapamiętuje
też stronę (gra jej nie podaje — składy z gry liczą się dla obu).
**Ustawienie**: jak u większości graczy, gdy skład jest w analizie API; potem rada z poradnika
(`lineup`, np. WCA: Tigra w rogu, War Machine obok); inaczej kolejność ma
znaczenie tylko dla umiejętności działających na sąsiadów („adjacent”) — taka postać idzie w
środek, obok swoich najlepszych partnerów; bez nich aplikacja mówi wprost, że kolejność jest
dowolna.

**Twoje składy** (z gry i oznaczone tu jako zapisane) dostają werdykt: skład z mety (zostaw), „prawie” znany/popularny skład
(≥ 3 wspólne postacie — co zamienić, z zablokowanymi oznaczonymi) albo własny — wtedy słabe
ogniwo (najmniej synergii z resztą) i postać z rosteru, która doda najwięcej. Zamiany nigdy nie
biorą postaci z innego Twojego składu tego trybu.

**Pozostałe wolne postacie** to silne postacie spoza Twoich składów trybu i spoza propozycji:
ich najlepsi wolni partnerzy według umiejętności i skład zbudowany wokół nich. Tryb demo
ma wymyślone opisy umiejętności w stylu gry — tylko do pokazania działania.

## Analiza postaci (`insights.ts`, `capabilities.ts`)

Strona „Analiza” patrzy na Twoje 60 najsilniejszych postaci (ISO-8 i umiejętności: 30).

- **Potencjał** — obecna moc vs moc maks. dla Twojego poziomu (`characterInstances`), z
  podziałem na to, co dadzą same ulepszenia (moc maks. przy obecnych gwiazdkach − obecna) i co
  tylko gwiazdki (reszta). Listy: najwyższy sufit, najwięcej bez shardów, najwięcej z 7★.
- **ISO-8** — klasa porównana z wyborem graczy (`iso8ClassAdoption`): podpowiedź, gdy klasę
  wybiera wyraźna większość (≥ 50%), a Twojej używa mniej niż połowa tylu graczy, albo gdy klasy
  nie ma. Do tego postacie z poziomem ISO-8 o ≥ 4 niższym niż Twoja mediana.
- **Kolejność umiejętności** — umiejętności ułożone według tego, ilu graczy ma w nich T4
  (`abilityAdoption`); następna do podniesienia i flaga, gdy mniej popularna umiejętność jest o
  ≥ 20% dalej rozwinięta.
- **Mechaniki** — słowa z opisów umiejętności (Taunt, Barrier, Deathproof, leczenie,
  odradzanie, Cleanse, Stun, Ability Block, Speed Bar, Flip, Assist, Counter, Stealth, Defense
  Down, Bleed, atak obszarowy): które są u Ciebie rzadkie. Karty na stronie „Składy” pokazują
  mechaniki składu i luki („brak: leczenie / odradzanie”), a szczegóły postaci — jej mechaniki,
  klasy ISO-8 u graczy i kolejność T4. To profil z tekstu, nie gwarancja efektu.

Dane o wyborach graczy i opisy w trybie demo są wymyślone.

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

**Limit poziomu gracza** (`level-caps.ts`): postać nie przekroczy Twojego poziomu, a poziom
postaci ogranicza gear i umiejętności. `/game/v1/characterInstanceCaps` (cache'owane) podaje
maks. gear i poziomy umiejętności dla każdego poziomu postaci — cele doradcy, opcje
umiejętności w formularzu i chipy gearu w fokusie nigdy nie wychodzą ponad to, na co pozwala
Twój poziom (widoczny w panelu fokusu). Poziom bierzemy z karty gracza; najwyższy poziom
postaci w rosterze jest dolną granicą i zastępstwem, gdy karta się nie wczyta. Bez poziomu
moce maks. nie są pobierane (API przyjęłoby maks. poziom gry). Bez danych o limitach gear
kończy się na najwyższym poziomie w Twoim rosterze, a umiejętności nie są proponowane.

### Składniki

- **Wartość** — Σ po drużynach z `known-meta.ts`: waga × (gotowość² + premia za kompletowanie).
  - Waga = poziom drużyny w mecie (S 1, A 0,75, B 0,5) × (wartość najlepszego trybu + 0,15
    na każdy dodatkowy tryb), ×2 dla drużyn z **fokusu**.
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

Ranking jest na Farmieniu. „Farmuj” zapisuje dokładnie krok akcji (`goals.ts`): dla ulepszeń
poziom, gear i umiejętności przy obecnych gwiazdkach, dla shardów 7★, dla odblokowania
gwiazdki odblokowania — i dołącza go do istniejącego celu (wyższy z celów w każdej części).
Cel, który niczego nie dodaje, nie jest zapisywany. Cele w grupach są sortowane według rankingu.

## Źródła postaci i eventy

Research z 14.10.2026 — **[raport](reports/Opłacalne%20drużyny%20MSF%20i%20źródła%20postaci.md)**:
które drużyny się opłacają, skąd brać ich postacie, co trwa teraz i co zrobić w połowie gry.
Aktualizacja z 19.10.2026 — **[raport](reports/Opłacalne%20drużyny%20MSF%20aktualizacja%20październik.md)**:
weryfikacja tez (Overpower zastąpiony przez Chapter Boosts od 4.05.2026), fala halloweenowa
(King of the Night / Nightreavers, Mephisto's Summoning) i polecenia na 19.10–2.11.
Aktualizacja z 2.11.2026 — **[raport](reports/Ulepszenia%20aplikacji%20MSF%20listopad.md)**:
Breaker Event: Sabretooth (od 2.11, 22:00), ostatni pass Wasp (Janet), Echoes of Dystopia
(Maestro), Ka-Zar i drużyny Wojny Menace i Savage Land, szacowane końce fal halloweenowej i
A.I. Takeover; listopadowe starty są o 22:00 czasu polskiego.
Załączniki raportów są w aplikacji jako `core/data/character-sources.ts` (146 postaci;
ze skrawków wyników wyszukiwania — potwierdzaj w grze przyciskiem „Find”, odświeżaj po
blogach). Okno czasowe może mieć `until` (szacowany koniec) i `afterUntil` — po tej dacie
(w lokalnej strefie gracza, sprawdzane co godzinę) status sam przechodzi np. z „event teraz” na
„niedostępna teraz”, a bez `afterUntil` na „okno minęło — sprawdź w grze” (×1,5). Każdy
wpis „event teraz” musi mieć `until` (pilnuje tego test), nawet szacunkowe.

- **Stan źródła**: stałe (sklep postaci według Age, węzeł kampanii, DD, stały event), tylko
  losowe orby, event teraz, tylko płatne, za bramką endgame, niedostępne, brak danych, okno minęło.
- **Koszt shardów** w rankingu mnożony według stanu (`SOURCE_FACTOR`): event 0,7, stałe 1,
  orby i wygasłe okna 1,5, płatne 3, endgame 4, niedostępne 6 — nie farmisz czegoś, czego teraz
  nie ma. Trwający event z API tanieje tylko shardy, które gwarantuje (suma trwających eventów);
  reszta zostaje po stawce źródła.
- **Eventy z API**: `/player/v1/events?objRewards=full` → shardy w nagrodach progów
  (`event-rewards.ts`). Trwający event z shardami postaci obniża koszt shardów, które daje, a
  w fokusie liczy się jako otwarte źródło; ruch dostaje dopisek „Event „X”: +N shardów (do d.m)”.
- **Fokus pomija drużyny, których nie skompletujesz** — brakujący członek jest płatny, za
  bramką albo niedostępny, chyba że masz już shardy na odblokowanie lub trwa event.
- **Tryby ważą według nagród** po reformie ekonomii 2026 (`MODE_VALUE`): rajd (gear) i Wojna
  (ISO-8, Power Cores) 1, Crucible (T4, Red Stars) 0,9, Arena (tylko Training Modules) 0,6,
  Blitz (Shop Credits) 0,5.
- Źródło widać w rankingu (ruchy Shardy/Odblokowanie), w „Drużynach do skompletowania”,
  w fokusie i na karcie „Skąd shardy” w szczegółach postaci.

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
