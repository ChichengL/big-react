let syncQueue: ((...args: any[]) => void)[] | null = null;
let isFlushingSyncQueue = false;
export function scheduleSyncCallback(callback: (...args: any[]) => void) {
	if (syncQueue === null) {
		syncQueue = [];
	}
	syncQueue.push(callback);
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue !== null) {
		isFlushingSyncQueue = true;
		let queue: typeof syncQueue | null = syncQueue;
		syncQueue = null;

		try {
			queue.forEach((callback) => callback());
		} catch (error) {
			if (__DEV__) {
				console.warn('flushSyncCallbacks error', error);
			}
			console.error(error);
		} finally {
			queue = null;
			isFlushingSyncQueue = false;
		}
	}
}
