import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { buildOvhSignature } from './ovh-signature';

describe('buildOvhSignature', () => {
  it('matches the OVH "$1$" + SHA1 of joined fields', () => {
    const p = {
      appSecret: 'secret', consumerKey: 'consumer',
      method: 'POST', url: 'https://eu.api.ovh.com/1.0/domain/zone/klasso.tn/record',
      body: '{"fieldType":"CNAME"}', timestamp: 1700000000,
    };
    const expected =
      '$1$' +
      createHash('sha1')
        .update([p.appSecret, p.consumerKey, p.method, p.url, p.body, p.timestamp].join('+'))
        .digest('hex');
    expect(buildOvhSignature(p)).toBe(expected);
  });

  it('produces a distinct signature when the body changes', () => {
    const base = { appSecret: 's', consumerKey: 'c', method: 'GET', url: 'u', timestamp: 1 };
    expect(buildOvhSignature({ ...base, body: 'a' })).not.toBe(buildOvhSignature({ ...base, body: 'b' }));
  });
});
