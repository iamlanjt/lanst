import { Stmt } from "./Statement.ts";

export class Expr extends Stmt {

	toString() {
		return `${this.kind}`
	}
}