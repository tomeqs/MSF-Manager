import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MsfDataSource } from '../data/msf-data-source';
import { TeamsStore } from './teams.store';

describe('TeamsStore', () => {
  function setup(getTeamOrder: () => unknown) {
    const spy = vi.fn(getTeamOrder);
    TestBed.configureTestingModule({
      providers: [{ provide: MsfDataSource, useValue: { getTeamOrder: spy } }],
    });
    return { store: TestBed.inject(TeamsStore), spy };
  }

  it('uses API teams when the analysis works', () => {
    const { store } = setup(() => of([{ squad: ['A', 'B'], total: 2 }]));
    store.load('arena');
    expect(store.tab('arena').source).toBe('api');
    expect(store.tab('arena').teams).toHaveLength(1);
  });

  it('falls back to the known list on 5xx and skips the API for other tabs', () => {
    const { store, spy } = setup(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { error: { subcode: 'INTERNAL_SERVER_ERROR' } },
          }),
      ),
    );
    store.load('arena');
    store.load('war');

    expect(store.tab('arena')).toMatchObject({ status: 'loaded', source: 'known' });
    expect(store.tab('arena').apiError).toContain('500 INTERNAL_SERVER_ERROR');
    expect(store.tab('war').source).toBe('known');
    expect(spy).toHaveBeenCalledTimes(1);

    store.load('war', true); // explicit retry asks the API again
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
