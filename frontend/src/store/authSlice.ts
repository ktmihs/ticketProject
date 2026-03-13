import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/services/api.client';

interface AuthState {
	userId: string | null;
	email: string | null;
	role: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

const initialState: AuthState = {
	userId: null,
	email: null,
	role: null,
	isAuthenticated: false,
	isLoading: true,
};

export const login = createAsyncThunk(
	'auth/login',
	async (
		credentials: { email: string; password: string },
		{ rejectWithValue },
	) => {
		try {
			const response = await apiClient.login(credentials);
			return response; // { userId, email, role }
		} catch (error: any) {
			return rejectWithValue(error);
		}
	},
);

export const logout = createAsyncThunk('auth/logout', async () => {
	await apiClient.logout();
	// 서버가 clearCookie 처리 — 클라이언트에서 따로 삭제 불필요
});

export const fetchCurrentUser = createAsyncThunk(
	'auth/fetchCurrentUser',
	async (_, { rejectWithValue }) => {
		try {
			const response = await apiClient.getMe();
			if (!response) return rejectWithValue(null);
			return response;
		} catch {
			return rejectWithValue(null);
		}
	},
);

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {},
	extraReducers: builder => {
		builder
			.addCase(login.pending, state => {
				state.isLoading = true;
			})
			.addCase(login.fulfilled, (state, action) => {
				state.isLoading = false;
				state.isAuthenticated = true;
				state.userId = action.payload.userId;
				state.email = action.payload.email;
				state.role = action.payload.role;
			})
			.addCase(login.rejected, state => {
				state.isLoading = false;
			})
			.addCase(logout.fulfilled, state => {
				state.isLoading = false;
				state.isAuthenticated = false;
				state.userId = null;
				state.email = null;
				state.role = null;
			})
			.addCase(fetchCurrentUser.fulfilled, (state, action) => {
				state.isLoading = false;
				state.isAuthenticated = true;
				state.userId = action.payload.userId;
				state.email = action.payload.email;
				state.role = action.payload.role;
			})
			.addCase(fetchCurrentUser.rejected, state => {
				state.isLoading = false;
				state.isAuthenticated = false;
				state.userId = null;
				state.email = null;
				state.role = null;
			});
	},
});

export default authSlice.reducer;
