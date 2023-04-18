import { Expr } from "./Expression.ts";

export class CallExpr extends Expr {
	args: Expr[]
	caller: Expr

	constructor(args: Expr[], caller: Expr) {
		super("CallExpr")
		this.args = args
		this.caller = caller
	}
}