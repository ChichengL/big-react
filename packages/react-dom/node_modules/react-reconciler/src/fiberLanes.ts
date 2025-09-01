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
