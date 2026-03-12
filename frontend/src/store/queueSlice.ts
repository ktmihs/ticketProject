import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/api.client';
import type { ApiResponse, QueueJoinResponse, QueueStatusResponse } from '@/types';

export type QueueStatus = 'IDLE' | 'JOINING' | 'WAITING' | 'ALLOWED' | 'EXPIRED' | 'ERROR';

interface QueueState {
  status: QueueStatus;
  showId: string | null;
  position: number | null;
  estimatedWaitTime: number | null;
  queueToken: string | null;
  allowedUntil: number | null;
  isPolling: boolean;
  error: string | null;
}

const initialState: QueueState = {
  status: 'IDLE',
  showId: null,
  position: null,
  estimatedWaitTime: null,
  queueToken: null,
  allowedUntil: null,
  isPolling: false,
  error: null,
};

// ✅ 대기열 진입
export const joinQueue = createAsyncThunk(
  'queue/join',
  async ({ showId, userId }: { showId: string; userId: string }) => {
    const response: ApiResponse<QueueJoinResponse> = await apiClient.joinQueue(showId, userId);
    apiClient.setQueueToken(response.data.queueToken);
    return { ...response.data, showId };
  }
);

// ✅ 대기열 상태 폴링 (useQueuePolling 호환)
export const fetchQueueStatus = createAsyncThunk(
  'queue/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response: ApiResponse<QueueStatusResponse> = await apiClient.getQueueStatus();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    updatePosition: (state, action: PayloadAction<{ position: number; estimatedWaitTime: number }>) => {
      state.position = action.payload.position;
      state.estimatedWaitTime = action.payload.estimatedWaitTime;
    },

    // SSE ALLOWED 이벤트에서 호출: 새 queueToken + allowedUntil 포함
    setAllowed: (state, action: PayloadAction<{ queueToken: string; allowedUntil: number }>) => {
      state.status = 'ALLOWED';
      state.queueToken = action.payload.queueToken;
      state.allowedUntil = action.payload.allowedUntil;
      state.isPolling = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('queueToken', action.payload.queueToken);
        localStorage.setItem('allowedUntil', action.payload.allowedUntil.toString());
        apiClient.setQueueToken(action.payload.queueToken);
      }
    },

    // useQueuePolling 훅에서 사용하는 액션들
    stopPolling: (state) => {
      state.isPolling = false;
    },
    setAllowedStatus: (state, action: PayloadAction<{ queueToken?: string; allowedUntil?: number }>) => {
      state.status = 'ALLOWED';
      state.isPolling = false;
      if (action.payload.allowedUntil) state.allowedUntil = action.payload.allowedUntil;
      if (action.payload.queueToken) {
        state.queueToken = action.payload.queueToken;
        if (typeof window !== 'undefined') {
          localStorage.setItem('queueToken', action.payload.queueToken);
          if (action.payload.allowedUntil)
            localStorage.setItem('allowedUntil', action.payload.allowedUntil.toString());
          apiClient.setQueueToken(action.payload.queueToken);
        }
      }
    },

    setExpired: (state) => {
      state.status = 'EXPIRED';
      state.queueToken = null;
      state.allowedUntil = null;
      state.isPolling = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('queueToken');
        localStorage.removeItem('allowedUntil');
      }
    },

    setError: (state, action: PayloadAction<string>) => {
      state.status = 'ERROR';
      state.error = action.payload;
      state.isPolling = false;
    },

    resetQueue: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('queueToken');
        localStorage.removeItem('allowedUntil');
      }
      apiClient.clearQueueToken();
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(joinQueue.pending, (state, action) => {
        state.status = 'JOINING';
        state.showId = action.meta.arg.showId;
        state.error = null;
        state.isPolling = false;
      })
      .addCase(joinQueue.fulfilled, (state, action) => {
        if (action.payload.status === 'ALLOWED') {
          state.status = 'ALLOWED';
          const allowedUntil = Date.now() + 10 * 60 * 1000;
          state.allowedUntil = allowedUntil;
          if (typeof window !== 'undefined') {
            localStorage.setItem('allowedUntil', allowedUntil.toString());
          }
        } else {
          state.status = 'WAITING';
          state.isPolling = true;
        }
        state.position = action.payload.position;
        state.estimatedWaitTime = action.payload.estimatedWaitTime;
        state.queueToken = action.payload.queueToken;
      })
      .addCase(joinQueue.rejected, (state, action) => {
        state.status = 'ERROR';
        state.error = action.error.message || '대기열 진입 실패';
      })
      .addCase(fetchQueueStatus.fulfilled, (state, action) => {
        const data = action.payload;
        if (data.status === 'ALLOWED') {
          state.status = 'ALLOWED';
          state.isPolling = false;
          if (!state.allowedUntil) {
            const allowedUntil = Date.now() + 10 * 60 * 1000;
            state.allowedUntil = allowedUntil;
            if (typeof window !== 'undefined') {
              localStorage.setItem('allowedUntil', allowedUntil.toString());
            }
          }
        } else if (data.status === 'WAITING') {
          state.position = data.position;
          state.estimatedWaitTime = data.estimatedWaitTime;
        }
      })
      .addCase(fetchQueueStatus.rejected, (state) => {
        state.isPolling = false;
      });
  },
});

export const {
  updatePosition,
  setAllowed,
  setAllowedStatus,
  stopPolling,
  setExpired,
  setError,
  resetQueue,
} = queueSlice.actions;

export default queueSlice.reducer;
