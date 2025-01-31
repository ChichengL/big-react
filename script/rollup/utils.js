import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // 导入 fileURLToPath
import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

const __filename = fileURLToPath(import.meta.url); // 将 URL 转换为文件路径
const __dirname = path.dirname(__filename); // 获取目录路径
const pkgPath = path.resolve(__dirname, '../../packages');
const distPath = path.resolve(__dirname, '../../dist/node_modules');

export function resolvePkgPath(pkgName, isDist) {
	if (isDist) {
		return `${distPath}/${pkgName}`;
	}
	return `${pkgPath}/${pkgName}`;
}
export function getPackageJson(pkgName) {
	// 包路径
	const path = `${resolvePkgPath(pkgName)}/package.json`;
	const str = fs.readFileSync(path, { encoding: 'utf-8' });
	return JSON.parse(str);
}

export function getBaseRollupPlugins({
	alias = {
		__DEV__: true,
	},
	typescript = {},
} = {}) {
	return [cjs(), ts(typescript), replace(alias)];
}
