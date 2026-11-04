# Baza wiedzy MSF Assistant

Jedno miejsce na to, co już ustalono — o grze Marvel Strike Force, o MSF API, o środowisku
pracy i o samej aplikacji — żeby nie szukać tego od nowa w sieci. **Stan: 4 listopada 2026.**

## Jak z niej korzystać

1. **Najpierw ta baza**, potem szczegóły w [`reports/`](../reports) (raporty z badań, z linkami
   do źródeł) i w danych aplikacji (`src/app/core/data/*.ts`), dopiero na końcu wyszukiwarka.
2. Wyszukuj tylko to, czego tu nie ma albo co jest oznaczone jako niepewne lub przeterminowane
   (sekcja [Otwarte pytania](#otwarte-pytania)).
3. **Po każdym badaniu dopisz wynik tutaj** (z datą, źródłem i oznaczeniem pewności) i popraw
   daty „Stan na”. Fakty nieaktualne przenoś do historii zamiast kasować.

Oznaczenia pewności (jak w raportach): **OFF** — fragment oficjalnej strony gry, **3P** — strona
fanowska, **SZAC.** — wniosek lub arytmetyka, nie tekst źródła.

## Środowisko pracy (co działa, a co nie)

- **Strony są niedostępne (błąd DNS)**: `marvelstrikeforce.com`, `www.marvel.church`,
  `msf.gg`, `developer.marvelstrikeforce.com`, `devtrackers.gg`. Reddit jest zablokowany dla
  wyszukiwarki. GitHub API cudzych repozytoriów — niedostępne. **Zostają tylko fragmenty wyników
  wyszukiwania** (WebSearch) — każdy fakt z nich oznaczaj jako „ze skrawka”.
- Serwer gry (`api.marvelstrikeforce.com`) też jest z sesji nieosiągalny — aplikacji nie da się
  przetestować na prawdziwym koncie; wszystko sprawdzane na danych demo (`core/data/mock/`).
- Rozsądny budżet: ~40 wyszukiwań na jedno badanie; większość pytań o meta i źródła ma już
  odpowiedź w raportach.
- Specyfikacja API jest lokalnie: [`docs/msf-api-spec.json`](msf-api-spec.json), ściąga:
  [`docs/msf-api.md`](msf-api.md).

## Gra: zasady i mechaniki

**Rozwój postaci**
- Żółte gwiazdki 1–7 (shardy), czerwone 1–7, potem 1–3 Diamenty (`activeRed` 8–10).
- Umiejętności maks. 8/8/8/6 (basic/special/ultimate/passive), ograniczone poziomem postaci;
  poziom postaci ≤ poziom gracza; maks. gear i umiejętności dla poziomu podaje
  `/game/v1/characterInstanceCaps`. Limit poziomu gry: 110.
- ISO-8: klasy Striker, Fortifier, Healer, Skirmisher, Raider; macierze zielona/niebieska/
  fioletowa (fioletowa od poziomu 85, OFF 2024), w bramkach eventów pojawia się też pomarańczowa.
- Shardy to najtrudniejszy zasób; gear powyżej „etapu” gracza (np. G17 przy rosterze G16) jest
  bardzo drogi.

**Ekonomia trybów (reformy 4.05 i 10.08.2026, OFF)**

| Tryb | Główna nagroda |
|---|---|
| Daily Objectives | Gold |
| Arena | tylko L4 Training Modules (bez Power Cores i Chapter Credits) |
| Blitz | Shop Credits (12 za każdy zduplikowany shard) |
| Rajdy | gear |
| Alliance War | ISO-8 i Power Cores |
| Crucible | T4 oraz Red Stars i Diamenty |

Większość nagród ma pochodzić z eventów i aktywności miesięcznych. W aplikacji odzwierciedla to
`MODE_VALUE` (rajd i Wojna 1, Crucible 0,9, Arena 0,6, Blitz/Wieża 0,5).

**Overpower nie istnieje od 4.05.2026** — zastąpiły go **Chapter Boosts** (Chapter Store za
Essence) dla postaci z cechami Anxiety, Panic, Fear, Terror (do 15–30%); liczą się do Roster Rank.
Każdy rozdział Age of Fear zeruje Chapter Boosts i Roster Rank (rozdział 3 „Terror” od 2.11.2026).

**Bramki trybów**
- Rajd (marvel.church, 3P): 11 poziomów; ISO D2 Green L1, D3 Green L3, D4 Green L5, **D5 Blue L3**,
  D6 Blue L5, D7 Purple L1, D8–D10 Purple L3. Od D3 cechy pięciu najnowszych drużyn rajdowych;
  Amazing Avengers obowiązkowi od D8.
- Dark Dimension: DD5 przy 5 postaciach GT16; DD7 GT19 (wymagania cech DD7 zawieszone na 90 dni od
  19.10.2026 — Mephisto's Summoning; czy GT19 też, nieznane); DD8 fioletowe ISO L3 na każdej
  postaci; DD9 GT21 w każdej misji.
- Trepidation (rajd): poniedziałek, wtorek, czwartek, piątek, niedziela; Trepidation Boss Raid:
  środa i sobota. Rajdy startują automatycznie w każdym sojuszu.
- Breaker Event: Sabretooth (od 2.11.2026): Beginner poz. 50–60, 5★ + 3 RS; Normal poz. 80–100,
  7 RS, Blue L5, GT18; Hard poz. 105, 2 Diamenty, Purple L4, GT19, wymagani Iron Raiders i A.I.
  Avengers; Omega poz. 110, 4 Diamenty, Orange L1, GT21.

**Wojna**
- Wersja 10.6 (od 21.10.2026): War Tokens za każdy ukończony atak (także przegrany), Defense
  Tokens za obrony sojuszu, które przetrwały.
- Role drużyn (badania 14.10 + oficjalne wpisy): **obrona** — Timeless Eternals, Hellfire Club;
  **atak** — West Coast Avengers, Omen, Secret Warriors, Nightreavers, Menace, Savage Land;
  reszta bez ustalonej roli. Dread (Crucible) tylko atak; Scorpion (Breaker) tylko atak.
- Ustawienie z poradnika: West Coast Avengers — Tigra (Protector) w rogu, War Machine obok niej.
- Tymczasowa reguła od 8.11.2026 do końca rozdziału: gdy Sabretooth (Breaker) ma 3 sojuszników
  Menace, wrogi Blue Marvel po Ultimate i Xavier po Special dostają 2 Exhausted, Menace ma Revive
  Once; Xavier nie może używać Mind Control.

**Źródła postaci (wzorce)**
- Premiera: tylko płatne (oferta łańcuchowa, Mega Orb w sklepie internetowym, orb za **625 Power
  Cores z szansą na do 400 shardów**). Po ok. 3,5–4 miesiącach (SZAC., dwa przypadki) postać
  trafia do orbów Basic/Premium/Mega, featured slotu albo na Hard Nexus X-9.
- Od 27.10.2025: jeden **Character Store z zakładkami według Age** (Age of Xavier, Annihilus,
  Fear); postać jest w zakładce swojej *obecnej* drużyny. Cen w Shop Credits nie znaleziono.
- Hard Nexus X-9 (stan 14.10.2026): 1-9 Angel, 2-9 Malekith, 3-9 Executioner, 4-9 Scorpion,
  5-9 Nova (Sam Alexander), 6-9 Riot. Featured slot: … Morph → Toxin (10–16.10).
- Typy eventów: Breaker Event (2 tyg., 10 misji, 4 poziomy, liczy się najlepszy run; Breaker
  wraca ok. 3 razy w rozdziale), First Breaker (stały), Escape From Kyln (4 tyg., 20 cel),
  Battleworld (boss co ok. 2 tyg. przez 3–4 mies.), Chapter Battle Pass (4 passy; darmowo 45
  shardów, Premium +160), Dark Dimension (stałe), Sagi, sezonowe (The Hunger co roku w
  październiku). Od Sabretootha wieże i Breakery skupiają nagrody na postaciach, o które się walczy.
- Od 30.10.2026 **Daily Web Free Claim** (losowy orb, do 300 shardów albo Gold / L4 Training
  Modules) zastąpił darmowe odbiory Mr. Negative i Scarlet Witch (Zombie).

**Czas** — gra podaje czas pacyficzny. Październik: 14:00 PDT = 23:00 w Polsce (CEST). Od
listopada podawane 13:00 PST = **22:00 w Polsce (CET)** — ta sama chwila 21:00 UTC.

## Kalendarz (listopad 2026)

| Data (PL) | Co | Pewność |
|---|---|---|
| do 2.11 | koniec King of the Night (Dracula → do 2027) i Halloween Leaderboard | OFF; koniec KotN SZAC. |
| 2.11, 22:00 | rozdział 3 Age of Fear „Terror” (Dreadmarks, reset Boosts i Roster Rank); Wasp (Janet) pass #4 — ostatni; Breaker Event: Sabretooth | OFF |
| 3.11, 22:00 | Echoes of Dystopia — Maestro (do 7 Yellow + 7 Red Stars) | OFF |
| 2–6.11 | wpis o nowym sezonie Alliance War (reguły, War Tech Mods) | OFF (zapowiedź) |
| ok. 6.11 | koniec Kyln: Code Blazes (Human Torch (Jim)) | SZAC. |
| 6.11, 22:00 | Ka-Zar (orb 625 PC, do 400 shardów); kampania Savage Land (X-23 GT0 → GT10) — wstęp do Tower Cyclopsa (Mighty, bez daty) | OFF |
| 8.11 | tymczasowa reguła Wojny dla Menace | OFF |
| 11.11, 22:00 | pierwsza szansa na odblokowanie Sabretooth (Breaker) | OFF |
| ok. 16.11 | koniec passa Wasp (Janet) #4 i Breaker Event: Sabretooth | SZAC. |
| ok. 17.01.2027 | koniec zawieszenia wymagań cech w DD7 | SZAC. |

Bez nowego rajdu (nadal Trepidation) i bez Crucible S26 (ostatni S25 „Artificial Dread”, ok. 7
tygodni → koniec ok. początku grudnia, SZAC.).

## Drużyny i postacie

- **Źródło prawdy w kodzie**: [`known-meta.ts`](../src/app/core/data/known-meta.ts) (drużyny per
  tryb, tier S/A/B, rola w Wojnie `war`, rada ustawienia `lineup`, źródło),
  [`character-sources.ts`](../src/app/core/data/character-sources.ts) (146 postaci: status
  źródła, skąd shardy, okna `until`/`afterUntil`), [`key-characters.ts`](../src/app/core/data/key-characters.ts).
  Pełne uzasadnienia: raporty z 14.10, 19.10 i 1.11.
- Nowe drużyny Wojny (atak): **Menace** — Sabretooth (Breaker) (pierwszy z Corruption,
  „plug-and-play”), przerobieni Blob, Toad, Silver Samurai, Stryfe; **Savage Land** — Ka-Zar,
  Sauron, Cyclops (Mighty) + ulepszeni Rogue i X-23 (skład odczytany z zapowiedzi, SZAC.).
  **Nightreavers** — Dracula, Morbius, Oath (3-osobowa).
- Hawkeye (Robot): cechy Global, Tech, Blaster, A.I. Avenger, Fear; źródła shardów brak.
- Rozdział „Terror” premiuje cechę Terror — **listy postaci z tą cechą nie opublikowano** (2.11).

## Otwarte pytania

Czego nie udało się ustalić (nie szukaj w ciemno — sprawdź datę, może już wiadomo):
lista postaci z cechą Terror; źródła shardów Saurona, Cyclopsa (Mighty), Hawkeye (Robot) i
przerobionych weteranów Menace/Savage Land; data Tower Cyclopsa (Mighty); końce The Hunger,
Candy Store i A.I. Takeover (w danych są szacunki); reguły nowego sezonu Wojny; czy Overpower/
Boosts działają w PvE; ceny w Shop Credits; czy zakres `m3p.f.ar.ros` jest dostępny; ile drużyn
na obronę w Wojnie wystawia gracz (zależy od sojuszu); czy pozycja w składzie ma znaczenie poza
umiejętnościami „adjacent”.

## Narzędzia graczy (konkurencja, stan 2026)

MarvelStrikeForce.com (oficjalne; dawne MSF.gg od 7.02.2023: roster, wymagania Legendary, mapy
rajdów i DD), MSFWAR (kontry War/Crucible/Arena, Crucible Planner, Game Plan bez powtarzania
postaci), MSF Base (od 16.06.2026: wyszukiwarka umiejętności, planery 6 wież, ISO-8), MSF Roster
(planowanie sojuszu), MSF Companion (freemium, Premium od 1,99 USD/mies.), MSF RosterBot (Discord,
CSV/PNG rosterów sojuszu), marvel.church (poradniki). Trend 2026: planery liczone na rosterze z
zasadą „każda postać raz”. Luki: historia TCP, wartość orbów, kalkulator gearu z ekwipunkiem.
Szczegóły: raport „Ulepszenia aplikacji MSF listopad”.

## MSF API

Ściąga: [`docs/msf-api.md`](msf-api.md) (dostęp, zakresy, limity, wszystkie trasy). Najważniejsze:
80 operacji, aplikacja używa ~18; brak tras sklepu, ofert, stanu rajdu/wojny gracza i pola „gdzie
dropi”; składy można tylko czytać; `charAdoption=full` daje wybory graczy (ISO-8, T4).

## Aplikacja

**Stos i konwencje**: Angular 21 (standalone, signals, OnPush, lazy routes), Vitest przez
`npx ng test --watch=false`, Prettier (printWidth 100, pojedyncze cudzysłowy) — `npx prettier
--write src/app`. **UI po polsku, kod i komentarze po angielsku.** Budżet stylów komponentu 4 kB
(większe sekcje wydzielaj do komponentów). `.npmrc`: `legacy-peer-deps=true`.
Uruchomienie: `npx ng serve --port 4200`; build: `npx ng build`. Sprawdzanie w przeglądarce:
Playwright z `/opt/node22/lib/node_modules/playwright/index.mjs` (Chromium preinstalowany),
wejście w demo przyciskiem „Wypróbuj na danych testowych” na `/login`.

**Menu** (5): Pulpit (Dziś + Nowości), Roster, Eventy, Składy (Asystent · Drużyny z mety),
Rozwój (Farmienie · Kluczowe postacie · Analiza). Stare `/teams`, `/key-characters`, `/analysis`
przekierowują.

**Mapa kodu** (`src/app/core/state`):

| Plik | Co robi |
|---|---|
| `advisor.ts` / `advisor.store.ts` | ranking „co się opłaca farmić”: wartość (drużyny, fokus, kluczowe) × zysk mocy ÷ wysiłek; `farmGoal` dla przycisków „Farmuj” |
| `progression.ts` | etap gearu gracza (frontier = najwyższy tier, który ma ≥ 20% z 60 najsilniejszych) |
| `team-plans.ts` | drużyny fokusowe (maks. 3), `TIER_WEIGHTS` S 1 / A 0,75 / B 0,5, `MODE_VALUE` |
| `sources.ts` / `auto-sources.ts` | status źródła shardów: badania (`character-sources.ts`) poprawione danymi gry (węzły, kampanie eventowe, orby) |
| `event-rewards.ts` | shardy w nagrodach progów eventów (`ShardOffer`) |
| `goals.ts` / `farming-calc.ts` / `farming.store.ts` | cele farmienia (gwiazdki, umiejętności, gear, poziom), łączenie celów, materiały |
| `synergy.ts` | synergia z opisów umiejętności (cechy i imiona; rzadkość cechy; bez wzmianek o wrogach) |
| `squads.ts` / `squad-assistant.ts` / `squads.store.ts` | opcje składów, asystent (gotowe / do dofarmienia, Wojna obrona/atak, ustawienie) |
| `capabilities.ts` / `insights.ts` | mechaniki z opisów; potencjał, ISO-8 i T4 względem graczy |
| `news.ts` / `news.store.ts` | Nowości: migawka gry vs ostatnia wizyta |
| `teams-calc.ts` | dopasowanie drużyn do rosteru; drużyna z cechy, gdy nazw brak w danych |
| `level-caps.ts`, `potential.store.ts` | limity poziomu; moc maks. (4 zapytania naraz) |

**Ważne stałe**: `EFFORT` (bazowo 1; 5 shardów = 1 jednostka; poziomy 0,5; umiejętność 0,05),
`SOURCE_FACTOR` (event 0,7, stałe 1, orby i wygasłe okno 1,5, płatne 3, endgame 4, niedostępne 6
— event tanieje tylko shardy, które gwarantuje), bonusy drużyn (kompletuje 1,5, prawie 0,5,
kluczowa 0,5), asystent: ocena = moc × siła w mecie (S 1 / A 0,85 / B 0,72, popularny 0,7–0,95,
bez poparcia 0,65) × (0,75 + 0,25 × synergia); gotowa postać = odblokowana, 7★ (lub 6★ w
ustawieniach), gear ≥ etap − 1. Cache danych gry: do zmiany hasha, inaczej 12 h.

**Reguły danych ręcznych** (pilnuje test w `sources.spec.ts`): każdy wpis `status: 'event'` musi
mieć `until` (choćby szacunkowe); po terminie bez `afterUntil` status = „okno minęło — sprawdź w
grze”. Zmieniaj dane tylko, gdy fakty się zmieniły; podnoś `CHARACTER_SOURCES_AS_OF` i
`KNOWN_META_AS_OF`.

**Znane luki** (z przeglądu 1.11): kalkulator nie liczy materiałów gearu; brak testów na
prawdziwych odpowiedziach API (7 założeń z README); wykrywanie mechanik to dopasowanie słów
(„Heal Block” = leczenie); synergia ~1,1 s przy 320 postaciach; karta gracza i eventy gracza ładują się
razem (błąd eventów gubi kartę).

## Procedura aktualizacji (co tydzień, po wpisie na blogu gry)

1. Przeczytaj tę bazę (kalendarz, otwarte pytania).
2. Wyszukaj nowe wpisy: `marvelstrikeforce.com/en/updates/blog-update-<m>-<d>-26` (tylko skrawki).
3. Popraw `character-sources.ts` (status, `until`, `afterUntil`, źródło), `known-meta.ts` (nowe
   drużyny, tier, `war`, `lineup`), `key-characters.ts`; podnieś daty `AS_OF`.
4. Dopisz fakty i daty tutaj (kalendarz, mechaniki, otwarte pytania).
5. `npx ng test --watch=false`, `npx ng build`, commit.
