import { Stmt } from "../ast_types/Statement.ts";
import Environment from "./environment.ts";
import { Decorator } from '../ast_types/Decorator.ts';
import { StringLiteral } from "../ast_types/StringLiteral.ts";
import { Token } from "../frontend/lexer.ts";
import { Expr } from "../ast_types/Expression.ts";
import { interpreter_err } from './interpreter.ts';

export type ValueType =
  | "nirv"
  | "number"
  | "string"
  | "boolean"
  | "object"
  | "native-fn"
  | "function"
  | "class"
  | "new"
  | "moved";

export class RuntimeVal {
  type: ValueType;

  constructor(type: ValueType) {
    this.type = type;
  }
}

export class NirvVal extends RuntimeVal {
  value: null;

  constructor() {
    super("nirv");
    this.value = null;
  }

  toString() {
    return "nirv";
  }
}

export function MK_NIRV() {
  return new NirvVal();
}

export class MovedVal extends RuntimeVal {
	new_location: string

	constructor(new_loc: string) {
		super("moved")
		this.new_location = new_loc
	}

	toString() {
		return `moved->${this.new_location}`
	}
}

export function MK_MOVED(new_location: string) {
	return new MovedVal(new_location);
}

export class ClassVal extends RuntimeVal {
	className: string
	classMethods: Stmt[]

	constructor(className: string, classMethods: Stmt[]) {
		super("class")
		this.className = className
		this.classMethods = classMethods
	}

	toString() {
		return `class ${this.className}`
	}
}

export function MK_CLASS(name: string, methods: Stmt[]) {
	return new ClassVal(name, methods)
}

export class BoolVal extends RuntimeVal {
  value: boolean;

  constructor(bool: boolean) {
    super("boolean");
    this.value = bool;
  }

  toString() {
    return this.value.toString();
  }
}

export function MK_BOOL(b = true) {
  return new BoolVal(b);
}

export class NumberVal extends RuntimeVal {
  value: number;

  constructor(value: number) {
    super("number");
    this.value = value;
  }

  toString() {
    return this.value.toString();
  }
}

export function MK_NUMBER(n = 0) {
  return new NumberVal(n);
}

/*
export function convertToRuntimeValues(m: Map<string, any>) {
	const newMap = new Map()
	m.forEach((propertyName, property) => {
		switch(typeof property) {
			case 'object': {
				newMap.set(propertyName, convertToRuntimeValues(property))
				break
			}
			case 'boolean': {
				newMap.set(propertyName, MK_BOOL(property))
				break
			}
			case 'number': {
				newMap.set(propertyName, MK_NUMBER(property))
				break
			}
			case 'string': {
				if (typeof propertyName === 'function') {
					newMap.set(propertyName, property)
				} else {
					newMap.set(propertyName, MK_STRING(property))
				}
				break
			}
			case 'function': {
				newMap.set(propertyName, property)
			}
			default: {
				newMap.set(propertyName, property)
				break
			}
		}
	})
	return newMap
}
*/

export class ObjectVal extends RuntimeVal {
  properties: Map<string, RuntimeVal>;

  constructor(type: ValueType, properties: Map<string, any>) {
    super(type);
	properties.set('length', MK_NUMBER(properties.keys.length))
	this.properties = properties
    // this.properties = properties;
  }

  toString() {
	let endStr = "{\n\t"
	let idx = 0
	for (const [propertyName, property] of this.properties) {
		endStr += `${(idx > 0) ? ',\n\t' : ''}${propertyName}: ${property.toString()}`
		idx += 1
	}
	endStr += '\n}'
	return endStr
  }
}

export function js_object_to_lanst_object(object: {}): ObjectVal {
	const return_obj = MK_OBJECT(new Map())
	for (const [key, value] of Object.entries(object)) {
		switch (typeof value) {
			case 'object': {
				return_obj.properties.set(key, js_object_to_lanst_object(value))
				break
			}
			case 'string': {
				return_obj.properties.set(key, MK_STRING(value))
				break
			}
			case 'number': {
				return_obj.properties.set(key, MK_NUMBER(value))
				break
			}
			case 'boolean': {
				return_obj.properties.set(key, MK_BOOL(value))
				break
			}
			case 'undefined': {
				return_obj.properties.set(key, MK_NIRV())
				break
			}
			default: {
				// last resort in case of the conversion already being completed, just set the base key, value pair
				return_obj.properties.set(key, value)
				break
			}
		}
	}
	
	return return_obj
}

export class StringVal extends ObjectVal {
  value: string;

  constructor(value: string) {
    super("string", new Map()
		.set("split", MK_NATIVE_FN((args, scope)=>{
			let splitBy = args[0]
			if (splitBy) {
				if (splitBy.type !== "string")
					interpreter_err(`Expected 'string', got ${splitBy.type} in native 'split' function argument 1.`)
				splitBy = (splitBy as unknown as StringVal).value
			}
			const splt = this.value.split(splitBy)
			return js_object_to_lanst_object(splt)
		}))
	)
    this.value = value;
  }
toString() {
	return this.value
  }
}

export function MK_STRING(str: string) {
  return new StringVal(str);
}

export function MK_OBJECT(properties: Map<string, RuntimeVal>) {
	return new ObjectVal("object", properties)
}

export class ListVal extends RuntimeVal {
	properties: RuntimeVal[];
  
	constructor(properties: RuntimeVal[]) {
	  super("number");
	  this.properties = properties;
	}
  
	toString() {
		let end = "[ "
		for (let entry of this.properties) {
			entry = entry ?? MK_NIRV()
			if (end !== "[ ") {
				end += ", "
			}
			end += entry.toString()
		}
		end += " ]"
		return end
	}
}
export function MK_LIST(properties: RuntimeVal[]) {
	return new ListVal(properties)
}

export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;
export class NaitveFnValue extends RuntimeVal {
  type: "native-fn";
  call: FunctionCall;

  constructor(call: FunctionCall) {
    super("native-fn");
    this.type = "native-fn";
    this.call = call;
  }
}
export function MK_NATIVE_FN(call: FunctionCall) {
  return new NaitveFnValue(call);
}

export class NewVal extends RuntimeVal {
	target: string
	args: any

	constructor(target: string, args: Expr[]) {
		super("new")
		this.target = target
		this.args = args
	}
}
export function MK_NEW(target: string, args: any) {
	return new NewVal(target, args)
}

export class FunctionValue extends RuntimeVal {
	name: string
	params: string[]
	declarationEnv: Environment
	body: Stmt[]
	decorators: Decorator[]

	constructor(name: string, params: string[], declenv: Environment, body: Stmt[], decorators: Decorator[]) {
		super("function")
		this.name = name
		this.params = params
		this.declarationEnv = declenv
		this.body = body
		this.decorators = decorators
	}

	toString(): string {
		return `function ${this.name}`
	}
}