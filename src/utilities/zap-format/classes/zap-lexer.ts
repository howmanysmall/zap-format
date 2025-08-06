/* eslint-disable ts/prefer-for-of -- man shut up */
import TokenType from "../meta/token-type";
import type { Token } from "../types";

const keywords = new Map<string, TokenType>([
	["AlignedCFrame", TokenType.ALIGNED_CFRAME],
	["args", TokenType.ARGS],
	["Async", TokenType.IDENTIFIER],
	["boolean", TokenType.BOOLEAN],
	["BrickColor", TokenType.BRICK_COLOR],
	["call", TokenType.CALL],
	["camelCase", TokenType.IDENTIFIER],
	["CFrame", TokenType.CFRAME],
	["Client", TokenType.IDENTIFIER],
	["Color3", TokenType.COLOR3],
	["ConstEnum", TokenType.IDENTIFIER],
	["data", TokenType.DATA],
	["DateTime", TokenType.DATETIME],
	["DateTimeMillis", TokenType.DATETIME_MILLIS],
	["enum", TokenType.ENUM],
	["event", TokenType.EVENT],
	["f32", TokenType.F32],
	["f64", TokenType.F64],
	["false", TokenType.BOOLEAN_LITERAL],
	["from", TokenType.FROM],
	["funct", TokenType.FUNCT],
	["future", TokenType.IDENTIFIER],
	["i8", TokenType.I8],
	["i16", TokenType.I16],
	["i32", TokenType.I32],
	["Instance", TokenType.INSTANCE],
	["ManyAsync", TokenType.IDENTIFIER],
	["ManySync", TokenType.IDENTIFIER],
	["map", TokenType.MAP],
	["namespace", TokenType.NAMESPACE],
	["opt", TokenType.OPT],
	["PascalCase", TokenType.IDENTIFIER],
	["Polling", TokenType.IDENTIFIER],
	["promise", TokenType.IDENTIFIER],
	["Reliable", TokenType.IDENTIFIER],
	["rets", TokenType.RETS],
	["Server", TokenType.IDENTIFIER],
	["set", TokenType.SET],
	["SingleAsync", TokenType.IDENTIFIER],
	["SingleSync", TokenType.IDENTIFIER],
	["snake_case", TokenType.IDENTIFIER],
	["string", TokenType.STRING],
	["StringConstEnum", TokenType.IDENTIFIER],
	["StringLiteral", TokenType.IDENTIFIER],
	["struct", TokenType.STRUCT],
	["Sync", TokenType.IDENTIFIER],
	["true", TokenType.BOOLEAN_LITERAL],
	["type", TokenType.TYPE],
	["u8", TokenType.U8],
	["u16", TokenType.U16],
	["u32", TokenType.U32],
	["unknown", TokenType.UNKNOWN],
	["Unreliable", TokenType.IDENTIFIER],
	["utf8", TokenType.IDENTIFIER],
	["Vector2", TokenType.VECTOR2],
	["Vector3", TokenType.VECTOR3],
	["vector", TokenType.VECTOR],
	["yield", TokenType.IDENTIFIER],
]);

function isAlpha(character: string): boolean {
	return (character >= "a" && character <= "z") || (character >= "A" && character <= "Z") || character === "_";
}
function isDigit(character: string): boolean {
	return character >= "0" && character <= "9";
}
function isAlphaNumeric(character: string): boolean {
	return isAlpha(character) || isDigit(character);
}

/**
 * Lexical analyzer for the Zap configuration language.
 *
 * @remarks
 * Converts a Zap configuration string into a sequence of tokens for parsing.
 * @see Token
 */
export default class ZapLexer {
	/**
	 * Tokenizes the input Zap configuration string into a sequence of tokens.
	 *
	 * @example
	 *
	 * ```typescript
	 * const tokens = new ZapLexer(input).tokenize();
	 * ```
	 *
	 * @returns An array of tokens representing the lexical structure of the
	 *   input.
	 */
	public tokenize(): ReadonlyArray<Token> {
		const tokens = new Array<Token>();
		let length = 0;
		while (this.position < this.input.length) {
			const token = this.nextToken();
			if (token) tokens[length++] = token;
		}

		tokens[length++] = {
			column: this.column,
			line: this.line,
			type: TokenType.EOF,
			value: "",
		};

		return tokens;
	}

	/**
	 * Creates an instance of the ZapLexer.
	 *
	 * @param input - The Zap configuration string to tokenize.
	 */
	public constructor(private readonly input: string) {}

	private column = 1;
	private line = 1;
	private position = 0;

	private advance(): void {
		if (this.position >= this.input.length) return;
		if (this.input[this.position] === "\n") {
			this.line += 1;
			this.column = 1;
		} else this.column += 1;

		this.position += 1;
	}

	private match(expected: string): boolean {
		for (let index = 0; index < expected.length; index += 1)
			if (this.position + index >= this.input.length || this.input[this.position + index] !== expected[index])
				return false;

		// biome-ignore lint/style/useForOf: wrong!
		for (let index = 0; index < expected.length; index += 1) this.advance();

		return true;
	}

	private nextToken(): Token | undefined {
		this.skipWhitespace();
		if (this.position >= this.input.length) return undefined;

		const startLine = this.line;
		const startColumn = this.column;

		if (this.match("--")) return this.readComment(startLine, startColumn);
		if (this.match("..")) return { column: startColumn, line: startLine, type: TokenType.DOT_DOT, value: ".." };

		const character = this.peek();
		if (!character) return undefined;

		switch (character) {
			case "\n": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.NEWLINE,
					value: "\n",
				};
			}

			case "(": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LEFT_PAREN,
					value: "(",
				};
			}

			case ")": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.RIGHT_PAREN,
					value: ")",
				};
			}

			case ",": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.COMMA,
					value: ",",
				};
			}

			case ":": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.COLON,
					value: ":",
				};
			}

			case "<": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LESS_THAN,
					value: "<",
				};
			}

			case "=": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.EQUALS,
					value: "=",
				};
			}

			case ">": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.GREATER_THAN,
					value: ">",
				};
			}

			case "?": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.QUESTION,
					value: "?",
				};
			}

			case "[": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LEFT_BRACKET,
					value: "[",
				};
			}

			case "]": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.RIGHT_BRACKET,
					value: "]",
				};
			}

			case "{": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LEFT_BRACE,
					value: "{",
				};
			}

			case "|": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.PIPE,
					value: "|",
				};
			}

			case "}": {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.RIGHT_BRACE,
					value: "}",
				};
			}
		}

		if (character === '"') return this.readStringLiteral(startLine, startColumn);
		if (isDigit(character)) return this.readNumber(startLine, startColumn);
		if (isAlpha(character)) return this.readIdentifier(startLine, startColumn);

		throw new Error(`Unexpected character '${character}' at line ${this.line}, column ${this.column}`);
	}

	private peek(): string | undefined {
		if (this.position >= this.input.length) return "\0";
		return this.input[this.position];
	}

	private readComment(startLine: number, startColumn: number): Token {
		let value = "";

		while (this.position < this.input.length && this.peek() !== "\n") {
			value += this.peek();
			this.advance();
		}

		return {
			column: startColumn,
			line: startLine,
			type: TokenType.COMMENT,
			value: `--${value}`,
		};
	}

	private readIdentifier(startLine: number, startColumn: number): Token {
		let value = "";

		while (this.position < this.input.length && (isAlphaNumeric(this.peek()!) || this.peek() === "_")) {
			value += this.peek();
			this.advance();
		}

		if (this.peek() === ".") {
			value += this.peek();
			this.advance();

			while (this.position < this.input.length && (isAlphaNumeric(this.peek()!) || this.peek() === "_")) {
				value += this.peek();
				this.advance();
			}
		}

		if (value.includes("."))
			return {
				column: startColumn,
				line: startLine,
				type: TokenType.IDENTIFIER,
				value,
			};

		const tokenType = keywords.get(value) ?? TokenType.IDENTIFIER;
		return {
			column: startColumn,
			line: startLine,
			type: tokenType,
			value,
		};
	}

	private readNumber(startLine: number, startColumn: number): Token {
		let value = "";
		let hasDecimalPoint = false;

		while (this.position < this.input.length) {
			const currentCharacter = this.peek()!;

			if (isDigit(currentCharacter)) {
				value += currentCharacter;
				this.advance();
			} else if (currentCharacter === "." && !hasDecimalPoint) {
				if (this.position + 1 < this.input.length && this.input[this.position + 1] === ".") break;

				hasDecimalPoint = true;
				value += currentCharacter;
				this.advance();
			} else break;
		}

		return {
			column: startColumn,
			line: startLine,
			type: TokenType.NUMBER_LITERAL,
			value,
		};
	}

	private readStringLiteral(startLine: number, startColumn: number): Token {
		let value = "";
		this.advance();

		while (this.position < this.input.length && this.peek() !== '"') {
			if (this.peek() === "\\") {
				this.advance();
				if (this.position < this.input.length) {
					const escaped = this.peek();
					switch (escaped) {
						case '"': {
							value += '"';
							break;
						}

						case "\\": {
							value += "\\";
							break;
						}

						case "n": {
							value += "\n";
							break;
						}

						case "r": {
							value += "\r";
							break;
						}

						case "t": {
							value += "\t";
							break;
						}

						default: {
							value += escaped;
							break;
						}
					}

					this.advance();
				}
			} else {
				value += this.peek();
				this.advance();
			}
		}

		if (this.position >= this.input.length)
			throw new Error(`Unterminated string literal at line ${startLine}, column ${startColumn}`);

		this.advance();

		return {
			column: startColumn,
			line: startLine,
			type: TokenType.STRING_LITERAL,
			value: `"${value}"`,
		};
	}

	private skipWhitespace(): void {
		while (this.position < this.input.length) {
			const character = this.peek();
			if (character === " " || character === "\t" || character === "\r") this.advance();
			else break;
		}
	}
}
