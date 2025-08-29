import internals from 'shared/internals';
import { FiberNode } from './fiber';

let currentlyRenderingFiber: FiberNode | null = null; //当前正在处理的fiber节点
let workInProgressHook: Hook | null = null; //当前正在处理的hook
const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any; //保存当前hook的状态
	updateQueue: unknown; //保存当前hook的更新队列 //当setState 时会往更新队列里添加更新
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
		//mount
	// 	currentDispatcher.current = {
	// 		useState: mountState,
	// 	};
	// }

	const props = wip.pendingProps;
	const children = Component(props);

	currentlyRenderingFiber = null;
	//重置操作
	return children;
}
