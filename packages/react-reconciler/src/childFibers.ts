import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	createFiberFromElement,
	FiberNode,
	createWorkInProgress,
} from './fiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './workTags';
import { Placement, ChildDeletion } from './fiberFlags';

function childReconciler(shouldTrackEffects: boolean) {
	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
	) {
		if (!shouldTrackEffects) {
			//如果不需要收集副作用，就不需要标记删除
			return;
		}
		let childToDelete = currentFiber;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}
	}
	/**
	 *
	 * @param returnFiber
	 * @param currentFiber 屏幕上显示内容对应的fiber节点
	 * @param element
	 * @description 处理单元素的reconcile 单节点的diff（这里指的是更新后为单节点）
	 * 需要区分 
	 	1. key type都相同，复用节点 例如type为Aky为1 A1B2C3->A1 复用A1节点（代表type为A，key为1）
		2. key 相同 type不同，不存在可以复用节点
		3. key不同 type相同，不存在可以复用节点
		4. key不同 type不同，不存在可以复用节点
	 * @returns
	 */
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType,
	) {
		//比较key type是否相同，全都相同才可以复用
		const key = element.key;
		while (currentFiber !== null) {
			//update
			if (currentFiber.key === key) {
				//比较完key，就比较type
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						//key/type都相同，可以复用
						const existing = useFiber(currentFiber, element.props);
						existing.return = returnFiber;
						//剩下节点可以删除
						deleteRemainingChildren(returnFiber, currentFiber.sibling);
						return existing;
					}
					//key相同 type不同 删除所有旧的
					deleteRemainingChildren(returnFiber, currentFiber);
					break;
				} else {
					if (__DEV__) {
						console.warn('未实现的reconcile类型', element);
						break;
					}
				}
			} else {
				//key不同，直接删除旧的fiberNode
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}
		// 根据element类型，创建新的fiberNode
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) {
			//如果不需要收集副作用，就不需要标记删除
			return;
		}
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			//说明当前父节点没有收集过删除的子节点
			returnFiber.deletions = [childToDelete];
			returnFiber.flags |= ChildDeletion; //标记有删除的子节点
		} else {
			deletions.push(childToDelete);
		}
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number,
	) {
		while (currentFiber !== null) {
			//update
			if (currentFiber.tag === HostText) {
				//可以复用
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				return existing;
			}
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
		}
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			// 如果是初次渲染，同时fiber.alternate为空，则表示是插入操作
			fiber.flags |= Placement;
		}
		return fiber;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType,
	) {
		//这三个参数分别是 父节点的fiber，当前子节点的fiberNode，子节点的ReactElement类型
		// return fiberNode

		//判断当前fiber的类型
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					// 如果是ReactElement类型，则创建新的fiberNode
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild),
					);
				default:
					if (__DEV__) {
						console.warn('未实现的reconcile类型', newChild);
					}
					break;
			}
		}
		//TODO: 多节点的情况 ul>li*4

		// TODO: HostText 类型
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild),
			);
		}
		if (currentFiber !== null) {
			//兜底情况标记删除
			deleteChild(returnFiber, currentFiber);
		}
		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}
		return null;
	};
}
/**
 * 复用老节点，创建新的节点
 */
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProgress(fiber, pendingProps);
	clone.index = 0; //复用的节点index重置为0
	clone.sibling = null; //复用的节点sibling重置为null
	return clone;
}

export const reconcileChildFibers = childReconciler(true);
export const mountChildFibers = childReconciler(false); //插入大量节点的时候使用
