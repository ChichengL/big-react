// 这里调用beginWork,completeWork,commitWork三个函数，完成React组件的更新。

import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null; // 指向当前工作的Fiber节点，方便后续更新

function prepareFreshStack(fiber: FiberRootNode) {
	//这个fiber没有child只有current
	// fiberRootNode.current -> rootFiber(这才是第一个可以正常使用的fiber节点)

	workInProgress = createWorkInProgress(fiber.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// 调度功能
	// 首屏渲染是hostFiber，其他情况下不是 找到fiberRootNode节点
	const root = markUpdateFromFiberToRoot(fiber);

	renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = fiber.return;

	while (parent !== null) {
		node = parent;
		parent = parent.return;
		//找到hostrootfiber节点
	}
	if (node.tag === HostRoot) {
		// 然后返回fiberrootNode节点
		return node.stateNode;
	}
	return null;
}
function renderRoot(root: FiberRootNode) {
	prepareFreshStack(root);
	do {
		try {
			workLoop();
			break;
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop error', e);
			}
			workInProgress = null;
		}
	} while (true);
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 遍历子节点
	const next = beginWork(fiber);
	fiber.memoizedProps = fiber.pendingProps; // 保存当前fiber的props

	if (next === null) {
		//到最深层了
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	//遍历兄弟节点,如果没有兄弟节点
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}
