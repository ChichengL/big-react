import { getPackageJson, resolvePkgPath, getBaseRollupPlugins } from './utils';
import alias from '@rollup/plugin-alias';
const { name, module, peerDependencies } = getPackageJson('react-dom');
const pkgPath = resolvePkgPath(name); //react-dom包的路径

const pkgDistPath = resolvePkgPath(name, true); //react-dom包的dist路径
import generatePackageJson from 'rollup-plugin-generate-package-json';
export default [
	//react-dom包的umd打包
	{
		input: `${pkgPath}/${module}`,
		output: [
			//兼容打包
			{
				//React17
				file: `${pkgDistPath}/index.js`,
				name: 'index.js',
				format: 'umd',
				sourcemap: true,
			},
			{
				//React18
				file: `${pkgDistPath}/client.js`,
				name: 'client.js',
				format: 'umd',
				sourcemap: true,
			},
		],
		external: [...Object.keys(peerDependencies)],
		plugins: [
			...getBaseRollupPlugins(),
			alias({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig.ts`,
				},
			}),
			generatePackageJson({
				input: pkgPath,
				output: pkgDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					peerDependencies: {
						react: version,
					},
					main: 'index.js',
				}),
			}),
		],
	},
];
