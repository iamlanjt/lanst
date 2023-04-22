import { Stmt } from "./Statement.ts";
import { Decorator } from './Decorator.ts';

export class FunctionDeclaration extends Stmt {
	parameters: string[]
	name: string
	body: Stmt[]
	description: string
	decorators: Decorator[]

	constructor(params: string[], name: string, body: Stmt[], description: string, decorators: Decorator[]) {
		super("FunctionDeclaration")
		this.kind = "FunctionDeclaration"
		this.parameters = params
		this.name = name
		this.body = body
		this.description = description
		this.decorators = decorators
	}

	toString() {
		return JSON.stringify(this)
	}
}