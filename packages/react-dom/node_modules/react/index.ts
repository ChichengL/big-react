import { jsxDEV } from './src/jsx';
import currentDispatcher, {
	Dispatcher,
	resolveDispatcher,
} from './src/currentDispatcher';
export const useState: Dispatcher['useState'] = (initialState: any) => {
	const dispatcher = resolveDispatcher();
	if (!dispatcher) {
		throw new Error('hooks只能在函数组件中调用');
	}
	return dispatcher.useState(initialState);
};

//实现内部数据共享层
//方便其他hook使用
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher,
};
export default {
	version: '0.0.0',
	createElement: jsxDEV,
};
