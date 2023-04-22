import { Expr } from "./Expression.ts";

export class StringLiteral extends Expr {
	value: string

	constructor(value: string) {
		super("StringLiteral")
		this.value = value
	}
}