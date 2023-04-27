import { NodeType } from "../frontend/ast.ts"
import { Token } from "../frontend/lexer.ts";

export class Stmt {
	kind: NodeType
	startingToken?: Token

	constructor(kind: NodeType, startingToken?: Token) {
		this.kind = kind
	}
}