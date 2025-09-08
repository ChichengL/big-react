import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { isSubsetOfLanes, Lane, NoLane } from './fiberLanes';

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
	pendingUpdate: Update<State> | null, //pending指向最后一个更新,这里同时也是baseQueue和pendingUpdateQueue合并后的结果
	renderLane: Lane,
): {
	memoizedState: State; //上次更新计算的最终state
	baseState: State; //本次更新参与计算的初始state
	baseQueue: Update<State> | null;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
		baseState,
		baseQueue: null,
	};
	if (pendingUpdate !== null) {
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<State>;

		let newBaseState = baseState;
		let newBaseQueueFirst: Update<State> | null = null;
		let newBaseQueueLast: Update<State> | null = null;
		let newState = baseState;
		do {
			const updateLane = pending?.lane;
			if (!isSubsetOfLanes(renderLane, updateLane)) {
				//优先级不够的情况，被跳过，有update被跳过
				const clone = createUpdate(pending.action, pending.lane); //被跳过的update
				//当前的update是不是第一个被跳过的update
				if (newBaseQueueFirst === null) {
					//第一个被跳过的
					newBaseQueueFirst = clone;
					newBaseQueueLast = clone;
					newBaseState = newState;
				} else {
					(newBaseQueueLast as Update<State>).next = clone;
					newBaseQueueLast = clone;
				}
			} else {
				//优先级足够
				if (newBaseQueueLast !== null) {
					//本次更新{被跳过的update及其后面的所有update}都会被保存在baseQueue中参与下次State计算
					const clone = createUpdate(pending.action, NoLane);
					newBaseQueueLast.next = clone;
					newBaseQueueLast = clone;
				}
				const action = pending.action;
				if (action instanceof Function) {
					newState = action(baseState);
				} else {
					newState = action;
				}
			}

			pending = pending.next as Update<State>;
		} while (pending !== first);
		if (newBaseQueueLast === null) {
			//本次计算没有update跳过
			newBaseState = newState;
		} else {
			//本次计算有update跳过
			newBaseQueueLast.next = newBaseQueueFirst;
		}
		result.memoizedState = newState;
		result.baseState = newBaseState;
		result.baseQueue = newBaseQueueLast;
	}
	return result;
};
