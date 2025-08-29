import { Key, Props, ReactElementType, Ref } from 'shared/ReactTypes';
import { FunctionComponent, HostComponent, WorkTags } from './workTags';
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
	memoizedState: any; //指向hooks链表
	alternate: FiberNode | null; // 指向 alternate 节点，用于实现链表结构的快速切换,上一次的fiber树
	flags: Flags;
	subTreeFlags: Flags; // 子树的标记位，用于标记子树是否需要更新
	updateQueue: unknown;

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
		this.updateQueue = null;

		this.alternate = null; // 指向 alternate 节点，用于实现链表结构的快速切换
		// 副作用
		this.flags = NoFlags; // 标记位
		this.subTreeFlags = NoFlags; // 子树的标记位，用于标记子树是否需要更新
	}
}

export class FiberRootNode {
	// fiberRootNode 是整个应用的根节点其current 指向fiber树
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null; //已经更新完成的fiber树，在mount阶段为null

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container; //指向真实dom
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
		wip.subTreeFlags = NoFlags;
	}
	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memoizedState = current.memoizedState;

	return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props } = element;
	let fiberTag: WorkTags = FunctionComponent;
	if (typeof type === 'string') {
		//原生dom节点<div/>
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}
	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}
