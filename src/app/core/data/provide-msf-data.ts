import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { msfApiInterceptor } from '../auth/msf-api.interceptor';
import { MsfDataSource } from './msf-data-source';
import { SessionMsfDataSource } from './session-msf-data-source';

export function provideMsfData(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([msfApiInterceptor])),
    { provide: MsfDataSource, useClass: SessionMsfDataSource },
  ]);
}
