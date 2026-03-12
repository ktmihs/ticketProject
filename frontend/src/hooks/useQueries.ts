import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';
import type { 
  ApiResponse, 
  ShowListResponse, 
  Show, 
  SeatListResponse,
  AvailableCountResponse 
} from '@/types';

// ==================== Show Queries ====================

export function useShows(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['shows', params],
    queryFn: async () => {
      const response: ApiResponse<ShowListResponse> = await apiClient.getShows(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}

export function useShow(showId: string | null) {
  return useQuery({
    queryKey: ['show', showId],
    queryFn: async () => {
      if (!showId) throw new Error('Show ID is required');
      const response: ApiResponse<Show> = await apiClient.getShowById(showId);
      return response.data;
    },
    enabled: !!showId,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== Seat Queries ====================

export function useSeats(showId: string | null) {
  return useQuery({
    queryKey: ['seats', showId],
    queryFn: async () => {
      if (!showId) throw new Error('Show ID is required');
      const response: ApiResponse<SeatListResponse> = await apiClient.getSeats(showId);
      return response.data;
    },
    enabled: !!showId,
    staleTime: 5 * 1000, // 5초 (좌석 상태는 자주 변경됨)
    refetchInterval: 5 * 1000, // 5초마다 자동 refetch
  });
}

export function useAvailableCount(showId: string | null) {
  return useQuery({
    queryKey: ['availableCount', showId],
    queryFn: async () => {
      if (!showId) throw new Error('Show ID is required');
      const response: ApiResponse<AvailableCountResponse> = await apiClient.getAvailableCount(showId);
      return response.data;
    },
    enabled: !!showId,
    staleTime: 3 * 1000, // 3초
    refetchInterval: 3 * 1000, // 3초마다 자동 refetch
  });
}

// ==================== Mutations ====================

export function useReleaseSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ showId, seatId }: { showId: string; seatId: number }) => {
      return await apiClient.releaseSeat(showId, seatId);
    },
    onSuccess: (_, variables) => {
      // 좌석 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['seats', variables.showId] });
    },
  });
}
