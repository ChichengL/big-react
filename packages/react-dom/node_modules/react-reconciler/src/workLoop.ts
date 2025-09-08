// 这里调用beginWork,completeWork,commitWork三个函数，完成React组件的更新。

import { scheduleMicroTask } from 'hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitLayoutEffects,
	commitMutationEffects,
} from './commitWork';
import { completeWork } from './completeWork';
import {
	createWorkInProgress,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects,
} from './fiber';
import { Flags, MutationMask, NoFlags, PassiveEffect } from './fiberFlags';
import {
	getHighestPriorityLane,
	Lane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLane,
	NoLane,
	SyncLane,
} from './fiberLanes';
import { HostRoot } from './workTags';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import {
	unstable_NormalPriority as NormalPriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_cancelCallback,
	unstable_shouldYield,
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null; // 指向当前工作的Fiber节点，方便后续更新
let wipRootRenderLane: Lane = NoLane; //本次更新的Lane是什么
let rootDoesHavePassiveEffects = false;

type RootExistStatus = number;
const RootInComplete = 1; //中断执行
const RootCompleted = 2; //完成
//TODO: 执行过程中可能报错
/**
 * React 内部分为三个阶段
 * schedule 调度更新执行
 * render   beginWork,completeWork
 * commit beforeMutation,mutation,layout
 */
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	//这个fiber没有child只有current
	// fiberRootNode.current -> rootFiber(这才是第一个可以正常使用的fiber节点)
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	//TODO: 调度功能
	// 首屏渲染是hostFiber，其他情况下不是。其他情况是找到fiberRootNode节点
	const root = markUpdateFromFiberToRoot(fiber);
	markRootFiberLane(root, lane);
	ensureRootIsScheduled(root);
}
function ensureRootIsScheduled(root: FiberRootNode) {
	const highestPriorityLane = getHighestPriorityLane(root.pendingLanes);
	const existingCallback = root.callbackNode;

	if (highestPriorityLane === NoLane) {
		//当没有优先级时，取消回调
		if (existingCallback !== null) {
			unstable_cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = highestPriorityLane;
	const prevPriority = root.callbackPriority;

	if (curPriority === prevPriority) {
		//当前优先级和之前的优先级相同，不需要取消回调
		return;
	}

	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback);
	}
	if (__DEV__) {
		console.log(
			`在${highestPriorityLane === SyncLane ? '微任务' : '宏任务'}中调度，优先级${highestPriorityLane}`,
		);
	}
	let newCallbackNode = null;
	if (highestPriorityLane === SyncLane) {
		if (root.__syncScheduled) {
			return;
		}
		root.__syncScheduled = true;
		//同步优先级使用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度');
		}
		scheduleSyncCallback(() => {
			root.__syncScheduled = false;
			performSyncWorkOnRoot(root);
		});
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		//其他优先级使用宏任务调度,这里要使用调度器进行调度
		const priority = lanesToSchedulerPriority(highestPriorityLane);

		newCallbackNode = scheduleCallback(
			priority,
			performConcurrentWorkOnRoot.bind(null, root),
		);
	}
	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

function markRootFiberLane(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLane(root.pendingLanes, lane);
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
/**
 * @description 默认可中断的更新
 * @param root 根节点
 * @param didTimeout 是否超时
 */
function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean,
): any {
	// 并发更新

	//useEffect可能产生更高优先级的任务，因此需要保障useEffect回调执行
	const currentCallback = root.callbackNode;
	const didFlushPassiveEffects = flushPassiveEffects(
		root.pendingPassiveEffects,
	);
	if (didFlushPassiveEffects) {
		if (root.callbackNode !== currentCallback) {
			//表明useEffect执行完成之后触发了更新，更新的优先级比当前的回调优先级高，当前任务不需要执行了因此返回null

			return null;
		}
	}

	const lane = getHighestPriorityLane(root.pendingLanes);
	const currentCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return;
	}
	const needSync = lane === SyncLane || didTimeout; //是否需要同步更新
	const existStatus = renderRoot(root, lane, !needSync);

	ensureRootIsScheduled(root);
	if (existStatus === RootInComplete) {
		//中断执行
		if (root.callbackNode !== currentCallbackNode) {
			//当前正在执行的回调不是当前的回调，说明当前的回调被中断了(当前的回调被更高优先级的回调中断了)
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}
	if (existStatus === RootCompleted) {
		//完成状态
		const finishedWork = root.current.alternate; // 这个是hostRootFiber已经工作好了的树
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		wipRootRenderLane = NoLane;

		// wip fiberNode树 树中的flags
		commitRoot(root); //commit阶段 包含beforMutation,mutation,layout三个阶段 在commitWork.ts中实现
	} else if (__DEV__) {
		console.error('当前还未实现并发更新结束状态');
	}
}
/**
 * @description 默认不可中断
 */
function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);

	if (nextLane !== SyncLane) {
		//其他比SyncLane低的优先级
		//Or NoLane

		ensureRootIsScheduled(root);
		return;
	}
	const existStatus = renderRoot(root, nextLane, false);
	if (existStatus === RootCompleted) {
		//完成状态
		const finishedWork = root.current.alternate; // 这个是hostRootFiber已经工作好了的树
		root.finishedWork = finishedWork;
		root.finishedLane = nextLane;
		wipRootRenderLane = NoLane;

		// wip fiberNode树 树中的flags
		commitRoot(root); //commit阶段 包含beforMutation,mutation,layout三个阶段 在commitWork.ts中实现
	} else if (__DEV__) {
		console.error('当前还未实现同步更新结束状态');
	}
}

/**
 *
 * @param root 根节点
 * @param lane 优先级
 * @param shouldTimeSlice 是否开启时间切片，如果开启说明是并发更新（开启就是非同步更新）
 */
function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (__DEV__) {
		console.log(`开始${shouldTimeSlice ? '并发' : '同步'}更新`, root);
	}

	if (wipRootRenderLane !== lane) {
		//当前的lane和wipRootRenderLane不一致，需要初始化
		prepareFreshStack(root, lane);
	}
	do {
		try {
			if (shouldTimeSlice) {
				workLoopConcurrent();
			} else {
				workLoopSync();
			} //render阶段 包含beginWork,completeWork 对应beginWork.ts,completeWork.ts
			break;
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop error', e);
			}
			workInProgress = null;
		}
	} while (true);

	//可能中断执行
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete;
	}
	// 执行完成
	if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
		console.error('render阶段执行结束 wip不应该是null，对于同步更新而言');
	}
	//TODO: 报错还没有处理
	return RootCompleted;
}
/**
 * commit阶段需要：
 * 1.fiber树的切换
 * 2.执行placement对应的操作  更新DOM节点的操作
 *
 */

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}
	const lane = root.finishedLane;

	if (lane === NoLane && __DEV__) {
		console.warn('commit 阶段finishedLane不应该是NoLane');
		return;
	}
	// 重置操作
	root.finishedWork = null;
	root.finishedLane = NoLane;
	markRootFinished(root, lane);

	if (
		(finishedWork.flags & PassiveEffect) !== NoFlags ||
		(finishedWork.subTreeFlags & PassiveEffect) !== NoFlags
	) {
		// 表示有useEffect
		if (!rootDoesHavePassiveEffects) {
			rootDoesHavePassiveEffects = true;
			//调度副作用 通过scheduler包
			scheduleCallback(NormalPriority, () => {
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// 需要判断root.flags, root.subTreeFlags

	const subtreeHasEffect =
		(finishedWork.subTreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
	// 判断三个子阶段需要执行的操作

	if (rootHasEffect || subtreeHasEffect) {
		// beforeMutation
		// mutation(placement)
		commitMutationEffects(finishedWork, root);

		root.current = finishedWork;

		// layout
		commitLayoutEffects(finishedWork, root);
	} else {
		root.current = finishedWork;
	}

	rootDoesHavePassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	let didFlushPassiveEffect = false; //判断当前是否有回调执行
	pendingPassiveEffects.unmount.forEach((effect) => {
		/**
		 * 副作用的执行流程   本次更新的任何create回调都必须在上一次更新的destroy回调执行完成之后再执行
		 * 1. 遍历effect
		 * 2. 首先触发所有unmount effect,且对于某个fiber，如果触发了unmount destroy函数 本次更新不会再触发update create  ===> 对应commitWork中的commitHookEffectListUnmount
		 * 3. 触发上次更新的destroy  ===> 对应commitWork中的commitHookEffectListDestroy
		 * 4. 触发当前更新的create
		 */
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effect); //卸载组件对应的effect
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;

		commitHookEffectListDestroy((Passive | HookHasEffect) as Flags, effect); //同时标记了Passive和HookHasEffect的才会去触发
	});

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;

		commitHookEffectListCreate((Passive | HookHasEffect) as Flags, effect); //同时标记了Passive和HookHasEffect的才会去触发
	});

	pendingPassiveEffects.update = [];
	/**
	 * 我们可能在Effect中去触发更新
	 */
	flushSyncCallbacks();

	return didFlushPassiveEffect;
}
function workLoopSync() {
	// render阶段的入口
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function workLoopConcurrent() {
	// render阶段的入口
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 遍历子节点
	const next = beginWork(fiber, wipRootRenderLane);
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
