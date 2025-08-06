import type TokenType from "./meta/token-type";

/**
 * Makes all properties of a type writable (removes readonly).
 *
 * @template T - The type to make writable.
 */
export type Writable<T> = { -readonly [P in keyof T]: T[P] };

/** Represents a single token produced by the Zap lexer. */
export interface Token {
	readonly column: number;
	readonly line: number;
	readonly type: TokenType;
	readonly value: string;
}

/** Base interface for all AST nodes in the Zap configuration language. */
export interface AstNode {
	readonly type: string;
}

/** Represents an option node in the Zap AST. */
export interface OptionNode extends AstNode {
	readonly key: string;
	readonly type: "option";
	readonly value: boolean | number | string;
}

/** Represents an event node in the Zap AST. */
export interface EventNode extends AstNode {
	readonly name: string;
	readonly properties: EventProperties;
	readonly type: "event";
}

/** Represents a function node in the Zap AST. */
export interface FunctionNode extends AstNode {
	readonly name: string;
	readonly properties: FunctionProperties;
	readonly type: "function";
}

/** Represents a namespace node in the Zap AST. */
export interface NamespaceNode extends AstNode {
	readonly members: ReadonlyArray<CommentNode | EventNode | FunctionNode>;
	readonly name: string;
	readonly type: "namespace";
}

/** Properties for an event node in the Zap AST. */
export interface EventProperties {
	readonly call?: "ManyAsync" | "ManySync" | "Polling" | "SingleAsync" | "SingleSync";
	readonly data?: TypeNode;
	readonly from?: "Client" | "Server";
	readonly type?: "Reliable" | "Unreliable";
}

/** Properties for a function node in the Zap AST. */
export interface FunctionProperties {
	readonly args?: TypeNode;
	readonly call?: "Async" | "Sync";
	readonly rets?: TypeNode;
}

/** Base interface for all type nodes in the Zap AST. */
export interface TypeNode extends AstNode {
	readonly subtype: string;
	readonly type: "type";
}

/** Represents a primitive type node in the Zap AST. */
export interface PrimitiveTypeNode extends TypeNode {
	readonly constraint?: RangeConstraint;
	readonly name: string;
	readonly subtype: "primitive";
}

/** Represents an array type node in the Zap AST. */
export interface ArrayTypeNode extends TypeNode {
	readonly constraint?: RangeConstraint;
	readonly elementType: TypeNode;
	readonly subtype: "array";
}

/** Represents a map type node in the Zap AST. */
export interface MapTypeNode extends TypeNode {
	readonly keyType: TypeNode;
	readonly subtype: "map";
	readonly valueType: TypeNode;
}

/** Represents a set type node in the Zap AST. */
export interface SetTypeNode extends TypeNode {
	readonly elementType: TypeNode;
	readonly subtype: "set";
}

/** Represents an optional type node in the Zap AST. */
export interface OptionalTypeNode extends TypeNode {
	readonly innerType: TypeNode;
	readonly subtype: "optional";
}

/** Represents a union type node in the Zap AST. */
export interface UnionTypeNode extends TypeNode {
	readonly subtype: "union";
	readonly types: ReadonlyArray<TypeNode>;
}

/** Represents an instance type node in the Zap AST. */
export interface InstanceTypeNode extends TypeNode {
	readonly className?: string;
	readonly subtype: "instance";
}

/** Represents a tuple type node in the Zap AST. */
export interface TupleTypeNode extends TypeNode {
	readonly elements: ReadonlyArray<{
		readonly name?: string;
		readonly type: TypeNode;
	}>;
	readonly subtype: "tuple";
}

/** Represents a range constraint for numeric types in the Zap AST. */
export interface RangeConstraint {
	readonly max?: number;
	readonly min?: number;
}

/** Represents a comment node in the Zap AST. */
export interface CommentNode extends AstNode {
	readonly text: string;
	readonly type: "comment";
}

/** Represents a type definition node in the Zap AST. */
export interface TypeDefinitionNode extends AstNode {
	readonly definition: TypeNode;
	readonly name: string;
	readonly type: "typeDefinition";
}

/** Represents an enum type node in the Zap AST. */
export interface EnumTypeNode extends TypeNode {
	readonly subtype: "enum";
	readonly tagField?: string;
	readonly variants: ReadonlyArray<{
		readonly fields?: StructTypeNode;
		readonly name: string;
	}>;
}

/** Represents a struct type node in the Zap AST. */
export interface StructTypeNode extends TypeNode {
	readonly fields: ReadonlyArray<{
		readonly name: string;
		readonly type: TypeNode;
	}>;
	readonly subtype: "struct";
}

/** Represents a vector type node in the Zap AST. */
export interface VectorTypeNode extends TypeNode {
	readonly components?: ReadonlyArray<TypeNode>;
	readonly subtype: "vector";
}

/** Represents the root configuration node in the Zap AST. */
export interface ZapConfigurationNode extends AstNode {
	readonly items: ReadonlyArray<CommentNode | EventNode | FunctionNode | NamespaceNode | TypeDefinitionNode>;
	readonly options: ReadonlyArray<OptionNode>;
	readonly type: "config";
}
