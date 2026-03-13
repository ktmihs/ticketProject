import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
	persistStore,
	persistReducer,
	FLUSH,
	REHYDRATE,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import queueReducer from './queueSlice';
import purchaseReducer from './purchaseSlice';
import authReducer from './authSlice';

// queue: queueToken, allowedUntil만 유지 (status는 새로고침 시 재검증)
const queuePersistConfig = {
	key: 'queue',
	storage,
	whitelist: ['allowedUntil', 'showId'],
};

// purchase: persist 안 함 (새로고침 시 구매 진행 상태 초기화가 맞음)
const rootReducer = combineReducers({
	auth: authReducer,
	queue: persistReducer(queuePersistConfig, queueReducer),
	purchase: purchaseReducer,
});

const persistedReducer = rootReducer;

export const store = configureStore({
	reducer: persistedReducer,
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
			},
		}),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
