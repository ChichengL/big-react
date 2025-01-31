import { UpdateQueue, processUpdateQueue } from './updateQueue';
import { FiberNode } from './fiber';
import { HostComponent, HostRoot, HostText } from './workTags';
import { ReactElementType } from 'shared/ReactTypes';
import { mountChildFibers, reconcileChildFibers } from './childFibers';

//递归
export const beginWork = (wip: FiberNode) => {
	//1. 计算状态的最新值
	//2. 创建子fiberNode

	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
};

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;

	updateQueue.shared.pending = null;

	const { memoizedState } = processUpdateQueue(baseState, pending); //计算后新的state
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
