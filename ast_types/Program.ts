import { Stmt } from "./Statement.ts";

export class Program extends Stmt {
	body: Stmt[]

	constructor(body: Stmt[]) {
		super("Program")
		this.kind = "Program"
		this.body = body
	}
}