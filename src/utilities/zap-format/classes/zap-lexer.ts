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

const BYTE_LOWER_A = 97;
const BYTE_LOWER_Z = 122;
const BYTE_UPPER_A = 65;
const BYTE_UPPER_Z = 90;
const BYTE_UNDERSCORE = 95;
const BYTE_0 = 48;
const BYTE_9 = 57;

function isAlphabetByte(byte: number): boolean {
	return (
		(byte >= BYTE_LOWER_A && byte <= BYTE_LOWER_Z) ||
		(byte >= BYTE_UPPER_A && byte <= BYTE_UPPER_Z) ||
		byte === BYTE_UNDERSCORE
	);
}

function isNumericByte(byte: number): boolean {
	return byte >= BYTE_0 && byte <= BYTE_9;
}

function isAlphanumericByte(byte: number): boolean {
	return isAlphabetByte(byte) || isNumericByte(byte);
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
		if (this.position + expected.length > this.input.length) return false;

		if (this.input.slice(this.position, this.position + expected.length) === expected) {
			// biome-ignore lint/style/useForOf: SHUT UP!
			for (let index = 0; index < expected.length; index += 1) this.advance();
			return true;
		}

		return false;
	}

	private nextToken(): Token | undefined {
		this.skipWhitespace();
		if (this.position >= this.input.length) return undefined;

		const startLine = this.line;
		const startColumn = this.column;

		if (this.match("--")) return this.readComment(startLine, startColumn);
		if (this.match("..")) return { column: startColumn, line: startLine, type: TokenType.DOT_DOT, value: ".." };

		const byte = this.peekByte();
		if (byte === 0) return undefined;

		switch (byte) {
			case 10: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.NEWLINE,
					value: "\n",
				};
			}

			case 40: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LEFT_PAREN,
					value: "(",
				};
			}

			case 41: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.RIGHT_PAREN,
					value: ")",
				};
			}

			case 44: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.COMMA,
					value: ",",
				};
			}

			case 58: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.COLON,
					value: ":",
				};
			}

			case 60: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LESS_THAN,
					value: "<",
				};
			}

			case 61: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.EQUALS,
					value: "=",
				};
			}

			case 62: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.GREATER_THAN,
					value: ">",
				};
			}

			case 63: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.QUESTION,
					value: "?",
				};
			}

			case 91: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LEFT_BRACKET,
					value: "[",
				};
			}

			case 93: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.RIGHT_BRACKET,
					value: "]",
				};
			}

			case 123: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.LEFT_BRACE,
					value: "{",
				};
			}

			case 124: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.PIPE,
					value: "|",
				};
			}

			case 125: {
				this.advance();
				return {
					column: startColumn,
					line: startLine,
					type: TokenType.RIGHT_BRACE,
					value: "}",
				};
			}
		}

		if (byte === 34) return this.readStringLiteral(startLine, startColumn);
		if (isNumericByte(byte)) return this.readNumber(startLine, startColumn);
		if (isAlphabetByte(byte)) return this.readIdentifier(startLine, startColumn);

		throw new Error(`Unexpected character '${this.peek()}' at line ${this.line}, column ${this.column}`);
	}

	private peek(): string {
		if (this.position >= this.input.length) return "\0";
		return this.input[this.position]!;
	}

	private peekByte(): number {
		if (this.position >= this.input.length) return 0;
		return this.input.charCodeAt(this.position);
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

		while (this.position < this.input.length && isAlphanumericByte(this.peekByte())) {
			value += this.peek();
			this.advance();
		}

		if (this.peek() === ".") {
			value += this.peek();
			this.advance();

			while (this.position < this.input.length && isAlphanumericByte(this.peekByte())) {
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
			const byte = this.peekByte();

			if (isNumericByte(byte)) {
				value += this.peek();
				this.advance();
			} else if (byte === 46 && !hasDecimalPoint) {
				if (this.position + 1 < this.input.length && this.input[this.position + 1] === ".") break;

				hasDecimalPoint = true;
				value += this.peek();
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
			const byte = this.peekByte();
			if (byte === 32 || byte === 9 || byte === 13) this.advance();
			else break;
		}
	}
}
