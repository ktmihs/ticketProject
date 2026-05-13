'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CHANNEL_NAME = 'ticket-tab-sync';
const STORAGE_KEY = 'ticket:active_tab';
const TAB_ID_KEY = 'ticket:tab_id';
const HEARTBEAT_MS = 3_000;
const CLAIM_TIMEOUT_MS = 8_000;
// RELEASE 수신 후 클레임 시도까지 대기
// (SPA 페이지 전환 시 현재 탭이 재클레임할 시간 확보)
const RELEASE_CLAIM_DELAY_MS = 400;

export type TabSyncStatus = 'owner' | 'blocked';

interface StoredClaim {
	tabId: string;
	ts: number;
}

interface SyncMessage {
	type: 'HEARTBEAT' | 'RELEASE';
	tabId: string;
}

function readClaim(): StoredClaim | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const claim: StoredClaim = JSON.parse(raw);
		if (Date.now() - claim.ts > CLAIM_TIMEOUT_MS) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return claim;
	} catch {
		return null;
	}
}

function writeClaim(tabId: string) {
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ tabId, ts: Date.now() }),
	);
}

function eraseClaim(tabId: string) {
	const stored = readClaim();
	if (stored?.tabId === tabId) localStorage.removeItem(STORAGE_KEY);
}

/**
 * 탭 간 구매 플로우 중복 진입 방지 훅
 *
 * - 현재 탭이 구매 플로우를 '소유(owner)'하거나 다른 탭에 의해 '차단(blocked)'된 상태를 반환한다.
 * - localStorage 클레임 + BroadcastChannel 하트비트로 동일 브라우저 내 탭을 조율한다.
 * - release()를 호출하면 소유권을 즉시 해제하고 다른 탭이 이어받을 수 있다.
 */
export function useTabSync(): { status: TabSyncStatus; release: () => void } {
	const tabId = useRef('');
	const [status, setStatus] = useState<TabSyncStatus>('owner');
	const statusRef = useRef<TabSyncStatus>('owner');
	const channelRef = useRef<BroadcastChannel | null>(null);
	const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stopHeartbeat = useCallback(() => {
		if (heartbeatRef.current) {
			clearInterval(heartbeatRef.current);
			heartbeatRef.current = null;
		}
	}, []);

	const startHeartbeat = useCallback(
		(id: string) => {
			stopHeartbeat();
			heartbeatRef.current = setInterval(() => {
				writeClaim(id);
				channelRef.current?.postMessage({
					type: 'HEARTBEAT',
					tabId: id,
				} satisfies SyncMessage);
			}, HEARTBEAT_MS);
		},
		[stopHeartbeat],
	);

	const becomeOwner = useCallback(
		(id: string) => {
			writeClaim(id);
			statusRef.current = 'owner';
			setStatus('owner');
			startHeartbeat(id);
		},
		[startHeartbeat],
	);

	const release = useCallback(() => {
		eraseClaim(tabId.current);
		channelRef.current?.postMessage({
			type: 'RELEASE',
			tabId: tabId.current,
		} satisfies SyncMessage);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		// 새로고침 시에도 동일 탭 ID 유지 (sessionStorage는 탭 단위로 격리됨)
		let id = sessionStorage.getItem(TAB_ID_KEY);
		if (!id) {
			id = crypto.randomUUID();
			sessionStorage.setItem(TAB_ID_KEY, id);
		}
		tabId.current = id;

		const existing = readClaim();
		if (existing && existing.tabId !== id) {
			statusRef.current = 'blocked';
			setStatus('blocked');
		} else {
			becomeOwner(id);
		}

		const channel = new BroadcastChannel(CHANNEL_NAME);
		channelRef.current = channel;

		channel.onmessage = (e: MessageEvent<SyncMessage>) => {
			if (e.data.tabId === tabId.current) return;

			if (e.data.type === 'HEARTBEAT') {
				// 다른 탭 활성 중 — 현재 탭이 owner라면 충돌 여부 재확인
				if (statusRef.current !== 'blocked') {
					const claim = readClaim();
					if (claim && claim.tabId !== tabId.current) {
						stopHeartbeat();
						statusRef.current = 'blocked';
						setStatus('blocked');
					}
				}
			} else if (e.data.type === 'RELEASE') {
				// 소유 탭 해제 — 딜레이 후 클레임 시도
				// (SPA 전환 중인 현재 탭이 재클레임 완료할 시간을 확보)
				setTimeout(() => {
					const claim = readClaim();
					if (!claim || claim.tabId === tabId.current) {
						becomeOwner(tabId.current);
					}
				}, RELEASE_CLAIM_DELAY_MS);
			}
		};

		// 탭 닫기·새로고침 시 클레임 해제
		const handlePageHide = () => release();
		window.addEventListener('pagehide', handlePageHide);

		return () => {
			stopHeartbeat();
			// SPA 페이지 전환: 클레임 유지 (다음 플로우 페이지가 재클레임)
			// 탭 닫기·새로고침: pagehide 핸들러가 처리
			channel.close();
			window.removeEventListener('pagehide', handlePageHide);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return { status, release };
}
