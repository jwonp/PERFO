# PERFO 윈도우 서버 배포 및 보안 가이드

> 남는 윈도우 PC를 PERFO 티켓팅 서버로 활용하기 위한 종합 가이드

## 목차

1. [사전 준비](#1-사전-준비)
2. [소프트웨어 설치](#2-소프트웨어-설치)
3. [프로젝트 배포](#3-프로젝트-배포)
4. [네트워크 설정](#4-네트워크-설정)
5. [HTTPS 설정](#5-https-설정)
6. [보안 체크리스트](#6-보안-체크리스트)
7. [자동 시작 설정](#7-자동-시작-설정)
8. [모니터링 및 유지보수](#8-모니터링-및-유지보수)

---

## 1. 사전 준비

### 하드웨어 권장 사양

| 항목 | 최소 | 권장 |
|------|------|------|
| CPU | 4코어 | 8코어 이상 |
| RAM | 8GB | 16GB 이상 |
| 저장소 | SSD 128GB | SSD 256GB 이상 |
| 네트워크 | 유선 연결 필수 | 1Gbps |

### 윈도우 설정

1. **윈도우 업데이트** 모두 설치
2. **절전 모드 끄기**: 설정 → 시스템 → 전원 → "절전 모드" 없음으로 설정
3. **자동 재시작 끄기**: 설정 → Windows 업데이트 → 고급 옵션 → 활성 시간 설정

---

## 2. 소프트웨어 설치

### 2.1 필수 소프트웨어

**PowerShell (관리자 권한)에서 실행:**

```powershell
# Chocolatey 패키지 관리자 설치
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 필수 패키지 설치
choco install -y git nodejs-lts pnpm docker-desktop
```

### 2.2 Docker Desktop 설정

1. Docker Desktop 실행
2. 설정 → General → "Start Docker Desktop when you log in" 체크
3. 설정 → Resources → WSL Integration 활성화

---

## 3. 프로젝트 배포

### 3.1 코드 클론 및 설정

```powershell
# 프로젝트 디렉토리 생성
mkdir C:\PERFO
cd C:\PERFO

# Git 클론 (본인 리포지토리 주소로 변경)
git clone https://github.com/YOUR_USERNAME/PERFO.git .

# 의존성 설치
pnpm install

# 환경변수 설정
copy .env.example .env.local
notepad .env.local  # 실제 값으로 수정
```

### 3.2 환경변수 설정 (.env.local)

```env
# 프로덕션 URL (본인 도메인 또는 IP)
NEXTAUTH_URL=https://your-domain.com

# 시크릿 (랜덤하게 생성)
NEXTAUTH_SECRET=RANDOM_32_CHAR_STRING_HERE

# 데이터베이스 (Docker Compose 사용 시)
DATABASE_URL=postgresql://perfo:STRONG_PASSWORD@localhost:5432/perfo

# 소셜 로그인 키 (기존 값 유지)
GOOGLE_CLIENT_ID=...
# ...
```

### 3.3 인프라 시작

```powershell
# Docker 컨테이너 시작 (PostgreSQL, Redis, Kafka)
docker-compose up -d

# 데이터베이스 마이그레이션
pnpm prisma db push

# 프로덕션 빌드
pnpm build

# 서버 시작 (포트 3000)
pnpm start
```

---

## 4. 네트워크 설정

### 4.1 고정 IP 설정

1. 제어판 → 네트워크 → 어댑터 설정 변경
2. 이더넷 → 속성 → IPv4 → 속성
3. 수동 IP 설정:
   - IP: `192.168.0.100` (예시, 공유기 설정에 맞게)
   - 서브넷: `255.255.255.0`
   - 게이트웨이: `192.168.0.1` (공유기 IP)
   - DNS: `8.8.8.8`, `8.8.4.4`

### 4.2 포트 포워딩 (공유기)

공유기 관리 페이지에서 설정 (보통 192.168.0.1):

| 외부 포트 | 내부 IP | 내부 포트 | 프로토콜 |
|----------|---------|----------|----------|
| 80 | 192.168.0.100 | 80 | TCP |
| 443 | 192.168.0.100 | 443 | TCP |

### 4.3 윈도우 방화벽 설정

```powershell
# 관리자 권한 PowerShell
netsh advfirewall firewall add rule name="PERFO HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="PERFO HTTPS" dir=in action=allow protocol=TCP localport=443
```

### 4.4 DDNS 설정 (선택)

유동 IP인 경우 무료 DDNS 서비스 사용:
- [DuckDNS](https://www.duckdns.org/) - 무료, 간단
- [No-IP](https://www.noip.com/) - 무료 플랜 제공

---

## 5. HTTPS 설정

### 5.1 Caddy 사용 (권장 - 자동 HTTPS)

```powershell
# Caddy 설치
choco install -y caddy

# Caddyfile 생성
@"
your-domain.com {
    reverse_proxy localhost:3000
}
"@ | Out-File -FilePath C:\PERFO\Caddyfile -Encoding utf8

# Caddy 시작
caddy run --config C:\PERFO\Caddyfile
```

### 5.2 또는 자체 서명 인증서 (내부망 전용)

```powershell
# OpenSSL로 자체 서명 인증서 생성
choco install -y openssl
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

---

## 6. 보안 체크리스트

### 🔴 필수 (반드시 적용)

- [ ] **강력한 비밀번호 사용**
  - 윈도우 계정, 데이터베이스, 모든 서비스
  - 최소 16자, 대소문자+숫자+특수문자

- [ ] **환경변수 보호**
  - `.env.local` 파일 권한 제한
  - Git에 절대 커밋하지 않기 (`.gitignore` 확인)

- [ ] **HTTPS 강제**
  - HTTP 접속 시 HTTPS로 리다이렉트
  - `NEXTAUTH_URL`을 `https://`로 설정

- [ ] **불필요한 포트 차단**
  - 외부에는 80, 443만 열기
  - PostgreSQL(5432), Redis(6379), Kafka(9092)는 외부 차단

- [ ] **윈도우 업데이트 자동화**
  - 보안 패치 자동 설치 설정

### 🟡 권장 (가능하면 적용)

- [ ] **Rate Limiting 적용**
  - API에 요청 제한 설정
  - DDoS 공격 방지

- [ ] **로그 모니터링**
  - 접근 로그 정기 확인
  - 의심스러운 IP 차단

- [ ] **백업 자동화**
  - 데이터베이스 일일 백업
  - 외부 저장소(클라우드)에 저장

- [ ] **원격 데스크톱 보안**
  - 기본 포트(3389) 변경
  - VPN 통해서만 접근 허용

### 🟢 선택 (보안 강화)

- [ ] **Fail2ban 대체 (Windows)**
  - [wail2ban](https://github.com/glasnt/wail2ban) 설치
  - 로그인 실패 시 IP 자동 차단

- [ ] **VPN 서버 구축**
  - 관리 기능은 VPN 접속 후에만 사용

---

## 7. 자동 시작 설정

### 7.1 PM2로 Next.js 관리 (권장)

```powershell
# PM2 설치
pnpm add -g pm2
pnpm add -g pm2-windows-startup

# 서비스 등록
cd C:\PERFO
pm2 start pnpm --name "perfo" -- start
pm2 save
pm2-startup install
```

### 7.2 작업 스케줄러로 Docker 자동 시작

1. `시작` → `작업 스케줄러` 검색
2. 기본 작업 만들기:
   - 이름: `Docker Compose PERFO`
   - 트리거: 컴퓨터 시작 시
   - 작업: `docker-compose -f C:\PERFO\docker-compose.yml up -d`

---

## 8. 모니터링 및 유지보수

### 8.1 상태 확인 스크립트

`C:\PERFO\healthcheck.ps1`:

```powershell
# 서비스 상태 확인
$services = @(
    @{Name="Next.js"; Url="http://localhost:3000"},
    @{Name="PostgreSQL"; Port=5432},
    @{Name="Redis"; Port=6379}
)

foreach ($svc in $services) {
    if ($svc.Url) {
        try {
            $response = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 5
            Write-Host "✅ $($svc.Name): OK"
        } catch {
            Write-Host "❌ $($svc.Name): DOWN"
        }
    }
}
```

### 8.2 데이터베이스 백업 (일일)

`C:\PERFO\backup.ps1`:

```powershell
$date = Get-Date -Format "yyyyMMdd"
$backupDir = "C:\PERFO\backups"
New-Item -ItemType Directory -Force -Path $backupDir

docker exec perfo-postgres pg_dump -U perfo perfo > "$backupDir\perfo_$date.sql"

# 7일 이상 된 백업 삭제
Get-ChildItem $backupDir -Filter "*.sql" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item
```

### 8.3 로그 확인

```powershell
# PM2 로그
pm2 logs perfo

# Docker 로그
docker-compose logs -f
```

---

## 부록: 문제 해결

### 포트가 이미 사용 중

```powershell
# 포트 사용 프로세스 확인
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID <PID> /F
```

### Docker 컨테이너 재시작

```powershell
cd C:\PERFO
docker-compose down
docker-compose up -d
```

### 외부에서 접속 안 됨

1. 방화벽 규칙 확인
2. 공유기 포트 포워딩 확인
3. ISP가 80/443 포트 차단하는지 확인 (일부 가정용 인터넷)

---

**마지막 업데이트:** 2026-02-09
