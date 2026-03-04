## 1. 프로젝트 개요 (Introduction)
이 프로젝트는 물리 서버 기반 HomeLab 환경에서 실제 서비스와 유사한 인프라 구조를 구축하고 트래픽 처리 성능을 분석하기 위해 진행하였다.
Ubuntu Server를 설치한 홈서버에서 KVM 가상화를 활용하여 DB, API, Load Balancer 서버를 분리하고 Docker 기반으로 애플리케이션 배포 환경을 구성하였다.
Nginx Reverse Proxy 및 Load Balancing 환경을 구축한 후 k6를 이용한 부하 테스트를 수행하여 시스템 처리 성능을 측정하였다.
테스트 과정에서 로드밸런서를 경유할 경우 처리량이 크게 감소하는 현상을 확인하였고, 성능 실험을 통해 병목 위치를 분석하였다.
이후 Nginx 연결 관리 설정을 튜닝하여 성능을 개선하고, 대량 데이터 환경에서의 조회 성능을 검증하기 위해 DB 페이징 및 인덱스 최적화 실험을 진행하였다.

## 2. Home Server Spec
- CPU: Intel Core i5-10400F (6C / 12T, VT-x 지원)
- Mainboard:ASRock H510M-HDV R2.0
- RAM: DDR4 2666MHz 16GB (8GB ×2 Dual Channel)
- Storage: SATA SSD 240GB (OS + VM)
- Storage: HDD 1TB (Data Storage)
- GPU: GTX 1050 Ti (비필수)
- OS: Ubuntu Server 24.04
- Virtualization:	KVM / libvirt

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
총 리소스 할당
- RAM: 9GB
- vCPU: 7
현재 서버 스펙에서 테스트 및 서비스 구조 실습을 수행하기에 충분한 리소스를 확보하였다.
추후 RAM을 32GB로 확장하거나 NVMe 스토리지를 추가할 경우 VM 운영 안정성과 DB 성능을 더욱 개선할 수 있다.

## System Architecture
HomeLab 환경에서 서비스 인프라를 실제 운영 환경과 유사하게 구성하기 위해 Load Balancer / API Server / Database Server 구조로 시스템을 설계하였다.
클라이언트 요청은 Nginx Load Balancer를 통해 API 서버로 분산되며, API 서버는 MySQL 데이터베이스와 통신하여 데이터를 처리한다.

### 전체 구조
Client -> Router -> Load Balancer (Nginx) -> (API-01 or API-02) -> MySQL
    
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

## Infrastructure Stack
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
