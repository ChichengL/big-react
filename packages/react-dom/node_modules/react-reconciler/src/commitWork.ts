import {
	appendChildToContainer,
	commitUpdate,
	Container,
	removeChild,
} from 'hostConfig';
import { FiberNode } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update,
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags';
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
	if ((flags & Update) !== NoFlags) {
		// update
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		// update
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach((childToDeletion) => {
				commitDeletion(childToDeletion);
			});
		}
		finishedWork.flags &= ~ChildDeletion;
	}
};

const commitDeletion = (childToDeletion: FiberNode) => {
	//递归操作
	//1.对于FC 执行effect unmount
	//2.对于HostComponent 解绑ref
	//3.对于HostText 直接删除
	let rootHostComponent: FiberNode | null = null;
	//递归子树
	commitNestedComponent(childToDeletion, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostComponent === null) {
					//找到要删除的第一个HostComponent
					rootHostComponent = unmountFiber;
				}
				//TODO: 解绑ref
				return;
			case HostText:
				if (rootHostComponent === null) {
					//找到要删除的第一个HostComponent
					rootHostComponent = unmountFiber;
				}
				return;
			case FunctionComponent:
				//TODO: useEffect unmount
				return;
			default:
				if (__DEV__) {
					console.warn('未处理的unmount类型', unmountFiber);
				}
				return;
		}
	});
	if (rootHostComponent !== null) {
		//删除rootHostComponent对应的DOM
		const hostParent = getHostParent(childToDeletion);
		if (hostParent === null) {
			if (__DEV__) {
				console.warn('未找到host parent');
			}
			return;
		}
		removeChild(hostParent, rootHostComponent);
	}
	//删除完成之后,重置
	childToDeletion.return = null;
	childToDeletion.child = null;
};
//子树的节点和回调函数
function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void,
) {
	let node = root;

	while (true) {
		onCommitUnmount(node);
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
		}
		if (node === root) {
			//终止
			return;
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			//向上归位
			node = node.return;
		}
		node.sibling.return = node.return;
		//归位完成后，继续遍历下一个节点
		node = node.sibling;
	}
}

const commitPlacement = (finishedWork: FiberNode) => {
	//插入操作：需要参数 parent->DOM  finishedWork ->DOM
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}

	//1. 获取父级宿主环境节点
	const hostParent = getHostParent(finishedWork);
	//2. 找到fishedWork对应的DOM ，并且append到container中
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};

function getHostParent(fiber: FiberNode): Container | null {
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
	return null;
}

function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
) {
	//finishedWork不一定是host类型的节点   向下遍历

	//fiber host
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		appendChildToContainer(hostParent, finishedWork.stateNode);
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
