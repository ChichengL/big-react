export interface Dispatcher {
	useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
	useEffect: (
		create: () => (() => void) | void,
		deps: Array<any> | void,
	) => void;
}

export type Dispatch<State> = (action: State) => void;

const currentDispatcher: { current: Dispatcher | null } = {
	current: null,
};

export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;
	if (!dispatcher) {
		throw new Error('hooks只能在函数组件中调用');
	}
	return dispatcher;
};

export default currentDispatcher;
