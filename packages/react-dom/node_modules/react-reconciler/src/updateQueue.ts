import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>;
	next: Update<State> | null;
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
export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action,
		next: null,
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
	pendingUpdate: Update<State> | null,
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
	};
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action;
		if (action instanceof Function) {
			result.memoizedState = action(baseState);
		} else {
			result.memoizedState = action;
		}
	}
	return result;
};
