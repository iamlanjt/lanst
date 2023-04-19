import Parser from "./frontend/parser.ts";
import { evaluate } from "./runtime/interpreter.ts";
import Environment from "./runtime/environment.ts";
import { createGlobalEnv } from "./runtime/environment.ts";
import { tokenize, TokenType } from "./frontend/lexer.ts";
import { Program } from "./ast_types/Program.ts";
import { Expr } from "./ast_types/types.ts";
import { Comment } from "./ast_types/Comment.ts";

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

function convertStringToObject(input: string): object {
	const parts = input.split(" ");
	let result: any = {};
  
	for (let i = 0; i < parts.length; i++) {
	  const current = parts[i];
  
	  if (current.includes("-")) {
		const [key, value] = current.split("-");
		if (!result[key]) {
		  result[key] = {};
		}
		if (i === parts.length - 1) {
		  result[key][value] = true;
		} else if (parts[i + 1].includes("-")) {
		  result[key][value] = {};
		} else {
		  result[key][value] = true;
		}
	  } else {
		continue;
	  }
	}
  
	return result;
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
		toggles.push(convertStringToObject((comment as Comment).value))
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
  // console.log(program)

  // const settings = handle_interp_options(program)

  // if (settings["lan-interp"]["no-evaluation"])
  evaluate(program, env);
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
