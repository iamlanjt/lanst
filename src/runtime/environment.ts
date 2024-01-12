import { MK_BOOL, MK_NATIVE_FN, MK_NIRV, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, RuntimeVal, StringVal } from './value.ts';
import process from 'node:process'
import { evaluate, interpreter_err } from './interpreter.ts';
import Parser from "../frontend/parser.ts";
import { sleep } from '../other/sleep.ts';
import { format } from 'node:util'
import fetch from 'npm:node-fetch@3.3.1';
import { createInterface } from 'node:readline';

function* entries(obj) {
    for (let key in obj)
        yield [key, obj[key]];
}

function isAsyncFunction(func: any): boolean {
	return func && {}.toString.call(func) === '[object AsyncFunction]';
}

export function createGlobalEnv() {
	const env = new Environment()
	env.declareVar("true", MK_BOOL(true), true, true)
	env.declareVar("false", MK_BOOL(false), true, true)
	env.declareVar("nirv", MK_NIRV(), true, true)

	/** Declaring native modules, such as `system`, `network`, etc */
	// SYSTEM native def
	env.declareVar("system", MK_OBJECT(new Map()
		.set("print", MK_NATIVE_FN((args, scope) => {
			console.log(args)
			return MK_NIRV()
		}))
		.set("println", MK_NATIVE_FN((args, scope) => {
			let endstr = ""
			if (args.length > 1) {
				endstr = (args).join(" ")
			} else if(args.length === 1) {
				if (args[0] === undefined) {
					console.log(endstr)
					return MK_NIRV()
				}
				if (isAsyncFunction(args[0])) {
					args[0]().then((results) => {
						return results
					})
				} else {
					if (args[0]["toString"]) {
						endstr = args[0].toString()
					} else {
						endstr = args[0]
					}
				}
			}
			console.log(endstr)
			return MK_NIRV()
		}))
	), true)

	// FILE native def
	env.declareVar("file", MK_OBJECT(new Map()
		.set("read")
	))

	// NETWORK native def
	env.declareVar("net", MK_OBJECT(new Map()
		.set("get", MK_NATIVE_FN(async(args, scope) => {
			const results = await fetch(args[0].value)
			return MK_OBJECT(new Map(entries(results)))
		}))
		.set("getJSON", MK_NATIVE_FN(async(args, scope) => {
			const results = await fetch(args[0].value) 
			const jsonResults = await results.json().catch((err)=>{
				throw `Failed to json-ify result`
			})
			return MK_OBJECT(new Map(entries(jsonResults)))
		}))
	), true)

	function sys_time(_args: RuntimeVal[], _env: Environment) {
		return MK_NUMBER(Date.now())
	}

	function sys_search_env(args: RuntimeVal[], env: Environment) {
		if (args.length < 1)
			throw 'Must search for something'
		if (args[0].type !== "string")
			throw 'Cannot search for non-string environment reservation.'
		const search_value = (args[0] as StringVal).value

		const found = env.doesExist(search_value)

		return MK_BOOL(found)
	}

	function str_eq(args: RuntimeVal[], env: Environment) {
		if (args.length < 2)
			interpreter_err('Must have at least 2 arguments')
		if (args[0].type !== "string")
			return false
		if (args[1].type !== "string")
			return false

			
		const compare_one = (args[0] as StringVal).value
		const compare_two = (args[1] as StringVal).value

		return MK_BOOL(compare_one === compare_two)
	}

	function _eval(args: RuntimeVal[], env: Environment) {
		// console.warn(`EVAL is an unsandboxed body, make sure to only run code you trust!`)
		if (args.length < 1)
			throw 'Must have at least 1 argument'
		if (args[0].type !== "string")
			throw 'Argument 0 must be a typeof string, received ' + args[0].type

		const source = (args[0] as StringVal).value
		
		const parser = new Parser(source)
		const _env = createGlobalEnv()
		const program = parser.produceAST(source)
		return evaluate(program, _env)
	}

	function _input(_args: RuntimeVal[], _env: Environment) {
		const inp = prompt("")

		return MK_STRING(inp || "")
	}

	function _toString(args: RuntimeVal[], env: Environment) {
		if (args.length !== 1)
			throw `Expected args to be length of 1.`
		
		switch (args[0].type) {
			case 'number': {
				return MK_STRING((args[0] as NumberVal).value.toString())
			}
		}

		return MK_NIRV()
	}

	async function _toNumber(args: RuntimeVal[], env: Environment) {
		if (args.length !== 1)
			throw `Expected args to be length of 1.`
		
		switch ((await args[0]).type) {
			case 'string': {
				return MK_NUMBER(parseInt(((await args[0]) as StringVal).value))
			}
		}

		return MK_NIRV()
	}

	function _typeof(args: RuntimeVal[], env: Environment) {
		if (args.length !== 1)
			throw `Expected args to be a length of 1.`
		
		return MK_STRING(args[0].type)
	}

	async function _sleep(args: RuntimeVal[], env: Environment) {
		if (args.length !== 1)
			throw `Expected args to be a length of 1.`
		if ((args[0].type as unknown) !== "number")
			throw `Expected number for sleep, got ${args[0].type}`

		await sleep((args[0] as unknown).value)
		return MK_NIRV()
	}

	function _throw(args: RuntimeVal[], env: Environment): RuntimeVal {
		interpreter_err(`${(args.map((a)=>{return a.value})).join()}`)
	}

	function _str_format(args: RuntimeVal[], env: Environment) {
		const c_args = args.map((a)=>{return a.value})
		const origin = c_args.shift() as String
		return MK_STRING(format(origin, ...c_args))
	}

	function _msg(args: RuntimeVal[], env: Environment) {
		const user32 = new ffi.Library('user32', {
			'MessageBoxW': [
				'int32', [ 'int32', 'string', 'string', 'int32' ]
			]
		});
		
		const OK_or_Cancel = user32.MessageBoxW(
			0, 'I am Node.JS!', 'Hello, World!', 1
		);

		console.log(OK_or_Cancel)

		return MK_NIRV()
	}

	// Env-declare all predeclared functions
	env.declareVar("time", MK_NATIVE_FN(sys_time), true)
	env.declareVar("search_env", MK_NATIVE_FN(sys_search_env), true)
	env.declareVar("str_eq", MK_NATIVE_FN(str_eq), true)
	env.declareVar("eval", MK_NATIVE_FN(_eval), true)
	env.declareVar("input", MK_NATIVE_FN(_input), true)
	env.declareVar("tostring", MK_NATIVE_FN(_toString), true)
	env.declareVar("tonumber", MK_NATIVE_FN(_toNumber), true)
	env.declareVar("typeof", MK_NATIVE_FN(_typeof), true)
	env.declareVar("sleep", MK_NATIVE_FN(_sleep), true)
	env.declareVar("format", MK_NATIVE_FN(_str_format), true)

	return env
}
 
export default class Environment {
	private parent?: Environment
	variables: Map<string, {
		value: RuntimeVal,
		creator: "INTERNAL" | "PROGRAM"
		isLocked: boolean,
		isInternal: boolean
	}>

	constructor(parentENV?: Environment) {
		const global = parentENV? true: false
		this.parent = parentENV
		this.variables = new Map()
	}

	public declareVar(varname: string, value: RuntimeVal, isLocked?: boolean, isInternal?: boolean, creator: "INTERNAL" | "PROGRAM" = "INTERNAL"): RuntimeVal {
		if (this.variables.has(varname)) {
			throw `Cannot reserve identifier "${varname}" as it's already reserved.`
		}

		this.variables.set(varname, {
			value: value,
			creator,
			isLocked: isLocked ?? false,
			isInternal: isInternal ?? false,
		})
		return value
	}

	public doesExist(varname: string): boolean {
		if (this.variables.has(varname))
			return true

		if (this.parent == undefined)
			return false

		return this.parent.doesExist(varname)
	}

	public assignVar(varname: string, value: RuntimeVal, override = false): RuntimeVal {
		const env = this.resolve(varname)
		const v = env.variables.get(varname)
		if (v?.isLocked && !override)
			throw `"${varname}" is currently locked for reassignment.`
		env.variables.set(varname, {
			isLocked: false,
			value: value
		})
		return value
	}

	public lookupVar(varname: string): RuntimeVal {
		const env = this.resolve(varname)
		return (env.variables.get(varname) as {isLocked: boolean, isInternal: boolean, value: RuntimeVal}).value as RuntimeVal
	}

	public getVar(varname: string) {
		const env = this.resolve(varname)
		return (env.variables.get(varname) as {isLocked: boolean, isInternal: boolean, value: RuntimeVal})
	}

	public resolve(varname: string): Environment {
		if (this.variables.has(varname))
			return this

		if (this.parent == undefined)
			throw `Cannot resolve "${varname}" as it does not exist.`

		return this.parent.resolve(varname)
	}
}