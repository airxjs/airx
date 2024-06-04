import pkg from './package.json' assert { type: 'json' }
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { babel } from '@rollup/plugin-babel'

const baseOutputOptions = {
	sourcemap: true,
	name: pkg.name
}

const umdOutputOptions = {
	...baseOutputOptions,
	file: pkg.main,
	format: 'umd',
	name: pkg.name
}

const moduleOutputOptions = {
	...baseOutputOptions,
	file: pkg.module,
	format: 'module',
	name: pkg.name
}

export default [
	{
		input: 'source/index.ts',
		plugins: [
			resolve({ browser: true }),
			commonjs(),
			typescript(),
			babel({ babelHelpers: 'bundled' })
		],
		output: [
			umdOutputOptions,
			moduleOutputOptions,
		]
	}
]
