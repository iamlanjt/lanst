import { Stmt } from "./Statement.ts";
import { Comparator } from './Comparator.ts';

export class WhileLoop extends Stmt {
	condition: Comparator
	body: Stmt[]

	constructor(condition: Comparator, body: Stmt[]) {
		super("WhileLoop")
		this.condition = condition
		this.body = body
	}
}