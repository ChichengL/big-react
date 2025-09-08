import { Key, Props, ReactElementType } from 'shared/ReactTypes';
import {
	createFiberFromElement,
	FiberNode,
	createWorkInProgress,
	createFiberFromFragment,
} from './fiber';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import { Fragment, HostText } from './workTags';
import { Placement, ChildDeletion } from './fiberFlags';

type ExistingChildren = Map<string | number, FiberNode>;

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
		const key = element.key;

		while (currentFiber !== null) {
			if (currentFiber.key === key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						// ✅ Fragment 用 children，其它用 props
						const props =
							element.type === REACT_FRAGMENT_TYPE
								? element.props.children
								: element.props;

						const existing = useFiber(currentFiber, props);
						existing.return = returnFiber;
						deleteRemainingChildren(returnFiber, currentFiber.sibling);
						return existing;
					}
					deleteRemainingChildren(returnFiber, currentFiber);
					break;
				} else {
					if (__DEV__) console.warn('未实现的reconcile类型', element);
					break;
				}
			} else {
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}

		// ✅ Fragment 需要用 children 创建 Fragment fiber
		let fiber;
		if (element.type === REACT_FRAGMENT_TYPE) {
			fiber = createFiberFromFragment(element.props.children, key);
		} else {
			fiber = createFiberFromElement(element);
		}
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

	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChildren: any[],
	) {
		let lastPlacedIndex: number = 0; //最后一个可复用fiber在current中的index
		let lastNewFiber: FiberNode | null = null; //创建的最后一个fiber
		let firstNewFiber: FiberNode | null = null; //创建的第一个fiber
		// 1. 将current中所有同级的fiber保存在Map中
		const existingChildren: ExistingChildren = new Map();
		let current = currentFiber;
		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index;
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}
		// 2.遍历newChildren
		for (let i = 0; i < newChildren.length; i++) {
			const after = newChildren[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
			if (newFiber === null) {
				continue;
			}
			/**
			 * 3. 标记移动还是插入
			 * 移动的依据：element的index 	与{element对应 currentFiber的} index比较
			 * 接下来遍历到的可复用fiber的index < lastPlacedIndex，则表示需要移动
			 * 比如存在ABC->BCA
			 *  第一轮: firstNewFiber = B,lastNewFiber = B,lastPlacedIndex = 1
			 *  第二轮: firstNewFiber = B,lastNewFiber = C,lastPlacedIndex = 2
			 *  第三轮: firstNewFiber = B,lastNewFiber = A,lastPlacedIndex = 2 然后这里遍历到A Fiber A的oldIndex为0表明A需要移动
			 * 这里本质上是做的是一套 “基于 key 的贪心策略”，找到最小变更
			 */
			newFiber.index = i;
			newFiber.return = returnFiber;

			if (lastNewFiber === null) {
				firstNewFiber = newFiber; //创建的第一个fiber
				lastNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling; //创建的最后一个fiber
			}
			if (!shouldTrackEffects) {
				continue;
			}
			const current = newFiber.alternate;
			if (current !== null) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					//需要移动
					newFiber.flags |= Placement;
					continue;
				} else {
					//不需要移动
					lastPlacedIndex = oldIndex;
				}
			} else {
				//mount阶段
				newFiber.flags |= Placement;
			}
		}
		//4.删除不存在的fiber
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});
		return firstNewFiber;
	}

	function getElementKeyToUse(element: any, index?: number): Key {
		if (
			Array.isArray(element) ||
			typeof element === 'string' ||
			typeof element === 'number' ||
			element === undefined ||
			element === null
		) {
			return index;
		}
		return element.key !== null ? element.key : index;
	}
	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any,
	): FiberNode | null {
		// ✅ key 读取要容错
		const keyToUse = getElementKeyToUse(element, index);

		const before = existingChildren.get(keyToUse);

		// ✅ 文本判断应当看 element
		if (typeof element === 'string' || typeof element === 'number') {
			if (before && (before as FiberNode).tag === HostText) {
				existingChildren.delete(keyToUse);
				return useFiber(before as FiberNode, { content: String(element) });
			}
			return new FiberNode(HostText, { content: String(element) }, null);
		}

		// ✅ 显式数组：当作隐式 Fragment
		if (Array.isArray(element)) {
			return updateFragment(
				returnFiber,
				before,
				element, // 传数组
				keyToUse,
				existingChildren,
			);
		}

		if (typeof element === 'object' && element !== null) {
			if (element.$$typeof === REACT_ELEMENT_TYPE) {
				// ✅ Fragment 用 element.type 判断，传 children（数组）
				if (element.type === REACT_FRAGMENT_TYPE) {
					return updateFragment(
						returnFiber,
						before,
						element.props.children, // 传 children 数组
						keyToUse,
						existingChildren,
					);
				}

				if (before && before.type === element.type) {
					existingChildren.delete(keyToUse);
					return useFiber(before, element.props);
				}
				return createFiberFromElement(element);
			}

			if (__DEV__) console.warn('未实现的reconcile类型', element);
		}

		return null;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: any,
	) {
		//这三个参数分别是 父节点的fiber，当前子节点的fiberNode，子节点的ReactElement类型
		// return fiberNode

		//判断fragment
		const isUnkeyedTopLevelFragment =
			typeof newChild === 'object' &&
			newChild !== null &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null;
		if (isUnkeyedTopLevelFragment) {
			/**
			 * 说明根节点就是Fragment
			 * 例如
			 <>
				 <div/>
				 <div/>
			 </>
			*/
			newChild = newChild.props.children;
		}
		//判断当前fiber的类型 ReactElement
		if (typeof newChild === 'object' && newChild !== null) {
			//TODO: 多节点的情况 ul>li*4
			/**
			 * 整体流程 多节点存在 插入 移动 删除
			 * 1. 将current中所有同级的fiber保存在Map中
			 * 2. 遍历 newChild数组，对每个遍历到的element，存在以下两种情况
			 * 	1.Map中存在对应的currentFiber 且可以复用
			 *  2.Map中不存在对应的currentFiber 或 不能复用
			 * 3. 判断插入还是移动
			 * 4. 最后Map中剩下的都标记删除
			 */
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
			}
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

		//  HostText 类型
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild),
			);
		}
		if (currentFiber !== null) {
			//兜底情况标记删除
			deleteRemainingChildren(returnFiber, currentFiber);
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

function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: any[],
	key: Key,
	existingChildren: ExistingChildren,
) {
	let fiber;

	if (!current || current.tag !== Fragment) {
		fiber = createFiberFromFragment(elements, key);
	} else {
		//复用
		existingChildren.delete(key);
		fiber = useFiber(current, elements);
	}
	fiber.return = returnFiber;
	return fiber;
}

export const reconcileChildFibers = childReconciler(true);
export const mountChildFibers = childReconciler(false); //插入大量节点的时候使用
