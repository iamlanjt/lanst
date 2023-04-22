import { Stmt } from "./Statement.ts";
import { TokenType } from '../frontend/lexer.ts';

export class Decorator extends Stmt {
	type: TokenType

	constructor(type: TokenType) {
		super("Decorator")
		this.type = type
	}

	toString() {
		return JSON.stringify(this)
	}
}