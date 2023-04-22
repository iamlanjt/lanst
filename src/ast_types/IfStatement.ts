import { Stmt } from "./Statement.ts";
import { Comparator } from './Comparator.ts';

export class IfStatement extends Stmt {
	condition: Comparator
	body: Stmt[]

	constructor(condition: Comparator, body: Stmt[]) {
		super("IfStatement")
		this.condition = condition
		this.body = body
	}
}