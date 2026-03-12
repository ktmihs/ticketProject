import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;
  private queueToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true, // Cookie 전송
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        // Queue Token 추가
        if (this.queueToken) {
          config.headers['X-Queue-Token'] = this.queueToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          // 서버가 응답을 반환한 경우
          const errorData = error.response.data;
          
          // 401 에러: 토큰 제거 + 전역 이벤트 발행 → 페이지에서 홈으로 이동
          if (error.response.status === 401) {
            this.clearQueueToken();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
          }
          
          return Promise.reject({
            code: errorData.error.code,
            message: errorData.error.message,
            details: errorData.error.details,
            statusCode: error.response.status,
          });
        } else if (error.request) {
          // 요청은 보냈지만 응답이 없는 경우
          return Promise.reject({
            code: 'NETWORK_ERROR',
            message: '네트워크 연결을 확인해주세요',
            statusCode: 0,
          });
        } else {
          // 요청 설정 중 에러가 발생한 경우
          return Promise.reject({
            code: 'REQUEST_ERROR',
            message: error.message,
            statusCode: 0,
          });
        }
      }
    );
  }

  // Queue Token 관리
  setQueueToken(token: string) {
    this.queueToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('queueToken', token);
    }
  }

  getQueueToken(): string | null {
    if (!this.queueToken && typeof window !== 'undefined') {
      this.queueToken = localStorage.getItem('queueToken');
    }
    return this.queueToken;
  }

  clearQueueToken() {
    this.queueToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('queueToken');
    }
  }

  // ==================== 공연 API ====================

  async getShows(params?: { status?: string; limit?: number; offset?: number }) {
    const response = await this.client.get('/shows', { params });
    return response.data;
  }

  async getShowById(showId: string) {
    const response = await this.client.get(`/shows/${showId}`);
    return response.data;
  }

  // ==================== 대기열 API ====================

  async joinQueue(showId: string, userId: string) {
    const response = await this.client.post('/queue/join', { showId, userId });
    return response.data;
  }

  async getQueueStatus() {
    const response = await this.client.get('/queue/status');
    return response.data;
  }

  // ==================== 구매 API ====================

  async getAvailableCount(showId: string) {
    const response = await this.client.get(`/shows/${showId}/available-count`);
    return response.data;
  }

  async purchaseNonReserved(data: any) {
    const response = await this.client.post('/purchase/non-reserved', data);
    return response.data;
  }

  async getSeats(showId: string) {
    const response = await this.client.get(`/seats/${showId}`);
    return response.data;
  }

  async holdSeat(showId: string, seatId: number) {
    const response = await this.client.post('/seats/hold', { showId, seatId });
    return response.data;
  }

  async purchaseReserved(data: any) {
    const response = await this.client.post('/purchase/reserved', data);
    return response.data;
  }

  async releaseSeat(showId: string, seatId: number) {
    const response = await this.client.post('/seats/release', { showId, seatId });
    return response.data;
  }
}

export const apiClient = new ApiClient();
