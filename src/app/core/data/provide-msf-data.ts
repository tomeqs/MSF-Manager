import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { MsfDataSource } from './msf-data-source';
import { MockMsfDataSource } from './mock/mock-msf-data-source';

/** Swap the implementation here once the real API client exists. */
export function provideMsfData(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: MsfDataSource, useClass: MockMsfDataSource }]);
}
