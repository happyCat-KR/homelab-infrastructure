import http from 'k6/http';

export default function () {
  http.get('http://<내부IP>/tasks');
}