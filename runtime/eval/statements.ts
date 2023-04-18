import { FunctionDeclaration } from "../../ast_types/FunctionDeclaration.ts";
import { Program } from "../../ast_types/Program.ts";
import { VarDeclaration } from "../../ast_types/VariableDeclaration.ts";
import Environment from "../environment.ts";
import { evaluate } from "../interpreter.ts";
import { FunctionValue, MK_NIRV, RuntimeVal } from "../value.ts";

export function eval_program(program: Program, env: Environment): RuntimeVal {
  let lastEvaluated: RuntimeVal = MK_NIRV();

  for (const statement of program.body) {
    lastEvaluated = evaluate(statement, env);
  }

  return lastEvaluated;
}

export function eval_var_declaration(
  declaration: VarDeclaration,
  env: Environment,
): RuntimeVal {
  const value = declaration.value
    ? evaluate(declaration.value, env)
    : MK_NIRV();

  return env.declareVar(declaration.identifier, value, declaration.locked);
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
  );

  return env.declareVar(declaration.name, fn, true);
}