# PERFO 윈도우 서버 배포 및 보안 가이드

> 남는 윈도우 PC 1대를 PERFO 단일 호스트로 쓰는 운영 가이드다. 현재 코드는 `frontend/` Next.js 앱과 `backend/` Spring Boot 앱이 분리되어 있고, 실행 기준은 `docker-compose.yml`이다.

## 1. 전제

- Docker Desktop + WSL2 기반 실행을 권장한다.
- 운영용 값은 `.env`에 둔다. 로컬 개발용 `.env.dev`와 섞지 않는다.
- 외부에는 HTTP/HTTPS 진입 포트만 공개하고, PostgreSQL/Redis/Kafka/MinIO는 직접 공개하지 않는다.

## 2. 설치

관리자 PowerShell:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

choco install -y git docker-desktop
```

Docker Desktop에서 WSL Integration을 켠다.

## 3. 프로젝트 준비

```powershell
mkdir C:\PERFO
cd C:\PERFO
git clone https://github.com/YOUR_USERNAME/PERFO.git .
```

운영 `.env`를 준비한다. 저장소에는 예시 파일이 따로 없으므로, 서버에서는 기존 `.env`를 기준으로 값을 채우되 실제 운영 secret으로 교체한다.

필수로 점검할 항목:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `JWT_SECRET`
- `INTERNAL_API_JWT_*`
- `APP_SECURITY_QR_SECRET`
- `SPRING_DATASOURCE_*`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `MINIO_*`
- `MAIL_*`, `RESEND_API_KEY`
- OAuth client id/secret
- VAPID key

## 4. 단일 호스트 실행

운영형 전체 서비스:

```powershell
docker compose --env-file .env --profile full up -d --build
```

상태 확인:

```powershell
docker compose --env-file .env --profile full ps
curl.exe -fsS http://127.0.0.1:4138/api/health
curl.exe -fsS http://127.0.0.1:8274/api/health
```

현재 기본 포트:

| 서비스 | 포트 |
| ------ | ---- |
| Frontend | `4138` |
| Backend | `8274` |
| PostgreSQL | `5329` |
| Redis | `6192` |
| Kafka | `9043` |
| Zookeeper | `2815` |
| MinIO API | `9000` |
| MinIO Console | `9001` |

## 5. Blue-Green 운영

무중단 전환이 필요하면 루트의 `BLUE_GREEN_DEPLOYMENT_MANUAL.md`를 따른다. 현재 Blue-Green 구성은 다음 파일을 사용한다.

- `docker-compose.bluegreen.yml`
- `deploy/nginx/nginx.conf`
- `deploy/nginx/upstreams/active/frontend-active.conf`
- `scripts/deploy-bluegreen.sh`
- `scripts/switch-traffic.sh`
- `scripts/rollback-bluegreen.sh`

초기 기동 예시:

```powershell
docker compose --env-file .env -f docker-compose.yml -f docker-compose.bluegreen.yml --profile bluegreen up -d nginx backend_blue frontend_blue
```

헬스체크:

```powershell
curl.exe -fsS http://127.0.0.1:4137/healthz
curl.exe -fsS http://127.0.0.1:4138/api/health
curl.exe -fsS http://127.0.0.1:8274/api/health
```

## 6. HTTPS

Windows 단일 호스트에서는 Caddy를 앞단에 두는 방식이 단순하다.

```powershell
choco install -y caddy
```

`C:\PERFO\Caddyfile`:

```text
your-domain.com {
    reverse_proxy 127.0.0.1:4138
}
```

실행:

```powershell
caddy run --config C:\PERFO\Caddyfile
```

Blue-Green을 쓰는 경우 Caddy는 Nginx 포트로 보낸다.

```text
your-domain.com {
    reverse_proxy 127.0.0.1:4137
}
```

## 7. 방화벽과 포트 공개

공유기/방화벽에서 외부 공개는 80, 443만 허용한다.

```powershell
netsh advfirewall firewall add rule name="PERFO HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="PERFO HTTPS" dir=in action=allow protocol=TCP localport=443
```

아래 포트는 외부 공개 금지:

- `5329` PostgreSQL
- `6192` Redis
- `9043` Kafka
- `2815` Zookeeper
- `9000`, `9001` MinIO
- `8274` Backend

## 8. 자동 시작

Docker Desktop 자동 시작을 켠 뒤 작업 스케줄러에서 compose를 실행한다.

작업:

```text
docker compose --env-file C:\PERFO\.env --profile full -f C:\PERFO\docker-compose.yml up -d
```

Blue-Green 운영이면:

```text
docker compose --env-file C:\PERFO\.env -f C:\PERFO\docker-compose.yml -f C:\PERFO\docker-compose.bluegreen.yml --profile bluegreen up -d nginx backend_blue frontend_blue
```

## 9. 유지보수

로그:

```powershell
docker compose --env-file .env --profile full logs -f backend frontend
```

재기동:

```powershell
docker compose --env-file .env --profile full restart backend frontend
```

전체 중지:

```powershell
docker compose --env-file .env --profile full down
```

볼륨 삭제는 데이터 삭제를 의미하므로 운영 서버에서 사용하지 않는다.

## 10. 보안 체크리스트

- `.env`를 Git에 커밋하지 않는다.
- 운영 secret은 개발 값에서 반드시 교체한다.
- `NEXTAUTH_URL`과 `CORS_ALLOWED_ORIGINS`는 실제 도메인으로 맞춘다.
- DB, Redis, Kafka, MinIO, Backend 포트는 외부에 직접 열지 않는다.
- 정기적으로 DB와 MinIO volume을 백업한다.
- 배포 후 `/api/health`, 로그인, 티켓 조회, 예약 QR, 검표 API를 확인한다.
