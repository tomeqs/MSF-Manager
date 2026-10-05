import { codeChallenge, randomString } from './pkce';

describe('pkce', () => {
  it('computes base64url(SHA-256) without padding', async () => {
    // SHA-256("abc") = ba7816bf…f20015ad (FIPS 180-2 test vector)
    expect(await codeChallenge('abc')).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
  });

  it('generates verifiers from the unreserved charset', () => {
    const value = randomString(64);
    expect(value).toHaveLength(64);
    expect(value).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });
});
