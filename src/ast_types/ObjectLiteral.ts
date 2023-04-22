import { Expr } from "./Expression.ts";
import { Property } from "./Property.ts";

export class ObjectLiteral extends Expr {
	properties: Property[]

	constructor(properties: Property[]) {
		super("ObjectLiteral")
		this.properties = properties
	}

	toString() {
		return JSON.stringify(this.properties)
	}
}