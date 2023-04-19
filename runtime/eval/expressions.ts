import { AssignmentExpr } from "../../ast_types/AssignmentExpr.ts";
import { BinaryExpr } from "../../ast_types/BinaryExpression.ts";
import { CallExpr } from "../../ast_types/CallExpr.ts";
import { Identifier } from "../../ast_types/Identifier.ts";
import { IfStatement } from "../../ast_types/IfStatement.ts";
import { MemberExpr } from "../../ast_types/MemberExpr.ts";
import { ObjectLiteral } from "../../ast_types/ObjectLiteral.ts";
import { StringLiteral } from "../../ast_types/StringLiteral.ts";
import { VarDeclaration } from "../../ast_types/VariableDeclaration.ts";
import { NumericLiteral } from "../../ast_types/types.ts";
import { TokenType } from "../../frontend/lexer.ts";
import Environment from "../environment.ts";
import { evaluate } from "../interpreter.ts";
import {
  FunctionValue,
  MK_BOOL,
  MK_NIRV,
  NaitveFnValue,
  NumberVal,
  RuntimeVal,
  StringVal,
} from "../value.ts";
import { ObjectVal } from "../value.ts";

function eval_numeric_binary_expr(
  lhs: NumberVal,
  rhs: NumberVal,
  operator: string,
): NumberVal {
  let result = 0;
  if (operator == "+") {
    result = lhs.value + rhs.value;
  } else if (operator == "-") {
    result = lhs.value - rhs.value;
  } else if (operator == "*") {
    result = lhs.value * rhs.value;
  } else if (operator == "/") {
    // TODO: Division by zero checks
    result = lhs.value / rhs.value;
  }
  return new NumberVal(result);
}

export function evaluate_binary_expr(
  binop: BinaryExpr,
  env: Environment,
): RuntimeVal {
  const lhs = evaluate(binop.left, env);
  const rhs = evaluate(binop.right, env);

  // Handle LHS: NUMBER -> all types
  if (lhs.type == "number" && rhs.type == "number") {
    return eval_numeric_binary_expr(
      lhs as NumberVal,
      rhs as NumberVal,
      binop.operator,
    );
  }

  return MK_NIRV();
}

export function eval_identifier(
  ident: Identifier,
  env: Environment,
): RuntimeVal {
  const val = env.lookupVar(ident.symbol);
  return val;
}

export function eval_assignment(
  node: AssignmentExpr,
  env: Environment,
): RuntimeVal {
  if (node.assignee.kind != "Identifier") {
    throw `Cannot assign ${node.assignee.kind} >INTO> IDENTIFIER`;
  }

  const varname = (node.assignee as Identifier).symbol;
  return env.assignVar(varname, evaluate(node.value, env));
}

export function eval_object_expr(
  obj: ObjectLiteral,
  env: Environment,
): RuntimeVal {
  const object = new ObjectVal(new Map());
  for (const { key, value } of obj.properties) {
    const runtimeVal = (value == undefined)
      ? env.lookupVar(key)
      : evaluate(value, env);

    object.properties.set(key, runtimeVal);
  }
  return object;
}

export function eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
  const args = expr.args.map((arg) => evaluate(arg, env));
  const fn = evaluate(expr.caller, env);

  if (fn.type == "native-fn") {
    const result = (fn as NaitveFnValue).call(args, env);
    return result;
  } else if (fn.type == "function") {
    const func = fn as FunctionValue;
    const scope = new Environment(func.declarationEnv);

    for (let i = 0; i < func.params.length; i++) {
      // TODO check the bounds here
      const varname = func.params[i];
      scope.declareVar(varname, args[i], false);
    }

    let result: RuntimeVal = MK_NIRV();

    for (const stmt of func.body) {
      result = evaluate(stmt, scope);
    }

    return result;
  }

  throw `[LAN:E0001]: Attempt to call value that is not of type "function": ${
    JSON.stringify(fn)
  }`;
}

export function eval_member_expr(
  expr: MemberExpr,
  env: Environment,
): RuntimeVal {

	return MK_NIRV()
}


export function eval_if_statement(expr: IfStatement, env: Environment): RuntimeVal {
	const lhs = evaluate(expr.condition.lhs, env)
	const rhs = evaluate(expr.condition.rhs, env)
	const comparator = expr.condition.comparator

	if (lhs.type !== rhs.type)
		throw `Cannot compare ${lhs.type} to ${rhs.type}.`

	let compare_left
	let compare_right
	
	switch(lhs.type) {
		case 'number': {
			compare_left = (lhs as NumberVal).value
			compare_right = (rhs as NumberVal).value
		}
	}

	if (!compare_left || !compare_right)
		throw `Cannot compare NIRV values.`

	let result

	switch (comparator.type) {
		case TokenType.Gt: {
			result = compare_left > compare_right
		}
	}

	if (result === true) {
		for (const ex of expr.body) {
			evaluate(ex, env)
		}
	}

	return MK_NIRV()
}