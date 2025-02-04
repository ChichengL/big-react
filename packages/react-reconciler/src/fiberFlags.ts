export const NoFlags = 0b00000001;
export const Placement = 0b00000010; //表示插入a->ab 或者移动abc -> bca
export const Update = 0b00000100; // 表示不包含【属性变化】相关的flag: <img title="🐔"/> -> <img title="🐷"/>这个是不包含的因为是属性变化
export const ChildDeletion = 0b00001000; //表示删除 ul>li*3 -> ul>li*2

export type Flags =
	| typeof NoFlags
	| typeof Placement
	| typeof Update
	| typeof ChildDeletion;

export const MutationMask = Placement | Update | ChildDeletion;
