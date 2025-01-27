import { UpdateQueue } from './updateQueue';
import { Key, Props, Ref } from 'shared/ReactTypes';
import { WorkTags } from './workTags';
import { Flags, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';
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
	memoizedState: any;
	alternate: FiberNode | null; // 指向 alternate 节点，用于实现链表结构的快速切换
	flags: Flags;
	UpdateQueue: unknown;

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

		//作为工作单元
		this.pendingProps = pendingProps; //刚开始的props
		this.memoizedProps = null; // 工作中使用的props
		this.memoizedState = null; // 工作中使用的state
		this.UpdateQueue = null;

		this.alternate = null; // 指向 alternate 节点，用于实现链表结构的快速切换
		// 副作用
		this.flags = NoFlags; // 标记位
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: Props,
): FiberNode => {
	let wip = current.alternate;
	if (wip === null) {
		//mount 首屏渲染的时候，只有一个fiber树
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;

		wip.alternate = current;
		current.alternate = wip; //两个树通过alternate指针相互关联
	} else {
		// update	更新的时候，会产生两个fiber树，一个current，一个wip，current指向当前的树，wip指向即将更新的树
		wip.pendingProps = pendingProps;
		wip.flags = NoFlags;
	}
	wip.type = current.type;
	wip.UpdateQueue = current.UpdateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memoizedState = current.memoizedState;

	return wip;
};
