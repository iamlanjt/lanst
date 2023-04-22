import { Expr } from "./Expression.ts";

export class Thrower extends Expr {
	reason: string

	constructor(reason: string) {
		super("Thrower")
		this.reason = reason
	}
}