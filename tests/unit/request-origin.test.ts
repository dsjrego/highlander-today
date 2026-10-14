import { isSameOriginMutation } from '@/lib/request-security';
const request = (headers: Record<string,string>, method='POST') => ({ method, url:'https://example.test/api/articles', headers:new Headers(headers) });
it('accepts same-origin browser mutations and authenticated non-browser callers', () => {
  expect(isSameOriginMutation(request({origin:'https://example.test'}))).toBe(true);
  expect(isSameOriginMutation(request({}))).toBe(true);
});
it('rejects foreign, opaque, malformed, or cross-site origins', () => {
  for(const origin of ['https://other.test','http://example.test','null','invalid']) expect(isSameOriginMutation(request({origin}))).toBe(false);
  expect(isSameOriginMutation(request({'sec-fetch-site':'cross-site'}))).toBe(false);
});
it('allows cross-origin safe reads', () => {
  expect(isSameOriginMutation(request({origin:'https://other.test'},'GET'))).toBe(true);
});

it('uses public Host when the server URL is internal, without trusting forwarded hosts', () => {
  expect(isSameOriginMutation({method:'POST',url:'https://internal:3000/api/a',headers:new Headers({host:'example.test',origin:'https://example.test','x-forwarded-host':'attacker.test'})})).toBe(true);
  expect(isSameOriginMutation(request({origin:'https://attacker.test','x-forwarded-host':'attacker.test'}))).toBe(false);
});
