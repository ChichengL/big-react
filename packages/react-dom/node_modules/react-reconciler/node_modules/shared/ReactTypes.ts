export type Type = any;
export type Ref = { current: any } | ((instance: any) => void);
export type Key = string | null | undefined | number;
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

export type ReactContext<T> = {
	$$typeof: symbol | number;
	Provider: ReactProviderType<T> | null;
	_currentValue: T;
};

export type ReactProviderType<T> = {
	$$typeof: symbol | number;
	_context: ReactContext<T> | null;
};
