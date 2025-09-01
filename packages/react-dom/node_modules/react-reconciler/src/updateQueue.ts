import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<State> {
	action: Action<State>;
	next: Update<State> | null;
	lane: Lane;
}
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	//兼容hooks
	dispatch: Dispatch<State> | null;
}
/**
 *
 * @function createUpdate 创建action 更新对应的数据结构
 *
 */
export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane,
): Update<State> => {
	return {
		action,
		next: null,
		lane,
	};
};

/**
 * @function createUpdateQueue 保存数据结构的队列
 * @
 */
export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null,
		},
		dispatch: null,
	} as UpdateQueue<State>;
};

/**
 * @function enqueueUpdate 入队更新
 */
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>,
) => {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		// 第一次更新 a->a
		update.next = update;
	} else {
		// 后续更新 b->a->b 环状链表 pending始终指向最后一次更新
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null, //指向最后一个更新
	renderLane: Lane,
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
	};
	if (pendingUpdate !== null) {
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<State>;
		do {
			const updateLane = pending?.lane;
			if (updateLane === renderLane) {
				const action = pending.action;
				if (action instanceof Function) {
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.warn('过期更新');
				}
			}

			pending = pending.next as Update<State>;
		} while (pending !== first);
	}
	result.memoizedState = baseState;
	return result;
};
