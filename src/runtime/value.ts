import { Stmt } from "../ast_types/Statement.ts";
import Environment from "./environment.ts";
import { Decorator } from '../ast_types/Decorator.ts';
import { StringLiteral } from "../ast_types/StringLiteral.ts";
import { Token } from "../frontend/lexer.ts";
import { Expr } from "../ast_types/Expression.ts";

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

export class StringVal extends RuntimeVal {
  value: string;

  constructor(value: string) {
    super("string");
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export function MK_STRING(str: string) {
  return new StringVal(str);
}

export class ObjectVal extends RuntimeVal {
  properties: Map<string, RuntimeVal>;

  constructor(properties: Map<string, RuntimeVal>) {
    super("number");
    this.properties = properties;
  }

  async toString() {
	let end = ""
	for await (const entry of this.properties.entries()) {
		const key = entry[0],
			  value = await entry[1];
		
		if (end !== "")
			end += ", "
		
		end += `${key.toString()}: ${value.toString()}`
	}
    return `{ ${end} }`
  }
}

export function MK_OBJECT(properties: Map<string, RuntimeVal>) {
	return new ObjectVal(properties)
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