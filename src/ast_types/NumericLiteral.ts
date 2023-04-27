import { Expr } from "./Expression.ts";

export class NumericLiteral extends Expr {
	value: number

	constructor(value: number) {
		super("NumericalLiteral")
		this.value = value
	}

	toString(): string {
		return this.value
	}
}