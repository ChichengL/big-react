import { Action, ReactContext } from '../../shared/ReactTypes';
//DisPatcher就是当前使用hooks的集合
/**
 * hooks需要区分当前实在函数组件中使用还是在类组件中使用
 * 或者区分是在函数组件内部使用还是在其他的hooks中使用
 *
 *
 * 多个hook通过dispatcher和react进行连接
 */
export interface Dispatcher {
	useState:
		| (<T>(initialState: (() => T) | T) => [T, Dispatch<T>])
		| (<T>() => [T, Dispatch<T>]);
	useEffect: (
		create: () => (() => void) | void,
		deps: Array<any> | void,
	) => void;
	useTransition: () => [boolean, (callback: () => void) => void];
	useRef: <T>(initial: T) => { current: T };
	useContext: <T>(context: ReactContext<T>) => T;
}

export type Dispatch<State> = (action: Action<State>) => void;

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
