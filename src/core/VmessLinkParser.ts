/**
 * v2rayDP Desktop - VLESS & VMess Link Parser & sing-box Config Generator
 * Built with full compatibility for sing-box 1.13+ (VPN TUN Mode)
 */

import { ServerProfile } from './types';

export interface SingBoxConfigOptions {
  clashApiPort?: number;
  clashApiSecret?: string;
  tunInterfaceName?: string;
  tunStack?: 'mixed' | 'gvisor' | 'system';
  strictRoute?: boolean;
  bypassLan?: boolean;
  enableHotspot?: boolean;
  hotspotPort?: number;
  hotspotRequireAuth?: boolean;
  hotspotUsername?: string;
  hotspotPassword?: string;
  primaryDns?: string;
  secondaryDns?: string;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'warning' | 'error' | 'none';
  ruleSetPath?: string;
  blockedDomains?: string[];
  bypassDirectDomains?: string[];
  bypassDirectIps?: string[];
  bypassProcesses?: string[];
}

export class VmessLinkParser {
  /**
   * Parses any supported share link (vless://, vmess://, trojan://)
   */
  static parse(link: string): ServerProfile {
    return this.parseShareLink(link);
  }

  static parseShareLink(link: string): ServerProfile {
    const trimmed = link.trim();
    if (trimmed.startsWith('vless://')) {
      return this.parseVlessLink(trimmed);
    } else if (trimmed.startsWith('vmess://')) {
      return this.parseVmessLink(trimmed);
    } else if (trimmed.startsWith('trojan://')) {
      return this.parseTrojanLink(trimmed);
    }
    throw new Error('Unsupported protocol: link must start with vless://, vmess://, or trojan://');
  }

  /**
   * VLESS URI format:
   * vless://uuid@host:port?type=ws&security=tls&path=/...#remarks
   */
  static parseVlessLink(link: string): ServerProfile {
    const withoutScheme = link.substring(8).trim();
    const fragmentIndex = withoutScheme.indexOf('#');
    let remarks = 'VLESS Node';
    if (fragmentIndex !== -1) {
      try {
        remarks = decodeURIComponent(withoutScheme.substring(fragmentIndex + 1)).trim();
      } catch {
        remarks = withoutScheme.substring(fragmentIndex + 1).trim() || 'VLESS Node';
      }
    }

    const mainPart = fragmentIndex !== -1 ? withoutScheme.substring(0, fragmentIndex) : withoutScheme;
    const queryIndex = mainPart.indexOf('?');
    const authorityPart = queryIndex !== -1 ? mainPart.substring(0, queryIndex) : mainPart;
    const queryPart = queryIndex !== -1 ? mainPart.substring(queryIndex + 1) : '';

    const atIndex = authorityPart.lastIndexOf('@');
    if (atIndex === -1) {
      throw new Error("Invalid VLESS URI: Missing '@' user delimiter");
    }

    const uuid = authorityPart.substring(0, atIndex).trim();
    let hostPort = authorityPart.substring(atIndex + 1).trim();
    if (hostPort.endsWith('/')) {
      hostPort = hostPort.slice(0, -1);
    }

    let address = '';
    let port = 443;

    if (hostPort.startsWith('[')) {
      // IPv6: [::1]:port
      const closeBracket = hostPort.indexOf(']');
      if (closeBracket === -1) {
        throw new Error("Invalid IPv6 address in VLESS URI: Missing closing bracket ']'");
      }
      address = hostPort.substring(1, closeBracket).trim();
      const portStr = hostPort.substring(closeBracket + 1).replace(/^:/, '').replace(/\/$/, '').trim();
      port = parseInt(portStr, 10) || 443;
    } else if (hostPort.includes(':')) {
      const colonIndex = hostPort.lastIndexOf(':');
      address = hostPort.substring(0, colonIndex).trim().replace(/\/$/, '');
      const portStr = hostPort.substring(colonIndex + 1).replace(/^:/, '').replace(/\/$/, '').trim();
      port = parseInt(portStr, 10) || 443;
    } else {
      address = hostPort.replace(/\/$/, '');
      port = 443;
    }

    // Parse query params case-insensitively
    const queryMap: Record<string, string> = {};
    if (queryPart.length > 0) {
      const pairs = queryPart.split('&');
      for (const pair of pairs) {
        const eq = pair.indexOf('=');
        if (eq !== -1) {
          const key = pair.substring(0, eq).trim().toLowerCase();
          const rawVal = pair.substring(eq + 1).trim();
          try {
            queryMap[key] = decodeURIComponent(rawVal);
          } catch {
            queryMap[key] = rawVal;
          }
        }
      }
    }

    const networkRaw = (queryMap['type'] || queryMap['net'] || 'tcp').toLowerCase().trim();
    if (networkRaw === 'xhttp' || networkRaw === 'splithttp' || networkRaw === 'kcp') {
      throw new Error('Transport not supported by sing-box');
    }
    const network = networkRaw as 'tcp' | 'ws' | 'grpc' | 'h2';

    const securityRaw = (queryMap['security'] || 'none').toLowerCase().trim();
    const tls: 'none' | 'tls' | 'reality' =
      securityRaw === 'reality' ? 'reality' : (securityRaw === 'tls' ? 'tls' : 'none');

    const sni = queryMap['sni'] || queryMap['peer'] || '';
    const alpn = queryMap['alpn'] || '';
    const flow = queryMap['flow'] || '';
    const publicKey = queryMap['pbk'] || '';
    const shortId = queryMap['sid'] || '';
    const fingerprint = queryMap['fp'] || 'chrome';
    const spiderX = queryMap['spx'] || '/';
    const host = queryMap['host'] || '';
    const path = queryMap['path'] || '/';
    const serviceName = queryMap['servicename'] || '';
    const grpcMode = queryMap['mode'] || 'gun';
    const headerType = queryMap['headerType'] || queryMap['headertype'] || 'none';
    const pinnedPeerCertSha256 = queryMap['pcs'] || '';
    const verifyPeerCertByName = queryMap['vcn'] || '';

    const allowInsecureRaw = queryMap['allowinsecure'] || queryMap['insecure'];
    const allowInsecure = allowInsecureRaw !== undefined ? allowInsecureRaw === '1' || allowInsecureRaw === 'true' : true;

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
      name: remarks,
      protocol: 'vless',
      address,
      port,
      uuid,
      alterId: 0,
      security: 'none',
      network,
      headerType,
      host,
      path,
      tls,
      sni,
      alpn,
      flow,
      publicKey,
      shortId,
      fingerprint,
      spiderX,
      serviceName,
      grpcMode,
      pinnedPeerCertSha256,
      verifyPeerCertByName,
      allowInsecure,
      pingLatencyMs: -1,
      createdAt: Date.now()
    };
  }

  /**
   * Trojan URI format:
   * trojan://password@host:port?security=tls&type=tcp&sni=...#remarks
   */
  static parseTrojanLink(link: string): ServerProfile {
    const withoutScheme = link.substring(9).trim();
    const fragmentIndex = withoutScheme.indexOf('#');
    let remarks = 'Trojan Node';
    if (fragmentIndex !== -1) {
      try {
        remarks = decodeURIComponent(withoutScheme.substring(fragmentIndex + 1)).trim();
      } catch {
        remarks = withoutScheme.substring(fragmentIndex + 1).trim() || 'Trojan Node';
      }
    }

    const mainPart = fragmentIndex !== -1 ? withoutScheme.substring(0, fragmentIndex) : withoutScheme;
    const queryIndex = mainPart.indexOf('?');
    const authorityPart = queryIndex !== -1 ? mainPart.substring(0, queryIndex) : mainPart;
    const queryPart = queryIndex !== -1 ? mainPart.substring(queryIndex + 1) : '';

    const atIndex = authorityPart.lastIndexOf('@');
    if (atIndex === -1) {
      throw new Error("Invalid Trojan URI: Missing '@' password delimiter");
    }

    const password = authorityPart.substring(0, atIndex).trim();
    let hostPort = authorityPart.substring(atIndex + 1).trim();
    if (hostPort.endsWith('/')) {
      hostPort = hostPort.slice(0, -1);
    }

    let address = '';
    let port = 443;

    if (hostPort.startsWith('[')) {
      const closeBracket = hostPort.indexOf(']');
      if (closeBracket === -1) {
        throw new Error("Invalid IPv6 address in Trojan URI: Missing closing bracket ']'");
      }
      address = hostPort.substring(1, closeBracket).trim();
      const portStr = hostPort.substring(closeBracket + 1).replace(/^:/, '').replace(/\/$/, '').trim();
      port = parseInt(portStr, 10) || 443;
    } else if (hostPort.includes(':')) {
      const colonIndex = hostPort.lastIndexOf(':');
      address = hostPort.substring(0, colonIndex).trim().replace(/\/$/, '');
      const portStr = hostPort.substring(colonIndex + 1).replace(/^:/, '').replace(/\/$/, '').trim();
      port = parseInt(portStr, 10) || 443;
    } else {
      address = hostPort.replace(/\/$/, '');
      port = 443;
    }

    const queryMap: Record<string, string> = {};
    if (queryPart.length > 0) {
      const pairs = queryPart.split('&');
      for (const pair of pairs) {
        const eq = pair.indexOf('=');
        if (eq !== -1) {
          const key = pair.substring(0, eq).trim().toLowerCase();
          const rawVal = pair.substring(eq + 1).trim();
          try {
            queryMap[key] = decodeURIComponent(rawVal);
          } catch {
            queryMap[key] = rawVal;
          }
        }
      }
    }

    const networkRaw = (queryMap['type'] || queryMap['net'] || 'tcp').toLowerCase().trim();
    if (networkRaw === 'xhttp' || networkRaw === 'splithttp' || networkRaw === 'kcp') {
      throw new Error('Transport not supported by sing-box');
    }
    const network = networkRaw as 'tcp' | 'ws' | 'grpc' | 'h2';

    const sni = queryMap['sni'] || queryMap['peer'] || '';
    const alpn = queryMap['alpn'] || '';
    const fingerprint = queryMap['fp'] || 'chrome';
    const host = queryMap['host'] || '';
    const path = queryMap['path'] || '/';
    const pinnedPeerCertSha256 = queryMap['pcs'] || '';
    const verifyPeerCertByName = queryMap['vcn'] || '';

    const allowInsecureRaw = queryMap['allowinsecure'] || queryMap['insecure'];
    const allowInsecure = allowInsecureRaw !== undefined ? allowInsecureRaw === '1' || allowInsecureRaw === 'true' : true;

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
      name: remarks,
      protocol: 'trojan',
      address,
      port,
      uuid: password,
      alterId: 0,
      security: 'none',
      network,
      headerType: 'none',
      host,
      path,
      tls: 'tls',
      sni,
      alpn,
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint,
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun',
      pinnedPeerCertSha256,
      verifyPeerCertByName,
      allowInsecure,
      pingLatencyMs: -1,
      createdAt: Date.now()
    };
  }

  /**
   * VMess link parser - supports Base64 JSON and Shadowrocket URI formats.
   */
  static parseVmessLink(link: string): ServerProfile {
    const rawData = link.substring(8).trim();

    // Check if JSON base64
    if (!rawData.includes('@') && !rawData.includes('?')) {
      try {
        const decoded = this.decodeFlexibleBase64(rawData);
        const json = JSON.parse(decoded);

        const remarks = json.ps || 'VMess Server';
        const address = json.add || '';
        const port = parseInt(json.port, 10) || 443;
        const uuid = json.id || '';
        const alterId = parseInt(json.aid, 10) || 0;
        const security = json.scy || 'auto';

        const netRaw = (json.net || 'tcp').toLowerCase().trim();
        if (netRaw === 'xhttp' || netRaw === 'splithttp' || netRaw === 'kcp') {
          throw new Error('Transport not supported by sing-box');
        }
        const network = netRaw as 'tcp' | 'ws' | 'grpc' | 'h2';

        const headerType = json.type || 'none';
        const host = json.host || '';
        let path = json.path || '/';
        if (!path.startsWith('/')) {
          path = `/${path}`;
        }
        const tls = (json.tls || '').toLowerCase() === 'tls' ? 'tls' : 'none';
        const sni = json.sni || host || address;
        const alpn = json.alpn || '';
        const fingerprint = json.fp || '';
        const pinnedPeerCertSha256 = json.pcs || '';
        const verifyPeerCertByName = json.vcn || '';

        return {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
          name: remarks,
          protocol: 'vmess',
          address,
          port,
          uuid,
          alterId,
          security,
          network,
          headerType,
          host,
          path,
          tls,
          sni,
          alpn,
          flow: '',
          publicKey: '',
          shortId: '',
          fingerprint,
          spiderX: '',
          serviceName: json.serviceName || '',
          grpcMode: 'gun',
          pinnedPeerCertSha256,
          verifyPeerCertByName,
          allowInsecure: true,
          pingLatencyMs: -1,
          createdAt: Date.now()
        };
      } catch (err) {
        if ((err as Error)?.message?.includes('Transport not supported by sing-box')) {
          throw err;
        }
        // Fall back to URI parsing
      }
    }

    // Shadowrocket URI format: vmess://base64(security:uuid@host:port)?remarks=...
    let clean = rawData;
    let queryPart = '';
    const qIndex = clean.indexOf('?');
    if (qIndex !== -1) {
      queryPart = clean.substring(qIndex + 1);
      clean = clean.substring(0, qIndex);
    }

    let decodedAuthority = clean;
    try {
      decodedAuthority = this.decodeFlexibleBase64(clean);
    } catch {}

    const atIndex = decodedAuthority.lastIndexOf('@');
    const userInfo = atIndex !== -1 ? decodedAuthority.substring(0, atIndex) : '';
    const authority = atIndex !== -1 ? decodedAuthority.substring(atIndex + 1) : decodedAuthority;

    const hostPort = authority;
    const userParts = userInfo.split(':');
    const security = userParts.length > 1 ? userParts[0] : 'auto';
    const uuid = userParts.length > 1 ? userParts[1] : userParts[0];

    const colonIndex = hostPort.lastIndexOf(':');
    const address = colonIndex !== -1 ? hostPort.substring(0, colonIndex).replace(/\/$/, '') : hostPort;
    const port = colonIndex !== -1 ? parseInt(hostPort.substring(colonIndex + 1), 10) || 443 : 443;

    const queryParams = new URLSearchParams(queryPart);
    const remarks = queryParams.get('remarks') || 'VMess Server';

    const netRaw = (queryParams.get('obfs') || queryParams.get('net') || 'tcp').toLowerCase().trim();
    if (netRaw === 'xhttp' || netRaw === 'splithttp' || netRaw === 'kcp') {
      throw new Error('Transport not supported by sing-box');
    }
    const network = netRaw as 'tcp' | 'ws' | 'grpc' | 'h2';

    let path = queryParams.get('path') || '/';
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    const host = queryParams.get('obfsParam') || queryParams.get('host') || '';
    const tlsRaw = queryParams.get('tls');
    const tls = tlsRaw === '1' || tlsRaw === 'tls' ? 'tls' : 'none';
    const sni = queryParams.get('peer') || queryParams.get('sni') || host || address;
    const pcs = queryParams.get('pcs') || queryParams.get('pinnedPeerCertSha256') || '';
    const vcn = queryParams.get('vcn') || queryParams.get('verifyPeerCertByName') || '';
    const fp = queryParams.get('fp') || '';

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12),
      name: remarks,
      protocol: 'vmess',
      address,
      port,
      uuid,
      alterId: 0,
      security,
      network,
      headerType: 'none',
      host,
      path,
      tls,
      sni,
      alpn: '',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: fp,
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun',
      pinnedPeerCertSha256: pcs,
      verifyPeerCertByName: vcn,
      allowInsecure: true,
      pingLatencyMs: -1,
      createdAt: Date.now()
    };
  }

  /**
   * Converts a ServerProfile into the appropriate share link.
   */
  static toShareLink(profile: ServerProfile): string {
    if (profile.protocol === 'trojan') {
      return this.toTrojanLink(profile);
    }
    return profile.protocol === 'vless' ? this.toVlessLink(profile) : this.toVmessLink(profile);
  }

  static toTrojanLink(profile: ServerProfile): string {
    const encodedName = encodeURIComponent(profile.name || 'Trojan Node');
    let link = `trojan://${encodeURIComponent(profile.uuid)}@${profile.address}:${profile.port}?security=tls&type=${profile.network || 'tcp'}`;
    if (profile.sni) link += `&sni=${encodeURIComponent(profile.sni)}`;
    if (profile.fingerprint) link += `&fp=${encodeURIComponent(profile.fingerprint)}`;
    if (profile.alpn) link += `&alpn=${encodeURIComponent(profile.alpn)}`;
    if (profile.allowInsecure === false) link += `&insecure=0`;
    if (profile.network === 'ws') {
      link += `&path=${encodeURIComponent(profile.path || '/')}`;
      if (profile.host) link += `&host=${encodeURIComponent(profile.host)}`;
    }
    link += `#${encodedName}`;
    return link;
  }

  static toVlessLink(profile: ServerProfile): string {
    const encodedPath = encodeURIComponent(profile.path || '/');
    const encodedName = encodeURIComponent(profile.name || 'VLESS Node');
    const sec = profile.tls === 'reality' ? 'reality' : (profile.tls === 'tls' ? 'tls' : 'none');

    let link = `vless://${profile.uuid}@${profile.address}:${profile.port}?type=${profile.network}&security=${sec}&path=${encodedPath}`;

    if (profile.sni) link += `&sni=${encodeURIComponent(profile.sni)}`;
    if (profile.fingerprint) link += `&fp=${encodeURIComponent(profile.fingerprint)}`;
    if (profile.alpn) link += `&alpn=${encodeURIComponent(profile.alpn)}`;
    if (profile.flow) link += `&flow=${encodeURIComponent(profile.flow)}`;
    if (profile.allowInsecure === false) link += `&insecure=0`;

    if (sec === 'reality') {
      if (profile.publicKey) link += `&pbk=${encodeURIComponent(profile.publicKey)}`;
      if (profile.shortId) link += `&sid=${encodeURIComponent(profile.shortId)}`;
      if (profile.spiderX) link += `&spx=${encodeURIComponent(profile.spiderX)}`;
    }

    if (profile.network === 'ws' && profile.host) {
      link += `&host=${encodeURIComponent(profile.host)}`;
    } else if (profile.network === 'grpc' && profile.serviceName) {
      link += `&serviceName=${encodeURIComponent(profile.serviceName)}`;
    }

    link += `#${encodedName}`;
    return link;
  }

  static toVmessLink(profile: ServerProfile): string {
    const json = {
      v: '2',
      ps: profile.name || 'VMess Node',
      add: profile.address,
      port: profile.port,
      id: profile.uuid,
      aid: profile.alterId || 0,
      scy: profile.security || 'auto',
      net: profile.network || 'tcp',
      type: profile.headerType || 'none',
      host: profile.host || '',
      path: profile.path || '/',
      tls: profile.tls === 'tls' ? 'tls' : '',
      sni: profile.sni || '',
      alpn: profile.alpn || '',
      fp: profile.fingerprint || ''
    };

    const raw = JSON.stringify(json, null, 2);
    let base64 = '';
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(raw).toString('base64');
    } else {
      base64 = btoa(unescape(encodeURIComponent(raw)));
    }

    return `vmess://${base64}`;
  }

  /**
   * Helper to parse DNS server address from settings into typed format
   * (1.1.1.1, tcp://..., udp://..., tls://..., https://host/path, optional :port)
   * A bare IP means udp.
   */
  private static parseDnsServer(rawDns: string, tag: string, detour: string): Record<string, unknown> {
    const raw = (rawDns || '').trim();
    if (!raw) {
      return {
        type: 'udp',
        tag,
        server: '1.1.1.1',
        detour
      };
    }

    let scheme = '';
    let rest = raw;
    if (raw.includes('://')) {
      const idx = raw.indexOf('://');
      scheme = raw.substring(0, idx).toLowerCase();
      rest = raw.substring(idx + 3);
    }

    // A bare IP or host means udp
    let type = scheme || 'udp';
    if (type === 'doh') type = 'https';
    if (type === 'dot') type = 'tls';

    let path: string | undefined;
    if (rest.includes('/')) {
      const slashIdx = rest.indexOf('/');
      path = rest.substring(slashIdx);
      rest = rest.substring(0, slashIdx);
    }

    let server = rest;
    let serverPort: number | undefined;

    if (server.startsWith('[') && server.includes(']')) {
      const closeBracket = server.indexOf(']');
      const after = server.substring(closeBracket + 1);
      server = server.substring(1, closeBracket);
      if (after.startsWith(':')) {
        const p = parseInt(after.substring(1), 10);
        if (!isNaN(p)) serverPort = p;
      }
    } else if (server.includes(':')) {
      const colonCount = (server.match(/:/g) || []).length;
      if (colonCount === 1) {
        const [h, pStr] = server.split(':');
        server = h;
        const p = parseInt(pStr, 10);
        if (!isNaN(p)) serverPort = p;
      }
    }

    const obj: Record<string, unknown> = {
      type,
      tag,
      server,
      detour
    };
    if (serverPort !== undefined) {
      obj.server_port = serverPort;
    }
    if (path) {
      obj.path = path;
    }
    return obj;
  }

  /**
   * Generates a fully compliant sing-box 1.13+ config JSON
   * Strict adherence to sing-box 1.13 TUN VPN specifications:
   * - Typed DNS server format (no legacy DNS syntax)
   * - No deprecated inbound fields (no `sniff: true` in tun or mixed inbounds)
   * - packet_encoding only on vmess/vless (not trojan)
   * - Reality requires utls with chrome default
   * - Respects profile.allowInsecure !== false
   * - default_domain_resolver: 'dns-direct'
   */
  static toSingBoxConfigJson(profile: ServerProfile, options: SingBoxConfigOptions = {}): string {
    const tunInterface = options.tunInterfaceName || 'v2rayDP-TUN';
    const bypassLan = options.bypassLan !== false;
    const primaryDns = options.primaryDns || '1.1.1.1';
    const secondaryDns = options.secondaryDns || '8.8.8.8';
    const clashPort = options.clashApiPort || 9090;

    // 1. Log configuration
    let lvl = 'warn';
    if (options.logLevel === 'debug') lvl = 'debug';
    else if (options.logLevel === 'info') lvl = 'info';
    else if (options.logLevel === 'error') lvl = 'error';
    else if (options.logLevel === 'trace') lvl = 'trace';
    else if (options.logLevel === 'none') lvl = 'panic';
    else if (options.logLevel === 'warn' || options.logLevel === 'warning') lvl = 'warn';

    const log = {
      disabled: options.logLevel === 'none',
      level: lvl,
      timestamp: true
    };

    // 2. Inbounds
    const tunStack = options.tunStack || 'mixed';
    const strictRoute = options.strictRoute !== false;

    // tun inbound: strict_route, auto_route true, stack, no sniff field
    const inbounds: Record<string, unknown>[] = [
      {
        type: 'tun',
        tag: 'tun-in',
        interface_name: tunInterface,
        address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
        auto_route: true,
        strict_route: strictRoute,
        stack: tunStack
      }
    ];

    // Optional Hotspot mixed inbound (SOCKS5 + HTTP) on 0.0.0.0 (no sniff field)
    if (options.enableHotspot) {
      const hotspotInbound: Record<string, unknown> = {
        type: 'mixed',
        tag: 'mixed-hotspot-in',
        listen: '0.0.0.0',
        listen_port: options.hotspotPort || 10808
      };
      if (options.hotspotRequireAuth && options.hotspotUsername) {
        hotspotInbound.users = [
          {
            username: options.hotspotUsername,
            password: options.hotspotPassword || ''
          }
        ];
      }
      inbounds.push(hotspotInbound);
    }

    // 3. Outbounds
    const isVless = profile.protocol === 'vless';
    const isTrojan = profile.protocol === 'trojan';
    const isReality = profile.tls === 'reality' || Boolean(profile.publicKey);
    const isTls = profile.tls === 'tls' || isReality;

    const proxyOutbound: Record<string, unknown> = {
      type: isTrojan ? 'trojan' : isVless ? 'vless' : 'vmess',
      tag: 'proxy',
      server: profile.address,
      server_port: profile.port,
      domain_resolver: 'dns-direct'
    };

    // packet_encoding is only valid for VMess and VLESS (never for Trojan)
    if (!isTrojan) {
      proxyOutbound.packet_encoding = 'xudp';
    }

    if (isTrojan) {
      proxyOutbound.password = profile.uuid;
    } else if (isVless) {
      proxyOutbound.uuid = profile.uuid;
      if (profile.flow && (profile.network === 'tcp' || (profile.network as string) === 'raw')) {
        proxyOutbound.flow = profile.flow;
      }
    } else {
      proxyOutbound.uuid = profile.uuid;
      proxyOutbound.security = profile.security || 'auto';
      proxyOutbound.alter_id = profile.alterId || 0;
    }

    // TLS Settings
    if (isTls) {
      const tlsSettings: Record<string, unknown> = {
        enabled: true,
        server_name: profile.sni || profile.address,
        insecure: profile.allowInsecure !== false
      };

      if (profile.alpn) {
        tlsSettings.alpn = profile.alpn
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (isReality) {
        tlsSettings.utls = {
          enabled: true,
          fingerprint: profile.fingerprint || 'chrome'
        };
        tlsSettings.reality = {
          enabled: true,
          public_key: profile.publicKey,
          short_id: profile.shortId || ''
        };
      } else if (profile.fingerprint) {
        tlsSettings.utls = {
          enabled: true,
          fingerprint: profile.fingerprint
        };
      }

      proxyOutbound.tls = tlsSettings;
    }

    // Transports: tcp, ws, grpc, http (h2), httpupgrade
    const netType = (profile.network || 'tcp').toLowerCase();
    if (netType === 'ws') {
      let wsPath = profile.path || '/';
      if (!wsPath.startsWith('/')) wsPath = `/${wsPath}`;
      const wsObj: Record<string, unknown> = {
        type: 'ws',
        path: wsPath
      };
      if (profile.host) {
        wsObj.headers = { Host: profile.host };
      }
      proxyOutbound.transport = wsObj;
    } else if (netType === 'grpc') {
      proxyOutbound.transport = {
        type: 'grpc',
        service_name: profile.serviceName || (profile.path ? profile.path.replace(/^\//, '') : '')
      };
    } else if (netType === 'h2' || netType === 'http') {
      let h2Path = profile.path || '/';
      if (!h2Path.startsWith('/')) h2Path = `/${h2Path}`;
      const httpObj: Record<string, unknown> = {
        type: 'http',
        path: h2Path
      };
      if (profile.host) {
        httpObj.host = [profile.host];
      }
      proxyOutbound.transport = httpObj;
    } else if (netType === 'httpupgrade') {
      let upPath = profile.path || '/';
      if (!upPath.startsWith('/')) upPath = `/${upPath}`;
      const upObj: Record<string, unknown> = {
        type: 'httpupgrade',
        path: upPath
      };
      if (profile.host) {
        upObj.host = profile.host;
      }
      proxyOutbound.transport = upObj;
    }

    const outbounds: Record<string, unknown>[] = [
      proxyOutbound,
      {
        type: 'direct',
        tag: 'direct'
      }
    ];

    // 4. DNS: typed format (no legacy DNS syntax)
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(profile.address);

    const dnsServers: Record<string, unknown>[] = [
      this.parseDnsServer(primaryDns, 'dns-remote-pri', 'proxy'),
      this.parseDnsServer(secondaryDns, 'dns-remote-sec', 'proxy'),
      {
        type: 'local',
        tag: 'dns-direct'
      }
    ];

    const dnsRules: Record<string, unknown>[] = [];
    if (!isIpAddress && profile.address) {
      dnsRules.push({
        domain: [profile.address],
        action: 'route',
        server: 'dns-direct'
      });
    }

    const dns = {
      servers: dnsServers,
      rules: dnsRules,
      final: 'dns-remote-pri',
      strategy: 'prefer_ipv4'
    };

    // 5. Route Rules in required order:
    // 1) sniff
    // 2) hijack-dns for protocol dns
    // 3) private/LAN IPs -> direct (controlled by bypass LAN setting)
    // 4) ad-block rule -> reject
    // 5) the proxy server address -> direct
    const routeRules: Record<string, unknown>[] = [];

    // 1) sniff
    routeRules.push({
      action: 'sniff'
    });

    // 2) hijack-dns for protocol dns
    routeRules.push({
      protocol: 'dns',
      action: 'hijack-dns'
    });

    // 3) private/LAN IPs -> direct (controlled by bypass LAN setting)
    if (bypassLan) {
      routeRules.push({
        ip_is_private: true,
        outbound: 'direct'
      });
    }

    // 4) ad-block rule -> reject
    const ruleSets: Record<string, unknown>[] = [];
    if (options.ruleSetPath) {
      const isBinary = options.ruleSetPath.endsWith('.srs');
      ruleSets.push({
        tag: 'adblock',
        type: 'local',
        format: isBinary ? 'binary' : 'source',
        path: options.ruleSetPath
      });
      routeRules.push({
        rule_set: ['adblock'],
        action: 'reject'
      });
    } else if (options.blockedDomains && options.blockedDomains.length > 0) {
      routeRules.push({
        domain_suffix: options.blockedDomains,
        action: 'reject'
      });
    }

    // Exclude / Split Tunneling direct rules
    if (options.bypassProcesses && options.bypassProcesses.length > 0) {
      routeRules.push({
        process_name: options.bypassProcesses,
        outbound: 'direct'
      });
    }
    if (options.bypassDirectDomains && options.bypassDirectDomains.length > 0) {
      routeRules.push({
        domain_suffix: options.bypassDirectDomains,
        outbound: 'direct'
      });
    }
    if (options.bypassDirectIps && options.bypassDirectIps.length > 0) {
      routeRules.push({
        ip_cidr: options.bypassDirectIps,
        outbound: 'direct'
      });
    }

    // 5) the proxy server's own address -> direct
    if (profile.address) {
      if (isIpAddress) {
        const cidr = profile.address.includes(':') ? `${profile.address}/128` : `${profile.address}/32`;
        routeRules.push({
          ip_cidr: [cidr],
          outbound: 'direct'
        });
      } else {
        routeRules.push({
          domain: [profile.address],
          outbound: 'direct'
        });
      }
    }

    const route: Record<string, unknown> = {
      auto_detect_interface: true,
      default_domain_resolver: 'dns-direct',
      final: 'proxy',
      rules: routeRules
    };

    if (ruleSets.length > 0) {
      route.rule_set = ruleSets;
    }

    // 6. Experimental: clash_api on 127.0.0.1
    const experimental = {
      clash_api: {
        external_controller: `127.0.0.1:${clashPort}`,
        secret: options.clashApiSecret || ''
      }
    };

    const rootConfig = {
      log,
      dns,
      inbounds,
      outbounds,
      route,
      experimental
    };

    return JSON.stringify(rootConfig, null, 2);
  }

  /**
   * Alias for backward compatibility if called elsewhere.
   */
  static toV2RayConfigJson(profile: ServerProfile, options: any = {}): string {
    return this.toSingBoxConfigJson(profile, options);
  }

  private static decodeFlexibleBase64(input: string): string {
    let sanitized = input
      .trim()
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/[\r\n\s]/g, '');

    const remainder = sanitized.length % 4;
    if (remainder > 0) {
      sanitized += '='.repeat(4 - remainder);
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(sanitized, 'base64').toString('utf8');
    } else {
      return decodeURIComponent(escape(atob(sanitized)));
    }
  }
}
