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
import { MK_NIRV, NirvVal } from "../runtime/value.ts";
import { Comment } from "../ast_types/Comment.ts";
import { IfStatement } from "../ast_types/IfStatement.ts";
import { Comparator } from '../ast_types/Comparator.ts';
import { Thrower } from "../ast_types/Thrower.ts";
import { WhileLoop } from "../ast_types/WhileLoop.ts";
import { Decorator } from "../ast_types/Decorator.ts";

function get_error_scope(
  leftExtension = 15,
  rightExtension = 15,
  src: string,
  line: number,
  lineindex: number,
) {
  const lines = src.split("\n");
  const targetLine = lines[line - 1];
  const leftIndex = Math.max(lineindex - leftExtension, 0);
  const rightIndex = Math.min(
    lineindex + rightExtension,
    targetLine.length - 1,
  );

  let result = targetLine.substring(leftIndex, lineindex) + "\u200B" +
    targetLine.substring(lineindex, rightIndex + 1);
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

  get not_eof(): boolean {
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
	const err_scope = get_error_scope(15, 15, this.src, token.ln, token.lnidx);
	let prefixed = "        ";
	prefixed += "^ Parser Error on this line";
	console.error(
		`Parser Error:
${msg}
	${err_scope}
${prefixed}

ParseError@${token.ln}:${token.lnidx} - ${token.type} tkn
		`
	)
	Deno.exit(1)
  }

  private expect(type: TokenType, err: any) {
    const prev = this.tokens.shift() as Token;
    if (!prev || prev.type != type) {
      this.err(`"${err}" \n\nReceived token_type "${prev.type}", but was expecting token_type "${type}"`, prev)
    }

    return prev;
  }

  public produceAST(source: string): Program {
    this.tokens = tokenize(source);
    const program = new Program([]);

    while (this.not_eof) {
      program.body.push(this.parse_stmt());
    }

    return program;
  }

  private parse_stmt(): Stmt {
    // skip to parse_expr
    switch (this.at.type) {
		case TokenType.Reserve:
		case TokenType.ReserveLocked:
			return this.parse_var_declaration();
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

  private parse_fn_declaration(): Stmt {
	const decorators: Decorator[] = []
	while (this.at.type === TokenType.Memoize) {
		if (decorators.find((decorator)=>{
			return decorator.type === this.at.type
		}))
			throw `Multiple decorators of the same type found in parsing: ${this.at.type}`
		decorators.push(new Decorator(this.eat().type)) // push all decorators into the decorator array
	}
    this.eat(); // eat `fn` token
    const name =
      this.expect(TokenType.Identifier, "Expected function name").value;

    const args = this.parse_args();
    const params: string[] = [];
    for (const arg of args) {
      if (arg.kind !== "Identifier") {
        throw `Expected identifier parameter, got ${arg.kind}`;
      }
      params.push((arg as Identifier).symbol);
    }

    this.expect(TokenType.OpenBrace, "Expected body");

    const body: Stmt[] = [];

    while (this.not_eof && this.at.type !== TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }

    this.expect(TokenType.CloseBrace, "Closing brace expected inside function");
    const desc = this.expect(
      TokenType.String,
      "Token string description expected at end",
    );

    const fn = new FunctionDeclaration(params, name, body, desc.value, decorators);

    return fn;
  }

  // RESERVE IDENT;
  // (RESERVE | LOCKEDRESERVE) IDENT = EXPR;
  private parse_var_declaration(): Stmt {
    const isLocked = this.eat().type == TokenType.ReserveLocked;
    const identifier =
      this.expect(
        TokenType.Identifier,
        "Expected identifier name following reserve | lockedreserve keywords.",
      ).value;

    if (this.at.type == TokenType.Semicolon) {
      this.eat();
      if (isLocked) {
        throw `Non-assigned lockedreserve not allowed for "${identifier}"`;
      }
      return new VarDeclaration(isLocked, identifier, undefined);
    }

    this.expect(
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
	this.expect(TokenType.OpenBrace, "Expected body");

    const body: Stmt[] = [];

    while (this.not_eof && this.at.type !== TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }

    this.expect(TokenType.CloseBrace, "Closing brace expected following if statement body.");

	return new IfStatement(comparator, body)
  }

  private parse_while_loop(): Expr {
	this.eat() // eat "while" token
	const comparator = this.parse_comparator_expr()
	this.expect(TokenType.OpenBrace, "Expected body");

    const body: Stmt[] = [];

    while (this.not_eof && this.at.type !== TokenType.CloseBrace) {
      body.push(this.parse_stmt());
    }

    this.expect(TokenType.CloseBrace, "Closing brace expected following while statement body.");

	return new WhileLoop(comparator, body)
  }

  private parse_expr(): Expr {
    return this.parse_assignment_expr();
  }

  private parse_throw(): Expr {
	if (this.at.type == TokenType.Throw) {
		this.eat()
		const reason = this.expect(TokenType.String, "Expecting string for throw expression")
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
	if (this.peek(1).type !== TokenType.Gt && this.peek(1).type !== TokenType.Lt && this.peek(1).type !== TokenType.DoubleEq)
		return this.parse_object_expr()

	let lhs = this.parse_object_expr()
	const operator = this.eat()
	const rhs = this.parse_object_expr()
	
	return new Comparator(lhs, rhs, operator)
  }

  private parse_object_expr(): Expr {
    if (this.at.type !== TokenType.OpenBrace) {
      return this.parse_additive_expr();
    }

    this.eat();
    const properties = new Array<Property>();

    while (this.not_eof && (this.at.type as unknown) != TokenType.CloseBrace) {
      const key =
        this.expect(TokenType.Identifier, "Object literal key expected").value;

      if ((this.at.type as unknown) == TokenType.Comma) {
        this.eat();
        properties.push(new Property(key));
        continue;
      } else if ((this.at.type as unknown) == TokenType.CloseBrace) {
        properties.push(new Property(key));
        continue;
      }

      this.expect(TokenType.Colon, "Missing Colon following ident");
      const value = this.parse_expr();

      properties.push(new Property(key, value));
      if ((this.at.type as unknown) != TokenType.CloseBrace) {
        this.expect(TokenType.Comma, "Expected comma or closebrace");
      }
    }

    this.expect(TokenType.CloseBrace, "Object literal missing closing brace");
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
    this.expect(TokenType.OpenParen, "Expected open parenthesis");
    const args = this.at.type == TokenType.CloseParen
      ? []
      : this.parse_arguments_list();

    this.expect(
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
          throw `Right-Hand of '${operator.value}' must be an Identifier, found '${property.kind}'`;
        }
      } else {
        computed = true;
        property = this.parse_expr();
        this.expect(
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
			let comment = this.expect(TokenType.String, `Expected String following comment declaration, got ${this.at.type}`)
			return new Comment(comment.value)
		}
		return new Comment("e")
	  }

      case TokenType.OpenParen: {
        this.eat();
        const value = this.parse_expr();
        this.expect(TokenType.CloseParen, "Expected closing parenthesis.");
        return value;
      }

      default: {
        console.error("Unexpected token found during parsing: ", this.at);
        Deno.exit(1);
      }
    }
  }
}
