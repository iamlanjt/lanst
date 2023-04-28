import { Stmt } from "./Statement.ts";
import { StringLiteral } from './StringLiteral.ts';

export class Class extends Stmt {
	className: string
	classMethods: Stmt[]

	constructor(className: string, classMethods: Stmt[]) {
		super("Class")
		this.className = className
		this.classMethods = classMethods
	}
}