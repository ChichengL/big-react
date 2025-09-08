import internals from 'shared/internals';
import { FiberNode } from './fiber';
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue,
	Update,
	UpdateQueue,
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLanes } from './fiberLanes';
import { Flags, PassiveEffect } from './fiberFlags';
import { HookHasEffect, Passive } from './hookEffectTags';

let currentlyRenderingFiber: FiberNode | null = null; //当前正在处理的fiber节点 存在于内存中即将展示的fiber
let workInProgressHook: Hook | null = null; //当前正在处理的hook
let currentHook: Hook | null = null; //当前正在处理的hook对应的current hook
let renderLane = NoLane;
const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any; //保存当前hook的状态
	updateQueue: UpdateQueue<any> | null; //保存当前hook的更新队列 //当setState 时会往更新队列里添加更新
	next: Hook | null; //指向下一个hook

	baseState: any; //保存当前hook的初始状态
	baseQueue: Update<any> | null; //保存当前hook的初始更新队列
}

export interface Effect {
	tag: Flags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}
export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null; //指向链表最后一个
}
type EffectCallback = () => void;
type EffectDeps = any[] | null;

export function renderWithHooks(wip: FiberNode, lane: Lane) {
	//赋值操作
	const Component = wip.type;
	currentlyRenderingFiber = wip;
	wip.memoizedState = null; //这里除了重置hooks链表还要重置effect链表
	wip.updateQueue = null;
	renderLane = lane;

	const current = wip.alternate; //上一次的fiber树
	if (current !== null) {
		//update
		workInProgressHook = null;
		currentHook = null;
		currentDispatcher.current = HookDispatcherOnUpdate;
	} else {
		currentDispatcher.current = HookDispatcherOnMount;
	}

	const props = wip.pendingProps;
	const children = Component(props);

	//重置操作
	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;
	return children;
}

const HookDispatcherOnMount: Dispatcher = {
	//这里应该需要区分一下什么时候是mountState什么时候是updateState
	useState: mountState,
	useEffect: mountEffect,
};
const HookDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
};

/**
 *
 * @description 初始化state
 * @returns
 */
function mountState<State>(
	initialState: (() => State) | State,
): [State, (action: Action<State>) => void] {
	//找到当前useState对应的hook数据
	const hook = mountWorkInProgressHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	const queue = createUpdateQueue<State>(); //因为state能够触发更新
	hook.updateQueue = queue;
	hook.memoizedState = memoizedState;
	const dispatch = dispatchSetState.bind(
		null,
		currentlyRenderingFiber!,
		queue as any,
	);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}
function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>,
) {
	const lane = requestUpdateLanes();
	const update = createUpdate(action, lane);
	//类似于fiberReconciler中的updateQueue，只不过这里是针对单个hook的，fiberReconciler中的updateQueue是针对整个fiberNode的
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber, lane);
}
function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null,
		baseState: null,
		baseQueue: null,
	};
	if (workInProgressHook === null) {
		//第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件中调用hooks');
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		//不是第一个hook
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook;
}

/**
 * @description 根据不同的fiberNode类型，执行不同的更新逻辑
 */
function updateState<State>(): [State, (action: Action<State>) => void] {
	//来源可以是交互时触发更新，也可能是在初始渲染时触发的更新
	//找到当前useState对应的hook数据
	const hook = updateWorkInProgressHook();

	//计算新的state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const baseState = hook.baseState;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;
	const { pending } = queue.shared; //获取当前hook的更新队列

	/**
	 * 支持并发更新
	 * 1. pending/baseQueue update保存在current中
	 */
	if (pending !== null) {
		if (baseQueue !== null) {
			/**
			 * baseQueue b2->b0->b1->b2
			 * pending p2->p0->p1->p2
			 * baseFirst b0
			 * pendingFirst p0
			 *
			 * baseQueue.next = pendingFirst =====> b2->p0->p1->p2->p0
			 * pending.next = baseFirst =====> p2->b0->b1->b2
			 *
			 * 最终 pending: p2->b0->b1->b2->p0->p1->p2形成了环
			 */
			const baseFirst = baseQueue.next;
			const pendingFirst = pending.next;
			baseQueue.next = pendingFirst;
			pending.next = baseFirst;
		}
		baseQueue = pending;
		//保存在current中
		current.baseQueue = pending;
		queue.shared.pending = null; //需要清空队列
		//说明当前hook有更新
		if (baseQueue !== null) {
			const {
				memoizedState,
				baseQueue: newBaseQueue,
				baseState: newBaseState,
			} = processUpdateQueue(baseState, pending, renderLane);
			hook.memoizedState = memoizedState;
			hook.baseQueue = newBaseQueue;
			hook.baseState = newBaseState;
		}
	}
	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}
function updateWorkInProgressHook(): Hook {
	//TODO: render阶段触发了更新，比如在fc中直接使用setState
	let nextCurrentHook: Hook | null = null;

	if (currentHook === null) {
		// 这个是FC update时的第一个hook
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			//说明不是初次渲染
			nextCurrentHook = current?.memoizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		//当前FC的后续hook(不是第一个hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		// mount/update u1 u2 u3
		// update u1 u2 u3 u4 相当于数量对不上，那么这里应该抛出错误
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的hook比上次执行时多`,
		);
	}
	currentHook = nextCurrentHook; //这里是为了复用
	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
		baseState: currentHook.baseState,
		baseQueue: currentHook.baseQueue,
	};

	if (workInProgressHook === null) {
		//第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件中调用hooks');
		} else {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		//不是第一个hook
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	//找到当前useState对应的hook数据
	const hook = mountWorkInProgressHook();

	const nextDeps = deps === undefined ? null : deps;

	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
	const tag = (Passive | HookHasEffect) as Flags;
	hook.memoizedState = pushEffect(tag, create, undefined, nextDeps);
}

function pushEffect(
	hookFlags: Flags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps,
): Effect {
	const effect: Effect = {
		create,
		destroy,
		deps,
		next: null,
		tag: hookFlags,
	};
	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;

	if (updateQueue === null) {
		const updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		//插入effect
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			effect.next = lastEffect.next;
			lastEffect.next = effect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}
function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	//找到当前useState对应的hook数据
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destroy: EffectCallback | void;
	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
		}
		//浅比较后不相等
		(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
		hook.memoizedState = pushEffect(
			(Passive | HookHasEffect) as Flags, //这种情况下才会执行副作用对应着 workLoop中的flushPassiveEffects
			create,
			destroy,
			nextDeps,
		);
	}
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (nextDeps === null || prevDeps === null) {
		return false;
	}

	if (nextDeps.length !== prevDeps.length) {
		return false;
	}
	for (let i = 0; i < prevDeps.length; i++) {
		if (Object.is(nextDeps[i], prevDeps[i])) {
			continue;
		}
		return false;
	}

	return true;
}
