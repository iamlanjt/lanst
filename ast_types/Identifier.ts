import { Expr } from "./Expression.ts";

export class Identifier extends Expr {
	symbol: string

	constructor(symbol: string) {
		super("Identifier")
		this.symbol = symbol
	}
}