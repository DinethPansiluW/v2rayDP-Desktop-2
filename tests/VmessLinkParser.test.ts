import { describe, it, expect } from 'vitest';
import { VmessLinkParser } from '../src/core/VmessLinkParser';
import { ServerProfile } from '../src/core/types';

describe('VmessLinkParser & sing-box 1.13 Configuration', () => {
  it('should parse modern VLESS Reality link correctly', () => {
    const vlessLink =
      'vless://b831381d-6324-4d53-ad4f-8cda48b30811@198.51.100.25:443?type=tcp&security=reality&pbk=Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U=&sid=12345678&fp=chrome&spx=%2F&flow=xtls-rprx-vision&sni=www.apple.com#Fast%20Reality%20Node';

    const profile = VmessLinkParser.parse(vlessLink);

    expect(profile.protocol).toBe('vless');
    expect(profile.name).toBe('Fast Reality Node');
    expect(profile.address).toBe('198.51.100.25');
    expect(profile.port).toBe(443);
    expect(profile.uuid).toBe('b831381d-6324-4d53-ad4f-8cda48b30811');
    expect(profile.network).toBe('tcp');
    expect(profile.tls).toBe('reality');
    expect(profile.publicKey).toBe('Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U=');
    expect(profile.shortId).toBe('12345678');
    expect(profile.fingerprint).toBe('chrome');
    expect(profile.spiderX).toBe('/');
    expect(profile.flow).toBe('xtls-rprx-vision');
    expect(profile.sni).toBe('www.apple.com');
  });

  // 1. Reality test
  it('should generate valid sing-box configuration for VLESS Reality (xtls-rprx-vision, pbk, sid, fp, insecure:true)', () => {
    const profile = VmessLinkParser.parse(
      'vless://b831381d-6324-4d53-ad4f-8cda48b30811@198.51.100.25:443?type=tcp&security=reality&pbk=Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U=&sid=12345678&fp=chrome&spx=%2F&flow=xtls-rprx-vision&sni=www.apple.com#Fast%20Reality%20Node'
    );

    const jsonStr = VmessLinkParser.toSingBoxConfigJson(profile, { clashApiPort: 9090 });
    const config = JSON.parse(jsonStr);

    // Inbound: TUN with 172.19.0.1/30 and IPv6
    expect(config.inbounds[0].type).toBe('tun');
    expect(config.inbounds[0].address).toContain('172.19.0.1/30');
    expect(config.inbounds[0].auto_route).toBe(true);
    expect(config.inbounds[0].strict_route).toBe(true);
    expect(config.inbounds[0].stack).toBe('mixed');

    // Outbound: VLESS Reality
    const proxy = config.outbounds.find((o: any) => o.tag === 'proxy');
    expect(proxy).toBeDefined();
    expect(proxy.type).toBe('vless');
    expect(proxy.server).toBe('198.51.100.25');
    expect(proxy.server_port).toBe(443);
    expect(proxy.uuid).toBe('b831381d-6324-4d53-ad4f-8cda48b30811');
    expect(proxy.flow).toBe('xtls-rprx-vision');
    expect(proxy.tls.enabled).toBe(true);
    expect(proxy.tls.insecure).toBe(true);
    expect(proxy.tls.server_name).toBe('www.apple.com');
    expect(proxy.tls.reality.enabled).toBe(true);
    expect(proxy.tls.reality.public_key).toBe('Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U=');
    expect(proxy.tls.reality.short_id).toBe('12345678');
    expect(proxy.tls.utls.fingerprint).toBe('chrome');

    // clash_api
    expect(config.experimental.clash_api.external_controller).toBe('127.0.0.1:9090');
  });

  // 2. ws+tls test
  it('should generate valid sing-box configuration for WebSocket + TLS', () => {
    const profile: ServerProfile = {
      id: 'p-ws',
      name: 'VLESS WS TLS',
      protocol: 'vless',
      address: 'cdn.example.com',
      port: 443,
      uuid: '11111111-2222-3333-4444-555555555555',
      alterId: 0,
      security: 'none',
      network: 'ws',
      headerType: 'none',
      host: 'cdn.example.com',
      path: '/vless-ws',
      tls: 'tls',
      sni: 'cdn.example.com',
      alpn: 'h2,http/1.1',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'safari',
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun'
    };

    const jsonStr = VmessLinkParser.toSingBoxConfigJson(profile);
    const config = JSON.parse(jsonStr);

    const proxy = config.outbounds.find((o: any) => o.tag === 'proxy');
    expect(proxy.type).toBe('vless');
    expect(proxy.tls.enabled).toBe(true);
    expect(proxy.tls.insecure).toBe(true);
    expect(proxy.tls.server_name).toBe('cdn.example.com');
    expect(proxy.tls.alpn).toEqual(['h2', 'http/1.1']);
    expect(proxy.tls.utls.fingerprint).toBe('safari');
    expect(proxy.transport.type).toBe('ws');
    expect(proxy.transport.path).toBe('/vless-ws');
    expect(proxy.transport.headers.Host).toBe('cdn.example.com');
  });

  // 3. grpc test
  it('should generate valid sing-box configuration for gRPC', () => {
    const profile = VmessLinkParser.parse(
      'vless://user-uuid-123@grpc.node.org:8443?type=grpc&security=tls&serviceName=my-grpc-service&mode=gun&sni=grpc.node.org#Germany%20gRPC'
    );

    const jsonStr = VmessLinkParser.toSingBoxConfigJson(profile);
    const config = JSON.parse(jsonStr);

    const proxy = config.outbounds.find((o: any) => o.tag === 'proxy');
    expect(proxy.type).toBe('vless');
    expect(proxy.transport.type).toBe('grpc');
    expect(proxy.transport.service_name).toBe('my-grpc-service');
  });

  // 4. h2 (http) test
  it('should generate valid sing-box configuration for HTTP/2 (h2)', () => {
    const profile: ServerProfile = {
      id: 'p-h2',
      name: 'VLESS H2',
      protocol: 'vless',
      address: 'h2.example.com',
      port: 443,
      uuid: '22222222-3333-4444-5555-666666666666',
      alterId: 0,
      security: 'none',
      network: 'h2',
      headerType: 'none',
      host: 'h2.example.com',
      path: '/h2path',
      tls: 'tls',
      sni: 'h2.example.com',
      alpn: 'h2',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'chrome',
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun'
    };

    const jsonStr = VmessLinkParser.toSingBoxConfigJson(profile);
    const config = JSON.parse(jsonStr);

    const proxy = config.outbounds.find((o: any) => o.tag === 'proxy');
    expect(proxy.transport.type).toBe('http');
    expect(proxy.transport.path).toBe('/h2path');
    expect(proxy.transport.host).toEqual(['h2.example.com']);
  });

  // 5. vmess test
  it('should generate valid sing-box configuration for VMess', () => {
    const vmessConfig = {
      v: '2',
      ps: 'US Cloudflare Node',
      add: 'cloudflare.cdn.com',
      port: 443,
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
      aid: 4,
      scy: 'auto',
      net: 'ws',
      type: 'none',
      host: 'cloudflare.cdn.com',
      path: '/vmess-path',
      tls: 'tls',
      sni: 'cloudflare.cdn.com',
      alpn: 'http/1.1'
    };
    const b64 = Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
    const profile = VmessLinkParser.parse(`vmess://${b64}`);

    const jsonStr = VmessLinkParser.toSingBoxConfigJson(profile);
    const config = JSON.parse(jsonStr);

    const proxy = config.outbounds.find((o: any) => o.tag === 'proxy');
    expect(proxy.type).toBe('vmess');
    expect(proxy.server).toBe('cloudflare.cdn.com');
    expect(proxy.uuid).toBe('a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6');
    expect(proxy.alter_id).toBe(4);
    expect(proxy.security).toBe('auto');
    expect(proxy.tls.insecure).toBe(true);
  });

  // 6. ad-block rule test
  it('should generate sing-box ad-block rule with reject action and rule_set', () => {
    const profile = VmessLinkParser.parse(
      'vless://b831381d-6324-4d53-ad4f-8cda48b30811@198.51.100.25:443?type=tcp&security=tls#Node'
    );

    const jsonStr = VmessLinkParser.toSingBoxConfigJson(profile, {
      ruleSetPath: 'C:\\Users\\User\\AppData\\Roaming\\v2raydp\\adblock.json'
    });
    const config = JSON.parse(jsonStr);

    // Rule set defined in route
    expect(config.route.rule_set).toBeDefined();
    expect(config.route.rule_set[0].tag).toBe('adblock');
    expect(config.route.rule_set[0].format).toBe('source');

    // Rule reject action in route rules
    const rejectRule = config.route.rules.find((r: any) => r.action === 'reject');
    expect(rejectRule).toBeDefined();
    expect(rejectRule.rule_set).toEqual(['adblock']);
  });

  // 7. bypass LAN test
  it('should handle bypass LAN setting in routing rules in correct order', () => {
    const profile = VmessLinkParser.parse(
      'vless://b831381d-6324-4d53-ad4f-8cda48b30811@198.51.100.25:443?type=tcp&security=tls#Node'
    );

    // With bypassLan: true
    const configWithBypass = JSON.parse(
      VmessLinkParser.toSingBoxConfigJson(profile, {
        bypassLan: true,
        blockedDomains: ['ad.doubleclick.net']
      })
    );

    const rules = configWithBypass.route.rules;
    // 1) sniff
    expect(rules[0].action).toBe('sniff');
    // 2) hijack-dns
    expect(rules[1].action).toBe('hijack-dns');
    expect(rules[1].protocol).toBe('dns');
    // 3) private/LAN IPs -> direct
    expect(rules[2].ip_is_private).toBe(true);
    expect(rules[2].outbound).toBe('direct');
    // 4) ad-block rule -> reject
    expect(rules[3].action).toBe('reject');
    // 5) proxy server's own address -> direct
    expect(rules[4].ip_cidr).toEqual(['198.51.100.25/32']);
    expect(rules[4].outbound).toBe('direct');

    // With bypassLan: false
    const configNoBypass = JSON.parse(
      VmessLinkParser.toSingBoxConfigJson(profile, {
        bypassLan: false
      })
    );
    const hasPrivateRule = configNoBypass.route.rules.some((r: any) => r.ip_is_private === true);
    expect(hasPrivateRule).toBe(false);
  });

  // 8. hotspot inbound test
  it('should add extra mixed inbound for hotspot sharing when enabled', () => {
    const profile = VmessLinkParser.parse(
      'vless://b831381d-6324-4d53-ad4f-8cda48b30811@198.51.100.25:443?type=tcp&security=tls#Node'
    );

    // Hotspot disabled: only tun-in
    const configDefault = JSON.parse(VmessLinkParser.toSingBoxConfigJson(profile, { enableHotspot: false }));
    expect(configDefault.inbounds).toHaveLength(1);
    expect(configDefault.inbounds[0].type).toBe('tun');

    // Hotspot enabled: tun-in + mixed-hotspot-in on 0.0.0.0
    const configHotspot = JSON.parse(
      VmessLinkParser.toSingBoxConfigJson(profile, {
        enableHotspot: true,
        hotspotPort: 10810,
        hotspotRequireAuth: true,
        hotspotUsername: 'hotspotUser',
        hotspotPassword: 'secretPassword'
      })
    );

    expect(configHotspot.inbounds).toHaveLength(2);
    const mixed = configHotspot.inbounds.find((i: any) => i.tag === 'mixed-hotspot-in');
    expect(mixed).toBeDefined();
    expect(mixed.type).toBe('mixed');
    expect(mixed.listen).toBe('0.0.0.0');
    expect(mixed.listen_port).toBe(10810);
    expect(mixed.users).toEqual([{ username: 'hotspotUser', password: 'secretPassword' }]);
  });
});
