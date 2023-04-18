import { Expr } from "./Expression.ts";

export class NumericLiteral extends Expr {
	value: number

	constructor(value: number) {
		super("NumericalLiteral")
		this.value = value
	}
}