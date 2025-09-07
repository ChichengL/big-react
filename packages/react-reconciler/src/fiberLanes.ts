import { FiberRootNode } from './fiber';

export type Lanes = number; // 表示多个lane
export type Lane = number;

export const NoLane = /**   */ 0b0000000;
export const SyncLane = /** */ 0b0000001;
export const NoLanes = /**  */ 0b0000000;
export const mergeLane = (lanes: Lane, lane: Lane) => {
	return lanes | lane;
};
export const requestUpdateLanes = () => {
	//TODO: 后续不同的更新有不同的优先级
	return SyncLane;
};

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
