import { Expr } from "./Expression.ts";

export class MemberExpr extends Expr {
	object: Expr
	property: Expr
	computed: boolean

	constructor(object: Expr, property: Expr, computed: boolean) {
		super("MemberExpr")
		this.object = object
		this.property = property
		this.computed = computed
	}
}