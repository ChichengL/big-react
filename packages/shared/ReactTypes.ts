export type Type = any;
export type Ref = { current: any } | ((instance: any) => void);
export type Key = string | null;
export type Props = {
	[key: string]: any;
	children?: any;
};
export type ElementType = any;

export interface ReactElementType {
	$$typeof: symbol | number;
	key: Key;
	props: Props;
	ref: Ref;
	type: ElementType;
	__mark: string;
}

export type Action<State> = State | ((prevState: State) => State);
