/* eslint-disable sonar/no-duplicate-string -- useless */

import TokenType from "../meta/token-type";
import TokenTypeMeta from "../meta/token-type-meta";
import type {
	ArrayTypeNode,
	CommentNode,
	EnumTypeNode,
	EventNode,
	EventProperties,
	FunctionNode,
	FunctionProperties,
	InstanceTypeNode,
	MapTypeNode,
	NamespaceNode,
	OptionalTypeNode,
	OptionNode,
	PrimitiveTypeNode,
	RangeConstraint,
	SetTypeNode,
	StructTypeNode,
	Token,
	TupleTypeNode,
	TypeDefinitionNode,
	TypeNode,
	UnionTypeNode,
	VectorTypeNode,
	Writable,
	ZapConfigurationNode,
} from "../types";

const STANDARD_TYPES = new Set([
	TokenType.ALIGNED_CFRAME,
	TokenType.BOOLEAN,
	TokenType.BRICK_COLOR,
	TokenType.CFRAME,
	TokenType.COLOR3,
	TokenType.DATETIME,
	TokenType.DATETIME_MILLIS,
	TokenType.F32,
	TokenType.F64,
	TokenType.I8,
	TokenType.I16,
	TokenType.I32,
	TokenType.STRING,
	TokenType.U8,
	TokenType.U16,
	TokenType.U32,
	TokenType.UNKNOWN,
	TokenType.VECTOR,
	TokenType.VECTOR2,
	TokenType.VECTOR3,
]);
const NUMBER_TYPES = new Set(["f32", "f64", "i8", "i16", "i32", "string", "u8", "u16", "u32"]);
const PROPERTY_TYPES = new Set([
	TokenType.ARGS,
	TokenType.CALL,
	TokenType.DATA,
	TokenType.FROM,
	TokenType.IDENTIFIER,
	TokenType.RETS,
	TokenType.TYPE,
]);
const IDENTIFIER_SET = new Set([TokenType.CALL, TokenType.DATA, TokenType.FROM, TokenType.TYPE]);

/**
 * Parses a sequence of Zap tokens into a Zap configuration AST.
 *
 * @remarks
 * This class implements a recursive descent parser for the Zap configuration
 * language, producing a strongly-typed AST.
 * @see ZapConfigurationNode
 */
export default class ZapParser {
	/**
	 * Parses the token stream into a Zap configuration AST.
	 *
	 * @example
	 *
	 * ```typescript
	 * const ast = new ZapParser(tokens).parse();
	 * ```
	 *
	 * @returns The root Zap configuration node representing the parsed AST.
	 */
	public parse(): ZapConfigurationNode {
		const options = new Array<OptionNode>();
		let optionsSize = 0;

		const items = new Array<CommentNode | EventNode | FunctionNode | NamespaceNode | TypeDefinitionNode>();
		let itemsSize = 0;

		while (!this.isAtEnd()) {
			this.skipNewlines();

			if (this.isAtEnd()) break;

			const tokenType = this.peek().type;

			switch (tokenType) {
				case TokenType.COMMENT: {
					items[itemsSize++] = this.parseComment();
					break;
				}

				case TokenType.EVENT: {
					items[itemsSize++] = this.parseEvent();
					break;
				}

				case TokenType.FUNCT: {
					items[itemsSize++] = this.parseFunction();
					break;
				}

				case TokenType.NAMESPACE: {
					items[itemsSize++] = this.parseNamespace();
					break;
				}

				case TokenType.OPT: {
					options[optionsSize++] = this.parseOption();
					break;
				}

				case TokenType.TYPE: {
					items[itemsSize++] = this.parseTypeDefinition();
					break;
				}

				default: {
					throw new Error(
						`Unexpected token '${this.getTokenTypeName(this.peek().type)}' at line ${this.peek().line}`,
					);
				}
			}

			this.skipNewlines();
		}

		return {
			items,
			options,
			type: "config",
		};
	}

	public constructor(tokens: ReadonlyArray<Token>) {
		this.tokens = tokens.filter((token) => token.type !== TokenType.WHITESPACE);
	}

	private current = 0;
	private readonly tokens: ReadonlyArray<Token>;

	private advance(): Token {
		if (!this.isAtEnd()) this.current += 1;
		return this.previous();
	}

	private check(type: TokenType): boolean {
		if (this.isAtEnd()) return false;
		return this.peek().type === type;
	}

	private consume(type: TokenType, message: string): Token {
		if (this.check(type)) return this.advance();
		throw new Error(`${message}. Got '${this.getTokenTypeName(this.peek().type)}' at line ${this.peek().line}`);
	}

	private consumeIdentifierValue(): string {
		const token = this.peek();
		if (token.type === TokenType.IDENTIFIER) return this.advance().value;
		if (IDENTIFIER_SET.has(token.type)) return this.advance().value;

		throw new Error(`Expected identifier value, got '${this.getTokenTypeName(token.type)}' at line ${token.line}`);
	}

	private consumeParameterName(): string {
		const token = this.peek();
		if (this.isValidParameterName()) return this.advance().value;
		throw new Error(`Expected parameter name, got '${this.getTokenTypeName(token.type)}' at line ${token.line}`);
	}

	private consumePropertyName(): string {
		const token = this.peek();
		if (PROPERTY_TYPES.has(token.type)) return this.advance().value;
		throw new Error(`Expected property name, got '${this.getTokenTypeName(token.type)}' at line ${token.line}`);
	}

	private getTokenTypeName(tokenType: TokenType): string {
		const { name } = TokenTypeMeta[tokenType];
		return name ?? `unknown token type (${tokenType})`;
	}

	private isAtEnd(): boolean {
		return this.peek().type === TokenType.EOF;
	}

	private isPrimitiveType(): boolean {
		const { type, value } = this.peek();

		if (STANDARD_TYPES.has(type)) return true;
		if (type === TokenType.IDENTIFIER && value.includes(".")) {
			const baseType = value.split(".")[0];
			return baseType ? NUMBER_TYPES.has(baseType) : false;
		}

		return false;
	}

	private isValidParameterName(): boolean {
		return PROPERTY_TYPES.has(this.peek().type);
	}

	private parseBaseType(): TypeNode {
		if (this.check(TokenType.LEFT_PAREN)) {
			this.advance();

			const elements = new Array<{ name?: string; type: TypeNode }>();
			let elementsSize = 0;

			if (!this.check(TokenType.RIGHT_PAREN))
				do {
					this.skipNewlines();
					if (this.check(TokenType.RIGHT_PAREN)) break;

					let name: string | undefined;

					const nextToken = this.peekNext();
					if (nextToken?.type === TokenType.COLON && this.isValidParameterName()) {
						name = this.consumeParameterName();
						this.advance();
					}

					const elementType = this.parseType();
					elements[elementsSize++] = { name, type: elementType };

					this.skipNewlines();

					if (!this.check(TokenType.COMMA)) break;

					this.advance();
					this.skipNewlines();
					// Handle trailing comma - if we see closing paren after comma, break
					if (this.check(TokenType.RIGHT_PAREN)) break;
				} while (!this.check(TokenType.RIGHT_PAREN));

			this.consume(TokenType.RIGHT_PAREN, 'Expected ")"');
			if (elements.length === 1 && !elements[0]!.name) return elements[0]!.type;

			return {
				elements,
				subtype: "tuple",
				type: "type",
			} as TupleTypeNode;
		}

		if (this.check(TokenType.MAP)) return this.parseMapType();
		if (this.check(TokenType.SET)) return this.parseSetType();
		if (this.check(TokenType.INSTANCE)) return this.parseInstanceType();
		if (this.check(TokenType.ENUM)) return this.parseEnumType();
		if (this.check(TokenType.STRUCT)) return this.parseStructType();
		if (this.check(TokenType.VECTOR) || this.check(TokenType.VECTOR2) || this.check(TokenType.VECTOR3))
			return this.parseVectorType();

		if (this.check(TokenType.IDENTIFIER)) {
			const token = this.peek();
			if (token.value.startsWith("Instance.")) {
				this.advance();
				const className = token.value.slice(9);
				return {
					className,
					subtype: "instance",
					type: "type",
				} as InstanceTypeNode;
			}
		}

		if (this.isPrimitiveType()) return this.parsePrimitiveType();

		throw new Error(
			`Unexpected token in type: '${this.getTokenTypeName(this.peek().type)}' at line ${this.peek().line}`,
		);
	}

	private parseComment(): CommentNode {
		const token = this.consume(TokenType.COMMENT, "Expected comment");
		return {
			text: token.value,
			type: "comment",
		};
	}

	private parseEnumType(): EnumTypeNode {
		this.consume(TokenType.ENUM, 'Expected "enum"');

		let tagField: string | undefined;

		if (this.check(TokenType.STRING_LITERAL)) {
			const tagToken = this.advance();
			tagField = tagToken.value.slice(1, -1);
		}

		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		const variants = new Array<{ fields?: StructTypeNode; name: string }>();
		let variantsSize = 0;

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.check(TokenType.RIGHT_BRACE)) break;

			const variantName = this.consume(TokenType.IDENTIFIER, "Expected variant name").value;
			let fields: StructTypeNode | undefined;

			if (tagField && this.check(TokenType.LEFT_BRACE)) fields = this.parseStructFields();
			variants[variantsSize++] = { name: variantName, fields };

			if (this.check(TokenType.COMMA)) {
				this.advance();
				this.skipNewlines();
				// Handle trailing comma
				if (this.check(TokenType.RIGHT_BRACE)) break;
			}
			this.skipNewlines();
		}

		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');

		return {
			subtype: "enum",
			tagField,
			type: "type",
			variants,
		};
	}

	private parseEvent(): EventNode {
		this.consume(TokenType.EVENT, 'Expected "event"');
		const name = this.consume(TokenType.IDENTIFIER, "Expected event name").value;
		this.consume(TokenType.EQUALS, 'Expected "="');
		this.skipNewlines(); // Skip newlines after equals
		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		const properties: Writable<EventProperties> = {};

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.check(TokenType.RIGHT_BRACE)) break;

			const propertyName = this.consumePropertyName();
			this.consume(TokenType.COLON, 'Expected ":"');

			switch (propertyName) {
				case "call": {
					properties.call = this.consumeIdentifierValue() as EventProperties["call"];
					break;
				}

				case "data": {
					properties.data = this.parseType();
					break;
				}

				case "from": {
					properties.from = this.consumeIdentifierValue() as "Client" | "Server";
					break;
				}

				case "type": {
					properties.type = this.consumeIdentifierValue() as "Reliable" | "Unreliable";
					break;
				}

				default: {
					throw new Error(`Unknown event property: ${propertyName}`);
				}
			}

			if (this.check(TokenType.COMMA)) this.advance();

			this.skipNewlines();
		}

		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');
		return {
			name,
			properties,
			type: "event",
		};
	}

	private parseFunction(): FunctionNode {
		this.consume(TokenType.FUNCT, 'Expected "funct"');
		const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
		this.consume(TokenType.EQUALS, 'Expected "="');
		this.skipNewlines(); // Skip newlines after equals
		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		const properties: Writable<FunctionProperties> = {};

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.check(TokenType.RIGHT_BRACE)) break;

			const propertyName = this.consumePropertyName();
			this.consume(TokenType.COLON, 'Expected ":"');

			switch (propertyName) {
				case "args": {
					properties.args = this.parseType();
					break;
				}

				case "call": {
					properties.call = this.consumeIdentifierValue() as "Async" | "Sync";
					break;
				}

				case "rets": {
					properties.rets = this.parseType();
					break;
				}

				default: {
					throw new Error(`Unknown function property: ${propertyName}`);
				}
			}

			if (this.check(TokenType.COMMA)) this.advance();
			this.skipNewlines();
		}

		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');

		return {
			name,
			properties,
			type: "function",
		};
	}

	private parseInstanceType(): InstanceTypeNode {
		this.consume(TokenType.INSTANCE, 'Expected "Instance"');

		let className: string | undefined;

		if (this.check(TokenType.LEFT_PAREN)) {
			this.advance();
			className = this.consumeIdentifierValue();
			this.consume(TokenType.RIGHT_PAREN, 'Expected ")"');
		}

		return {
			className,
			subtype: "instance",
			type: "type",
		};
	}

	private parseMapType(): MapTypeNode {
		this.consume(TokenType.MAP, 'Expected "map"');
		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		this.consume(TokenType.LEFT_BRACKET, 'Expected "["');
		const keyType = this.parseType();
		this.consume(TokenType.RIGHT_BRACKET, 'Expected "]"');

		this.consume(TokenType.COLON, 'Expected ":"');
		const valueType = this.parseType();
		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');

		return {
			keyType,
			subtype: "map",
			type: "type",
			valueType,
		};
	}

	private parseNamespace(): NamespaceNode {
		this.consume(TokenType.NAMESPACE, 'Expected "namespace"');
		const name = this.consume(TokenType.IDENTIFIER, "Expected namespace name").value;
		this.consume(TokenType.EQUALS, 'Expected "="');
		this.skipNewlines(); // Skip newlines after equals
		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		const members = new Array<CommentNode | EventNode | FunctionNode>();
		let membersSize = 0;

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.check(TokenType.RIGHT_BRACE)) break;

			if (this.check(TokenType.COMMENT)) members[membersSize++] = this.parseComment();
			else if (this.check(TokenType.EVENT)) members[membersSize++] = this.parseEvent();
			else if (this.check(TokenType.FUNCT)) members[membersSize++] = this.parseFunction();
			else throw new Error(`Unexpected token in namespace: '${this.getTokenTypeName(this.peek().type)}'`);

			this.skipNewlines();
		}

		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');

		return {
			name,
			members,
			type: "namespace",
		};
	}

	private parseOption(): OptionNode {
		this.consume(TokenType.OPT, 'Expected "opt"');
		const key = this.consume(TokenType.IDENTIFIER, "Expected option key").value;
		this.consume(TokenType.EQUALS, 'Expected "="');

		let value: boolean | number | string;

		if (this.check(TokenType.STRING_LITERAL)) ({ value } = this.advance());
		else if (this.check(TokenType.NUMBER_LITERAL)) value = Number.parseFloat(this.advance().value);
		else if (this.check(TokenType.BOOLEAN_LITERAL)) value = this.advance().value === "true";
		else if (this.check(TokenType.IDENTIFIER)) ({ value } = this.advance());
		else throw new Error(`Expected value for option "${key}"`);

		return {
			key,
			type: "option",
			value,
		};
	}

	private parseOptionalType(): TypeNode {
		let baseType = this.parseBaseType();

		while (this.check(TokenType.LEFT_BRACKET)) {
			this.advance();

			let arrayConstraint: RangeConstraint | undefined;
			if (!this.check(TokenType.RIGHT_BRACKET)) arrayConstraint = this.parseRangeConstraintContent();

			this.consume(TokenType.RIGHT_BRACKET, 'Expected "]"');

			baseType = {
				constraint: arrayConstraint,
				elementType: baseType,
				subtype: "array",
				type: "type",
			} as ArrayTypeNode;
		}

		if (this.check(TokenType.QUESTION)) {
			this.advance();
			return {
				innerType: baseType,
				subtype: "optional",
				type: "type",
			} as OptionalTypeNode;
		}

		return baseType;
	}

	private parsePrimitiveType(): ArrayTypeNode | PrimitiveTypeNode {
		const typeName = this.advance().value;
		let constraint: RangeConstraint | undefined;

		if (this.check(TokenType.LEFT_PAREN)) constraint = this.parseRangeConstraint();
		else if (this.check(TokenType.LEFT_BRACKET)) {
			this.advance();

			let arrayConstraint: RangeConstraint | undefined;
			if (!this.check(TokenType.RIGHT_BRACKET)) arrayConstraint = this.parseRangeConstraintContent();

			this.consume(TokenType.RIGHT_BRACKET, 'Expected "]"');

			return {
				constraint: arrayConstraint,
				elementType: {
					name: typeName,
					subtype: "primitive",
					type: "type",
				} satisfies PrimitiveTypeNode,
				subtype: "array",
				type: "type",
			} as ArrayTypeNode;
		}

		return {
			name: typeName,
			constraint,
			subtype: "primitive",
			type: "type",
		};
	}

	private parseRangeConstraint(): RangeConstraint {
		this.consume(TokenType.LEFT_PAREN, 'Expected "("');
		const constraint = this.parseRangeConstraintContent();
		this.consume(TokenType.RIGHT_PAREN, 'Expected ")"');
		return constraint;
	}

	private parseRangeConstraintContent(): RangeConstraint {
		const constraint: Writable<RangeConstraint> = {};

		if (this.check(TokenType.DOT_DOT)) {
			this.advance();
			if (this.check(TokenType.NUMBER_LITERAL)) constraint.max = Number.parseFloat(this.advance().value);
		} else if (this.check(TokenType.NUMBER_LITERAL)) {
			constraint.min = Number.parseFloat(this.advance().value);

			if (this.check(TokenType.DOT_DOT)) {
				this.advance();
				if (this.check(TokenType.NUMBER_LITERAL)) constraint.max = Number.parseFloat(this.advance().value);
			} else constraint.max = constraint.min;
		}

		return constraint;
	}

	private parseSetType(): SetTypeNode {
		this.consume(TokenType.SET, 'Expected "set"');
		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		const elementType = this.parseType();
		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');

		return {
			elementType,
			subtype: "set",
			type: "type",
		};
	}

	private parseStructFields(): StructTypeNode {
		this.consume(TokenType.LEFT_BRACE, 'Expected "{"');

		const fields = new Array<{
			readonly name: string;
			readonly type: TypeNode;
		}>();
		let fieldsSize = 0;

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			this.skipNewlines();
			if (this.check(TokenType.RIGHT_BRACE)) break;

			const fieldName = this.consume(TokenType.IDENTIFIER, "Expected field name").value;
			this.consume(TokenType.COLON, 'Expected ":"');
			const fieldType = this.parseType();

			fields[fieldsSize++] = { name: fieldName, type: fieldType };

			if (this.check(TokenType.COMMA)) {
				this.advance();
				this.skipNewlines();
				// Handle trailing comma
				if (this.check(TokenType.RIGHT_BRACE)) break;
			}
			this.skipNewlines();
		}

		this.consume(TokenType.RIGHT_BRACE, 'Expected "}"');

		return {
			fields,
			subtype: "struct",
			type: "type",
		};
	}

	private parseStructType(): StructTypeNode {
		this.consume(TokenType.STRUCT, 'Expected "struct"');
		return this.parseStructFields();
	}

	private parseType(): TypeNode {
		return this.parseUnionType();
	}

	private parseTypeDefinition(): TypeDefinitionNode {
		this.consume(TokenType.TYPE, 'Expected "type"');
		const name = this.consume(TokenType.IDENTIFIER, "Expected type name").value;
		this.consume(TokenType.EQUALS, 'Expected "="');
		const definition = this.parseType();

		return {
			name,
			definition,
			type: "typeDefinition",
		};
	}

	private parseUnionType(): TypeNode {
		const type = this.parseOptionalType();

		if (this.check(TokenType.PIPE)) {
			const types = [type];
			let length = 1;

			while (this.check(TokenType.PIPE)) {
				this.advance();
				types[length++] = this.parseOptionalType();
			}

			return {
				subtype: "union",
				type: "type",
				types,
			} as UnionTypeNode;
		}

		return type;
	}

	private parseVectorType(): VectorTypeNode {
		this.advance();
		let components: Array<TypeNode> | undefined;

		if (this.check(TokenType.LEFT_PAREN)) {
			this.advance();

			components = new Array<TypeNode>();
			let componentsSize = 0;

			if (!this.check(TokenType.RIGHT_PAREN))
				do {
					components[componentsSize++] = this.parseType();
					if (!this.check(TokenType.COMMA)) break;
					this.advance();
					// Handle trailing comma
					if (this.check(TokenType.RIGHT_PAREN)) break;
				} while (!this.check(TokenType.RIGHT_PAREN));

			this.consume(TokenType.RIGHT_PAREN, 'Expected ")"');
		}

		return {
			components,
			subtype: "vector",
			type: "type",
		};
	}

	private peek(): Token {
		return this.tokens[this.current]!;
	}

	private peekNext(): Token | undefined {
		if (this.current + 1 >= this.tokens.length) return undefined;
		return this.tokens[this.current + 1];
	}

	private previous(): Token {
		return this.tokens[this.current - 1]!;
	}

	private skipNewlines(): void {
		while (this.check(TokenType.NEWLINE)) this.advance();
	}
}
