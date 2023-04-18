import { Stmt } from "./Statement.ts";

export class FunctionDeclaration extends Stmt {
	parameters: string[]
	name: string
	body: Stmt[]
	description: string

	constructor(params: string[], name: string, body: Stmt[], description: string) {
		super("FunctionDeclaration")
		this.kind = "FunctionDeclaration"
		this.parameters = params
		this.name = name
		this.body = body
		this.description = description
	}

	toString() {
		return JSON.stringify(this)
	}
}