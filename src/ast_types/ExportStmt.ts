import { Expr } from "./Expression.ts";

export class ExportStmt extends Expr {
	assignee: Expr
	value: Expr
	
	constructor(assignee: Expr, value: Expr) {
		super("AssignmentExpr")
		this.assignee = assignee
		this.value = value
	}
}