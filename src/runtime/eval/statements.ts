import { FunctionDeclaration } from "../../ast_types/FunctionDeclaration.ts";
import { Program } from "../../ast_types/Program.ts";
import { VarDeclaration } from "../../ast_types/VariableDeclaration.ts";
import { TokenType } from "../../frontend/lexer.ts";
import Environment from "../environment.ts";
import { evaluate } from "../interpreter.ts";
import { FunctionValue, MK_NIRV, RuntimeVal } from "../value.ts";
import { Identifier } from '../../ast_types/Identifier.ts';
import { MK_MOVED } from '../value.ts';
import { TryCatch } from "../../ast_types/TryCatch.ts";

export async function eval_program(program: Program, env: Environment): RuntimeVal {
  let lastEvaluated: RuntimeVal = MK_NIRV();

  for (const statement of program.body) {
    lastEvaluated = await evaluate(statement, env);
  }

  return lastEvaluated;
}

export async function eval_var_declaration(
  declaration: VarDeclaration,
  env: Environment,
): RuntimeVal {
  const value = declaration.value
    ? await evaluate(declaration.value, env)
    : MK_NIRV();

  if(declaration.value && (declaration.value as unknown as Identifier).kind === TokenType.Identifier) {
	env.assignVar(declaration.value.symbol, MK_MOVED(declaration.identifier), true)
  }

  return env.declareVar(declaration.identifier, value, declaration.locked, "PROGRAM");
}

export function eval_function_declaration(
  declaration: FunctionDeclaration,
  env: Environment,
): RuntimeVal {
  const fn = new FunctionValue(
    declaration.name,
    declaration.parameters,
    env,
    declaration.body,
	declaration.decorators,
  );

  return env.declareVar(declaration.name, fn, true);
}