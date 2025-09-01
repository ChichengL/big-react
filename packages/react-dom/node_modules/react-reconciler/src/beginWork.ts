import { UpdateQueue, processUpdateQueue } from './updateQueue';
import { FiberNode } from './fiber';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags';
import { ReactElementType } from 'shared/ReactTypes';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
import { renderWithHooks } from './fiberHooks';
import { Lane } from './fiberLanes';

//递归
export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	//1. 计算状态的最新值
	//2. 创建子fiberNode
	/**
	 * 对于update流程begin work还需要处理 ChildrenDeletion 和 节点移动的情况比如(abc->bca)
	 */
	//暂时只处理单节点的问题（也就是先不考虑移动
	//能够触发更新的要给与renderLane
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragment(wip);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
};
function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane);
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	if (pending !== null) {
		updateQueue.shared.pending = null;
		const current = wip.alternate;
		if (current !== null && current.updateQueue) {
			(current.updateQueue as UpdateQueue<Element>).shared.pending = null;
		}
	}

	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane); //计算后新的state
	wip.memoizedState = memoizedState;

	const nextChildren = wip.memoizedState;
	/**
	 * <A><B/></A>这样子的
	 * 当进行A的beginWork时，通过对比B的current fiberNode 与 B的reactElement生成B对应的wip fiberNode
	 */

	reconcileChildren(wip, nextChildren); //对比子节点

	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps; // children是放在pendingProps的
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
	// 这里对比的是子节点的current fiberNode和reactElement，生成新的fiberNode
	const current = wip.alternate;
	if (current !== null) {
		// 说明是update
		wip.child = reconcileChildFibers(wip, current?.child, children);
	} else {
		// 说明是mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
