import { Key, Props, Ref } from 'shared/ReactTypes';
import { WorkTags } from './workTags';
import { Flags, NoFlags } from './fiberFlags';
export class FiberNode {
	tag: WorkTags;
	key: Key;
	stateNode: any;
	type: any;
	pendingProps: Props;
	ref: Ref;

	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	memoizedProps: Props | null;
	alternate: FiberNode | null; // 指向 alternate 节点，用于实现链表结构的快速切换
	flags: Flags;
	constructor(tag: WorkTags, pendingProps: Props, key: Key) {
		// 实例
		this.tag = tag;
		this.key = key;
		// HostComponent 类型时，stateNode 指向真实 dom 节点
		this.stateNode = null;
		// 类型
		this.type = null;

		// 构成树状结构
		this.return = null; // 指向父fiberNode
		this.sibling = null;
		this.child = null;
		// 同级的index 比如 ul>li * 3 第一个li的index是0，第二个li的index是1，第三个li的index是2
		this.index = 0;

		this.ref = null;

		this.pendingProps = pendingProps; //刚开始的props
		this.memoizedProps = null; // 工作中使用的props
		this.alternate = null; // 指向 alternate 节点，用于实现链表结构的快速切换
		this.flags = NoFlags; // 标记位
	}
}
