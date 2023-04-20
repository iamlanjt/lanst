export type NodeType = 
					  // STATEMENTS
					 | "Program"
					 | "VarDeclaration"
					 | "FunctionDeclaration"
					 | "IfStatement"
					  // EXPRESSIONS
					 | "AssignmentExpr"
					 | "MemberExpr"
					 | "CallExpr"
					 | "Comment"
					 | "Comparator"
					 | "Thrower"

					 | "Property"
					 | "ObjectLiteral"
					 | "NumericalLiteral"
					 | "StringLiteral"
					 | "Identifier"
					 | "BinaryExpr"
					 | null