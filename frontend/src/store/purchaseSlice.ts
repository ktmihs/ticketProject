import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/api.client';
import type {
  PurchaseState,
  PurchaseStage,
  Show,
  Seat,
  ApiResponse,
  HoldSeatResponse,
  PurchaseResponse,
} from '@/types';

const initialState: PurchaseState = {
  stage: 'IDLE',
  selectedShow: null,
  selectedSeat: null,
  holdToken: null,
  holdExpiresAt: null,
  quantity: 1,
  totalAmount: 0,
  error: null,
  isProcessing: false,
  purchaseResult: null, // ✅ 구매 결과 저장 (성공 페이지에서 사용)
};

// ==================== Async Thunks ====================

export const holdSeat = createAsyncThunk(
  'purchase/holdSeat',
  async ({ showId, seatId }: { showId: string; seatId: number }, { rejectWithValue }) => {
    try {
      const response: ApiResponse<HoldSeatResponse> = await apiClient.holdSeat(showId, seatId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const purchaseNonReserved = createAsyncThunk(
  'purchase/nonReserved',
  async (data: any, { rejectWithValue }) => {
    try {
      const response: ApiResponse<PurchaseResponse> = await apiClient.purchaseNonReserved(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

export const purchaseReserved = createAsyncThunk(
  'purchase/reserved',
  async (data: any, { rejectWithValue }) => {
    try {
      const response: ApiResponse<PurchaseResponse> = await apiClient.purchaseReserved(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

// ==================== Slice ====================

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState,
  reducers: {
    setStage: (state, action: PayloadAction<PurchaseStage>) => {
      state.stage = action.payload;
    },
    selectShow: (state, action: PayloadAction<Show>) => {
      state.selectedShow = action.payload;
      state.stage = 'QUEUE';
    },
    selectSeat: (state, action: PayloadAction<Seat>) => {
      state.selectedSeat = action.payload;
      state.totalAmount = action.payload.price;
    },
    setQuantity: (state, action: PayloadAction<number>) => {
      state.quantity = action.payload;
      if (state.selectedShow && state.selectedShow.seatType === 'non_reserved') {
        const price = state.selectedShow.price.min ?? state.selectedShow.price.max ?? 0;
        state.totalAmount = price * action.payload;
      }
    },
    proceedToPayment: (state) => {
      state.stage = 'PAYMENT';
    },
    returnToSeatSelect: (state) => {
      state.stage = 'SEAT_SELECT';
      state.selectedSeat = null;
      state.holdToken = null;
      state.holdExpiresAt = null;
    },
    expireHold: (state) => {
      state.selectedSeat = null;
      state.holdToken = null;
      state.holdExpiresAt = null;
      state.error = '좌석 선점 시간이 만료되었습니다';
    },
    resetPurchase: () => initialState,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // holdSeat
    builder
      .addCase(holdSeat.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(holdSeat.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.holdToken = action.payload.holdToken;
        state.holdExpiresAt = action.payload.expiresAt;
        state.totalAmount = action.payload.seat.price;
        state.stage = 'PAYMENT';
        state.error = null;
      })
      .addCase(holdSeat.rejected, (state, action: any) => {
        state.isProcessing = false;
        state.error = action.payload?.message || '좌석 선점에 실패했습니다';
      });

    // purchaseNonReserved
    builder
      .addCase(purchaseNonReserved.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(purchaseNonReserved.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.stage = 'COMPLETED';
        state.purchaseResult = action.payload; // ✅ 결과 저장
        state.error = null;
      })
      .addCase(purchaseNonReserved.rejected, (state, action: any) => {
        state.isProcessing = false;
        state.error = action.payload?.message || '구매에 실패했습니다';
      });

    // purchaseReserved
    builder
      .addCase(purchaseReserved.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(purchaseReserved.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.stage = 'COMPLETED';
        state.purchaseResult = action.payload; // ✅ 결과 저장
        state.error = null;
      })
      .addCase(purchaseReserved.rejected, (state, action: any) => {
        state.isProcessing = false;
        state.error = action.payload?.message || '구매에 실패했습니다';
      });
  },
});

export const {
  setStage,
  selectShow,
  selectSeat,
  setQuantity,
  proceedToPayment,
  returnToSeatSelect,
  expireHold,
  resetPurchase,
  clearError,
} = purchaseSlice.actions;

export default purchaseSlice.reducer;
