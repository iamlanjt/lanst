export enum TokenType {
	Number = "Number",
	Identifier = "Identifier",
	String = "String",
	Eq = "Eq",
	Comma = "Comma",
	Slash = "Slash",
	Colon = "Colon",
	OpenBrace = "OpenBrace",
	CloseBrace = "CloseBrace",
	Semicolon = "Semicolon",
	OpenParen = "OpenParen", CloseParen = "CloseParen",
	OpenBracket = "OpenBracket",
	CloseBracket = "ClosedBracket",
	Dot = "Dot",
	Arrow = "Arrow",
	Fn = "Fn",
	If = "If",
	Gt = "Gt",
	Lt = "Lt",
	DoubleEq = "DoubleEq",
	While = "While",
	DoDebug = "DoDebug",
	Memoize = "Memoize",

	Class = "Class",
	New = "New",
	Self = "Self",
	
	BinaryOp = "BinaryOp",

	Reserve = "Reserve",
	ReserveLocked = "ReserveLocked",
	Throw = "Throw",

	Export = "Export",

	EOF = "EOF",
}

// All reserved keywords in Lanst
export const RESERVED: Record<string, TokenType> = {
	"res": TokenType.Reserve,
	"reslock": TokenType.ReserveLocked,
	"fn": TokenType.Fn,
	"if": TokenType.If,
	"throw": TokenType.Throw,
	"while": TokenType.While,
	"internal_do_enable_debugger": TokenType.DoDebug,
	"memoize": TokenType.Memoize,
	"class": TokenType.Class,
	"self": TokenType.Identifier,
	"new": TokenType.New,
	"export": TokenType.Export,
}

export interface Token {
	value: string,
	type: TokenType,
}

export class Token {
	value: string
	type: TokenType
	line: number
	column: number

	constructor(value: string = "", type: TokenType, line: number, column: number) {
		this.value = value
		this.type = type
		this.line = line
		this.column = column
	}
}

function isIdentifier(str: string): boolean {
	return /^[a-zA-Z_]+$/.test(str);
}

function isWhitespace(str: string): boolean {
	return str == ' ' || str == '\n' || str == '\t' || str == '\r'
}

function isNumber(str: string): boolean {
	const c = str.charCodeAt(0)
	const bounds = ['0'.charCodeAt(0), '9'.charCodeAt(0)]

	return (c >= bounds[0] && c <= bounds[1])
}

export function tokenize(source: string): Token[] {
	const tokens = new Array<Token>
	const src = source.split("")
	let line = 1
	let column = 1

	while (src.length > 0) {
		column++
		switch (src[0].toString()) {
			case '?': {
				tokens.push(new Token(src.shift(), TokenType.Slash, line, column))
				break
			}
			case '(': {
				tokens.push(new Token(src.shift(), TokenType.OpenParen, line, column))
				break
			}
			case ')': {
				tokens.push(new Token(src.shift(), TokenType.CloseParen, line, column))
				break
			}
			case '{': {
				tokens.push(new Token(src.shift(), TokenType.OpenBrace, line, column))
				break
			}
			case '}': {
				tokens.push(new Token(src.shift(), TokenType.CloseBrace, line, column))
				break
			}
			case '[': {
				tokens.push(new Token(src.shift(), TokenType.OpenBracket, line, column))
				break
			}
			case ']': {
				tokens.push(new Token(src.shift(), TokenType.CloseBracket, line, column))
				break
			}
			case '>': {
				tokens.push(new Token(src.shift(), TokenType.Gt, line, column))
				break
			}
			case '<': {
				tokens.push(new Token(src.shift(), TokenType.Lt, line, column))
				break
			}
			case '+': {
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, column))
				break
			}
			case '-': {
				if (src[1] === ">") {
					src.shift()
					src.shift()
					tokens.push(new Token("->", TokenType.Arrow, line, column))
					break
				}
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, column))
				break
			}
			case '*': {
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, column))
				break
			}
			case '/': {
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, column))
				break
			}
			case '=': {
				if (src[1] === "=") {
					src.shift()
					src.shift()
					tokens.push(new Token("==", TokenType.DoubleEq, line, column))
				} else {
					tokens.push(new Token(src.shift(), TokenType.Eq, line, column))
				}
				break
			}
			case ';': {
				tokens.push(new Token(src.shift(), TokenType.Semicolon, line, column))
				break
			}
			case ':': {
				tokens.push(new Token(src.shift(), TokenType.Colon, line, column))
				break
			}
			case ',': {
				tokens.push(new Token(src.shift(), TokenType.Comma, line, column))
				break
			}
			case '.': {
				tokens.push(new Token(src.shift(), TokenType.Dot, line, column))
				break
			}
			case '"': {
				let str = ""
				src.shift()
		
				while (src.length > 0 && src[0] !== '"') {
				  if (src[0] === "\n") {
					console.error(`SyntaxError: Strings must not span newlines, at line ${line}:${column}`)
					Deno.exit(1)
				  }
				  str += src.shift()
				}
		
				if (src.length === 0) {
				  console.error(`SyntaxError: Unterminated string literal at line ${line}:${column}`)
				  Deno.exit(1)
				}
		
				src.shift()
		
				tokens.push(new Token(str, TokenType.String, line, column))
				break
			}
			default: {
				// Handle multichar token

				if (isNumber(src[0])) {
					let num = ""

					while(src.length > 0 && isNumber(src[0])) {
						num += src.shift()
					}

					tokens.push(new Token(num, TokenType.Number, line, column))
				} else if(isIdentifier(src[0])) {
					let identifier = ""

					while(src.length > 0 && isIdentifier(src[0])) {
						identifier += src.shift()
					}


					const reserved = RESERVED[identifier]
					if (reserved == undefined) {
						tokens.push(new Token(identifier, TokenType.Identifier, line, column))
					} else {
						tokens.push(new Token(identifier, reserved, line, column))
					}
				} else if(isWhitespace(src[0])) {
					if (src[0] == "\n") {
						line++
						column = 0
					}
					src.shift()
				} else {
					console.error(`UnrecognizedError: ${src[0]} could not be lexed`)
					Deno.exit(1)
				}
				break
			}
		}
	}

	tokens.push(new Token("EndOfFile", TokenType.EOF, line, column))
	return tokens
}