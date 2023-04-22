export type NodeType = 
					  // STATEMENTS
					 | "Program"
					 | "VarDeclaration"
					 | "FunctionDeclaration"
					 | "IfStatement"
					 | "WhileLoop"
					 | "Decorator"
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