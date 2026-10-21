import { VmessLinkParser } from '../src/core/VmessLinkParser';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { ServerProfile } from '../src/core/types';

export function getSingBoxBinary(): string {
  const isWin = process.platform === 'win32';
  const winBin = path.resolve(process.cwd(), 'resources/bin/sing-box.exe');
  const linuxBin = path.resolve(process.cwd(), 'resources/bin/sing-box');
  const tmpBin = '/tmp/sing-box';

  if (isWin && fs.existsSync(winBin)) return winBin;
  if (fs.existsSync(linuxBin)) return linuxBin;
  if (fs.existsSync(tmpBin)) return tmpBin;
  return 'sing-box';
}

export const sampleProfiles: { name: string; profile: ServerProfile }[] = [
  // 1. VLESS TCP + Reality + Vision
  {
    name: 'VLESS TCP + Reality + Vision',
    profile: VmessLinkParser.parse(
      'vless://b831381d-6324-4d53-ad4f-8cda48b30811@198.51.100.25:443?type=tcp&security=reality&pbk=BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc&sid=12345678&fp=chrome&spx=%2F&flow=xtls-rprx-vision&sni=www.apple.com#VLESS-Reality-Vision'
    )
  },
  // 2. VLESS WS + TLS (with a different SNI and Host)
  {
    name: 'VLESS WS + TLS (diff SNI/Host)',
    profile: {
      id: 'prof-vless-ws',
      name: 'VLESS WS TLS',
      protocol: 'vless',
      address: 'cdn-server.example.com',
      port: 443,
      uuid: '22222222-3333-4444-5555-666666666666',
      alterId: 0,
      security: 'none',
      network: 'ws',
      headerType: 'none',
      host: 'host-header.cloudflare.com',
      path: '/vless-ws-path',
      tls: 'tls',
      sni: 'custom-sni.google.com',
      alpn: 'h2,http/1.1',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'chrome',
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun',
      allowInsecure: true
    }
  },
  // 3. VLESS gRPC + TLS
  {
    name: 'VLESS gRPC + TLS',
    profile: {
      id: 'prof-vless-grpc',
      name: 'VLESS gRPC TLS',
      protocol: 'vless',
      address: 'grpc.example.org',
      port: 443,
      uuid: '33333333-4444-5555-6666-777777777777',
      alterId: 0,
      security: 'none',
      network: 'grpc',
      headerType: 'none',
      host: '',
      path: '',
      tls: 'tls',
      sni: 'grpc.example.org',
      alpn: 'h2',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'firefox',
      spiderX: '',
      serviceName: 'my-grpc-service',
      grpcMode: 'gun',
      allowInsecure: true
    }
  },
  // 4. VMess WS + TLS
  {
    name: 'VMess WS + TLS',
    profile: {
      id: 'prof-vmess-ws',
      name: 'VMess WS TLS',
      protocol: 'vmess',
      address: 'vmess-cdn.example.net',
      port: 443,
      uuid: '44444444-5555-6666-7777-888888888888',
      alterId: 0,
      security: 'auto',
      network: 'ws',
      headerType: 'none',
      host: 'vmess-host.example.net',
      path: '/vmess-ws',
      tls: 'tls',
      sni: 'vmess-sni.example.net',
      alpn: 'http/1.1',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'chrome',
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun',
      allowInsecure: true
    }
  },
  // 5. VMess TCP
  {
    name: 'VMess TCP',
    profile: {
      id: 'prof-vmess-tcp',
      name: 'VMess TCP',
      protocol: 'vmess',
      address: '198.51.100.99',
      port: 10086,
      uuid: '55555555-6666-7777-8888-999999999999',
      alterId: 0,
      security: 'auto',
      network: 'tcp',
      headerType: 'none',
      host: '',
      path: '',
      tls: 'none',
      sni: '',
      alpn: '',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: '',
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun',
      allowInsecure: false
    }
  },
  // 6. Trojan TLS
  {
    name: 'Trojan TLS',
    profile: {
      id: 'prof-trojan-tls',
      name: 'Trojan TLS',
      protocol: 'trojan',
      address: 'trojan-node.example.org',
      port: 443,
      uuid: 'strong-trojan-password-1234',
      alterId: 0,
      security: 'none',
      network: 'tcp',
      headerType: 'none',
      host: '',
      path: '',
      tls: 'tls',
      sni: 'trojan-node.example.org',
      alpn: 'h2,http/1.1',
      flow: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'chrome',
      spiderX: '',
      serviceName: '',
      grpcMode: 'gun',
      allowInsecure: true
    }
  }
];

export function checkProfileConfig(profile: ServerProfile, binaryPath?: string): { success: boolean; output: string } {
  const bin = binaryPath || getSingBoxBinary();
  const configJson = VmessLinkParser.toSingBoxConfigJson(profile, { clashApiPort: 9090 });
  const tmpFile = path.resolve(process.cwd(), `.tmp_check_${profile.id || 'prof'}.json`);
  
  try {
    fs.writeFileSync(tmpFile, configJson, 'utf-8');
    const result = execFileSync(bin, ['check', '-c', tmpFile], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Check for ERROR or FATAL in output
    const cleanOutput = (result || '').replace(/\x1b\[[0-9;]*m/g, '');
    if (cleanOutput.includes('ERROR') || cleanOutput.includes('FATAL')) {
      return { success: false, output: cleanOutput };
    }
    return { success: true, output: cleanOutput };
  } catch (err: any) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || '';
    const combined = (stdout + '\n' + stderr).replace(/\x1b\[[0-9;]*m/g, '');
    return { success: false, output: combined };
  } finally {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {}
  }
}

if (process.argv[1] && process.argv[1].endsWith('check-configs.ts')) {
  console.log(`Using sing-box binary: ${getSingBoxBinary()}`);
  let allPass = true;
  for (const item of sampleProfiles) {
    const res = checkProfileConfig(item.profile);
    if (!res.success) {
      console.error(`❌ FAILED: ${item.name}\n${res.output}`);
      allPass = false;
    } else {
      console.log(`✅ PASSED: ${item.name}`);
    }
  }
  if (!allPass) {
    process.exit(1);
  }
  console.log('All 6 sing-box configurations verified successfully!');
}
