export const FunctionComponent = 0;
export const HostRoot = 3; //项目挂载的根节点
export const HostComponent = 5; //div,span,p,input等原生组件
export const HostText = 6; //文本节点

export type WorkTags =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText;
