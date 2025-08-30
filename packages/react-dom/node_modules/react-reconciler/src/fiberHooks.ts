import internals from 'shared/internals';
import { FiberNode } from './fiber';
import { Dispatcher } from 'react/src/currentDispatcher';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue,
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

let currentlyRenderingFiber: FiberNode | null = null; //当前正在处理的fiber节点
let workInProgressHook: Hook | null = null; //当前正在处理的hook
const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any; //保存当前hook的状态
	updateQueue: any; //保存当前hook的更新队列 //当setState 时会往更新队列里添加更新
	next: Hook | null; //指向下一个hook
}
export function renderWithHooks(wip: FiberNode) {
	//赋值操作
	const Component = wip.type;
	currentlyRenderingFiber = wip;
	wip.memoizedState = null;

	const current = wip.alternate; //上一次的fiber树
	if (current !== null) {
		//update
		workInProgressHook = null;
	} else {
		currentDispatcher.current = HookDispatcherOnMount;
	}

	const props = wip.pendingProps;
	const children = Component(props);

	currentlyRenderingFiber = null;
	//重置操作
	return children;
}

const HookDispatcherOnMount: Dispatcher = {
	useState: mountState,
};
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
	//@ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}
function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>,
) {
	const update = createUpdate(action);
	//类似于fiberReconciler中的updateQueue，只不过这里是针对单个hook的，fiberReconciler中的updateQueue是针对整个fiberNode的
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber);
}
function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null,
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
