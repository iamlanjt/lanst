import { Expr } from "./Expression.ts";
import { Property } from "./Property.ts";

export class ListLiteral extends Expr {
	properties: any[]

	constructor(properties: any[]) {
		super("ListLiteral")
		this.properties = properties
	}

	toString() {
		let end = "[ "
		for (const entry of this.properties) {
			if (end !== "[ ") {
				end += ", "
			}
			end += entry.toString()
		}
		end += " ]"
		return end
	}
}