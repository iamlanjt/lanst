import Parser from "./src/frontend/parser.ts";
import { evaluate } from "./src/runtime/interpreter.ts";
import Environment from "./src/runtime/environment.ts";
import { createGlobalEnv } from "./src/runtime/environment.ts";
import { tokenize, TokenType } from "./src/frontend/lexer.ts";
import { Program } from "./src/ast_types/Program.ts";
import { Expr } from "./src/ast_types/types.ts";
import { Comment } from "./src/ast_types/Comment.ts";
import { MK_BOOL } from './src/runtime/value.ts';
import chalk from 'npm:chalk@5.2.0'

const mode: "run" | "repl" = "run";
const filepath = "./index.lan";

if ((mode as unknown) == "repl") {
  console.log(`\n-------------\nWelcome to the LAN language's
(R)ead
(E)val
(P)rint
(L)oop
-------------
`);
  repl();
} else if (mode == "run") {
  run(filepath);
}


function handle_interp_options(program: Program) {
	const prefixer = "lan-interp";
	const interp_comments = program.scrape_kind("Comment").filter(
		(expr: Expr) => {
			return (expr as Comment).value.startsWith(prefixer);
		},
	);

	const toggles = []
	for (const comment of interp_comments) {
		toggles.push((comment as Comment).value)
	}
	return toggles
}

async function run(filename: string) {
  const input = await Deno.readTextFile(filename);
  // const tokens = tokenize(input)
  // console.log(tokens)
  const parser = new Parser(input);
  const env = createGlobalEnv();
  const program = parser.produceAST(input);
  // console.log(program.body[1])

  const settings = handle_interp_options(program)
  if (settings.includes("lan-interp debug")) {
	for (const ast of program.body) {
		const eval_results = await evaluate(ast, env)
		console.log()
		console.log(chalk.greenBright(`~~~~~~~~ New AST node evaluated ~~~~~~~~`))
		console.log(`\nCurrent user-declared environment:\n`)
		const _env: any[] = []
		for(const key of env.variables.keys()) {
			const v = env.variables.get(key)
			if (v.creator === "PROGRAM") {
				_env[chalk.red(key)] = {
					EvaluatedValue: v.value,
					Creator: v.creator,
					"Locked?": v.isLocked
				}
			}
		}
		console.table(_env)
		console.log()
		console.log(`Evaluating AST node with type "${ast.kind}"`)
		console.log(chalk.bgGreen("Evaluation results:"))
		console.log(eval_results)
		console.log()
		prompt("Any value to continue:")
	}
	console.log("\n\n!! Program finished.\n\n")
  } else {
  	await evaluate(program, env);
  }
}

function repl() {
  const env = new Environment();

  console.log("REPL v0.0.1");
  while (true) {
    const input = prompt("> ");

    if (!input || input.includes("exit")) {
      Deno.exit(1);
    }
    const parser = new Parser(input);

    const program = parser.produceAST(input);

    const result = evaluate(program, env);
    console.log(result.toString());
  }
}
