import * as dns from 'node:dns/promises';
import { preferIpv4FromEnv, resolveSmtpConnectEndpoint } from './smtp-connect-endpoint';

jest.mock('node:dns/promises');

const resolve4 = dns.resolve4 as jest.MockedFunction<typeof dns.resolve4>;

describe('resolveSmtpConnectEndpoint', () => {
  beforeEach(() => {
    resolve4.mockReset();
  });

  it('usa IPv4 com SNI quando existe registo A', async () => {
    resolve4.mockResolvedValueOnce(['203.0.113.10']);
    await expect(resolveSmtpConnectEndpoint('smtp.example.test', true)).resolves.toEqual({
      host: '203.0.113.10',
      servername: 'smtp.example.test',
    });
    expect(resolve4).toHaveBeenCalledWith('smtp.example.test');
  });

  it('mantém hostname quando preferIpv4=false', async () => {
    await expect(resolveSmtpConnectEndpoint('smtp.example.test', false)).resolves.toEqual({
      host: 'smtp.example.test',
    });
    expect(resolve4).not.toHaveBeenCalled();
  });

  it('mantém hostname quando resolve4 falha', async () => {
    resolve4.mockRejectedValueOnce(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }));
    await expect(resolveSmtpConnectEndpoint('smtp.example.test', true)).resolves.toEqual({
      host: 'smtp.example.test',
    });
  });

  it('aceita host literal IP sem servername extra', async () => {
    await expect(resolveSmtpConnectEndpoint('192.0.2.1', true)).resolves.toEqual({ host: '192.0.2.1' });
    expect(resolve4).not.toHaveBeenCalled();
  });
});

describe('preferIpv4FromEnv', () => {
  it('omissão ou true → IPv4 preferido', () => {
    expect(preferIpv4FromEnv(undefined)).toBe(true);
    expect(preferIpv4FromEnv('true')).toBe(true);
    expect(preferIpv4FromEnv('1')).toBe(true);
  });

  it('false / 0 / ipv6 → não forçar A', () => {
    expect(preferIpv4FromEnv('false')).toBe(false);
    expect(preferIpv4FromEnv('0')).toBe(false);
    expect(preferIpv4FromEnv('6')).toBe(false);
    expect(preferIpv4FromEnv('ipv6')).toBe(false);
  });
});
