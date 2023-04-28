import { Token } from "../frontend/lexer.ts";
import { Expr } from "./Expression.ts";
import { Stmt } from "./Statement.ts";

export class New extends Stmt {
	target: Token
	args: Expr[]

	constructor(target: Token, args: Expr[]) {
		super("New")
		this.target = target
		this.args = args
	}
}