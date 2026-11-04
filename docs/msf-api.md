# MSF API — ściąga

Stan: specyfikacja **„Marvel Strike Force Api”, beta 0.2.1**, zapisana w
[`msf-api-spec.json`](msf-api-spec.json) (OpenAPI). Strona
`developer.marvelstrikeforce.com/beta/index.html` jest z kontenerów sesji niedostępna (DNS),
więc **czytaj lokalny plik** — np. `python3 -c "import json; s=json.load(open('docs/msf-api-spec.json')); print(s['paths']['/player/v1/squads'])"`.
Na żywym API nic z tego nie było jeszcze sprawdzone (brak dostępu do serwera z sesji).

## Dostęp

- Baza: `https://api.marvelstrikeforce.com`. Każde zapytanie: `x-api-key: 17wMKJLRxy3pYDCKG5ciP7VSU45OVumB2biCzzgw`
  (publiczny klucz ze specyfikacji), `User-Agent` (przeglądarka ustawia sama), `Authorization: Bearer <token>`.
- OAuth2 Authorization Code + PKCE na Hydra: `https://hydra-public.prod.m3.scopelypv.com/oauth2/auth` i `/oauth2/token`.
  Klient SPA aplikacji: `cc73949e-3077-434a-895e-716745f5bc48`, redirect `/auth/callback`
  (`src/app/core/config/msf-config.ts`). Token odświeżany przez `POST /util/v1/gatedRefresh`.
- Zakresy na liście OAuth (`securitySchemes`): `m3p.f.pr.pro` (profil), `m3p.f.pr.ros` (roster i składy),
  `m3p.f.pr.inv` (ekwipunek, wishlist), `m3p.f.pr.act` (eventy), `m3p.f.pr.buy` (oferty — brak tras),
  `m3p.f.ar.pro` (sojusz), `openid`, `offline`. Aplikacja prosi o wszystkie poza `pr.buy`.
- **Brak na liście OAuth** (choć tagi tras ich używają): `m3p.f.ar.ros` (rostery i składy członków
  sojuszu), `m3p.x.pw.pro` (kody promocyjne), `m3p.x.aw.pro` (zaproszenia/akcje sojuszu). Tagi
  `m3p.f.ar.raid`, `ar.war`, `ar.inv`, `ar.act`, „Time Heist” nie mają żadnej trasy. Czy da się dostać
  `ar.ros` — sprawdzić w Developer Portal lub na Discordzie `#api-faq`.
- Trasy `/game/v1/*` działają z dowolnym ważnym tokenem (także client-credentials).

## Limity i błędy

- **472 RESPONSE_TOO_LARGE** (przykład `maxLength: 472000`) — dziel na strony (`page`, `perPage`,
  `meta.perTotal`) i przycinaj (`itemFormat=id`, `pieceInfo=none`, `traitFormat=id`, `lang=none`).
  Lista postaci z kitami: strony po 40; zwykła lista postaci: po 100; eventy: po 25.
- **344 UNCHANGED** z parametrem `since=<meta.asOf>` — tylko roster, ekwipunek, wishlist, składy gracza.
- 464 NO_ACCESS (np. członek sojuszu nie udostępnia rosteru), 474 BANNED, 422 PROHIBITED_VALUE,
  552 RESTARTING / 553 MAINTENANCE, 500. **Limitu zapytań (429) specyfikacja nie opisuje.**
- Refresh token jednorazowy; ponowne użycie w ciągu 20 s → **473 GATED**; ponowne użycie na serwerze
  OAuth unieważnia cały łańcuch tokenów.
- `meta.hashes` (`events`, `drops`, `locs`, `nodes`, `chars`, `other`, `all`) zmieniają się, gdy
  zmieniają się dane gry — cache danych gry jest unieważniany po hashu (`ApiCache.gameData`),
  bez hasha TTL 12 h. Zastrzeżenie: węzły kampanii eventowych mogą zależeć od trwającego eventu,
  a hash `nodes` może się wtedy nie zmienić.

## Parametry, których używa aplikacja (i po co)

| Trasa | Parametry | Po co |
|---|---|---|
| `/game/v1/characters` | `status=playable, itemFormat=id, starItems=full, abilityKits=none, …` | lista postaci; `starItems[0]` = shard żółtych gwiazdek |
| `/game/v1/characters` (kity) | `abilityKits=max, charAdoption=full, starItems=none`, strony po 40 | opisy umiejętności na maks. poziomie, `iso8ClassAdoption`, `abilityAdoption` (T4) |
| `/game/v1/characterInstances/{id}` | `level`, `red`, `iso8=<klasa>,max`, opcjonalnie `yellow` | moc maks. dla poziomu gracza; bez `level` API przyjmuje limit gry (110) |
| `/game/v1/characterInstanceCaps` | — | maks. gear i umiejętności na każdy poziom postaci |
| `/game/v1/upgradeData/{fieldId}` | `yellowStarTotalShards`, `yellowStarTotalCosts`, `abilityUpgradeCosts` | koszty gwiazdek i umiejętności (9 z 12 pól nieużywane) |
| `/player/v1/events` | `objRewards=full, itemFormat=id, pieceInfo=none` | eventy gracza z nagrodami progów i postępem |
| `/game/v1/events` | `itemFormat=id, pieceInfo=none`, strony po 25 | wszystkie eventy gry (też te, do których gracz się nie kwalifikuje) |
| `/game/v1/episodics/campaign` + `/{type}/{id}` | `nodeRewards=full, nodeInfo=part, itemFormat=id`; przy 472 po rozdziałach `/{id}/{n}` | gdzie dropią shardy (węzły kampanii i kampanii eventowych z `EventInfo.episodic.ids`) |
| `/game/v1/orbRewards/{itemId}` + `/game/v1/items/{itemId}` | `itemFormat=id` | zawartość orbów (orb rozpoznawany po „orb” w id; NOT_FOUND = nie orb) i nazwa |
| `/player/v1/squads` | `since` | zapisane składy gracza per zakładka (tylko odczyt — zapisywać składów przez API się nie da) |
| `/game/v1/analysis/teamOrder/{tab}` | — | najczęstsze ustawienia składów wśród graczy (w becie bywa puste / 5xx — fallback `known-meta.ts`) |

## Nieużywane, a wartościowe (pomysły)

- `claimableTiers` / `claimableTiersPremium` w postępie eventów → przypomnienie o nieodebranych nagrodach
  (odebrać przez API się nie da — brak trasy).
- `Requirements` / `CharacterFilter` w eventach → tablica gotowości na wszystkie eventy.
- `gearTiers=full` + `pieceFlatCost=full` + `/game/v1/items/{id}/characters` → kalkulator gearu.
- `/player/v1/itemWishlist` (`pr.inv`) → synchronizacja listy życzeń.
- `/player/v1/alliance/card` i `/members` (`ar.pro`, aplikacja już ma) → panel sojuszu.
- `/game/v1/dds`, `/game/v1/raids/{id}`, `/game/v1/survivalTowers`, `/game/v1/pickYourPoison` → wymagania DD, rajdów, wież.
- `DELETE /player/v1/auth/consents` → prawdziwe „wyloguj i cofnij dostęp”.
- Brak w API: zawartość sklepów i ofert, stan rajdu/wojny gracza, pole „gdzie dropi” przy przedmiocie.

## Wszystkie trasy (✓ = używa aplikacja)

Wygenerowane ze specyfikacji; pominięte wspólne parametry formatu (`lang`, `itemFormat`, `traitFormat`,
`statsFormat`, `quantityFormat`, `pieceInfo`, `page`, `perPage`, `since`).

| App | Metoda | Ścieżka | Opis | Kategoria (zakres) | Uwagi | Ważne parametry |
|---|---|---|---|---|---|---|
| ✓ | GET | `/game/v1/analysis/teamOrder` | Team Order | Analysis |  |  |
| ✓ | GET | `/game/v1/analysis/teamOrder/{tabId}` | Team Order | Analysis |  |  |
| ✓ | GET | `/game/v1/characterInstanceCaps` | Character Instance Caps | Characters | paged |  |
|  | GET | `/game/v1/characterInstances` | Character Instances | Characters | paged | mission=false|true|both, trait, status, level, yellow, red, gearTier, slot0, slot1, slot2, slot3, slot4, slot5, basic, special, ultimate, passive, iso8, stark, war=attack|defend;ABCHM |
| ✓ | GET | `/game/v1/characterInstances/{characterId}` | Character Instance(s) | Characters | paged | mission=false|true, charInfo=none|part|full, abilityKits=none|part|full, gearTiers=none|part|full, level, yellow, red, gearTier, slot0, slot1, slot2, slot3, slot4, slot5, basic, special, ultimate, pas |
|  | GET | `/game/v1/characterInstances/{characterId}/{level}/{yellow}/{red}/{gearTier}` | Character Instance(s) (Shortcut 1) | Characters (Shortcuts) | paged | mission=false|true, charInfo=none|part|full, abilityKits=none|part|full, gearTiers=none|part|full, slot0, slot1, slot2, slot3, slot4, slot5, basic, special, ultimate, passive, iso8, stark, war=attack| |
|  | GET | `/game/v1/characterInstances/{characterId}/{level}/{yellow}/{red}/{gearTier}/{slot0}/{slot1}/{slot2}/{slot3}/{slot4}/{slot5}` | Character Instance(s) (Shortcut 2) | Characters (Shortcuts) | paged | mission=false|true, charInfo=none|part|full, abilityKits=none|part|full, gearTiers=none|part|full, basic, special, ultimate, passive, iso8, stark, war=attack|defend;ABCHM |
|  | GET | `/game/v1/characterInstances/{characterId}/{level}/{yellow}/{red}/{gearTier}/{slot0}/{slot1}/{slot2}/{slot3}/{slot4}/{slot5}/{basic}/{special}/{ultimate}/{passive}` | Character Instance(s) (Shortcut 3) | Characters (Shortcuts) | paged | mission=false|true, charInfo=none|part|full, abilityKits=none|part|full, gearTiers=none|part|full, iso8, stark, war=attack|defend;ABCHM |
|  | GET | `/game/v1/characterInstances/{level}/{yellow}/{red}/{gearTier}` | Character Instances (Shortcut 1) | Characters (Shortcuts) | paged | mission=false|true|both, trait, status, slot0, slot1, slot2, slot3, slot4, slot5, basic, special, ultimate, passive, iso8, stark, war=attack|defend;ABCHM |
|  | GET | `/game/v1/characterInstances/{level}/{yellow}/{red}/{gearTier}/{slot0}/{slot1}/{slot2}/{slot3}/{slot4}/{slot5}` | Character Instances (Shortcut 2) | Characters (Shortcuts) | paged | mission=false|true|both, trait, status, basic, special, ultimate, passive, iso8, stark, war=attack|defend;ABCHM |
|  | GET | `/game/v1/characterInstances/{level}/{yellow}/{red}/{gearTier}/{slot0}/{slot1}/{slot2}/{slot3}/{slot4}/{slot5}/{basic}/{special}/{ultimate}/{passive}` | Character Instances (Shortcut 3) | Characters (Shortcuts) | paged | mission=false|true|both, trait, status, iso8, stark, war=attack|defend;ABCHM |
| ✓ | GET | `/game/v1/characters` | Characters | Characters | paged | mission=false|true|both, trait, status, charInfo=none|full, costumes=none|full, abilityKits=none|full|basic|special|ultimate|passive|noLevels|max, gearTiers=none|full, charAdoption=none|full, starItem |
|  | GET | `/game/v1/characters/array/{characterIdArray}` | Character | Characters |  | mission=false|true, charInfo=none|full, costumes=none|full, abilityKits=none|full|basic|special|ultimate|passive|noLevels|max, gearTiers=none|full, charAdoption=none|full, flexFields |
|  | GET | `/game/v1/characters/{characterId}` | Character | Characters |  | mission=false|true, charInfo=none|full, costumes=none|full, abilityKits=none|full|basic|special|ultimate|passive|noLevels|max, gearTiers=none|full, charAdoption=none|full, starItems=none|full |
|  | GET | `/game/v1/dds` | Dark Dimensions | Combat | paged | nodeInfo=none|part|full, nodeReqs=none|full, nodeRewards=none|full, raidInfo=none|full, raidMap=none|full, raidRewards=none|full, flexFields |
|  | GET | `/game/v1/dds/{ddId}` | Dark Dimension | Combat |  | nodeInfo=none|part|full, nodeReqs=none|full, nodeRewards=none|full, raidInfo=none|full, raidMap=none|full, raidRewards=none|full, nodeCombat=none|full, charInfo=none|full, flexFields |
|  | GET | `/game/v1/dds/{ddId}/{roomId}` | Dark Dimension Room | Combat |  | nodeInfo=part|full, nodeReqs=none|full, nodeRewards=none|full, raidMap=none|full, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/decorations` | Decorations | Globals |  |  |
| ✓ | GET | `/game/v1/episodics/{episodicType}` | Episodics | Combat | paged | flexFields |
| ✓ | GET | `/game/v1/episodics/{episodicType}/{episodicId}` | Episodic | Combat |  | nodeInfo=none|part|full, nodeReqs=none|full, nodeRewards=none|full |
| ✓ | GET | `/game/v1/episodics/{episodicType}/{episodicId}/{chapterNumber}` | Chapter | Combat |  | nodeInfo=none|part|full, nodeReqs=none|full, nodeRewards=none|full, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/episodics/{episodicType}/{episodicId}/{chapterNumber}/{tierNumber}` | Tier of Chapter | Combat |  | nodeInfo=part|full, nodeReqs=none|full, nodeRewards=none|full, nodeCombat=none|full, charInfo=none|full |
| ✓ | GET | `/game/v1/events` | Events | Events | paged | type, eventInfo=none|full |
|  | GET | `/game/v1/events/{eventId}` | Event | Events |  | eventInfo=none|full, objRewards=none|full |
|  | GET | `/game/v1/iso8Abilities` | ISO-8 Abilities | Globals |  |  |
|  | GET | `/game/v1/iso8Abilities/{classId}` | ISO-8 Ability | Globals |  |  |
| ✓ | GET | `/game/v1/items/{itemId}` | Items | Items |  |  |
|  | GET | `/game/v1/items/{itemId}/characters` | Items | Items | paged | charInfo=none|full |
|  | GET | `/game/v1/languages` | Languages | Localization | paged |  |
|  | GET | `/game/v1/localizations` | Localizations | Localization | paged |  |
|  | GET | `/game/v1/localizations/{tableId}` | Localization | Localization |  |  |
|  | GET | `/game/v1/nodeCombats/{combatId}` | NodeCombat | Combat |  | charInfo=none|full, difficultyGroup, difficulty |
| ✓ | GET | `/game/v1/orbRewards/{itemId}` | OrbRewards | Items |  |  |
|  | GET | `/game/v1/pickYourPoisons` | PickYourPoisons | Combat | paged | nodeInfo=none|part|full, nodeReqs=none|full, raidInfo=none|full, raidMap=none|full, raidDiffs=none|full |
|  | GET | `/game/v1/pickYourPoisons/{pypId}` | PickYourPoison | Combat |  | nodeInfo=none|part|full, nodeReqs=none|full, raidInfo=none|full, raidMap=none|full, raidDiffs=none|full, difficulty, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/pickYourPoisons/{pypId}/{roomId}` | PickYourPoison Room | Combat |  | nodeInfo=part|full, nodeReqs=none|full, raidMap=none|full, difficulty, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/raidGroups` | Raid Groups | Combat | paged |  |
|  | GET | `/game/v1/raids` | Raids | Combat | paged | nodeInfo=none|part|full, nodeReqs=none|full, nodeRewards=none|full, raidInfo=none|full, raidMap=none|full, raidRewards=none|full, raidDiffs=none|full, groupId, flexFields |
|  | GET | `/game/v1/raids/{raidId}` | Raid | Combat |  | nodeInfo=none|part|full, nodeReqs=none|full, nodeRewards=none|full, raidInfo=none|full, raidMap=none|full, raidRewards=none|full, raidDiffs=none|full, difficulty, nodeCombat=none|full, charInfo=none|f |
|  | GET | `/game/v1/raids/{raidId}/{roomId}` | Raid Room | Combat |  | nodeInfo=part|full, nodeReqs=none|full, nodeRewards=none|full, raidMap=none|full, difficulty, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/scopes` | Scopes | Scopes | paged | scopeFormat=object|id |
|  | GET | `/game/v1/survivalTowers` | Survival Towers | Combat | paged | nodeInfo=none|part|full, nodeReqs=none|full, raidInfo=none|full, raidMap=none|full |
|  | GET | `/game/v1/survivalTowers/{stId}` | Survival Tower | Combat |  | nodeInfo=none|part|full, nodeReqs=none|full, raidInfo=none|full, raidMap=none|full, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/survivalTowers/{stId}/{roomId}` | Surival Tower Room | Combat |  | nodeInfo=part|full, nodeReqs=none|full, raidMap=none|full, nodeCombat=none|full, charInfo=none|full |
|  | GET | `/game/v1/traits` | Traits | Characters | paged |  |
|  | GET | `/game/v1/upgradeData` | Upgrade Data | Globals |  |  |
| ✓ | GET | `/game/v1/upgradeData/{fieldId}` | Upgrade Data Field | Globals |  |  |
|  | POST | `/player/v1/alliance/action/{actionId}/requester/{requesterId}` | Alliance Requester Take Action | Player (m3p.x.aw.pro) |  |  |
|  | GET | `/player/v1/alliance/card` | Alliance Card | Player (m3p.f.ar.pro) |  |  |
|  | POST | `/player/v1/alliance/invite/applicant/{applicantId}` | Alliance Invite Appplicant | Player (m3p.x.aw.pro) |  |  |
|  | GET | `/player/v1/alliance/members` | Alliance Members | Player (m3p.f.ar.pro) |  |  |
|  | GET | `/player/v1/alliance/recruiting/applications` | Alliance Applications | Player (m3p.f.ar.pro) |  |  |
|  | GET | `/player/v1/alliance/recruiting/recruiters` | Alliances looking for commanders. |  |  | langs=en|de|es|fr|id|it|ja|ko|pt|ru|sv|th|tr|no|zhs|zht, raids, search, sortDir=asc|desc, style=casual|mid-core|competitive, avgTcp, warLeague, warZone, searchNonRecruiting |
|  | GET | `/player/v1/alliance/{allianceId}/card` | Alliance Card | Player (m3p.f.ar.pro) |  |  |
|  | GET | `/player/v1/alliance/{allianceId}/members` | Alliance Members | Player (m3p.f.ar.pro) |  |  |
|  | GET | `/player/v1/applicant` | Applicant Information |  |  |  |
|  | POST | `/player/v1/applicant` | Enroll Player as Applicant |  |  |  |
|  | GET | `/player/v1/applicant/applicants` | Applicants to Alliance |  |  |  |
|  | DELETE | `/player/v1/auth/consents` | Revoke Consents | Player (m3p.{any}) |  |  |
| ✓ | GET | `/player/v1/card` | Card | Player (m3p.f.pr.pro) |  |  |
|  | GET | `/player/v1/card/applicant/{applicantId}` | Applicant Card | Player (m3p.{any}) |  |  |
|  | GET | `/player/v1/card/member/{memberId}` | Member Card | Player (m3p.{any}) |  |  |
|  | GET | `/player/v1/card/requester/{requesterId}` | Requester Card | Player (m3p.{any}) |  |  |
| ✓ | GET | `/player/v1/events` | Player Events | Player (m3p.f.pr.act) | paged | type, eventInfo=none|full, objRewards=none|part|full |
|  | GET | `/player/v1/events/{eventId}` | Player Event | Player (m3p.f.pr.act) |  | eventInfo=none|full, objRewards=none|part|full |
| ✓ | GET | `/player/v1/inventory` | Inventory | Player (m3p.f.pr.inv) | paged since | itemType=GEAR|ISOITEM|SHARD|RS|COSTUME|CONSUMABLE|ABILITY_MATERIAL |
|  | GET | `/player/v1/invites` | Invites from Alliances |  |  |  |
|  | GET | `/player/v1/itemWishlist` | Item Wishlist | Player (m3p.f.pr.inv) | paged since |  |
|  | POST | `/player/v1/promocode/{promocodeId}/claim` | Promocode Claim | Player (m3p.x.pw.pro) |  |  |
|  | GET | `/player/v1/recruiting/recruits` | Recruiting List | Player (m3p.{any}) | paged | minTcp, maxTcp |
|  | GET | `/player/v1/recruiting/recruits/{recruitId}` | Recruits Info | Player (m3p.{any}) |  |  |
| ✓ | GET | `/player/v1/roster` | Roster | Player (m3p.f.pr.ros) | paged since | charInfo=none|full, war=attack|defend;ABCHM |
|  | GET | `/player/v1/roster/applicant/{applicantId}` | Roster | Player (m3p.{any}) | paged since | charInfo=none|full, war=attack|defend;ABCHM |
|  | GET | `/player/v1/roster/member/{memberId}` | Roster | Player (m3p.f.ar.ros) | paged since | charInfo=none|full, war=attack|defend;ABCHM |
|  | GET | `/player/v1/roster/requester/{requesterId}` | Roster | Player (m3p.{any}) | paged since | charInfo=none|full, war=attack|defend;ABCHM |
| ✓ | GET | `/player/v1/squads` | Squads | Player (m3p.f.pr.ros) | since |  |
|  | GET | `/player/v1/squads/applicant/{applicantId}` | Applicant Squads | Player (m3p.{any}) | since |  |
|  | GET | `/player/v1/squads/member/{memberId}` | Member Squads | Player (m3p.f.ar.ros) | since |  |
|  | GET | `/player/v1/squads/requester/{requesterId}` | Requester Squads | Player (m3p.{any}) | since |  |
| ✓ | POST | `/util/v1/gatedRefresh` | Gated Refresh | Util |  |  |
