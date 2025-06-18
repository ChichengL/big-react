import {
	appendInitialChild,
	createInstance,
	createTextInstance,
	Instance,
} from 'hostConfig';
import { FiberNode } from './fiber';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags';
import { NoFlags } from './fiberFlags';

// 归过程
export const completeWork = (wip: FiberNode): FiberNode | null => {
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			// 构建离屏DOM树，并且插入到真实DOM树中
			if (current !== null && wip.stateNode) {
				//stateNode对应着真实DOM节点 update
			} else {
				// mount
				const instance = createInstance(wip.type, newProps); // 创建宿主环境的实例

				appendAllChildren(instance, wip);
				wip.stateNode = instance; // 保存实例到fiber节点中
			}
			bubbleProperties(wip); // 冒泡属性到父节点
			return null;
		case HostText:
			if (current !== null && wip.stateNode) {
				//stateNode对应着真实DOM节点 update
			} else {
				// mount
				const instance = createTextInstance(newProps.content); // 创建宿主环境的实例

				appendAllChildren(instance, wip);
				wip.stateNode = instance; // 保存实例到fiber节点中
			}
			bubbleProperties(wip); // 冒泡属性到父节点

			return null;
		case HostRoot:
			bubbleProperties(wip); // 冒泡属性到父节点

			return null;
		case FunctionComponent:
			bubbleProperties(wip); // 冒泡属性到父节点

			return null;
		default:
			if (__DEV__) {
				console.warn('未处理的completeWork类型', wip);
			}
			break;
	}
	return wip;
};

function appendAllChildren(parent: Instance, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			// 如果是原生组件或者文本节点，则直接插入到父节点的子节点中
			appendInitialChild(parent, node?.stateNode);
		} else if (node.child !== null) {
			// 查找子节点的子节点，并插入到父节点的子节点中
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		while (node.sibling === null) {
			// 如果没有兄弟节点，则返回上一层节点
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node.return;
		}
		node.sibling.return = node.return; //这里是有兄弟节点能走到的，让兄弟节点的return指向父节点 然后递归兄弟节点
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	// flags分布在不同的fiberNode中，如何快速找到他们----> 利用completeWork向上遍历的流程，将flags冒泡上去

	let subTreeFlags = NoFlags;
	let child = wip.child;

	while (child !== null) {
		subTreeFlags |= child.subTreeFlags;
		subTreeFlags |= child.flags;
		// subTreeFalgs	记录了子树的标记位，用于标记子树是否需要更新

		child.return = wip;
		child = child.sibling;
	}
	// 遍历完所有的子节点，将子树的标记位冒泡到父节点
	wip.subTreeFlags |= subTreeFlags;
}
