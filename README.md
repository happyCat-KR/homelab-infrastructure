# HomeLab Infrastructure & Performance Testing
KVM 기반 HomeLab 환경에서 Load Balancer, API Server, Database 구조를 구축하고 부하 테스트를 통해 시스템 병목을 분석 및 최적화한 프로젝트

## 0. Project Highlights
- KVM 기반 HomeLab 인프라 구축
- Nginx Load Balancer 병목 분석
- LB bypass 테스트를 통한 병목 위치 확인
- Keep-Alive 기반 Nginx 튜닝으로 145 → 3800 RPS 개선
- 100,000 rows 데이터 환경에서 DB 성능 테스트 수행

## 1. 프로젝트 개요 (Introduction)
이 프로젝트는 물리 서버 기반 HomeLab 환경에서 실제 서비스와 유사한 인프라 구조를 구축하고 트래픽 처리 성능을 분석하기 위해 진행하였다.
Ubuntu Server를 설치한 홈서버에서 KVM 가상화를 활용하여 DB, API, Load Balancer 서버를 분리하고 Docker 기반으로 애플리케이션 배포 환경을 구성하였다.
Nginx Reverse Proxy 및 Load Balancing 환경을 구축한 후 k6를 이용한 부하 테스트를 수행하여 시스템 처리 성능을 측정하였다.
테스트 과정에서 로드밸런서를 경유할 경우 처리량이 크게 감소하는 현상을 확인하였고, 성능 실험을 통해 병목 위치를 분석하였다.
이후 Nginx 연결 관리 설정을 튜닝하여 성능을 개선하고, 대량 데이터 환경에서의 조회 성능을 검증하기 위해 DB 페이징 및 인덱스 최적화 실험을 진행하였다.

## 2. Home Server Spec
```
- CPU: Intel Core i5-10400F (6C / 12T, VT-x 지원)
- Mainboard: ASRock H510M-HDV R2.0
- RAM: DDR4 2666MHz 16GB (8GB ×2 Dual Channel)
- Storage: SATA SSD 240GB (OS + VM)
- Storage: HDD 1TB (Data Storage)
- GPU: GTX 1050 Ti (비필수)
- OS: Ubuntu Server 24.04
- Virtualization:	KVM / libvirt
```

## 3. Virtualization Layout
Home Server에서 KVM 가상화를 활용하여 서비스 역할별로 VM을 분리하였다.
DB, API, Load Balancer 서버를 각각 독립된 VM으로 구성하여 실제 서비스 환경과 유사한 인프라 구조를 구축하였다.

### VM 구성
- DB Server
  - RAM: 4GB
  - vCPU: 2
  - Disk: 30GB
- API Server 01
  - RAM: 2GB
  - vCPU: 2
  - Disk: 20GB
- API Server 02
  - RAM: 2GB
  - vCPU: 2
  - Disk: 20GB
- Load Balancer
  - RAM: 1GB
  - vCPU: 1
  - Disk: 10GB

### 총 리소스 할당
- RAM: 9GB
- vCPU: 7
현재 서버 스펙에서 테스트 및 서비스 구조 실습을 수행하기에 충분한 리소스를 확보하였다.
추후 RAM을 32GB로 확장하거나 NVMe 스토리지를 추가할 경우 VM 운영 안정성과 DB 성능을 더욱 개선할 수 있다.

## 4. System Architecture
HomeLab 환경에서 서비스 인프라를 실제 운영 환경과 유사하게 구성하기 위해 Load Balancer / API Server / Database Server 구조로 시스템을 설계하였다.
클라이언트 요청은 Nginx Load Balancer를 통해 API 서버로 분산되며, API 서버는 MySQL 데이터베이스와 통신하여 데이터를 처리한다.

### 전체 구조
```
Client -> Router -> Load Balancer (Nginx) -> (API-01 or API-02) -> MySQL
```
    
### 구성 설명
- Client
  - 사용자 요청이 최초로 발생하는 지점
- Router
  - 외부 네트워크와 HomeLab 내부 네트워크를 연결
  - 포트 포워딩을 통해 내부 서비스 접근 가능
- Load Balancer (Nginx)
  - 클라이언트 요청을 API 서버로 분산
  - Reverse Proxy 역할 수행
  - Round Robin 방식으로 트래픽 분배
- API Servers
  - Spring Boot 기반 REST API 서버
  - Docker 컨테이너 환경에서 실행
  - 두 개의 API 서버를 운영하여 수평 확장 구조 구성
- Database Server
  - MySQL Docker 컨테이너 기반 DB 서버
  - API 서버에서 발생하는 데이터 요청 처리
이 구조를 통해 서버 역할 분리, 트래픽 분산, 서비스 확장 구조를 실험할 수 있도록 설계하였다.

## 5. Infrastructure Stack
HomeLab 환경에서 서비스 인프라를 구축하기 위해 다음과 같은 기술 스택을 사용하였다.

- OS
  - Ubuntu Server 24.04
- Virtualization
  - KVM
  - libvirt
- Container
  - Docker
  - Docker Compose
- Web Server / Load Balancer
  - Nginx
- Backend
  - Spring Boot
- Database
  - MySQL
- Load Testing
  - k6
각 서버는 KVM 기반 VM 환경에서 운영되며, 서비스는 Docker 컨테이너 기반으로 배포된다.

## 6. Service Deployment Structure
HomeLab 환경에서 서비스는 Docker 기반 컨테이너 환경으로 배포되며 각 서버 역할에 따라 VM 단위로 분리하여 운영하였다.
서비스는 Load Balancer → API Server → Database Server 구조로 구성되어 있으며, 클라이언트 요청은 Load Balancer를 통해 API 서버로 전달되고 데이터 처리는 Database 서버에서 수행된다.

### 서비스 요청 흐름
```
Client -> Nginx (Load Balancer) -> Spring Boot API Servers -> MySQL Database
```

### 서비스 구성
- Load Balancer
  - Nginx Reverse Proxy 기반 구성
  - 클라이언트 요청을 API 서버로 전달
  - Round Robin 방식으로 트래픽 분산
- API Servers
  - Spring Boot 기반 REST API 서버
  - Docker 컨테이너 환경에서 실행
  - 두 개의 API 서버를 운영하여 수평 확장 구조 구성
- Database Server
  - MySQL 기반 데이터베이스 서버
  - Docker 컨테이너 환경에서 실행
  - API 서버의 데이터 요청 처리
이와 같은 구조를 통해 트래픽 분산 및 서버 역할 분리 구조를 실습하고 성능 테스트 환경을 구축하였다.

## 7. Performance Testing (k6)
시스템 인프라 구성 후 서비스의 처리 성능을 확인하기 위해 k6를 활용한 부하 테스트를 진행하였다.
부하 테스트를 통해 현재 인프라 구조에서 처리 가능한 요청 수(RPS)를 측정하고, 시스템 병목이 발생하는 지점을 확인하는 것을 목표로 하였다.

### 테스트 환경
- Load Testing Tool: k6
- Virtual Users (VU): 30 / 60 / 100
- Test Duration: 30s
- Target API: /tasks
- Request Type: HTTP GET
- Architecture: Nginx Load Balancer → API Servers → MySQL

### 테스트 구조
```
Client -> Load Balancer (Nginx) -> (API Server 1/ API Server 2) -> MySQL
```

### 초기 테스트 결과
Load Balancer를 경유한 상태에서 부하 테스트를 수행한 결과 약 145 RPS 수준에서 처리량이 제한되는 현상이 발생하였다.
이 수치는 예상보다 낮은 수치였기 때문에 시스템 내부에서 병목이 발생하고 있을 가능성을 고려하였다.

### VM 리소스 확장 테스트
초기에는 API 서버의 CPU 리소스 부족이 원인일 것으로 판단하였다.
이에 따라 다음과 같이 VM 리소스를 확장하였다.
- API Server vCPU: 2 → 4
- DB Server vCPU: 2 → 4
하지만 리소스 확장 이후에도 성능 테스트 결과는 다음과 같았다.
- RPS ≈ 145
리소스를 증가시켰음에도 처리량이 동일하게 유지되었기 때문에 CPU 리소스가 병목 원인이 아니라는 것을 확인하였다.
이를 통해 시스템의 다른 구성 요소에서 병목이 발생하고 있을 가능성을 확인하였다.

## 8. Bottleneck Investigation
초기 부하 테스트에서 약 145 RPS 수준에서 처리량이 제한되는 현상이 발생하였다.
VM 리소스를 확장했음에도 성능 변화가 없었기 때문에 시스템 구성 요소 중 다른 지점에서 병목이 발생하고 있을 가능성을 확인하였다.
이에 따라 병목 지점을 확인하기 위해 Load Balancer를 우회한 테스트를 수행하였다.

### Load Balancer 우회 테스트
Load Balancer를 거치지 않고 API 서버에 직접 요청을 보내는 방식으로 부하 테스트를 진행하였다.

### 테스트 구조
```
Client -> API Server -> MySQL
```
### 테스트 결과
Load Balancer를 우회한 상태에서 부하 테스트를 수행한 결과 처리량은 다음과 같이 증가하였다.
- RPS ≈ 4000
이는 Load Balancer를 경유했을 때의 성능과 비교하면 매우 큰 차이가 발생하는 결과였다.
- LB 경유: 145 RPS
- LB 우회: 4000 RPS
이 결과를 통해 API 서버나 Database가 아닌 Load Balancer(Nginx)에서 병목이 발생하고 있음을 확인하였다.

### 분석 결과
초기 Nginx 설정은 기본 설정 상태로 운영되고 있었으며, 이로 인해 다음과 같은 문제가 발생할 수 있었다.
- API 서버와의 연결 재사용이 이루어지지 않음
- Keep-Alive 설정 미비
- 매 요청마다 새로운 TCP 연결 생성
따라서 Nginx의 Keep-Alive 및 Proxy 연결 설정을 조정하여 API 서버와의 연결 재사용이 가능하도록 Load Balancer 성능을 개선하였다.

## 9. Load Balancer Optimization
Bottleneck 분석 결과 Load Balancer(Nginx)에서 요청 처리 성능이 제한되고 있는 것을 확인하였다.
초기 Nginx 설정에서는 API 서버와의 연결이 재사용되지 않아 요청마다 새로운 TCP 연결이 생성되었고, 이로 인해 높은 트래픽 환경에서 성능 저하가 발생하였다.
이를 해결하기 위해 Keep-Alive 기반 연결 재사용 설정을 적용하여 Load Balancer 성능을 개선하였다.

### 주요 설정 변경
- Upstream Keep-Alive 설정
  API 서버와의 연결을 재사용하도록 설정하여 TCP 연결 생성 비용을 줄였다.
- HTTP/1.1 Proxy 설정
  API 서버와의 통신에서 HTTP/1.1을 사용하여 Keep-Alive 연결을 유지하도록 설정하였다.
- Connection Header 조정
  Connection 헤더를 제거하여 연결이 종료되지 않도록 설정하였다.

### Nginx 설정
```
upstream api_server {
    server 192.168.55.152:8080;
    server 192.168.55.153:8080;
    keepalive 100;
}

server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /tasks {
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        proxy_pass http://api_server;

        proxy_set_header Host $host;
        proxy_set_header X-Real_IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 성능 개선 결과
설정 변경 이후 다시 부하 테스트를 수행한 결과 Load Balancer를 경유한 상태에서도 처리 성능이 크게 향상된 것을 확인하였다.
```
- Before Optimization: ≈ 145 RPS
- After Optimization: ≈ 3800 RPS
```
이를 통해 Load Balancer의 연결 관리 방식이 전체 시스템 처리 성능에 큰 영향을 미친다는 것을 확인하였다.

## 10. Large Dataset Performance Test (100k rows)
초기 성능 테스트는 데이터가 거의 없는 상태에서 진행되었기 때문에 실제 서비스 환경과는 차이가 있을 수 있었다.
실제 서비스에서는 데이터가 증가함에 따라 조회 성능이 영향을 받을 수 있기 때문에 대량 데이터 환경에서의 성능 테스트를 추가로 진행하였다.

### 테스트 방법
MySQL 데이터베이스에 테스트 데이터를 대량으로 삽입하여 조회 성능 변화를 확인하였다.
```
기존 데이터: 약 3건
추가 데이터: 100,000건
```
데이터 삽입 이후 동일한 API 엔드포인트에 대해 다시 부하 테스트를 수행하였다.

### 테스트 결과
대량 데이터가 삽입된 이후 성능 테스트 결과는 다음과 같았다.
```
RPS ≈ 17
```
이전 테스트와 비교하면 처리량이 크게 감소한 것을 확인할 수 있었다.
```
기존 테스트 ≈ 3800 RPS
대량 데이터 환경 ≈ 17 RPS
```
이 결과를 통해 데이터 증가에 따라 데이터베이스 조회 성능이 급격히 저하되는 현상을 확인하였다.

### 분석 결과
API 조회 시 모든 데이터를 조회하는 방식으로 구현되어 있었기 때문에 데이터가 증가할수록 조회 비용이 크게 증가하였다.
이 문제를 해결하기 위해 다음과 같은 방식으로 쿼리 최적화를 진행하였다.
- Pagination 적용
- 조회 컬럼 최적화
- Index 적용

## 11. Query Optimization
대량 데이터 환경에서 성능 저하가 발생한 원인을 분석한 결과, API 조회 시 모든 데이터를 한 번에 조회하는 방식이 성능 저하의 주요 원인임을 확인하였다.
데이터가 증가할수록 조회해야 하는 데이터의 양이 증가하면서 데이터베이스 조회 비용이 크게 증가하였다.
이를 해결하기 위해 다음과 같은 쿼리 최적화를 적용하였다.

### Pagination 적용
조회 시 모든 데이터를 반환하는 대신 LIMIT을 이용한 Pagination 방식을 적용하여 한 번에 조회되는 데이터 양을 제한하였다.
```
SELECT *
FROM tasks
ORDER BY created_at DESC
LIMIT 20;
```
Pagination 적용을 통해 데이터 조회 범위를 제한하여 데이터베이스 부하를 감소시켰다.

### Index 적용
대량 데이터 환경에서 정렬 및 조회 성능을 개선하기 위해 created_at 컬럼에 Index를 추가하였다.
```
ALTER TABLE tasks
ADD INDEX idx_tasks_created_at (created_at);
```
Index 적용을 통해 정렬 및 조회 시 데이터 검색 비용을 줄이고 성능을 개선할 수 있었다.

### 최적화 결과
Pagination과 Index 적용 이후 성능 테스트를 다시 수행하여 대량 데이터 환경에서도 안정적인 조회 성능을 확인하였다.

## 12. Observations
성능 테스트를 진행하면서 시스템 동작과 관련된 몇 가지 특징을 관찰할 수 있었다.

### DB Buffer Cache 영향
대량 데이터 테스트를 반복 수행하는 과정에서 초기 테스트보다 이후 테스트의 성능이 개선되는 현상을 확인하였다.
이는 MySQL의 Buffer Cache에 의해 데이터가 메모리에 캐싱되면서 디스크 접근이 줄어들었기 때문으로 판단된다.
따라서 동일한 테스트라도 초기 실행과 반복 실행 시 성능 차이가 발생할 수 있음을 확인하였다.

### JVM Warm-up 영향
Spring Boot 애플리케이션 실행 직후에는 처리 성능이 상대적으로 낮았지만, 일정 시간 이후에는 처리량이 증가하는 현상을 확인하였다.
이는 JVM의 JIT 컴파일 및 내부 최적화 과정(JVM Warm-up)에 의해 성능이 점진적으로 개선되기 때문으로 판단된다.
따라서 성능 테스트를 수행할 때는 충분한 워밍업 이후 측정하는 것이 중요함을 확인하였다.

## 13. Key Learnings
이번 프로젝트를 통해 인프라 구성과 성능 테스트 과정에서 다음과 같은 점을 경험하고 학습할 수 있었다.

### Load Balancer 설정의 중요성
초기 테스트에서는 약 145 RPS 수준에서 성능이 제한되는 현상이 발생하였다.
VM 리소스를 확장했음에도 성능 변화가 없었고, Load Balancer를 우회한 테스트를 통해 Nginx 설정이 병목 원인임을 확인하였다.
Keep-Alive 기반 연결 재사용 설정을 적용한 이후 처리 성능이 크게 개선되는 것을 통해 Load Balancer 설정이 전체 시스템 성능에 큰 영향을 미친다는 것을 경험하였다.

### 성능 테스트를 통한 병목 분석의 중요성
시스템 성능 문제는 단순히 리소스를 증가시키는 방식으로 해결되지 않을 수 있으며, 실제 테스트를 통해 병목이 발생하는 위치를 정확하게 분석하는 과정이 중요하다는 것을 확인하였다.
Load Balancer 우회 테스트와 같은 실험을 통해 문제 원인을 단계적으로 분석하는 접근 방식의 중요성을 경험하였다.

### 대량 데이터 환경에서의 조회 성능 고려
데이터가 거의 없는 상태에서는 높은 성능이 나타났지만, 100,000건 이상의 데이터가 삽입되자 성능이 크게 저하되는 현상을 확인하였다.
이를 통해 실제 서비스 환경에서는 데이터 증가에 따른 성능 변화를 고려해야 하며, Pagination과 Index 설계가 중요한 요소라는 것을 확인하였다.

### 실제 운영 환경과 유사한 테스트 환경의 필요성
초기 테스트는 데이터가 적은 상태에서 진행되었기 때문에 실제 서비스 환경과 차이가 있었다.
대량 데이터 환경을 추가로 구성하여 테스트를 진행하면서 실제 운영 환경과 유사한 조건에서 성능을 검증하는 것이 중요하다는 점을 확인하였다.
