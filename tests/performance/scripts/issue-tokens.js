#!/usr/bin/env node
// 부하테스트용 internal JWT 사전 발급. backend의 InternalApiJwtService와 동일한
// HMAC 서명 규칙(kid 헤더, iss/aud/uid/email/role/scope claim)을 그대로 따른다.
// 로그인 흐름을 타지 않고 backend가 신뢰하는 서명키로 직접 사인한다.
//
// 사용:
//   INTERNAL_API_JWT_ACTIVE_KID=dev-v1 \
//   INTERNAL_API_JWT_ACTIVE_SECRET=dev-internal-jwt-secret-key-change-me-1234567890 \
//   node tests/performance/scripts/issue-tokens.js --count=50
//
// kid/secret 값은 backend가 실제로 검증에 쓰는 .env.dev의 INTERNAL_API_JWT_ACTIVE_KID /
// INTERNAL_API_JWT_ACTIVE_SECRET 와 동일해야 한다.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ISSUER = process.env.INTERNAL_API_JWT_ISSUER || 'perfo-frontend';
const AUDIENCE = process.env.INTERNAL_API_JWT_AUDIENCE || 'perfo-backend-ticketing';
const KID = process.env.INTERNAL_API_JWT_ACTIVE_KID;
const SECRET = process.env.INTERNAL_API_JWT_ACTIVE_SECRET;
// 부하테스트 실행 시간 동안 토큰이 살아있어야 하므로 frontend의 실제 발급 TTL
// (INTERNAL_API_JWT_TTL_SECONDS, 보통 수십 초)과는 별개로 길게 잡는다.
const TTL_SECONDS = Number(process.env.LOAD_TEST_TOKEN_TTL_SECONDS || 3600);
// 시나리오마다 필요한 scope가 달라(ticketing / tickets / ticketing:projection) 한 토큰에
// 전부 넣어 재사용한다. scope claim은 공백으로 구분된 문자열이면 backend가 contains로 검사한다.
const SCOPE = process.env.LOAD_TEST_SCOPE || 'ticketing tickets ticketing:projection actuator';

function parseArgs(argv) {
  const out = {};
  for (const part of argv) {
    const [key, value] = part.replace(/^--/, '').split('=');
    out[key] = value === undefined ? true : value;
  }
  return out;
}

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function algorithmForSecret(secret) {
  const bits = Buffer.byteLength(secret, 'utf8') * 8;
  if (bits >= 512) return { alg: 'HS512', hmac: 'sha512' };
  if (bits >= 384) return { alg: 'HS384', hmac: 'sha384' };
  if (bits >= 256) return { alg: 'HS256', hmac: 'sha256' };
  throw new Error(`INTERNAL_API_JWT_ACTIVE_SECRET too short (${bits} bits) - need >=256 bits`);
}

function signToken({ uid, email, role }) {
  const { alg, hmac } = algorithmForSecret(SECRET);
  const header = { alg, typ: 'JWT', kid: KID };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER,
    aud: AUDIENCE,
    iat: now,
    exp: now + TTL_SECONDS,
    uid: String(uid),
    email,
    role,
    scope: SCOPE,
  };

  const signingInput = `${toBase64Url(Buffer.from(JSON.stringify(header)))}.${toBase64Url(Buffer.from(JSON.stringify(payload)))}`;
  const signature = toBase64Url(crypto.createHmac(hmac, SECRET).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

function main() {
  if (!KID || !SECRET) {
    console.error(
      'INTERNAL_API_JWT_ACTIVE_KID / INTERNAL_API_JWT_ACTIVE_SECRET 환경변수 필요 (.env.dev 값과 동일해야 backend가 서명을 검증할 수 있음)',
    );
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const count = Number(args.count || 50);
  const startUid = Number(args.startUid || 1);
  const outFile = args.out || path.join(__dirname, '..', 'data', 'tokens.json');

  const tokens = [];
  for (let i = 0; i < count; i += 1) {
    const uid = startUid + i;
    const email = `load-test-user-${uid}@perfo.test`;
    const role = 'USER';
    tokens.push({ uid, email, role, token: signToken({ uid, email, role }) });
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(tokens, null, 2));
  console.log(`${tokens.length}개 토큰 생성 -> ${outFile} (TTL ${TTL_SECONDS}s, scope="${SCOPE}")`);
  console.log('주의: uid는 토큰 claim일 뿐, DB users 테이블에 실제 row가 없으면 티켓팅 요청은 FK 위반으로 실패함 (시드 데이터 단계에서 맞춰야 함).');
}

main();
