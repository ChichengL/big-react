import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_LowPriority as LowPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	CallbackNode,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	// unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback,
} from 'scheduler';
console.log('getFirstCallbackNode', getFirstCallbackNode);

const root = document.querySelector('#root');
type Priority =
	| typeof ImmediatePriority
	| typeof UserBlockingPriority
	| typeof NormalPriority
	| typeof LowPriority
	| typeof IdlePriority;
interface Work {
	count: number;
	priority: Priority;
}
const workList: Work[] = [];
let prePriority: Priority = IdlePriority;
let curCallback: CallbackNode | null = null;
[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
	(priority) => {
		const btn = document.createElement('button');

		btn.innerText = [
			'',
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority',
			'IdlePriority',
		][priority];
		root?.append(btn);
		btn.onclick = () => {
			workList.push({
				count: 100,
				priority: priority as Priority,
			});
			schedule();
		};
	},
);

function schedule() {
	const cbNode = getFirstCallbackNode?.();
	const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];
	if (!curWork) {
		curCallback = null;
		if (cbNode) {
			cancelCallback(cbNode);
		}
		return;
	}
	// 策略逻辑
	const { priority: curPriority } = curWork;

	if (curPriority === prePriority) {
		return;
	}
	//更高优先级的work
	if (cbNode) {
		cancelCallback(cbNode);
	}
	curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}
function perform(work: Work, didTimeout?: boolean) {
	/**
	 * 1. work.priority
	 * 2. 饥饿问题
	 * 3. 时间切片
	 */
	const needSync = work.priority === ImmediatePriority || didTimeout;
	while ((needSync || !shouldYield()) && work.count) {
		work.count--;
		insertSpan(`${work.priority}`);
	}
	//中断 || 执行完成
	prePriority = work.priority;
	if (!work.count) {
		const workIdx = workList.indexOf(work);
		workList.splice(workIdx, 1);
		prePriority = IdlePriority;
	}

	const prevCallback = curCallback;
	schedule();
	const newCallback = curCallback;

	if (newCallback && prevCallback === newCallback) {
		return perform.bind(null, work);
	}
}

function insertSpan(content) {
	const span = document.createElement('span');
	span.textContent = content;
	span.className = `pri-${content}`;
	doSomeBuzyWork(10000000);
	root?.append(span);
}

function doSomeBuzyWork(len: number) {
	let result = 0;
	while (len--) {
		result += len;
	}
}
