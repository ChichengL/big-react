export const FunctionComponent = 0;
export const HostRoot = 3; //项目挂载的根节点
export const HostComponent = 5; //div,span,p,input等原生组件
export const HostText = 6; //文本节点
export const Fragment = 7;
export const ContextProvider = 8;
export const SuspenseComponent = 13;
export const OffscreenComponent = 14;
export type WorkTags =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment
	| typeof ContextProvider
	| typeof SuspenseComponent
	| typeof OffscreenComponent;
