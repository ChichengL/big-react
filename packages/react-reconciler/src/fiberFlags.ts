export const NoFlags = /**                */ 0b000000000000000000;
export const Placement = /**              */ 0b000000000000000010; //表示插入a->ab 或者移动abc -> bca
export const Update = /**                 */ 0b000000000000000100; // 表示不包含【属性变化】相关的flag: <img title="🐔"/> -> <img title="🐷"/>这个是不包含的因为是属性变化
export const ChildDeletion = /**          */ 0b000000000000001000; //表示删除 ul>li*3 -> ul>li*2
export const PassiveEffect = /**          */ 0b000000000000010000; //代表当前fiber更新需要触发effect的情况
export const Ref = /**                    */ 0b000000000000100000;
export type Flags =
	| typeof NoFlags
	| typeof Placement
	| typeof Update
	| typeof ChildDeletion
	| typeof PassiveEffect;

export const MutationMask = Placement | Update | ChildDeletion | Ref;
export const LayoutMask = Ref;

export const PassiveMask = PassiveEffect | ChildDeletion; //这里卸载也需要触发Effect
