import { RuntimeVal, StringVal } from "./value.ts";
import {
  BinaryExpr,
  Identifier,
  NumericLiteral,
  Program,
  Stmt,
} from "../ast_types/types.ts";
import { NumberVal } from "./value.ts";
import Environment from "./environment.ts";
import { VarDeclaration } from "../ast_types/VariableDeclaration.ts";
import {
  eval_assignment,
  eval_call_expr,
  eval_identifier,
  eval_member_expr,
  eval_thrower,
  eval_while_loop,
  evaluate_binary_expr,
} from "./eval/expressions.ts";
import {
  eval_function_declaration,
  eval_program,
  eval_var_declaration,
} from "./eval/statements.ts";
import { AssignmentExpr } from "../ast_types/AssignmentExpr.ts";
import { eval_object_expr, eval_if_statement } from "./eval/expressions.ts";
import { ObjectLiteral } from "../ast_types/ObjectLiteral.ts";
import { CallExpr } from "../ast_types/CallExpr.ts";
import { StringLiteral } from "../ast_types/StringLiteral.ts";
import { FunctionDeclaration } from "../ast_types/FunctionDeclaration.ts";
import { MemberExpr } from "../ast_types/MemberExpr.ts";
import { Comment } from "../ast_types/Comment.ts";
import { IfStatement } from '../ast_types/IfStatement.ts';
import { Comparator } from "../ast_types/Comparator.ts";
import { eval_comparator } from './eval/expressions.ts';
import { Thrower } from "../ast_types/Thrower.ts";
import { WhileLoop } from '../ast_types/WhileLoop.ts';

export async function evaluate(astNode: Stmt, env: Environment): RuntimeVal {
  switch (astNode.kind) {
	case "Comment":
		return new Comment((astNode as Comment).value)

    case "NumericalLiteral":
      return new NumberVal((astNode as NumericLiteral).value);

    case "StringLiteral":
      return new StringVal((astNode as StringLiteral).value);

	case "Thrower": 
		return eval_thrower(astNode as Thrower, env)
	
    case "Identifier":
      return eval_identifier(astNode as Identifier, env);

	case "Comparator":
		return await eval_comparator(astNode as Comparator, env)

	case "WhileLoop":
		return await eval_while_loop(astNode as WhileLoop, env)

	case "IfStatement":
		return eval_if_statement(astNode as IfStatement, env)

    case "ObjectLiteral":
      return eval_object_expr(astNode as ObjectLiteral, env);

	case "MemberExpr":
		return await eval_member_expr(astNode as MemberExpr, env)

    case "CallExpr":
      return await eval_call_expr(astNode as CallExpr, env);

    case "AssignmentExpr":
      return eval_assignment(astNode as AssignmentExpr, env);

    case "BinaryExpr":
      return evaluate_binary_expr(astNode as BinaryExpr, env);

    case "Program":
      return eval_program(astNode as Program, env);

    // Handle Statements
    case "VarDeclaration":
      return eval_var_declaration(astNode as VarDeclaration, env);

    case "FunctionDeclaration":
      return eval_function_declaration(astNode as FunctionDeclaration, env);

    default:
      console.log(
        "This AST Node has not yet been setup for interpretation.",
        astNode,
      );
      Deno.exit(0);
  }
}
