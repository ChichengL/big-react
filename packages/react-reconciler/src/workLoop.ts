// 这里调用beginWork,completeWork,commitWork三个函数，完成React组件的更新。

import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode } from './fiber';

let workInProgress: FiberNode | null = null; // 指向当前工作的Fiber节点，方便后续更新

function prepareFreshStack(fiber: FiberNode) {
	workInProgress = fiber;
}

function renderRoot(root: FiberNode) {
	do {
		try {
			workLoop();
			break;
		} catch (e) {
			console.warn('workLoop error', e);
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
