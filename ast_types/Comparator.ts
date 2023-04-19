import { Stmt } from "./Statement.ts";
import { Expr } from "./types.ts";
import { Token } from '../frontend/lexer.ts';

export class Comparator extends Stmt {
	lhs: Expr
	rhs: Expr
	comparator: Token

	constructor(lhs: Expr, rhs: Expr, comparator: Token) {
		super("Comparator")
		this.lhs = lhs
		this.rhs = rhs
		this.comparator = comparator
	}
}