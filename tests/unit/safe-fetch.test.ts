import {
  isPrivateNetworkAddress,
  readResponseBytes,
  validatePublicHttpUrl,
} from '@/lib/security/safe-fetch';

describe('safe public source fetching', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.1.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
  ])('blocks private or reserved address %s', (address) => {
    expect(isPrivateNetworkAddress(address)).toBe(true);
  });

  it('rejects loopback source URLs, including IPv6', async () => {
    await expect(validatePublicHttpUrl('http://127.0.0.1/admin')).rejects.toThrow(
      /private|reserved/i
    );
    await expect(validatePublicHttpUrl('http://[::1]/admin')).rejects.toThrow(
      /private|reserved/i
    );
  });

  it('stops reading a response after the configured byte limit', async () => {
    const response = new Response('123456');
    await expect(readResponseBytes(response, 5)).rejects.toThrow(/exceeds/i);
  });
});
