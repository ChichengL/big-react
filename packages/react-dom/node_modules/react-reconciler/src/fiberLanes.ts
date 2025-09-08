import {
	unstable_getCurrentPriorityLevel,
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
} from 'scheduler';
import { FiberRootNode } from './fiber';

export type Lanes = number; // 表示多个lane
export type Lane = number;

export const NoLane = /**                    无 */ 0b0000000;
export const NoLanes = /**                   无 */ 0b0000000;
export const SyncLane = /**                同步 */ 0b0000001;
export const InputContinuousLane = /** 输入连续 */ 0b0000010;
export const DefaultLane = /**       默认优先级 */ 0b0000100;
export const IdleLane = /**          空闲优先级 */ 0b0001000;
export const mergeLane = (lanes: Lane, lane: Lane) => {
	return lanes | lane;
};
export const requestUpdateLanes = () => {
	//从上下文环境中获取Scheduler优先级
	const priority = unstable_getCurrentPriorityLevel();
	const lane = schedulerPriorityToLane(priority); //通过调度器的优先级获取lane
	return lane;
};
/**
 * @description 将lane转换为scheduler优先级
 */
export function lanesToSchedulerPriority(lanes: Lanes) {
	const lane = getHighestPriorityLane(lanes);

	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuousLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}
/**
 * @description scheduler优先级转化为lane优先级
 */
export function schedulerPriorityToLane(schedulerPriority: number) {
	if (schedulerPriority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuousLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return DefaultLane;
	}
	if (schedulerPriority === unstable_IdlePriority) {
		return IdleLane;
	}
	return NoLane;
}
export const getHighestPriorityLane = (lanes: Lanes): Lane => {
	/**
	 * 返回优先级最高的lane(二进制中最右边的1)
	 * 比如 0b00110 -> 0b00010
	 */
	return lanes & -lanes;
};

export const markRootFinished = (root: FiberRootNode, lane: Lane) => {
	// 从未消费队列中移除已完成的 lane，避免重复调度
	root.pendingLanes &= ~lane;
};
