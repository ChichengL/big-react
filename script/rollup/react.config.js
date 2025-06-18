import { getPackageJson, resolvePkgPath, getBaseRollupPlugins } from './utils';

console.log(getPackageJson('react'));
const { name, module } = getPackageJson('react');
const pkgPath = resolvePkgPath(name); //react包的路径

const pkgDistPath = resolvePkgPath(name, true); //react包的dist路径
import generatePackageJson from 'rollup-plugin-generate-package-json';
export default [
	//react包的umd打包
	{
		input: `${pkgPath}/${module}`,
		output: {
			file: `${pkgDistPath}/index.js`,
			name: 'index.js',
			format: 'umd',
			sourcemap: true,
		},
		plugins: [
			...getBaseRollupPlugins(),
			generatePackageJson({
				input: pkgPath,
				output: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: 'index.js',
				}),
			}),
		],
	},
	// jsx-runtime
	{
		input: `${pkgPath}/src/jsx.ts`,
		output: [
			// jsx-runtime
			{
				file: `${pkgDistPath}/jsx-runtime.js`,
				name: 'jsx-runtime.js',
				format: 'umd',
				sourcemap: true,
			},
			// jsx-dev-runtime
			{
				file: `${pkgDistPath}/jsx-dev-runtime.js`,
				name: 'jsx-dev-runtime.js',
				format: 'umd',
				sourcemap: true,
			},
		],
		plugins: getBaseRollupPlugins(),
	},
];
