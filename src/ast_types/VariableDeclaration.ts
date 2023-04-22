import { Stmt } from "./Statement.ts";
import { Expr } from "./types.ts";

export class VarDeclaration extends Stmt {
	locked: boolean
	identifier: string
	value?: Expr

	constructor(locked: boolean, identifier: string, value?: Expr) {
		super("VarDeclaration")
		this.kind = "VarDeclaration"
		this.locked = locked
		this.identifier = identifier
		this.value = value
	}
}