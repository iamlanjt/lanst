import { Stmt } from "../ast_types/Statement.ts";
import Environment from "./environment.ts";
import { Decorator } from '../ast_types/Decorator.ts';

export type ValueType =
  | "nirv"
  | "number"
  | "string"
  | "boolean"
  | "object"
  | "native-fn"
  | "function"
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
}

export function MK_MOVED(new_location: string) {
	return new MovedVal(new_location);
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

  toString() {
    return Object.fromEntries(this.properties);
  }
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
}