import { MK_BOOL, MK_NATIVE_FN, MK_NIRV, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, RuntimeVal, StringVal } from './value.ts';
import process from 'node:process'
import { evaluate } from './interpreter.ts';
import Parser from "../frontend/parser.ts";
import { sleep } from '../other/sleep.ts';
import { format } from 'node:util'

export function createGlobalEnv() {
	const env = new Environment()
	env.declareVar("true", MK_BOOL(true), true)
	env.declareVar("false", MK_BOOL(false), true)
	env.declareVar("nirv", MK_NIRV(), true)

	// SYSTEM native def
	env.declareVar("system", MK_OBJECT(new Map()
		.set("print", MK_NATIVE_FN((args, scope) => {
			let endstr = args.join(" ").replace(/\\n/g,"\n")
			process.stdout.write(endstr)
			return MK_NIRV()
		}))
		.set("println", MK_NATIVE_FN((args, scope) => {
			let endstr = (args.map(a=>{return (a.toString())})).join(" ").replace(/\\n/g, "\n")
			endstr += "\n"
			process.stdout.write(endstr)
			return MK_NIRV()
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
			throw 'Must have at least 2 arguments'
		if (args[0].type !== "string")
			throw 'Argument 0 must be a typeof string, received ' + args[0].type
		if (args[1].type !== "string")
			throw 'Argument 1 must be a typeof string, received ' + args[1].type

			
		const compare_one = (args[0] as StringVal).value
		const compare_two = (args[1] as StringVal).value

		return MK_BOOL(compare_one === compare_two)
	}

	function _eval(args: RuntimeVal[], env: Environment) {
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
		if (!inp)
			return MK_NIRV()

		return MK_STRING(inp)
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
		throw `${(args.map((a)=>{return a.value})).join()}`
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
	}>

	constructor(parentENV?: Environment) {
		const global = parentENV? true: false
		this.parent = parentENV
		this.variables = new Map()
	}

	public declareVar(varname: string, value: RuntimeVal, isLocked?: boolean, creator: "INTERNAL" | "PROGRAM" = "INTERNAL"): RuntimeVal {
		if (this.variables.has(varname)) {
			throw `Cannot reserve identifier "${varname}" as it's already reserved.`
		}

		this.variables.set(varname, {
			value: value,
			creator,
			isLocked: isLocked ?? false,
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
		return (env.variables.get(varname) as {isLocked: boolean, value: RuntimeVal}).value as RuntimeVal
	}

	public resolve(varname: string): Environment {
		if (this.variables.has(varname))
			return this

		if (this.parent == undefined)
			throw `Cannot resolve "${varname}" as it does not exist.`

		return this.parent.resolve(varname)
	}
}