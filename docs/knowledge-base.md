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
fanowska, **YT** — tylko tytuł lub opis filmu, **SZAC.** — wniosek lub arytmetyka, nie tekst źródła.

## Środowisko pracy (co działa, a co nie)

- **Strony są niedostępne (błąd DNS)**: `marvelstrikeforce.com`, `www.marvel.church`,
  `msf.gg`, `developer.marvelstrikeforce.com`, `devtrackers.gg`, `theriagames.com`, `frvr.com`,
  `msfwar.com`, `msfbase.com`, `youtubesummary.com`. Daty stron marvel.church z wyszukiwarki to
  daty utworzenia, nie aktualizacji (strony „Season 25” mają rzekomo 843+ dni), a wpisy kontr nie
  mają dat — uważaj na wpisy sprzed przeróbek. Reddit jest zablokowany dla
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
- Breaker Event: Sabretooth (od 2.11.2026): Beginner poz. 50–60 (3P mówi „od 65”), 5★ + 3 RS;
  Normal poz. 80–100, 7 RS, Blue L5, GT18; Hard poz. 105, 2 Diamenty, Purple L4 (OFF; 3P: L3),
  GT19, wymagani Iron Raiders i A.I. Avengers; Omega poz. 110, 4 Diamenty, Orange L1, GT21. Boss
  końcowy Wolverine, w misjach reguły Wojny. Misje (3P, Hard/Omega): M1 bez wymagań, M2 Iron
  Raiders, M3/M7 Non-Mythic Mutant lub Mighty albo Breaker, M4/M8 Global Skill lub Global Tech,
  M5/M9 Global Mystic lub City Mystic, M6 A.I. Avengers, M10 Iron Raiders lub A.I. Avengers.
  „Łatwe 5★ + 5 RS” z M1 to Omega (endgame). G16 realnie: Beginner, shardy w kolejnych runach.
- Trepidation Boss Raid (OFF): węzeł 1 Insidious Six, 2 Immortal Weapons, 3 Champions, 4 Amazing
  Avengers, 5 Iron Raiders, 6 wspólny boss Amazing Avengers + Iron Raiders; 5 Sim Attempts. Zwykły
  Trepidation: 10 Sim Attempts, Iron Raiders na dwóch ostatnich węzłach, D10 = 10 węzłów na linii
  (YT). Tabeli cech per węzeł nie znaleziono. Mapa `maps/raid_incursion` to stary Incursion.
- Echoes of Dystopia (Maestro, od 3.11; pierwszy run od 20.10): cecha „Maestro Challengers”,
  Standard 1–5 GT16 → GT20, 5 poziomów Insanity GT20. Kyln: Code Blazes: tylko Tower Challengers 3
  (3 czy 5 postaci w celi — sprzeczne). The Hunger: 8 progów z 2, 4 lub 5 postaciami Undying;
  shardy Undying i Nightstalkers. DD5 ≈ 20 postaci na GT16, DD8 ≈ 25 na Purple L3.

**Wojna**
- Wersja 10.6 (od 21.10.2026): War Tokens za każdy ukończony atak (także przegrany), Defense
  Tokens za obrony sojuszu, które przetrwały.
- Role drużyn (badania 14.10 + oficjalne wpisy): **obrona** — Timeless Eternals, Hellfire Club;
  **atak** — West Coast Avengers, Omen, Secret Warriors, Nightreavers, Menace, Savage Land;
  reszta bez ustalonej roli. Dread (Crucible) tylko atak; Scorpion (Breaker) tylko atak.
- Ustawienie z poradnika: West Coast Avengers — Tigra (Protector) w rogu, War Machine obok niej.
- War Tech: moduły (dodatkowe sloty składów, Reinforcements, Combat Mods) zdobywane w każdym
  rozdziale; Combat Mods zerują się z końcem rozdziału (3P) — więc najpewniej 2.11 (SZAC.). Wpis
  o nowym sezonie Wojny zapowiedziany na 2–6.11, 4.11 jeszcze niezaindeksowany; stream twórców
  4.11 o 20:00. 27.10 zmieniono też Assist Chance Silver Samuraia w Wojnie (liczb brak).
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
| 3.11, 22:00 | Echoes of Dystopia — Maestro (do 7 Yellow + 7 Red Stars), drugi run (pierwszy od 20.10) | OFF |
| 4.11, 20:00 | stream twórców (Breaker, Wojna) | OFF |
| 2–6.11 | wpis o nowym sezonie Alliance War (reguły, War Tech Mods) | OFF (zapowiedź) |
| ok. 6.11 | koniec Kyln: Code Blazes (Human Torch (Jim)) | SZAC. |
| 6.11, 22:00 | Ka-Zar (orb 625 PC, do 400 shardów); kampania Savage Land (X-23 GT0 → GT10) — wstęp do Tower Cyclopsa (Mighty, bez daty) | OFF |
| 8.11 | tymczasowa reguła Wojny dla Menace; nowy sezon Wojny najpewniej od pierwszej Wojny po 8.11 | OFF; sezon SZAC. |
| 11.11, 22:00 | pierwsza szansa na odblokowanie Sabretooth (Breaker) | OFF |
| ok. 16.11 | koniec passa Wasp (Janet) #4 i Breaker Event: Sabretooth | SZAC. |
| ok. 17.01.2027 | koniec zawieszenia wymagań cech w DD7 | SZAC. |

Bez nowego rajdu (nadal Trepidation) i bez Crucible S26 (ostatni S25 „Artificial Dread”, ok. 7
tygodni → koniec ok. początku grudnia, SZAC.).

## Składy (stan 4.11.2026)

Pełne tabele, źródła i uzasadnienia: raport [„Składy i postacie MSF listopad”](../reports/Składy%20i%20postacie%20MSF%20listopad.md).
Meta zmieniła się tylko w ataku w Wojnie; Arena, Crucible S25, Trepidation i DD jak w październiku.

**Arena** (brak źródeł z X–XI 2026; najnowsze z lipca). Zasada: drużyna potrzebuje tylko **2
sojuszników ze swojej drużyny** do umiejętności (3P) → hybrydy 3+2.
- Symbiote Six: Quicksilver (Symbiote), Riot, Toxin + Professor Xavier, Annihilus (Knull, gdy brak
  Annihilusa); plug-and-play: Maestro, Blue Marvel. 3–5 Diamentów na trójce symbiontów (3P).
- Fantastic Four (MCU): Franklin Richards, Invisible Woman (MCU), Mister Fantastic (MCU) +
  Professor Xavier / Nightcrawler / Odin / Quasar / Emma Frost / Mephisto. Franklin rusza pierwszy,
  Invisible Woman (MCU) druga; ISO-8: Skirmisher na Franklinie, Striker na Invisible Woman (3P).
- Annihilators: Gorr, Ultimus, Silver Surfer, Thanos (Endgame), Gladiator; Gorr w rogu, Silver
  Surfer w środku (marvel.church); Theria od lewej: Gladiator – Ultimus – Silver Surfer – Thanos
  (Endgame) – Gorr (3P).

**Wojna — obrona**: Timeless Eternals to wciąż najnowszy mur; Gilgamesh kontruje Offense Up,
Speed Up i Deathproof i blokuje wrogie Barrier (OFF/3P).

**Wojna — atak** (nowe):
- **Menace**: Sabretooth (Breaker) (Controller) + Blob, Toad, Silver Samurai, Stryfe (Protectorzy,
  Toad Controller; wszyscy czterej mogą Taunt). Ultimate Sabretootha nakłada **Corruption** na
  Defense Up całej drużyny wroga i czyści Barrier u wrogów z Defense Up; na War Offense daje
  Menace Deflect i Defense Up, Deathproof poniżej 50% Health; kontra na Odina, Mephisto, Retcon
  (OFF). Pułapki: Toad potrzebuje Bloba; z Mephisto w drużynie Sabretooth nie nakłada Exhausted
  (3P). Pozycji źródła nie podają.
- **Savage Land**: Ka-Zar (Support), Sauron (Controller), Cyclops (Mighty), X-23 (Brawlerzy),
  Rogue (Protector) — skład potwierdzony 3P + datamine; Rogue i X-23 wybrani w głosowaniu graczy.
  Rogue i X-23 obok siebie, Sauron rusza pierwszy; wymagania 3P: ≥3 Diamenty na X-23 i Rogue,
  Raider na Sauronie, maks. Basic Cyclopsa (Mighty). Celuje w Symbiote Six z Knullem; z 3
  sojusznikami w Wojnie −100% szansy wroga na Revive; Ka-Zar z Defense Up — sojusznicy nie dostają
  Bleed (OFF). Sprzeczność: marvel.church — premie także w obronie; OFF — „rozrywa obrony”.
- **Nightreavers**: Dracula, Morbius, Oath; oficjalnie proponowane miejsca 4–5: Blade i Kestrel
  (Zombie); ≥3 Diamenty na Morbiusie i Oath. Celuje w Winter Guard, Brimstone, Shadow Conclave.
- Brimstone: Daimon Hellstrom zawsze pierwszy, otwiera Ultimate (3P). WCA (OFF): na Shadow
  Conclave, Retcon, Winter Guard; pass #3 Wasp (Janet) (16.10) podnosi jej obrażenia też na Brimstone.

**Kontry w Wojnie** (marvel.church, 3P, wpisy bez dat; punch-up: ▲ 5%, ▲▲ 10%, ▲▲▲ ≥20%,
⊜ równo, ▼ −10% — atak musi być silniejszy):
- Timeless Eternals → najpierw **Gilgamesh** (jedyne źródło Eternal Saga): Brimstone + Oath/Kang/
  Cable; Symbiote Six + Oath bez Riota (stun Gilgamesha Specialem Toxina); Storm (Mighty) + Quasar
  + Old Man Logan + Odin + Oath; Illuminati + Odin + Sentry (Ultimate Captain Britain na
  Gilgamesha). Nie działa przy aktywnych Barracks wroga.
- Symbiote Six → kolejność **Riot → Quicksilver (Symbiote) → Toxin**; Winter Guard + Xavier;
  Brimstone + Odin. Spowolnienie nie działa, manipulacja Speed Barem tak.
- Winter Guard → Xavier + Quasar + Blade + Oath + Agatha Harkness; Brimstone + Xavier ▲▲▲;
  Brimstone + Apocalypse ▲▲ (przetrwać okno do pierwszej tury Ursy Majora).
- Hellfire Club → Brimstone, Undying, Secret Warriors, Illuminati ▲▲▲; Secret Defenders ▲▲▲
  (stun Sebastiana Shawa Specialem Black Cat). Accursed → Undying, Brimstone, Secret Warriors ▲▲▲.
- Brimstone (obrona) → Winter Guard ▲▲. Shadow Conclave → drużyny z Daimonem Hellstromem lub
  Xavierem; Brimstone tu ▼▼, Winter Guard ▼▼▼.
- Absolute A-Force → lustro AAF, Gamma + Mephisto; Annihilators → Quasar + Ares + Mephisto +
  Phoenix Force; FF (MCU) → najpierw Franklin; Mephisto jako piąty → Odin lub Knull; Undying →
  Astral + Blue Marvel ▲▲▲.
- Brimstone to najczęściej wymieniany atak ▲▲▲ i najbardziej uniwersalny atak F2P (SZAC.).

**Crucible S25 — obrona** (marvel.church, 3P; reguły etapów OFF):

| Etap | Best | Optimal | Budget |
|---|---|---|---|
| 1 Standard | Symbiote Six + Professor Xavier | Symbiote Six | Immortal Weapon + Captain Britain |
| 2 Weak Point | Daring Warriors + Odin | Accursed + Odin | Amazing Avengers |
| 3 | Phoenix Force + Toxin + Mister Fantastic (MCU) / Whiplash | — | — |
| 4 Best Offense | Exalted X-Men + Annihilus / Quasar | Starjammers | Shadow Conclave / Winter Guard |
| 5 Repair Kit | New Mutants + Silver Surfer (Breaker) / Mephisto | — | — |
| 6 | **FF (MCU) + Sentry + Blue Marvel** (korekta 19.10) | FF (MCU) + Captain Britain + Nightcrawler | Winter Guard |

Atak: Dread (tylko atak; ▲▲▲ na Immortal Weapon + Void Knight, ▲▲ na New Mutants), A.I. Avengers
(atak i obrona); Exalted X-Men + Odin (bez Wolverine'a) ▲▲▲ na Symbiote Six; Brimstone ▲▲ na
Accursed + Mordo. Na A.I. Avengers z Repair (odporni na Defense Down i Stun) tylko opcje ▼▼▼.

**Rajd i eventy dla G16** (SZAC.): rajd D4–D6, DD5, Beginner u Sabretootha, Echoes Standard 1,
kampania Savage Land (z X-23), łatwiejsze Kyln. Najbardziej użyteczna drużyna PvE miesiąca: Iron
Raiders. Wąskie gardła bez źródła shardów: Whiplash, Blade (Mighty), Moon Girl, Jocasta, Hawkeye
(Robot), X-23.

## Drużyny i postacie

- **Źródło prawdy w kodzie**: [`known-meta.ts`](../src/app/core/data/known-meta.ts) (drużyny per
  tryb, tier S/A/B, rola w Wojnie `war`, rada ustawienia `lineup`, źródło),
  [`character-sources.ts`](../src/app/core/data/character-sources.ts) (152 postacie: status
  źródła, skąd shardy, okna `until`/`afterUntil`), [`key-characters.ts`](../src/app/core/data/key-characters.ts).
  Pełne uzasadnienia: raporty z 14.10, 19.10, 1.11 i 4.11. Dane wprowadzone 4.11: etap 6 Crucible,
  Winter Guard i Shadow Conclave, rady ustawienia (Savage Land, Menace, Brimstone, Annihilators,
  FF (MCU)), wpisy źródeł Bloba, Toada, Silver Samuraia, Stryfe'a, Rogue i X-23 (`unknown`).
- Nowe drużyny Wojny (atak): zob. [Składy](#składy-stan-4112026).
- **Sabretooth (Breaker)**: Villain, Global, Mystic, Controller, Menace; Speed 124 (OFF). Corruption
  znosi premię pozytywnego efektu i nie da się jej oczyścić, odwrócić ani skrócić. Pasywka na War
  Offense: Disrupted i Exhausted (−3 energii Special). Cechy Terror nie ma.
- **Ka-Zar**: Support; Defense Up na start; Special „Primal Fury” zamienia negatywne efekty
  sojuszników w pozytywne, daje Savage Land Safeguard i Defense Up, leczy 3 najbardziej rannych.
- **Dracula**: Villain, Global, Brawler, Mystic, Vampire, Epic, Nightreaver; Speed 127; kit wokół
  Bleed. **Morbius** kradnie Health krwawiącym celom; z Draculą krwawiący wrogowie −50% Damage i
  Resistance. **Oath** nakłada Bleed, a na War Offense Exposed i Trauma.
- **Maestro**: Villain, Global, Bio, Brawler, Gamma (+ Terror w jednym skrawku); pasywka „Trophy
  Tyrant” — odporność na większość negatywów powyżej 50% Health. Partner Symbiote Six (3P).
- Przeróbki Menace (27.10): Blob — off-protector z Deflect, Toad — do 75% Dodge, Silver Samurai —
  rośnie z Charged, Stryfe — główne źródło Barrier (bez zmian tylko jego Basic).
- AI Takeover Orbs: shardy Gilgamesha, Ulyssesa Klaue, Iron Mongera i Thena (OFF).
- Hawkeye (Robot): cechy Global, Tech, Blaster, A.I. Avenger, Fear; źródła shardów brak.
- Rozdział „Terror” premiuje cechę Terror — **listy postaci z tą cechą nie opublikowano** (stan
  4.11; jedyny trop: Maestro). Najlepsza droga: pole `traits` z prawdziwego API.
- Plug-and-play według oficjalnych wpisów: trzy Breakery — Sabretooth (Breaker), Silver Surfer
  (Breaker), Magik (Breaker). Tier listy z listopada brak (najnowsza Pocket Gamer 7.10, sprzed przeróbek).

## Otwarte pytania

Czego nie udało się ustalić (nie szukaj w ciemno — sprawdź datę, może już wiadomo; stan 4.11):
lista postaci z cechą Terror; źródła shardów Saurona, Cyclopsa (Mighty), Hawkeye (Robot), X-23 i
przerobionych weteranów Menace/Savage Land; kity Saurona i Cyclopsa (Mighty) z OFF; data Tower
Cyclopsa (Mighty) (wcześniejsze wieże 2026: 6 pięter tygodniowo, 12 lub 24 piętra); końce The
Hunger, Candy Store i A.I. Takeover (w danych są szacunki); reguły nowego sezonu Wojny; nagrody
samego Beginner u Sabretootha i czy lista misji M1–M10 dotyczy też Beginner/Normal; Hard Purple
L3 czy L4; Kyln 3 czy 5 postaci; Savage Land także w obronie?; pozycje w Menace, Symbiote Six;
bramka GT19 w DD7; czy Boosts działają w PvE (jeden skrawek mówi „Pain, Fear, Terror” zamiast
Anxiety/Panic); ceny w Shop Credits; czy zakres `m3p.f.ar.ros` jest dostępny; ile drużyn na
obronę wystawia gracz; cechy per węzeł w Trepidation; listy Tower Challengers 3 i Maestro
Challengers; premie cech w Blitzu; plotka „Destroyer & Raid Boss Next Week” (YT). Pozycja w
składzie ma znaczenie przynajmniej w FF (MCU), Annihilators, WCA i Savage Land (3P).

**Fałszywe tropy** (nie daj się złapać): sezon Wojny „Halloween Showdown” i „rozdział 3 Age of
Annihilus” to 2025 r.; mapa `maps/raid_incursion` to Incursion, nie Trepidation; nazwy umiejętności
„Saurona” w jednym skrawku pochodzą ze strony Sersi; „X-23 GT5/GT9” to kampania Savage Land, nie
misje Sabretootha.

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
