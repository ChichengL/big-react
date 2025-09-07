// 这里调用beginWork,completeWork,commitWork三个函数，完成React组件的更新。

import { scheduleMicroTask } from 'hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
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
	markRootFinished,
	mergeLane,
	NoLane,
	SyncLane,
} from './fiberLanes';
import { HostRoot } from './workTags';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { unstable_NormalPriority, unstable_scheduleCallback } from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null; // 指向当前工作的Fiber节点，方便后续更新
let wipRootRenderLane: Lane = NoLane; //本次更新的Lane是什么
let rootDoesHavePassiveEffects = false;
/**
 * React 内部分为三个阶段
 * schedule 调度更新执行
 * render   beginWork,completeWork
 * commit beforeMutation,mutation,layout
 */
function prepareFreshStack(fiber: FiberRootNode, lane: Lane) {
	//这个fiber没有child只有current
	// fiberRootNode.current -> rootFiber(这才是第一个可以正常使用的fiber节点)

	workInProgress = createWorkInProgress(fiber.current, {});
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
	if (highestPriorityLane === NoLane) {
		return;
	}
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
			performSyncWorkOnRoot(root, highestPriorityLane);
		});
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		//其他优先级使用宏任务调度
	}
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
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);

	if (nextLane !== SyncLane) {
		//其他比SyncLane低的优先级
		//Or NoLane

		ensureRootIsScheduled(root);
		return;
	}
	prepareFreshStack(root, lane);
	do {
		try {
			workLoop(); //render阶段 包含beginWork,completeWork 对应beginWork.ts,completeWork.ts
			break;
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop error', e);
			}
			workInProgress = null;
		}
	} while (true);

	const finishedWork = root.current.alternate; // 这个是hostRootFiber已经工作好了的树
	root.finishedWork = finishedWork;
	root.finishedLane = lane;
	wipRootRenderLane = NoLane;

	// wip fiberNode树 树中的flags
	commitRoot(root); //commit阶段 包含beforMutation,mutation,layout三个阶段 在commitWork.ts中实现
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

	if (__DEV__) {
		console.warn('warn commitRoot start', finishedWork);
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
			unstable_scheduleCallback(unstable_NormalPriority, () => {
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
	} else {
		root.current = finishedWork;
	}

	rootDoesHavePassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	pendingPassiveEffects.unmount.forEach((effect) => {
		/**
		 * 副作用的执行流程   本次更新的任何create回调都必须在上一次更新的destroy回调执行完成之后再执行
		 * 1. 遍历effect
		 * 2. 首先触发所有unmount effect,且对于某个fiber，如果触发了unmount destroy函数 本次更新不会再触发update create  ===> 对应commitWork中的commitHookEffectListUnmount
		 * 3. 触发上次更新的destroy  ===> 对应commitWork中的commitHookEffectListDestroy
		 * 4. 触发当前更新的create
		 */
		commitHookEffectListUnmount(Passive, effect); //卸载组件对应的effect
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy((Passive | HookHasEffect) as Flags, effect); //同时标记了Passive和HookHasEffect的才会去触发
	});

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate((Passive | HookHasEffect) as Flags, effect); //同时标记了Passive和HookHasEffect的才会去触发
	});

	pendingPassiveEffects.update = [];
	/**
	 * 我们可能在Effect中去触发更新
	 */
	flushSyncCallbacks();
}
function workLoop() {
	// render阶段的入口
	while (workInProgress !== null) {
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
