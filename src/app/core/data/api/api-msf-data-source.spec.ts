import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_MSF_CONFIG as CONFIG } from '../../config/msf-config';
import { provideMsfData } from '../provide-msf-data';
import { ApiMsfDataSource, resolveImg } from './api-msf-data-source';

const API = CONFIG.apiBaseUrl;
const IMG = 'https://assets.marvelstrikeforce.com/imgs/';
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('ApiMsfDataSource', () => {
  let api: ApiMsfDataSource;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'msf.auth.tokens',
      JSON.stringify({ accessToken: 'AT', expiresAt: Date.now() + 3_600_000 }),
    );
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideMsfData(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiMsfDataSource);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('pages the characters list and resolves relative portraits', async () => {
    const result = firstValueFrom(api.getCharacters());
    await tick();

    const first = httpMock.expectOne((r) => r.url.endsWith('/game/v1/characters'));
    expect(first.request.params.get('page')).toBe('1');
    expect(first.request.params.get('perPage')).toBe('100');
    first.flush({
      data: [{ id: 'A', portrait: 'Portraits/a.png' }],
      meta: { version: 1, perTotal: 250, baseImgUrl: IMG },
    });

    const rest = httpMock.match((r) => r.url.endsWith('/game/v1/characters'));
    expect(rest.map((r) => r.request.params.get('page'))).toEqual(['2', '3']);
    rest[0].flush({ data: [{ id: 'B' }], meta: { version: 1 } });
    rest[1].flush({ data: [{ id: 'C', portrait: 'https://cdn/c.png' }], meta: { version: 1 } });

    expect(await result).toEqual([
      { id: 'A', portrait: `${IMG}Portraits/a.png` },
      { id: 'B', portrait: undefined },
      { id: 'C', portrait: 'https://cdn/c.png' },
    ]);
  });

  it('requests only the needed upgradeData fields', async () => {
    const result = firstValueFrom(api.getUpgradeData());
    await tick();

    const meta = { version: 1, baseImgUrl: IMG };
    httpMock
      .expectOne(
        `${API}/game/v1/upgradeData/yellowStarTotalShards?pieceInfo=full&pieceDirectCost=none&pieceFlatCost=none&subPieceInfo=none`,
      )
      .flush({ data: { '1': 10 }, meta });
    httpMock
      .expectOne((r) => r.url.endsWith('/upgradeData/yellowStarTotalCosts'))
      .flush({ data: { '2': [{ item: { id: 'GOLD', icon: 'gold.png' }, quantity: 5 }] }, meta });
    httpMock
      .expectOne((r) => r.url.endsWith('/upgradeData/abilityUpgradeCosts'))
      .flush({ data: { basic: { '2': [{ item: 'T1', quantity: 1 }] } }, meta });

    expect(await result).toEqual({
      yellowStarTotalShards: { '1': 10 },
      yellowStarTotalCosts: {
        '2': [{ item: { id: 'GOLD', icon: `${IMG}gold.png` }, quantity: 5 }],
      },
      abilityUpgradeCosts: { basic: { '2': [{ item: 'T1', quantity: 1 }] } },
    });
  });
});

describe('resolveImg', () => {
  it('joins base and path with exactly one slash', () => {
    expect(resolveImg('/a/b.png', 'https://x/imgs/')).toBe('https://x/imgs/a/b.png');
    expect(resolveImg('a.png', 'https://x/imgs')).toBe('https://x/imgs/a.png');
    expect(resolveImg('a.png', undefined)).toBe('a.png');
    expect(resolveImg(undefined, 'https://x')).toBeUndefined();
  });
});
