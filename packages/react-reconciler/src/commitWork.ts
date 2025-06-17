import { appendChildToContainer, Container } from 'hostConfig';
import { FiberNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTags';
let nextEffect: FiberNode | null = null;
export const commitMutationEffects = (finishedWork: FiberNode) => {
	// 递归找到flag
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;

		if (
			(nextEffect.subTreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			//子节点可能存在flags,需要继续递归
			nextEffect = child;
		} else {
			/**
			 * 1. 找到底了
			 * 2. 找到的节点不包含subTreeFlags，但是可能包含flags
			 *
			 * 向上遍历
			 */
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	// 当前的finishedWork是真正存在flags的节点
	const flags = finishedWork.flags;
	if ((flags & Placement) !== NoFlags) {
		//表示当前节点是一个Placement节点
		commitPlacement(finishedWork);
		//然后移除placement
		finishedWork.flags &= ~Placement;
	}
};

const commitPlacement = (finishedWork: FiberNode) => {
	//插入操作：需要参数 parent->DOM  finishedWork ->DOM
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}

	//1. 获取父级宿主环境节点
	const hostParent = getHostParent(finishedWork);
	//2. 找到fishedWork对应的DOM ，并且append到container中
	appendPlacementNodeIntoContainer(finishedWork, hostParent);
};

function getHostParent(fiber: FiberNode): Container {
	let parent = fiber.return;

	while (parent) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			return parent.stateNode;
		}
		if (parentTag === HostRoot) {
			return parent.stateNode.container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('未找到host parent', fiber);
	}
}

function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
) {
	//finishedWork不一定是host类型的节点   向下遍历

	//fiber host
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		appendChildToContainer(finishedWork.stateNode, hostParent);
		return;
	}

	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
