import { Expr } from "./Expression.ts";

export class Property extends Expr {
	key: string
	value?: Expr

	constructor(key: string, value?: Expr) {
		super("Property")
		this.key = key
		this.value = value
	}
}