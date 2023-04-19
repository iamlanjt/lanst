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
	
	BinaryOp = "BinaryOp",

	Reserve = "Reserve",
	ReserveLocked = "ReserveLocked",

	EOF = "EOF",
}

export const RESERVED: Record<string, TokenType> = {
	"res": TokenType.Reserve,
	"reslock": TokenType.ReserveLocked,
	"fn": TokenType.Fn,
	"if": TokenType.If
}

export interface Token {
	value: string,
	type: TokenType,
}

export class Token {
	value: string
	type: TokenType
	ln: number
	lnidx: number

	constructor(value: string = "", type: TokenType, ln: number, lnidx: number) {
		this.value = value
		this.type = type
		this.ln = ln
		this.lnidx = lnidx
	}
}

function is_ident_matching(str: string): boolean {
	return /^[a-zA-Z_]+$/.test(str);
}

function isskippable(str: string) {
	return str == ' ' || str == '\n' || str == '\t' || str == '\r'
}

function isint(str: string): boolean {
	const c = str.charCodeAt(0)
	const bounds = ['0'.charCodeAt(0), '9'.charCodeAt(0)]

	return (c >= bounds[0] && c <= bounds[1])
}

export function tokenize(source: string): Token[] {
	const tokens = new Array<Token>
	const src = source.split("")
	let line = 1
	let line_idx = 1

	while (src.length > 0) {
		line_idx++
		switch (src[0].toString()) {
			case '?': {
				tokens.push(new Token(src.shift(), TokenType.Slash, line, line_idx))
				break
			}
			case '(': {
				tokens.push(new Token(src.shift(), TokenType.OpenParen, line, line_idx))
				break
			}
			case ')': {
				tokens.push(new Token(src.shift(), TokenType.CloseParen, line, line_idx))
				break
			}
			case '{': {
				tokens.push(new Token(src.shift(), TokenType.OpenBrace, line, line_idx))
				break
			}
			case '}': {
				tokens.push(new Token(src.shift(), TokenType.CloseBrace, line, line_idx))
				break
			}
			case '[': {
				tokens.push(new Token(src.shift(), TokenType.OpenBracket, line, line_idx))
				break
			}
			case ']': {
				tokens.push(new Token(src.shift(), TokenType.CloseBracket, line, line_idx))
				break
			}
			case '>': {
				tokens.push(new Token(src.shift(), TokenType.Gt, line, line_idx))
				break
			}
			case '<': {
				tokens.push(new Token(src.shift(), TokenType.Lt, line, line_idx))
				break
			}
			case '+': {
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, line_idx))
				break
			}
			case '-': {
				if (src[1] === ">") {
					src.shift()
					src.shift()
					tokens.push(new Token("->", TokenType.Arrow, line, line_idx))
					break
				}
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, line_idx))
				break
			}
			case '*': {
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, line_idx))
				break
			}
			case '/': {
				tokens.push(new Token(src.shift(), TokenType.BinaryOp, line, line_idx))
				break
			}
			case '=': {
				tokens.push(new Token(src.shift(), TokenType.Eq, line, line_idx))
				break
			}
			case ';': {
				tokens.push(new Token(src.shift(), TokenType.Semicolon, line, line_idx))
				break
			}
			case ':': {
				tokens.push(new Token(src.shift(), TokenType.Colon, line, line_idx))
				break
			}
			case ',': {
				tokens.push(new Token(src.shift(), TokenType.Comma, line, line_idx))
				break
			}
			case '.': {
				tokens.push(new Token(src.shift(), TokenType.Dot, line, line_idx))
				break
			}
			case '"': {
				let str = ""
				src.shift()
		
				while (src.length > 0 && src[0] !== '"') {
				  if (src[0] === "\n") {
					console.error(`SyntaxError: Strings must not span newlines, at line ${line}:${line_idx}`)
					Deno.exit(1)
				  }
				  str += src.shift()
				}
		
				if (src.length === 0) {
				  console.error(`SyntaxError: Unterminated string literal at line ${line}:${line_idx}`)
				  Deno.exit(1)
				}
		
				src.shift()
		
				tokens.push(new Token(str, TokenType.String, line, line_idx))
				break
			}
			default: {
				// Handle multichar token

				if (isint(src[0])) {
					let num = ""

					while(src.length > 0 && isint(src[0])) {
						num += src.shift()
					}

					tokens.push(new Token(num, TokenType.Number, line, line_idx))
				} else if(is_ident_matching(src[0])) {
					let identifier = ""

					while(src.length > 0 && is_ident_matching(src[0])) {
						identifier += src.shift()
					}


					const reserved = RESERVED[identifier]
					if (reserved == undefined) {
						tokens.push(new Token(identifier, TokenType.Identifier, line, line_idx))
					} else {
						tokens.push(new Token(identifier, reserved, line, line_idx))
					}
				} else if(isskippable(src[0])) {
					if (src[0] == "\n") {
						line++
						line_idx = 0
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

	tokens.push(new Token("EndOfFile", TokenType.EOF, line, line_idx))
	return tokens
}