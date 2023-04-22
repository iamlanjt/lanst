import { NodeType } from "../frontend/ast.ts"

export class Stmt {
	kind: NodeType

	constructor(kind: NodeType) {
		this.kind = kind
	}
}