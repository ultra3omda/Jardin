import { createHash } from 'node:crypto';

export interface OvhSignatureParams {
  appSecret: string;
  consumerKey: string;
  method: string;
  url: string;
  body: string;
  timestamp: number;
}

/**
 * OVH API request signature.
 * `"$1$" + sha1_hex(appSecret + "+" + consumerKey + "+" + METHOD + "+" + URL + "+" + body + "+" + timestamp)`.
 * https://docs.ovh.com/gb/en/api/api-arguments-basics/
 */
export function buildOvhSignature(p: OvhSignatureParams): string {
  const toSign = [p.appSecret, p.consumerKey, p.method, p.url, p.body, p.timestamp].join('+');
  return '$1$' + createHash('sha1').update(toSign).digest('hex');
}
