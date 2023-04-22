import { Stmt } from "./Statement.ts";
import { Expr } from "./types.ts";

export class Program extends Stmt {
	body: Stmt[]

	constructor(body: Stmt[]) {
		super("Program")
		this.kind = "Program"
		this.body = body
	}

	scrape_kind(kind: string): Expr[] {
		const results: Expr[] = []
		
		for (const expr of this.body) {
			if (expr.kind === kind)
				results.push(expr)
		}

		return results
	}
}