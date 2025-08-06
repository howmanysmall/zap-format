import type {
	ArrayTypeNode,
	CommentNode,
	EnumTypeNode,
	EventNode,
	FunctionNode,
	InstanceTypeNode,
	MapTypeNode,
	NamespaceNode,
	OptionalTypeNode,
	OptionNode,
	PrimitiveTypeNode,
	RangeConstraint,
	SetTypeNode,
	StructTypeNode,
	TupleTypeNode,
	TypeDefinitionNode,
	TypeNode,
	UnionTypeNode,
	VectorTypeNode,
	ZapConfigurationNode,
} from "../types";

const ALPHANUMERIC_REGEX = /[^a-zA-Z0-9_]/;
const COMMENT_REGEX = /^--/;
const WIDTH_THRESHOLD = 120;

function extractFields(variant: { readonly fields?: StructTypeNode }): StructTypeNode | undefined {
	return variant.fields;
}
function extractName(variant: { readonly name: string }): string {
	return variant.name;
}

/**
 * Formats a parsed Zap configuration AST into a string representation.
 *
 * @remarks
 * This class provides methods to format Zap configuration nodes, including
 * options, events, functions, namespaces, and type nodes.
 * @see ZapConfigurationNode
 */
export default class ZapFormatter {
	/**
	 * Formats a Zap configuration AST into a canonical string representation.
	 *
	 * @example
	 *
	 * ```typescript
	 * const output = new ZapFormatter().format(zapConfigNode);
	 * ```
	 *
	 * @param zapConfigurationNode - The root Zap configuration node to format.
	 * @returns The formatted Zap configuration as a string.
	 */
	public format(zapConfigurationNode: ZapConfigurationNode): string {
		const result = new Array<string>();
		let length = 0;

		if (zapConfigurationNode.options.length > 0) {
			for (const option of zapConfigurationNode.options) result[length++] = this.formatOption(option);
			if (zapConfigurationNode.items.length > 0) result[length++] = "";
		}

		for (let index = 0; index < zapConfigurationNode.items.length; index += 1) {
			const item = zapConfigurationNode.items[index];
			if (!item) continue;

			const formatted = this.formatItem(item);
			result[length++] = formatted;

			if (index < zapConfigurationNode.items.length - 1 && item.type !== "comment") result[length++] = "";
		}

		return result.join("\n");
	}

	private readonly indentCharacter: string = "\t";
	private indentLevel = 0;

	private formatArrayType(arrayTypeNode: ArrayTypeNode): string {
		let result = `${this.formatType(arrayTypeNode.elementType)}[]`;
		if (arrayTypeNode.constraint) result += this.formatRangeConstraint(arrayTypeNode.constraint);
		return result;
	}

	private formatConstraint(rangeConstraint: RangeConstraint): string {
		return `(${this.formatRangeConstraint(rangeConstraint)})`;
	}

	private formatEnumType(enumTypeNode: EnumTypeNode): string {
		let result = "enum";
		if (enumTypeNode.tagField) result += ` "${enumTypeNode.tagField}"`;

		if (!enumTypeNode.tagField && !enumTypeNode.variants.some(extractFields)) {
			const variants = enumTypeNode.variants.map(extractName).join(", ");
			const inlineFormat = `${result} {${variants}}`;
			if (inlineFormat.length <= WIDTH_THRESHOLD) return inlineFormat;
		}

		result += " {";
		const lines = [result];
		let length = 1;

		for (let index = 0; index < enumTypeNode.variants.length; index += 1) {
			const variant = enumTypeNode.variants[index]!;
			let variantLine = `\t${variant.name}`;

			if (variant.fields) variantLine += ` ${this.formatStructType(variant.fields)}`;

			variantLine += index < enumTypeNode.variants.length - 1 ? "," : "";
			lines[length++] = variantLine;

			if (enumTypeNode.tagField && variant.fields && index < enumTypeNode.variants.length - 1)
				lines[length++] = "";
		}

		lines[length++] = "}";
		return lines.join("\n");
	}

	private formatEvent({ name, properties }: EventNode): string {
		const indent = this.getIndent();
		const lines = [`${indent}event ${name} = {`];
		let length = 1;

		this.indentLevel += 1;
		const propertyIndent = this.getIndent();

		if (properties.from) lines[length++] = `${propertyIndent}from: ${properties.from},`;
		if (properties.type) lines[length++] = `${propertyIndent}type: ${properties.type},`;
		if (properties.call) lines[length++] = `${propertyIndent}call: ${properties.call},`;
		if (properties.data) lines[length++] = `${propertyIndent}data: ${this.formatType(properties.data)},`;

		this.indentLevel -= 1;
		lines[length++] = `${indent}}`;

		return lines.join("\n");
	}

	private formatFunction({ name, properties }: FunctionNode): string {
		const indent = this.getIndent();
		const lines = [`${indent}funct ${name} = {`];
		let length = 1;

		this.indentLevel += 1;
		const propertyIndent = this.getIndent();

		if (properties.call) lines[length++] = `${propertyIndent}call: ${properties.call},`;
		if (properties.args) {
			const argumentsString = this.formatType(properties.args);
			lines[length++] = `${propertyIndent}args: ${argumentsString},`;
		}
		if (properties.rets) {
			const returnsString = this.formatType(properties.rets);
			lines[length++] = `${propertyIndent}rets: ${returnsString},`;
		}

		this.indentLevel -= 1;
		lines[length++] = `${indent}}`;

		return lines.join("\n");
	}

	private formatInstanceType(instanceTypeNode: InstanceTypeNode): string {
		let result = "Instance";
		if (instanceTypeNode.className) result += `.${instanceTypeNode.className}`;
		return result;
	}

	private formatItem(item: CommentNode | EventNode | FunctionNode | NamespaceNode | TypeDefinitionNode): string {
		switch (item.type) {
			case "comment": {
				return item.text;
			}

			case "event": {
				return this.formatEvent(item);
			}

			case "function": {
				return this.formatFunction(item);
			}

			case "namespace": {
				return this.formatNamespace(item);
			}

			case "typeDefinition": {
				return this.formatTypeDefinition(item);
			}

			default: {
				throw new Error(`Unknown item type: ${(item as Record<string, string>).type}`);
			}
		}
	}

	private formatMapType(mapTypeNode: MapTypeNode): string {
		return `map {[${this.formatType(mapTypeNode.keyType)}]: ${this.formatType(mapTypeNode.valueType)}}`;
	}

	private formatNamespace(namespaceNode: NamespaceNode): string {
		const indent = this.getIndent();
		const lines = [`${indent}namespace ${namespaceNode.name} = {`];
		let length = 1;

		this.indentLevel += 1;

		for (let index = 0; index < namespaceNode.members.length; index += 1) {
			const member = namespaceNode.members[index];
			if (!member) continue;

			const formatted = this.formatItem(member);

			lines[length++] =
				member.type === "comment" ? `${this.getIndent()}${formatted.replace(COMMENT_REGEX, "--")}` : formatted;

			if (
				index < namespaceNode.members.length - 1 &&
				(member.type !== "comment" || namespaceNode.members[index + 1]?.type !== "comment")
			)
				lines[length++] = "";
		}

		this.indentLevel -= 1;
		lines[length++] = `${indent}}`;

		return lines.join("\n");
	}

	private formatOption(optionNode: OptionNode): string {
		return `opt ${optionNode.key} = ${this.formatOptionValue(optionNode.value)}`;
	}

	private formatOptionalType(optionalTypeNode: OptionalTypeNode): string {
		return `${this.formatType(optionalTypeNode.innerType)}?`;
	}

	private formatOptionValue(value: boolean | number | string): string {
		if (typeof value === "string") {
			if (value.startsWith('"') && value.endsWith('"')) return value;
			if (ALPHANUMERIC_REGEX.test(value) && !value.includes("(")) return `"${value}"`;
			return value;
		}

		return String(value);
	}

	private formatPrimitiveType(primitiveTypeNode: PrimitiveTypeNode): string {
		let result = primitiveTypeNode.name;
		if (primitiveTypeNode.constraint) result += this.formatConstraint(primitiveTypeNode.constraint);
		return result;
	}

	private formatRangeConstraint(rangeConstraint: RangeConstraint): string {
		if (rangeConstraint.min !== undefined && rangeConstraint.max !== undefined) {
			if (rangeConstraint.min === rangeConstraint.max) return String(rangeConstraint.min);
			return `${rangeConstraint.min}..${rangeConstraint.max}`;
		}

		if (rangeConstraint.min !== undefined) return `${rangeConstraint.min}..`;
		if (rangeConstraint.max !== undefined) return `..${rangeConstraint.max}`;
		return "..";
	}

	private formatSetType(setTypeNode: SetTypeNode): string {
		return `set {${this.formatType(setTypeNode.elementType)}}`;
	}

	private formatStructType(structTypeNode: StructTypeNode): string {
		const fields = structTypeNode.fields.map((field) => `${field.name}: ${this.formatType(field.type)}`).join(", ");
		const inlineFormat = `struct {${fields}}`;

		if (inlineFormat.length <= WIDTH_THRESHOLD) return inlineFormat;

		const lines = ["struct {"];
		let length = 1;

		for (let index = 0; index < structTypeNode.fields.length; index += 1) {
			const field = structTypeNode.fields[index]!;
			lines[length++] =
				`\t${field.name}: ${this.formatType(field.type)}${index < structTypeNode.fields.length - 1 ? "," : ""}`;
		}

		lines[length++] = "}";
		return lines.join("\n");
	}

	private formatTupleType(tupleTypeNode: TupleTypeNode): string {
		const elements = tupleTypeNode.elements.map((element) => {
			if (element.name) return `${element.name}: ${this.formatType(element.type)}`;
			return this.formatType(element.type);
		});

		const inlineFormat = `(${elements.join(", ")})`;
		if (inlineFormat.length <= WIDTH_THRESHOLD) return inlineFormat;

		// Multi-line format when too long
		const lines = ["("];
		let length = 1;

		this.indentLevel += 1;
		const elementIndent = this.getIndent();

		for (let index = 0; index < elements.length; index += 1) {
			const element = elements[index]; 
			if (element === undefined) continue;

			const isLast = index === elements.length - 1;
			lines[length++] = `${elementIndent}${element}${isLast ? "" : ","}`;
		}

		this.indentLevel -= 1;
		lines[length++] = `${this.getIndent()})`;

		return lines.join("\n");
	}

	private formatType(typeNode: TypeNode): string {
		switch (typeNode.subtype) {
			case "array": {
				return this.formatArrayType(typeNode as ArrayTypeNode);
			}

			case "enum": {
				return this.formatEnumType(typeNode as EnumTypeNode);
			}

			case "instance": {
				return this.formatInstanceType(typeNode as InstanceTypeNode);
			}

			case "map": {
				return this.formatMapType(typeNode as MapTypeNode);
			}

			case "optional": {
				return this.formatOptionalType(typeNode as OptionalTypeNode);
			}

			case "primitive": {
				return this.formatPrimitiveType(typeNode as PrimitiveTypeNode);
			}

			case "set": {
				return this.formatSetType(typeNode as SetTypeNode);
			}

			case "struct": {
				return this.formatStructType(typeNode as StructTypeNode);
			}

			case "tuple": {
				return this.formatTupleType(typeNode as TupleTypeNode);
			}

			case "union": {
				return this.formatUnionType(typeNode as UnionTypeNode);
			}

			case "vector": {
				return this.formatVectorType(typeNode as VectorTypeNode);
			}

			default: {
				throw new Error(`Unknown type subtype: ${typeNode.subtype}`);
			}
		}
	}

	private formatTypeDefinition(typeDefinitionNode: TypeDefinitionNode): string {
		return `${this.getIndent()}type ${typeDefinitionNode.name} = ${this.formatType(typeDefinitionNode.definition)}`;
	}

	private formatUnionType(unionTypeNode: UnionTypeNode): string {
		return unionTypeNode.types.map((typeNode) => this.formatType(typeNode)).join(" | ");
	}

	private formatVectorType(vectorTypeNode: VectorTypeNode): string {
		/** Default to Vector3. */
		let result = "Vector3";

		if (vectorTypeNode.components) {
			result = "vector";
			const components = vectorTypeNode.components.map((component) => this.formatType(component)).join(", ");
			result += `(${components})`;
		}

		return result;
	}

	private getIndent(): string {
		return this.indentCharacter.repeat(this.indentLevel);
	}
}
