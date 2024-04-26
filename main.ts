import Parser from "./src/frontend/parser.ts";
import { evaluate } from "./src/runtime/interpreter.ts";
import { createGlobalEnv } from "./src/runtime/environment.ts";
import { Program } from "./src/ast_types/Program.ts";
import { Expr } from "./src/ast_types/types.ts";
import { Comment } from "./src/ast_types/Comment.ts";
import chalk from 'npm:chalk@5.2.0'

let filepath
let mode: "repl" | "run"

const args = Deno.args
if (args.length === 0) {
	filepath = ""
	mode = "repl"
} else {
	filepath = args[0]
	mode = "run"
}


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


const META_STATE = {
	nanosAt: 0,
	parseTime: 0,
	dir: "",
	filename: "",
	path: ""
}

export function fetchInterpreterMeta() {
	return META_STATE
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
// initial scope; classes and other functions may use this, so we must export it
export const GLOBAL_ENVIRONMENT = createGlobalEnv();


async function singleRun(ast) {
	const eval_results = await evaluate(ast, GLOBAL_ENVIRONMENT)
	console.log()
	console.log(chalk.greenBright(`~~~~~~~~ New AST node evaluated ~~~~~~~~`))
	console.log(`\nCurrent user-declared environment:\n`)
	const _env: any[] = []
	for(const key of GLOBAL_ENVIRONMENT.variables.keys()) {
		const v = GLOBAL_ENVIRONMENT.variables.get(key)
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
async function runAst(program) {
	for (const ast of program.body) {
		await singleRun(ast)
	}
}

async function run(filename: string) {
  const input = await Deno.readTextFile(filename);
  // const tokens = tokenize(input)
  // console.log(tokens)
  const t = performance.now()
  const parser = new Parser(input);
  const program = parser.produceAST(input);
  META_STATE.parseTime = performance.now() - t
  // console.log(program.body)
  META_STATE.nanosAt = performance.now()
  META_STATE.dir = Deno.cwd()
  META_STATE.filename = ""
  const settings = handle_interp_options(program)
  if (settings.includes("lan-interp debug")) {
	console.log('Entered lanst debugger')
	for (const ast of program.body) {
		switch (ast.kind) {
			/*
			case 'IfStatement':
			case 'Thread':
			case 'TryCatch':
			case 'WhileLoop': {
				await runAst(ast)
				break
			}
			*/
			default: {
				await singleRun(ast)
				break
			}
		}
	}
	console.log("\n\n!! Program finished.\n\n")
  } else {
	META_STATE.nanosAt = performance.now()
	// console.log(program.body[1].args)
  	await evaluate(program, GLOBAL_ENVIRONMENT);
  }
}

async function repl() {
  console.log("REPL v0.0.1\n\"exit\" to exit the REPL");
  const env = createGlobalEnv()
  while (true) {
    const input = prompt("> ");

    if (!input || input.includes("exit")) {
      Deno.exit(1);
    }
    const parser = new Parser(input);

    const program = parser.produceAST(input);

    const result = evaluate(program, env);
    console.log((await result).toString());
  }
}
