import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';

export type Container = Element;
export type Instance = Element | Text;
export type TextInstance = Text;
export const createInstance = (type: string, props: any): Instance => {
	const element = document.createElement(type);
	//TODO: 处理props
	return element;
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
