🏠 HomeLab Infrastructure & Performance Testing

물리 서버 기반 HomeLab 환경에서 Ubuntu Server를 설치하고 KVM 가상화를 활용하여 DB / API / Load Balancer 서버를 분리한 인프라를 구축하였다.

Docker 기반으로 애플리케이션을 배포하고 Nginx Reverse Proxy 및 Load Balancing 환경을 구성하였다.

또한 k6를 활용한 API 성능 테스트를 수행하고 병목을 분석하여 성능을 개선하였다.

🖥 Home Server Spec
Component	Spec
CPU	Intel Core i5-10400F (6C / 12T)
RAM	16GB DDR4 (Dual Channel)
Storage	SSD 240GB (OS + VM) / HDD 1TB (Data)
Virtualization	KVM / libvirt
OS	Ubuntu Server 24.04
🧩 Virtualization Layout
VM	RAM	vCPU	Disk
DB	4GB	2	30GB
API-01	2GB	2	20GB
API-02	2GB	2	20GB
LB	1GB	1	10GB

총 할당

RAM : 9GB
vCPU : 7
🏗 System Architecture
Client
   ↓
Router
   ↓
Load Balancer (Nginx)
   ↓        ↓
API-01     API-02
     ↓
   MySQL

HomeLab 내부 구조

Home Server
 ├ DB VM
 ├ API VM1
 ├ API VM2
 └ LB VM
⚙ Infrastructure Stack
Category	Technology
OS	Ubuntu Server 24.04
Virtualization	KVM / libvirt
Container	Docker / Docker Compose
Web Server	Nginx
Backend	Spring Boot
Database	MySQL
Load Test	k6
🚀 Service Deployment Structure
React Frontend
      ↓
Nginx (Load Balancer)
      ↓
Spring Boot API Servers
      ↓
MySQL Database

각 서버는 VM 단위로 분리되어 Docker 기반으로 서비스가 실행된다.

📊 Performance Testing

부하 테스트 도구

k6

테스트 환경

30 VU
60 VU
100 VU

초기 테스트 결과

구조	RPS
LB 경유	145
API 직접 호출	4500

로드밸런서를 경유할 경우 처리량이 크게 감소하는 문제가 확인되었다.

🔎 Bottleneck Investigation

초기 테스트에서 로드밸런서를 경유할 경우 약 145 RPS로 처리량이 제한되었다.

API 서버 성능 문제 가능성을 확인하기 위해 다음 조치를 수행하였다.

1️⃣ VM 리소스 확장

API 서버와 DB 서버의 리소스를 확장하였다.

API vCPU : 2 → 4
DB vCPU : 2 → 4

그러나 성능 테스트 결과

RPS ≈ 145

으로 동일한 처리량이 유지되었다.

이를 통해 CPU 리소스가 병목 원인이 아님을 확인하였다.

2️⃣ Load Balancer 우회 테스트

로드밸런서를 우회하여 API 서버에 직접 요청을 보내는 테스트를 수행하였다.

k6 → API 직접 호출

테스트 결과

테스트	RPS
API 직접 호출	4500

이를 통해 병목이 API 서버가 아닌 Load Balancer 계층에 있음을 확인하였다.

🔧 Load Balancer Optimization

원인 분석 결과 다음 문제가 확인되었다.

proxy_http_version 기본값 = HTTP/1.0
upstream keepalive 미설정

이 설정으로 인해 요청마다 새로운 TCP 연결이 생성되는 구조가 발생하였다.

TCP 연결 과정

3-way handshake
socket 생성
TIME_WAIT 처리

이 과정에서 LB 서버 CPU 리소스가 크게 소비되며 처리량이 제한되었다.

적용한 설정
upstream api_servers {
    server 192.168.55.152:8080;
    server 192.168.55.153:8080;
    keepalive 100;
}

location /tasks {
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_pass http://api_servers;
}
성능 개선 결과
상태	RPS
튜닝 전	145
튜닝 후	3900

약 26배 성능 개선을 달성하였다.

🗄 Large Dataset Performance Test

대량 데이터 환경을 가정하여 tasks 테이블에 100,000건 데이터를 삽입하였다.

초기 전체 조회 쿼리

SELECT * FROM tasks;

테스트 결과

단계	RPS
전체 조회	17

Full Table Scan으로 인해 응답 시간이 크게 증가하였다.

Pagination 적용
SELECT *
FROM tasks
LIMIT 20 OFFSET 0;

결과

단계	RPS
페이징 적용	500
정렬 인덱스 추가
CREATE INDEX idx_created_at
ON tasks(created_at);

결과

단계	RPS
인덱스 적용	1390

최종적으로

17 RPS → 1390 RPS

약 80배 성능 개선을 확인하였다.

📌 Observations

테스트 과정에서 반복 요청 이후 성능이 상승하는 현상이 관찰되었다.

가능한 원인

MySQL Buffer Pool Cache
JVM Warm-up
OS Page Cache

초기 요청에서는 디스크 접근이 발생하지만 반복 요청 시 메모리 캐시를 활용하여 응답 속도가 개선될 수 있다.

🎯 Key Learnings

이 프로젝트를 통해 다음과 같은 경험을 얻었다.

물리 서버 기반 인프라 구축 경험

KVM 가상화를 활용한 서버 분리 구조 설계

Docker 기반 서비스 배포 환경 구축

Nginx Reverse Proxy 및 Load Balancer 구성

k6 기반 트래픽 테스트 수행

로드밸런서 설정으로 인한 병목 분석 및 해결

대량 데이터 환경에서 페이징 및 인덱스 튜닝 경험

특히 성능 테스트 → 병목 분석 → 개선 과정을 직접 수행하며 시스템 관점에서 서비스 성능을 분석하는 경험을 할 수 있었다.
