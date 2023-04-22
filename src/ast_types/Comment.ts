import { Expr } from "./Expression.ts";

export class Comment extends Expr {
	value: string

	constructor(value: string) {
		super("Comment")
		this.value = value
	}
}