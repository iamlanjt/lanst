import Parser from './frontend/parser.ts'
import { evaluate } from './runtime/interpreter.ts'
import Environment from './runtime/environment.ts';
import { createGlobalEnv } from './runtime/environment.ts';
// import { tokenize } from './frontend/lexer.ts';

const mode: 'run' | 'repl' = 'run'
const filepath = './index.lan'

if ((mode as unknown) == 'repl') {
	console.log(`\n-------------\nWelcome to the LAN language's
(R)ead
(E)val
(P)rint
(L)oop
-------------
`)
	repl()
} else if(mode == 'run') {
	run(filepath)
}

async function run(filename: string) {
	let _evaluate = true
	let input = await Deno.readTextFile(filename)
	if (input.startsWith("//-!interp-no-eval")){
		_evaluate = false
		input = input.substring(19, input.length)
}
	const parser = new Parser(input)
	const env = createGlobalEnv()
	// const tokens = tokenize(input)
	// console.log(tokens)
	const program = parser.produceAST(input)
	if (!_evaluate) return;
	evaluate(program, env)
	// console.log(result.toString())
}

function repl() {
	const env = new Environment()

	console.log("REPL v0.0.1")
	while (true) {
		const input = prompt("> ")

		if (!input || input.includes("exit")) {
			Deno.exit(1)
		}
		const parser = new Parser(input)

		const program = parser.produceAST(input)
		
		const result = evaluate(program, env)
		console.log(result.toString())
	}
}