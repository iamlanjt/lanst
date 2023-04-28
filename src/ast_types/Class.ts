import { Stmt } from "./Statement.ts";
import { StringLiteral } from './StringLiteral.ts';
import { Expr } from './Expression.ts';

export class Class extends Stmt {
	className: string
	classMethods: Stmt[]
	properties: Expr[]

	constructor(className: string, classMethods: Stmt[], properties?: Expr[]) {
		super("Class")
		this.className = className
		this.classMethods = classMethods
		this.properties = properties ?? []
	}
}