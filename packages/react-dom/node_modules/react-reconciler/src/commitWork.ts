import {
	appendChildToContainer,
	commitUpdate,
	Container,
	insertChildToContainer,
	Instance,
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
};

const commitDeletion = (childToDeletion: FiberNode) => {
	//递归操作
	//1.对于FC 执行effect unmount
	//2.对于HostComponent 解绑ref
	//3.对于HostText 直接删除
	let rootHostNode: FiberNode | null = null;
	//递归子树
	commitNestedComponent(childToDeletion, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					//找到要删除的第一个HostComponent
					rootHostNode = unmountFiber;
				}
				//TODO: 解绑ref
				return;
			case HostText:
				if (rootHostNode === null) {
					//找到要删除的第一个HostComponent
					rootHostNode = unmountFiber;
				}
				return;
			case FunctionComponent:
				//TODO: useEffect unmount 以及ref调用
				return;
			default:
				if (__DEV__) {
					console.warn('未处理的unmount类型', unmountFiber);
				}
				return;
		}
	});
	if (rootHostNode !== null) {
		//删除rootHostComponent对应的DOM
		const hostParent = getHostParent(childToDeletion);
		if (hostParent === null) {
			if (__DEV__) {
				console.warn('未找到host parent');
			}
			return;
		}
		removeChild(hostParent, (rootHostNode as FiberNode).stateNode);
	}
	//删除完成之后,重置
	childToDeletion.return = null;
	childToDeletion.child = null;
};
/**
 *
 * @param root 根节点
 * @param onCommitUnmount 卸载回调函数
 * @description 递归卸载子树
 * @returns
 */
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
			/**
			 * 问题记录
			 * 描述：
			 ```
			 function App() {
				const [num, setNum] = useState(222);
				window.setNum = setNum;
				return num === 3 ? <Child /> : <div>{num}</div>;
			 }
			 function Child() {
			 	return <p>child</p>;
			 }
			 ```
			 这样子的组件当调用setNum(3) 再setNum(0)后，Child无法被卸载
			 * 在 root 是 Child(FunctionComponent) 且它有子节点 <p> 时，执行顺序是：

				onCommitUnmount(root) 被调用（这时还没看到宿主节点）。

				发现有 child，把 node 指到 <p>，但没 continue。

				直接进入“回溯/兄弟”分支，因为 <p> 没有兄弟且 node.return === root，于是 return。 
				这里相当于调用到了onCommitUnmount(Child) 本应该要调用onCommitUnmount(p)及其子节点的onCommitUnmount

				结果：onCommitUnmount 从未对 <p> / 文本节点调用过，rootHostNode 当然也就没被设到 <p>，导致不删除。
			 */
			continue; //这里需要遍历完成child之后再去遍历child的sibling，不然可能会提前终止
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
/**
 * @description 这里实现插入或者移动操作
 * @param finishedWork 插入的节点
 */
const commitPlacement = (finishedWork: FiberNode) => {
	//插入操作：需要参数 parent->DOM  finishedWork ->DOM
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}

	//1. 获取父级宿主环境节点
	const hostParent = getHostParent(finishedWork);

	//host sibling parentNode.insertBefore 需要找到目标兄弟Host节点
	const sibling = getHostSibling(finishedWork);

	//2. 找到fishedWork对应的DOM ，并且append到container中
	if (hostParent !== null) {
		insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
	}
};
function getHostSibling(fiber: FiberNode): Instance | null {
	let node: FiberNode = fiber;
	findSibling: while (true) {
		while (node.sibling === null) {
			//同级没有sibling需要向上遍历
			const parent = node.return;

			if (
				parent === null ||
				parent.tag === HostRoot ||
				parent.tag === HostComponent
			) {
				return null;
			}
			node = parent;
		}
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostComponent && node.tag !== HostText) {
			//需要向下遍历
			if ((node.flags & Placement) !== NoFlags) {
				//不稳定的placement
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling; //已经到底了
			} else {
				node.child.return = node;
				node = node.child;
			}
		}
		if ((node.flags & Placement) !== NoFlags) {
			return node.stateNode;
		}
	}
}

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

function insertOrAppendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance | null,
) {
	//finishedWork不一定是host类型的节点   向下遍历

	//fiber host
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		if (before) {
			insertChildToContainer(finishedWork.stateNode, hostParent, before);
		} else {
			appendChildToContainer(hostParent, finishedWork.stateNode);
		}
		return;
	}

	const child = finishedWork.child;
	if (child !== null) {
		insertOrAppendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
