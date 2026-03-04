## 프로젝트 개요 (Introduction)
이 프로젝트는 물리 서버 기반 HomeLab 환경에서 실제 서비스와 유사한 인프라 구조를 구축하고 트래픽 처리 성능을 분석하기 위해 진행하였다.
Ubuntu Server를 설치한 홈서버에서 KVM 가상화를 활용하여 DB, API, Load Balancer 서버를 분리하고 Docker 기반으로 애플리케이션 배포 환경을 구성하였다.
Nginx Reverse Proxy 및 Load Balancing 환경을 구축한 후 k6를 이용한 부하 테스트를 수행하여 시스템 처리 성능을 측정하였다.
테스트 과정에서 로드밸런서를 경유할 경우 처리량이 크게 감소하는 현상을 확인하였고, 성능 실험을 통해 병목 위치를 분석하였다.
이후 Nginx 연결 관리 설정을 튜닝하여 성능을 개선하고, 대량 데이터 환경에서의 조회 성능을 검증하기 위해 DB 페이징 및 인덱스 최적화 실험을 진행하였다.

## Home Server Spec
- CPU: Intel Core i5-10400F (6C / 12T, VT-x 지원)
- Mainboard:ASRock H510M-HDV R2.0
- RAM: DDR4 2666MHz 16GB (8GB ×2 Dual Channel)
- Storage: SATA SSD 240GB (OS + VM)
- Storage: HDD 1TB (Data Storage)
- GPU: GTX 1050 Ti (비필수)
- OS: Ubuntu Server 24.04
- Virtualization:	KVM / libvirt
