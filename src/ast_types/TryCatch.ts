import { Stmt } from "./Statement.ts";
import { Decorator } from './Decorator.ts';

export class TryCatch extends Stmt {
	body: Stmt[]
	errorBody: Stmt[]
	args: string[]

	constructor(body: Stmt[], errorBody: Stmt[], args: string[]) {
		super("TryCatch")
		this.kind = "TryCatch"
		this.body = body
		this.errorBody = errorBody
		this.args = args
	}

	toString() {
		return JSON.stringify(this)
	}
}