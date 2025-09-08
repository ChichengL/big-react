import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';
import { DOMElement, updateFiberProps } from './SyntheticEvent';
import { Props } from 'shared/ReactTypes';

export type Container = Element;
export type Instance = Element | Text;
export type TextInstance = Text;
export const createInstance = (type: string, props: Props): Instance => {
	const element = document.createElement(type) as unknown;
	//TODO: 处理props
	console.log('createInstance', element, props);
	updateFiberProps(element as DOMElement, props);
	setInitialProps(element as DOMElement, props);
	return element as DOMElement;
};

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance,
) => {
	parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};

export const appendChildToContainer = appendInitialChild;

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostComponent:
			// 处理HostComponent
			const el = fiber.stateNode as DOMElement;
			const nextProps = fiber.memoizedProps as Props;
			const prevProps = fiber.alternate?.memoizedProps as Props | null;
			updateFiberProps(el, nextProps); // 更新事件 props
			patchProps(el, nextProps, prevProps); // 更新真实 DOM 属性（含 style）
			break;
		case HostText: {
			const text = fiber.memoizedProps.content;
			return commitTextUpdate(fiber.stateNode, text);
		}
		default:
			if (__DEV__) {
				console.warn('未处理的commitUpdate类型', fiber);
			}
			break;
	}
};

export function commitTextUpdate(textInstance: TextInstance, content: string) {
	textInstance.textContent = content;
}
export const removeChild = (
	container: Instance | TextInstance,
	child: Instance,
) => {
	container.removeChild(child);
};

export const insertChildToContainer = (
	child: Instance,
	container: Instance | TextInstance,
	before: Instance,
) => {
	container.insertBefore(child, before);
};

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
			? (callback: (...args: any[]) => void) =>
					Promise.resolve(null).then(callback)
			: setTimeout;

function setInitialProps(el: DOMElement, props: Props) {
	// style
	const style = props.style;
	if (style && typeof style === 'object') {
		for (const key in style) {
			(el.style as any)[key] = style[key];
		}
	}
	// 常规属性（排除 children 和事件）
	for (const key in props) {
		if (key === 'children' || key === 'style' || key.startsWith('on')) continue;
		const value = (props as any)[key];
		if (value == null) continue;
		(el as any)[key] = value;
	}
}
function patchProps(el: DOMElement, next: Props, prev: Props | null) {
	// diff style：删除旧样式，设置新样式
	const prevStyle = (prev && prev.style) || null;
	const nextStyle = next.style || null;
	if (prevStyle || nextStyle) {
		// 先删除旧样式
		if (prevStyle) {
			for (const key in prevStyle) {
				if (!nextStyle || nextStyle[key] == null) {
					(el.style as any)[key] = '';
				}
			}
		}
		// 再设置新样式
		if (nextStyle) {
			for (const key in nextStyle) {
				(el.style as any)[key] = nextStyle[key];
			}
		}
	}
	// 其他属性：删除旧的、设置新的（忽略事件与 children）
	const isEvent = (k: string) => k.startsWith('on');
	if (prev) {
		for (const key in prev) {
			if (key === 'children' || key === 'style' || isEvent(key)) continue;
			if (!(key in next)) {
				(el as any)[key] = null;
			}
		}
	}
	for (const key in next) {
		if (key === 'children' || key === 'style' || isEvent(key)) continue;
		const value = (next as any)[key];
		if ((prev as any)?.[key] !== value) {
			(el as any)[key] = value;
		}
	}
}
