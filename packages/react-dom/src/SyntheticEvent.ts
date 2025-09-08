//这里集成了跟ReactDom相关的事件系统

import { Container } from 'hostConfig';
import {
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_runWithPriority,
	unstable_UserBlockingPriority,
} from 'scheduler';
import { Props } from 'shared/ReactTypes';

//eg. dom[xxx] = reactElement props

export const elementPropsKey = '__props';
type EventCallback = (e: Event) => void;
export interface DOMElement extends Element {
	[elementPropsKey]: Props;
	[key: string]: any;
	style: {
		[key: string]: any;
	};
}
interface Paths {
	bubble: EventCallback[];
	capture: EventCallback[];
}
interface SyntheticEvent extends Event {
	//合成事件
	__stopPropagation: boolean;
}
/**
 *
 * @param node 事件绑定的节点
 * @param props 节点的props
 * @description 更新节点的props 调用时机：
 * 1. 组件挂载时
 * 2. 组件更新时
 * 3. 组件卸载时
 */
export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKey] = props;
}

const validEventTypeList = ['click'];

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn('当前不支持', eventType, '事件');
		return;
	}
	if (__DEV__) {
		console.log('initEvent', container, eventType);
	}
	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e);
	});
}

function createSyntheticEvent(e: Event) {
	const syntheticEvent = e as SyntheticEvent;
	syntheticEvent.__stopPropagation = false;
	const originStopPropagation = e.stopPropagation;

	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;
		if (originStopPropagation) {
			originStopPropagation();
		}
	};
	return syntheticEvent;
}
function dispatchEvent(container: Container, eventType: string, e: Event) {
	//1. 收集沿途的事件

	const target = e.target;
	if (target === null) {
		console.warn('事件目标不存在target', e);
		return;
	}
	const { bubble, capture } = collectPaths(
		target as DOMElement,
		container,
		eventType,
	);
	//2. 构造合成事件
	const syntheticEvent = createSyntheticEvent(e);

	//3. 遍历capture 先是遍历捕获阶段
	triggerEventFlow(capture, syntheticEvent);
	if (syntheticEvent.__stopPropagation) {
		return;
	}

	//4. 遍历bubble 再次遍历冒泡阶段
	triggerEventFlow(bubble, syntheticEvent);
}
function triggerEventFlow(
	paths: EventCallback[],
	syntheticEvent: SyntheticEvent,
) {
	for (let i = 0; i < paths.length; i++) {
		const cb = paths[i];
		unstable_runWithPriority(
			eventTypeToSchedulerPriority(syntheticEvent.type),
			() => {
				cb.call(null, syntheticEvent); //这里使用call绑定this为null，为了
			},
		);

		if (syntheticEvent.__stopPropagation) {
			break;
		}
	}
}

function getEventCallbackNameFromEventType(
	eventType: string,
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick'], //先处理捕获再处理冒泡
	}[eventType];
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string,
) {
	const paths: Paths = {
		capture: [],
		bubble: [],
	};

	while (targetElement && targetElement !== container) {
		//收集
		const elementProps = targetElement[elementPropsKey];
		if (elementProps) {
			//click->onClick onClickCapture
			const callbackNameList = getEventCallbackNameFromEventType(eventType);
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, idx) => {
					const eventCallback = elementProps[callbackName];
					if (eventCallback) {
						if (idx === 0) {
							//capture
							/**
                             * 这里为什么要unshift
                            div onClick onClickCapture
                                div onClick onClickCapture
                                    p targetElement onClick onClickBubble
                            捕获应该从外到内，但是这里处理是从内到外
                             */
							paths.capture.unshift(eventCallback);
						} else {
							paths.bubble.push(eventCallback);
						}
					}
				});
			}
		}
		targetElement = targetElement.parentNode as DOMElement;
	}
	return paths;
}

function eventTypeToSchedulerPriority(eventType: string) {
	switch (eventType) {
		case 'click':
		case 'keydown':
		case 'keyup':
			return unstable_ImmediatePriority;
		case 'scroll':
			return unstable_UserBlockingPriority;
		default:
			return unstable_NormalPriority;
	}
}
