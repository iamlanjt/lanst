import { Expr } from "./Expression.ts";

export class BinaryExpr extends Expr {
	left: Expr
	right: Expr
	operator: string

	constructor(left: Expr, right: Expr, operator: string) {
		super("BinaryExpr")
		this.left = left
		this.right = right
		this.operator = operator
	}
	
	toString(): string {
		return `${this.left} ${this.operator} ${this.right}`
	}
}