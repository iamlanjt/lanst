import { Stmt } from "./Statement.ts";
import { Decorator } from './Decorator.ts';

export class Thread extends Stmt {
	body: Stmt[]

	constructor(body: Stmt[]) {
		super("Thread")
		this.kind = "Thread"
		this.body = body
	}

	toString() {
		return JSON.stringify(this)
	}
}