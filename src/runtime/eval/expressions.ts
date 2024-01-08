import { AssignmentExpr } from "../../ast_types/AssignmentExpr.ts";
import { BinaryExpr } from "../../ast_types/BinaryExpression.ts";
import { CallExpr } from "../../ast_types/CallExpr.ts";
import { Identifier } from "../../ast_types/Identifier.ts";
import { IfStatement } from "../../ast_types/IfStatement.ts";
import { MemberExpr } from "../../ast_types/MemberExpr.ts";
import { ObjectLiteral } from "../../ast_types/ObjectLiteral.ts";
import { StringLiteral } from "../../ast_types/StringLiteral.ts";
import { VarDeclaration } from "../../ast_types/VariableDeclaration.ts";
import { Expr, FunctionDeclaration, NumericLiteral } from "../../ast_types/types.ts";
import { TokenType } from "../../frontend/lexer.ts";
import Environment from "../environment.ts";
import { evaluate } from "../interpreter.ts";
import {
ClassVal,
  FunctionValue,
  ListVal,
  MK_BOOL,
  MK_NIRV,
  MK_STRING,
  MovedVal,
  NaitveFnValue,
  NirvVal,
  NumberVal,
  RuntimeVal,
  StringVal,
} from "../value.ts";
import { ObjectVal } from "../value.ts";
import { Comparator } from '../../ast_types/Comparator.ts';
import { Stmt } from '../../ast_types/Statement.ts';
import { BoolVal } from '../value.ts';
import { Thrower } from "../../ast_types/Thrower.ts";
import { WhileLoop } from '../../ast_types/WhileLoop.ts';
import { ListLiteral } from "../../ast_types/ListLiteral.ts";
import { Class } from "../../ast_types/Class.ts";
import { MK_CLASS } from '../value.ts';
import { NewVal } from '../value.ts';
import { Token } from '../../frontend/lexer.ts';
import { interpreter_err } from '../interpreter.ts';
import { TryCatch } from "../../ast_types/TryCatch.ts";

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

export async function eval_try_catch(
	trycatch: TryCatch,
	env: Environment
): RuntimeVal {
	let err: RuntimeVal = MK_NIRV()
	let result: RuntimeVal = MK_NIRV()
	for (const bodyStmt of trycatch.body) {
		try {
			result = await evaluate(bodyStmt, env)
		} catch (caughtError) {
			err = MK_STRING(caughtError)
			break
		}
	}
	
	if (err.type !== "nirv") {
		let errorResult: RuntimeVal = MK_NIRV()
		let internalEnv = new Environment(env)
		internalEnv.declareVar(trycatch.args[0], err, true, "PROGRAM")

		for (const errorBodyStmt of trycatch.errorBody) {
			result = await evaluate(errorBodyStmt, internalEnv)
		}

		return errorResult
	}
	return result
}

export async function evaluate_binary_expr(
  binop: BinaryExpr,
  env: Environment,
): RuntimeVal {
  const lhs = await evaluate(binop.left, env);
  const rhs = await evaluate(binop.right, env);

  // Handle LHS: NUMBER -> all types
  if (lhs.type == "number" && rhs.type == "number") {
    return eval_numeric_binary_expr(
      lhs as NumberVal,
      rhs as NumberVal,
      binop.operator,
    );
  }

  if ((lhs.type == "number" && rhs.type == "string") || (lhs.type == "string" && rhs.type == "number")) {
	return MK_STRING(
		(lhs.type == "number") ? `${(rhs as StringVal).value}${(lhs as NumberVal).value.toString()}` : `${(lhs as StringVal).value}${(rhs as NumberVal).value.toString()}`
	)
  }

  if (lhs.type == "string" && rhs.type == "string") {
	return MK_STRING(`${(lhs as StringVal).value}${(rhs as StringVal).value}`)
  }

  return MK_NIRV();
}

export function eval_identifier(
  ident: Identifier,
  env: Environment,
): RuntimeVal {
  const val = env.lookupVar(ident.symbol);
  if (!val)
	return undefined
  if (val.type === "moved") {
	console.log(`Attempt to access value "${ident.symbol}" which has been moved to "${(val as MovedVal).new_location}".\n\nBasic error reconstruction:\n\nres ${ident.symbol} = 5\nres ${(val as MovedVal).new_location} = ${ident.symbol}\nsys_println(${ident.symbol}) <- "${ident.symbol}" no longer exists here`)
	Deno.exit(1)
  }
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

export function eval_list_expr(
	list: ListLiteral,
	_env: Environment
): RuntimeVal {
	const lst = new ListVal([])
	for (const value of list.properties) {
		const runtimeVal = value ?? MK_NIRV()

		lst.properties.push(runtimeVal);
	}
	return lst;
}

// Format:
// for fn(1, 2, 3):
// memoized_results[0] = {args: [1, 2, 3], fnName: "fn", result: 5}
const memoized_results: any = []

function equal_args(one, two) {
	if (one.length !== two.length) return false
	let i = 0
	for(const arg of one) {
		if (two[i].value !== arg.value) return false
		i += 1
	}
	return true
}

export function eval_call_expr(expr: CallExpr, env: Environment): Promise<RuntimeVal> {
	// deno-lint-ignore no-async-promise-executor
	return new Promise(async(res, rej)=>{
		const args = await expr.args.map(async(arg) => await evaluate(arg, env));
		//console.log('bargs', args)
		const fn = await evaluate(expr.caller, env);
		//console.log(expr.caller, fn)
		const newargs: any = []
		for (const arg of args) {
			newargs.push((await arg))
		}
		if (fn.type == "native-fn") {
			const result = await (fn as NaitveFnValue).call(newargs, env);
			//console.log('res', result)
			res(result)
			return
		} else if (fn.type == "function") {
			const func = fn as FunctionValue;
			const scope = new Environment(func.declarationEnv);

			// should we try to pull previous requests from a cache?
			const isMemoized = (func.decorators.find((decorator)=>{return (decorator.type as unknown) === TokenType.Memoize}) !== undefined)

			const memoization = memoized_results.find((memory)=>{
				return equal_args(memory.args, newargs) == true && memory.fnName == (fn as FunctionValue).name
			})
			if (isMemoized && (memoization !== undefined)) {
				return memoization.result
			}

			for (let i = 0; i < func.params.length; i++) {
				// TODO check the bounds here
				const varname = func.params[i];
				scope.declareVar(varname, newargs[i], false);
			}

			let result: RuntimeVal = MK_NIRV();

			for await (const stmt of func.body) {
				result = await evaluate(stmt, scope);
			}

			if (isMemoized && (memoization === undefined)) {
				const mem = {
					args: newargs,
					fnName: (fn as FunctionValue).name,
					result
				}
				memoized_results.push(mem)
			}

			res(result);
			return
		}

		throw `[LAN:E0001]: Attempt to call value that is not of type "function": ${
			JSON.stringify(fn)
		}`;
	})
}

export async function eval_member_expr(
  expr: MemberExpr,
  env: Environment,
): RuntimeVal {
	/*
	if (expr.kind === "Class") {
		let last_obj: MemberExpr = expr
		let tree = []

		tree.push(last_obj.property)
		while (last_obj.object.kind === "MemberExpr") {
			last_obj = last_obj.object
			tree.push(last_obj.property)
		}
		last_obj = last_obj.object

		if ((last_obj as unknown as Identifier).kind !== "Identifier") {
			throw 'Expected identifier for tailing member expression, got ' + last_obj.kind
		}

		const base_entry = env.lookupVar((last_obj as unknown as Identifier).symbol)
		let end_value = base_entry

		for (let i = tree.length-1; i >= 0; i--) {
			end_value = await end_value.properties.get(tree[i].symbol)
		}
		
		return end_value
	}
	*/

	// identifier and member expr
	let last_obj: MemberExpr = expr
	let tree = []

	tree.push(last_obj.property)
	while (last_obj.object.kind === "MemberExpr") {
		last_obj = last_obj.object
		tree.push(last_obj.property)
	}
	last_obj = last_obj.object

	if ((last_obj as unknown as Identifier).kind !== "Identifier") {
		throw 'Expected identifier for tailing member expression, got ' + last_obj.kind
	}

	const base_entry = env.lookupVar((last_obj as unknown as Identifier).symbol)
	let end_value = base_entry

	for (let i = tree.length-1; i >= 0; i--) {
		end_value = await end_value.properties.get(tree[i].symbol)
	}
	
	return end_value
}

export async function eval_while_loop(expr: WhileLoop, env: Environment): RuntimeVal {
	let condition_results = await eval_comparator(expr.condition, env)

	while ((condition_results as unknown as BoolVal).value === true) {
		const internal_environment = new Environment(env)
		for await (const ex of expr.body) {
			await evaluate(ex, internal_environment)
		}

		condition_results = await eval_comparator(expr.condition, internal_environment)
	}
}

export async function eval_new(expr: NewVal, env: Environment): RuntimeVal {
	let last_results = null
	const target_class = env.lookupVar((expr.target as unknown as Token).value)

	if (target_class.type !== "class")
		interpreter_err("'new' cannot be used on a non-class", expr)
	const found_initializer = (target_class as ClassVal).classMethods.find((pred)=>{
		return (pred as FunctionDeclaration).name === 'init'
	})
	if (!found_initializer) {
		interpreter_err(`Unable to find initializer function 'init' of class '${(expr.target as unknown as Token).value}' for 'new' keyword`)
	}

	const scope = new Environment(env);
	const func = (found_initializer as unknown as FunctionDeclaration)

	for (let i = 0; i < expr.args.length; i++) {
		// TODO check the bounds here
		const varname = func.parameters[i];
		scope.declareVar(varname, expr.args[i], false);
	}

	let result: RuntimeVal = MK_NIRV();

	for await (const stmt of func.body) {
		result = await evaluate(stmt, scope);
	}

	return target_class // MK_CLASS((expr.target as unknown as Token).value)
}

export async function eval_class(expr: Class, env: Environment): RuntimeVal {
	env.declareVar(expr.className, MK_CLASS(expr.className, expr.classMethods))
	return MK_CLASS(expr.className, expr.classMethods)
}

export async function eval_if_statement(expr: IfStatement, env: Environment): RuntimeVal {
	const condition_results = await eval_comparator(expr.condition, env)

	if ((condition_results as unknown as BoolVal).value === true) {
		for await (const ex of expr.body) {
			await evaluate(ex, env)
		}
	}

	return MK_NIRV()
}

export async function eval_comparator(expr: Comparator, env: Environment): RuntimeVal {
	// console.log(expr.rhs)
	const lhs = await evaluate(expr.lhs, env)
	const rhs = await evaluate(expr.rhs, env)
	//console.log(expr.rhs)
	const comparator = expr.comparator

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

	if (compare_left == undefined || compare_right == undefined)
		throw `Cannot compare NIRV values.`

	let result

	switch (comparator.type) {
		case TokenType.Gt: {
			result = compare_left > compare_right
			break
		}
		case TokenType.Lt: {
			result = compare_left < compare_right
			break
		}
		case TokenType.DoubleEq: {
			result = compare_left == compare_right
		}
	}

	return MK_BOOL(result)
}

export function eval_thrower(expr: Thrower, env: Environment): RuntimeVal {
	const reason = expr.reason

	console.error(reason)
	Deno.exit(1)

	return MK_NIRV()
}