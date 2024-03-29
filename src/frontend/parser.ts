// deno-lint-ignore-file no-explicit-any
import { Token, tokenize, TokenType } from "./lexer.ts";
import {
  BinaryExpr,
  Expr,
  FunctionDeclaration,
  Identifier,
  NumericLiteral,
  Program,
  Stmt,
} from "../ast_types/types.ts";
import { VarDeclaration } from "../ast_types/VariableDeclaration.ts";
import { AssignmentExpr } from "../ast_types/AssignmentExpr.ts";
import { Property } from "../ast_types/Property.ts";
import { ObjectLiteral } from "../ast_types/ObjectLiteral.ts";
import { CallExpr } from "../ast_types/CallExpr.ts";
import { MemberExpr } from "../ast_types/MemberExpr.ts";
import { StringLiteral } from "../ast_types/StringLiteral.ts";
import { Comment } from "../ast_types/Comment.ts";
import { IfStatement } from "../ast_types/IfStatement.ts";
import { Comparator } from '../ast_types/Comparator.ts';
import { Thrower } from "../ast_types/Thrower.ts";
import { WhileLoop } from "../ast_types/WhileLoop.ts";
import { Decorator } from "../ast_types/Decorator.ts";
import { ListLiteral } from '../ast_types/ListLiteral.ts';
import { Class } from "../ast_types/Class.ts";
import { New } from "../ast_types/New.ts";
import { TryCatch } from "../ast_types/TryCatch.ts";
import { Thread } from "../ast_types/Thread.ts";

function getErrorScope(
  leftExtension = 15,
  rightExtension = 15,
  src: string,
  line: number,
  column: number,
) {
  const lines = src.split("\n");
  const targetLine = lines[line - 1];
  const leftIndex = Math.max(column - leftExtension, 0);
  const rightIndex = Math.min(
    column + rightExtension,
    targetLine.length - 1,
  );

  let result = targetLine.substring(leftIndex, column) + "\u200B" +
    targetLine.substring(column, rightIndex + 1);
  if (leftIndex > 0) {
    result = "..." + result;
  }
  if (rightIndex < targetLine.length - 1) {
    result += "...";
  }
  return result;
}

export default class Parser {
  private tokens: Token[] = [];
  src: string;

  constructor(src: string) {
    this.src = src;
  }

  private peek(offset: number): Token {
    return this.tokens[offset];
  }

  get notEof(): boolean {
    return this.tokens[0].type !== TokenType.EOF;
  }

  get at(): Token {
    return this.tokens[0];
  }

  private eat(): Token {
    const prev = this.tokens.shift() as Token;
    return prev;
  }

  private err(msg: string, token: Token) {
	const err_scope = getErrorScope(15, 15, this.src, token.line, token.column);
	let prefixed = "        ";
  let squiggles = ""
  for (let i = 0; i < token.value.length; i++) {
    squiggles += "‾"
  }
  squiggles = squiggles.substring(0, 20)
	prefixed += `${(" ").repeat(token.column-1)}${squiggles}| Parser Error here`;
	console.error(
		`Parser Error:
${msg}
	${err_scope}
${prefixed}

ParseError@${token.line}:${token.column} - ${token.type} tkn
		`
	)
	Deno.exit(1)
  }

  private expectToken(type: TokenType, err: any) {
    const prev = this.tokens.shift() as Token;
    if (!prev || prev.type != type) {
      this.err(`"${err}" \n\nReceived token_type "${prev.type}", but was expecting token_type "${type}"`, prev)
    }

    return prev;
  }

  public produceAST(source: string): Program {
    this.tokens = tokenize(source);
    const program = new Program([]);

    while (this.notEof) {
      program.body.push(this.parse_stmt());
    }

    return program;
  }

  private parse_stmt(): Stmt {
    // skip to parse_expr
    switch (this.at.type) {
		case TokenType.New:
			return this.parse_new_stmt();
		case TokenType.Class:
			return this.parse_class_declaration();
		case TokenType.Reserve:
		case TokenType.ReserveLocked:
			return this.parse_var_declaration();
		case TokenType.Exclaim:
			return this.parse_try_catch();
		case TokenType.Memoize:
		case TokenType.Fn:
			return this.parse_fn_declaration();
		case TokenType.If:
			return this.parse_if_statement();
		case TokenType.While:
			return this.parse_while_loop();

      default:
        return this.parse_expr();
    }
  }

  private parse_new_stmt(): Expr {
	this.eat()
	const target = this.expectToken(TokenType.Identifier, "Expected identifier after 'new' keyword")
	const args = this.parse_args()
	return new New(target, args)
  }

  private parse_class_declaration(): Expr {
	this.eat()
	const className = this.expectToken(TokenType.Identifier, "Class names must be identifiers only.")
	this.expectToken(TokenType.OpenBrace, "Missing opening brace in class declaration")

	// Keep track of the class's methods
	const classMethods:  Stmt[] = []

    while (this.notEof && this.at.type !== TokenType.CloseBrace) {
      const innerStatement = this.parse_stmt()
	  if (innerStatement.kind !== "FunctionDeclaration") {
		this.err("Only function declarations are allowed in the beginning scope of a class", this.at)
	  }
	  
	  classMethods.push(innerStatement)
    }

	this.expectToken(TokenType.CloseBrace, "Missing closing brace in class declaration")

	const newClass = new Class(className.value, classMethods)
	return newClass
  }

  private parse_try_catch(): Stmt {
    this.eat() // eat `!` token
    const flowType = this.expectToken(TokenType.Identifier, "Expected identifier for program flow after `!`.")

    // parse try block
    this.expectToken(TokenType.OpenBrace, "Expected open brace following program flow block")
    const body: Stmt[] = []
    while (this.at.type !== TokenType.CloseBrace) {
      const bodyAdditive = this.parse_stmt()
      body.push(bodyAdditive)
    }
    this.eat() // eat closing brace

    switch(flowType.value.toLowerCase()) {
      case 'fuckaround': {
        // parse catch block
        this.expectToken(TokenType.Ampersand, "Expected ampersand")
        this.expectToken(TokenType.Identifier, "Expected `findout`")

        const args = this.parse_args()
          const params: string[] = [];
          for (const arg of args) {
            if (arg.kind !== "Identifier") {
          this.err(`expectTokened identifier parameter, got ${arg.kind}`, this.at)
            }
            params.push((arg as Identifier).symbol);
          }

        this.expectToken(TokenType.OpenBrace, "Expected open brace following catch block")
        const errorBody: Stmt[] = []
        while (this.at.type !== TokenType.CloseBrace) {
          const errorBodyAdditive = this.parse_stmt()
          errorBody.push(errorBodyAdditive)
        }
        this.eat() // eat closing brace
        const trycatch = new TryCatch(body, errorBody, params)
        
        return trycatch
      }
      case "async": {
        return new Thread(body)
      }
      default: {
        this.err(`This flow switch has not been implemented.`, flowType)
      }
    }
  }

  private parse_fn_declaration(): Stmt {
	const decorators: Decorator[] = []
	while (this.at.type === TokenType.Memoize) {
		if (decorators.find((decorator)=>{
			return decorator.type === this.at.type
		}))
		this.err(`Multiple decorators of the same type found: ${this.at.value}`, this.at)
		decorators.push(new Decorator(this.eat().type)) // push all decorators into the decorator array
	}
    this.eat(); // eat `fn` token
    const name =
      this.expectToken(TokenType.Identifier, "Expected function name").value;

    const args = this.parse_args();
    const params: string[] = [];
    for (const arg of args) {
      if (arg.kind !== "Identifier") {
		this.err(`expectTokened identifier parameter, got ${arg.kind}`, this.at)
      }
      params.push((arg as Identifier).symbol);
    }

    this.expectToken(TokenType.OpenBrace, "Expected body");

    const body: Stmt[] = [];

    while (this.notEof && this.at.type !== TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }

    this.expectToken(TokenType.CloseBrace, "Closing brace Expected inside function");
    const desc = this.expectToken(
      TokenType.String,
      "Token string description Expected at end",
    );

    const fn = new FunctionDeclaration(params, name, body, desc.value, decorators);

    return fn;
  }

  // RESERVE IDENT;
  // (RESERVE | LOCKEDRESERVE) IDENT = EXPR;
  private parse_var_declaration(): Stmt {
    const isLocked = this.eat().type == TokenType.ReserveLocked;
    const identifier =
      this.expectToken(
        TokenType.Identifier,
        "Expected identifier name following reserve | lockedreserve keywords.",
      ).value;

    if (this.at.type == TokenType.Semicolon) {
      this.eat();
      if (isLocked) {
		this.err(`"${identifier}" is locked for reassignment.`, this.at)
      }
      return new VarDeclaration(isLocked, identifier, undefined);
    }

    this.expectToken(
      TokenType.Eq,
      "Expected equals token following identifier in variable declaration.",
    );
    const declaration = new VarDeclaration(
      isLocked,
      identifier,
      this.parse_expr(),
    );
    return declaration;
  }

  // if (expr) {block}
  private parse_if_statement(): Expr {
	this.eat() // eat "if" token
	const comparator = this.parse_comparator_expr()
	this.expectToken(TokenType.OpenBrace, "Expected body");

    const body: Stmt[] = [];

    while (this.notEof && this.at.type !== TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }

    this.expectToken(TokenType.CloseBrace, "Closing brace expected following if statement body.");

	return new IfStatement(comparator, body)
  }

  private parse_while_loop(): Expr {
	this.eat() // eat "while" token
	const comparator = this.parse_comparator_expr()
	this.expectToken(TokenType.OpenBrace, "Expected body");

    const body: Stmt[] = [];

    while (this.notEof && this.at.type !== TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }

    this.expectToken(TokenType.CloseBrace, "Closing brace expected following while statement body.");

	return new WhileLoop(comparator, body)
  }

  private parse_expr(): Expr {
    return this.parse_assignment_expr();
  }

  private parse_throw(): Expr {
	if (this.at.type == TokenType.Throw) {
		this.eat()
		const reason = this.expectToken(TokenType.String, "Expected string for throw expression")
		return new Thrower(reason.value)
	}
	return this.parse_assignment_expr()
  }

  private parse_assignment_expr(): Expr {
    const left = this.parse_comparator_expr();
    if (this.at.type == TokenType.Eq) {
      this.eat();
      const value = this.parse_assignment_expr();
      return new AssignmentExpr(left, value);
    }

    return left;
  }

  private parse_comparator_expr(): Expr {
	if (this.peek(1) === undefined) {
		this.err(`Parser peeked expected a token, but found undefined.`, this.at)
	}
	if (this.peek(1).type !== TokenType.Gt && this.peek(1).type !== TokenType.Lt && this.peek(1).type !== TokenType.DoubleEq)
		return this.parse_list_expr()

	let lhs = this.parse_list_expr()
	const operator = this.eat()
	const rhs = this.parse_list_expr()
	
	return new Comparator(lhs, rhs, operator)
  }

  private parse_list_expr(): Expr {
	if (this.at.type !== TokenType.OpenBracket) {
		return this.parse_object_expr()
	}

	this.eat()
	const properties = []

	while (this.notEof && (this.at.type as unknown) != TokenType.CloseBracket) {
		const value = this.parse_expr()
		if ((this.at.type as unknown) == TokenType.Comma) {
			this.eat();
			properties.push(value);
			continue;
		} else if ((this.at.type as unknown) == TokenType.CloseBracket) {
			properties.push(value);
			continue;
		}
	}
	this.eat()

	return new ListLiteral(properties)
  }

  private parse_object_expr(): Expr {
    if (this.at.type !== TokenType.OpenBrace) {
      return this.parse_additive_expr();
    }

    this.eat();
    const properties = new Array<Property>();

    while (this.notEof && (this.at.type as unknown) != TokenType.CloseBrace) {
      const key =
        this.expectToken(TokenType.Identifier, "Object literal key expected").value;

      if ((this.at.type as unknown) == TokenType.Comma) {
        this.eat();
        properties.push(new Property(key));
        continue;
      } else if ((this.at.type as unknown) == TokenType.CloseBrace) {
        properties.push(new Property(key));
        continue;
      }

      this.expectToken(TokenType.Colon, "Missing Colon following ident");
      const value = this.parse_expr();

      properties.push(new Property(key, value));
      if ((this.at.type as unknown) != TokenType.CloseBrace) {
        this.expectToken(TokenType.Comma, "Expected comma or closebrace");
      }
    }

    this.expectToken(TokenType.CloseBrace, "Object literal missing closing brace");
    return new ObjectLiteral(properties);
  }

  private parse_additive_expr(): Expr {
    let left = this.parse_multiplicative_expr();

    while (this.at.value == "+" || this.at.value == "-") {
      const operator = this.eat().value;
      const right = this.parse_multiplicative_expr();
      left = new BinaryExpr(left, right, operator);
    }

    return left;
  }

  private parse_multiplicative_expr(): Expr {
    let left = this.parse_call_member_expr();

    while (this.at.value == "/" || this.at.value == "*") {
      const operator = this.eat().value;
      const right = this.parse_call_member_expr();
      left = new BinaryExpr(left, right, operator);
    }

    return left;
  }

  private parse_call_member_expr(): Expr {
    const member = this.parse_member_expr();

    if (this.at.type == TokenType.OpenParen) {
      return this.parse_call_expr(member);
    }

    return member;
  }

  private parse_call_expr(caller: Expr): Expr {
    let call_expr: Expr = new CallExpr(this.parse_args(), caller);

    if (this.at.type == TokenType.OpenParen) {
      call_expr = this.parse_call_expr(call_expr);
    }

    return call_expr;
  }

  private parse_args(): Expr[] {
    this.expectToken(TokenType.OpenParen, "Expected open parenthesis");
    const args = this.at.type == TokenType.CloseParen
      ? []
      : this.parse_arguments_list();

    this.expectToken(
      TokenType.CloseParen,
      "Missing closing parenthesis inside arguments list",
    );
    return args;
  }

  private parse_arguments_list(): Expr[] {
    const args = [this.parse_assignment_expr()];
    while (this.at.type == TokenType.Comma && this.eat()) {
      args.push(this.parse_assignment_expr());
    }

    return args;
  }

  private parse_member_expr(): Expr {
    let object = this.parse_primary_expr();

    while (
      this.at.type == TokenType.Dot || this.at.type == TokenType.OpenBracket
    ) {
      const operator = this.eat();
      let property: Expr;
      let computed: boolean;

      // Non-computed values aka dot.expr
      if (operator.type == TokenType.Dot) {
        computed = false;
        property = this.parse_primary_expr();

        if (property.kind != "Identifier") {
		  this.err(`Right-Hand of '${operator.value}' must be an Identifier, found '${property.kind}'`, this.at)
        }
      } else {
        computed = true;
        property = this.parse_expr();
        this.expectToken(
          TokenType.CloseBracket,
          "Missing closing bracket in computed value.",
        );
      }

      object = new MemberExpr(object, property, computed);
    }
    return object;
  }

  private parse_primary_expr(): Expr {
    const tk = this.at.type;

    switch (tk) {
	  case TokenType.New: {
		return this.parse_new_stmt()
	  }

	  case TokenType.Throw: {
		return this.parse_throw()
	  }

      case TokenType.Identifier: {
        return new Identifier(this.eat().value);
      }

      case TokenType.Number: {
        return new NumericLiteral(parseInt(this.eat().value));
      }

      case TokenType.String: {
        return new StringLiteral(this.eat().value);
      }

	  // deno-lint-ignore no-fallthrough
	  case TokenType.Slash: {
		if (this.peek(1).type == TokenType.Slash) {
			this.eat()
			this.eat()
			let comment = this.expectToken(TokenType.String, `Expected String following comment declaration, got ${this.at.type}`)
			return new Comment(comment.value)
		}
		return new Comment("e")
	  }

      case TokenType.OpenParen: {
        this.eat();
        const value = this.parse_expr();
        this.expectToken(TokenType.CloseParen, "Expected closing parenthesis.");
        return value;
      }

      default: {
        console.error("Unexpected token found during parsing: ", this.at);
        Deno.exit(1);
      }
    }
  }
}
