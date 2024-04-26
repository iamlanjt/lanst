import { ListVal, MK_BOOL, MK_CLASS, MK_FN, MK_NATIVE_FN, MK_NIRV, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal } from './value.ts';
import process from 'node:process'
import { evaluate, interpreter_err } from './interpreter.ts';
import Parser from "../frontend/parser.ts";
import { sleep } from '../other/sleep.ts';
import { format } from 'node:util'
import fetch from 'npm:node-fetch@3.3.1';
import { createInterface } from 'node:readline';
import { Stmt } from '../ast_types/Statement.ts';
import { fetchInterpreterMeta } from '../../main.ts';


function* entries(obj) {
    for (let key in obj)
        yield [key, obj[key]];
}

function isAsyncFunction(func: any): boolean {
	return func && {}.toString.call(func) === '[object AsyncFunction]';
}

var sha256 = function sha256(ascii: string) {
	function rightRotate(value, amount) {
		return (value>>>amount) | (value<<(32 - amount));
	};
	
	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j; // Used as a counter across the whole file
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty]*8;
	
	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = sha256.h = sha256.h || [];
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];
	/*/
	var hash = [], k = [];
	var primeCounter = 0;
	//*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
			k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
		}
	}
	
	ascii += '\x80' // Append Ƈ' bit (plus zero padding)
	while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j>>8) return; // ASCII check: only accept characters in range 0-255
		words[i>>2] |= j << ((3 - i)%4)*8;
	}
	words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
	words[words[lengthProperty]] = (asciiBitLength)
	
	// process each chunk
	for (j = 0; j < words[lengthProperty];) {
		var w: any = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);
		
		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if 
			var w15 = w[i - 15], w2 = w[i - 2];

			// Iterate
			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
				+ ((e&hash[5])^((~e)&hash[6])) // ch
				+ k[i]
				// Expand the message schedule if needed
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
					)|0
				);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
				+ ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj
			
			hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1)|0;
		}
		
		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i])|0;
		}
	}
	
	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i]>>(j*8))&255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}

	return result
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

	env.declareVar("WebSocket", MK_OBJECT(new Map()
		.set("on", MK_NATIVE_FN((args, scope) => {
			if (!args[0]) return MK_NIRV()
			if (args[0]) return MK_NIRV()

			return MK_NIRV()
		}))
	))

	// UTIL native def
	env.declareVar("util", MK_OBJECT(new Map()
		.set("password", MK_OBJECT(new Map()
			.set("hash", MK_NATIVE_FN((args, scope) => {
				if (!args[0] || args[0].type !== "string")
					throw 'Expected argument 0 to be of type string'
				let ascii = (args[0] as StringVal).value

				const hash: string = sha256(ascii) as string
				return MK_STRING(hash)
			}))
			.set("verify", MK_NATIVE_FN((args, scope) => {
				if (!args[0] || args[0].type !== "string")
					throw 'Expected argument 0 to be of type string'
				if (!args[1] || args[1].type !== "string")
					throw 'Expected argument 1 to be of type string'

				return MK_BOOL(sha256((args[0] as StringVal).value) === (args[1] as StringVal).value)
			}))
		))
		.set("perf", MK_OBJECT(new Map()
			.set("nanos", MK_NATIVE_FN((args, scope) => {
				const meta = fetchInterpreterMeta()
				return MK_NUMBER((performance.now() - meta.nanosAt) * 1000000)
			}))
		))
	))

	// FILE native def
	env.declareVar("file", MK_OBJECT(new Map()
		.set("read")
	))

	// NETWORK native def
	env.declareVar("net", MK_OBJECT(new Map()
		.set("get", MK_NATIVE_FN(async(args, scope) => {
			const results = await fetch(args[0].value)
			const thisMap = new Map(entries(results))
			thisMap.set("toJSON", MK_NATIVE_FN(async(args, scope) => {
				return MK_OBJECT(new Map(entries((await results.json()))))
			}))
			return MK_OBJECT(thisMap)
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

	async function _eval(args: RuntimeVal[], env: Environment) {
		// console.warn(`EVAL is an unsandboxed body, make sure to only run code you trust!`)
		if (args.length < 1)
			throw 'Must have at least 1 arguments'
		if (args[0].type !== "string")
			throw 'Argument 0 must be a typeof string, received ' + args[0].type
		if (args[1] && args[1].type !== 'nirv') {
			if (args[1].type !== "list") {
				throw `Argument 1 must be a typeof NIRV or list, received ${args[1].type}`
			}
		}

		const source = (args[0] as StringVal).value
		
		const parser = new Parser(source)
		const program = parser.produceAST(source)
		const body: Stmt[] = []
		const params: string[] = []
		if (args[1] && args[1].type !== "nirv") {
			for (const param of (args[1] as ListVal).properties) {
				params.push(param.value)
			}
		}
		for (const bodyStmt of program.body) {
			body.push(bodyStmt)
		}
		const fn = MK_FN("evalresult", params, env, body, [], true)
		
		return fn
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