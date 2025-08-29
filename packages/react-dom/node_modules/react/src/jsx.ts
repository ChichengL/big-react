import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import {
	Type,
	Key,
	Ref,
	Props,
	ReactElementType,
	ElementType,
} from 'shared/ReactTypes';
// ReactElemnt
const ReactElemnt = function (
	type: Type,
	key: Key,
	ref: Ref,
	props: Props,
): ReactElementType {
	const element = {
		$$typeof: REACT_ELEMENT_TYPE,
		key,
		ref,
		props,
		__mark: 'chichengl',
		type,
	};
	return element;
};

export const jsx = (type: ElementType, config: any, ...children: any[]) => {
	let key: Key = null;
	const props: Props = {};
	let ref: Ref = null;

	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val;
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			// 如果是自己的prop，则添加到props中
			props[prop] = val;
		}
	}

	const childrenLength = children.length;
	if (childrenLength === 1) {
		props.children = children[0];
	} else if (childrenLength > 1) {
		props.children = children;
	}

	return ReactElemnt(type, key, ref, props);
};

export const jsxDEV = (type: ElementType, config: any) => {
	let key: Key = null;
	const props: Props = {};
	let ref: Ref = null;

	for (const prop in config) {
		const val = config[prop];
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val;
			}
			continue;
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val;
			}
			continue;
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			// 如果是自己的prop，则添加到props中
			props[prop] = val;
		}
	}

	return ReactElemnt(type, key, ref, props);
};
