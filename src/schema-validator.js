"use strict";

function validateSchema(schema, value, options = {}) {
  const rootSchema = options.rootSchema || schema;
  const errors = [];
  validateNode(schema, value, {
    rootSchema,
    path: options.path || "$",
    errors
  });
  return {
    ok: errors.length === 0,
    errors
  };
}

function validateNode(schema, value, context) {
  if (!schema || typeof schema !== "object") return;

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, context.rootSchema);
    if (!resolved) {
      context.errors.push(`${context.path}: unresolved schema ref ${schema.$ref}`);
      return;
    }
    validateNode(resolved, value, context);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    context.errors.push(`${context.path}: expected one of ${schema.enum.join(", ")}`);
    return;
  }

  if (schema.type && !matchesType(value, schema.type)) {
    context.errors.push(`${context.path}: expected type ${formatType(schema.type)}, got ${typeOf(value)}`);
    return;
  }

  if (typeof value === "string") {
    validateString(schema, value, context);
  }

  if (typeof value === "number") {
    validateNumber(schema, value, context);
  }

  if (Array.isArray(value)) {
    validateArray(schema, value, context);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    validateObject(schema, value, context);
  }
}

function validateString(schema, value, context) {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    context.errors.push(`${context.path}: expected at least ${schema.minLength} characters`);
  }

  if (schema.pattern) {
    const pattern = new RegExp(schema.pattern);
    if (!pattern.test(value)) {
      context.errors.push(`${context.path}: does not match pattern ${schema.pattern}`);
    }
  }
}

function validateNumber(schema, value, context) {
  if (schema.minimum !== undefined && value < schema.minimum) {
    context.errors.push(`${context.path}: expected >= ${schema.minimum}`);
  }

  if (schema.maximum !== undefined && value > schema.maximum) {
    context.errors.push(`${context.path}: expected <= ${schema.maximum}`);
  }
}

function validateArray(schema, value, context) {
  if (schema.minItems !== undefined && value.length < schema.minItems) {
    context.errors.push(`${context.path}: expected at least ${schema.minItems} items`);
  }

  if (schema.items) {
    value.forEach((item, index) => {
      validateNode(schema.items, item, {
        ...context,
        path: `${context.path}[${index}]`
      });
    });
  }
}

function validateObject(schema, value, context) {
  const required = schema.required || [];
  for (const key of required) {
    if (!(key in value)) {
      context.errors.push(`${context.path}.${key}: required property missing`);
    }
  }

  const properties = schema.properties || {};
  const patternProperties = schema.patternProperties || {};
  for (const [key, propertySchema] of Object.entries(properties)) {
    if (key in value) {
      validateNode(propertySchema, value[key], {
        ...context,
        path: `${context.path}.${key}`
      });
    }
  }

  for (const [pattern, propertySchema] of Object.entries(patternProperties)) {
    const regex = new RegExp(pattern);
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!(key in properties) && regex.test(key)) {
        validateNode(propertySchema, nestedValue, {
          ...context,
          path: `${context.path}.${key}`
        });
      }
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      const matchesPattern = Object.keys(patternProperties).some((pattern) => new RegExp(pattern).test(key));
      if (!(key in properties) && !matchesPattern) {
        context.errors.push(`${context.path}.${key}: additional property not allowed`);
      }
    }
  } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!(key in properties)) {
        validateNode(schema.additionalProperties, nestedValue, {
          ...context,
          path: `${context.path}.${key}`
        });
      }
    }
  }
}

function resolveRef(ref, rootSchema) {
  if (!ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current = rootSchema;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return null;
    current = current[part];
  }
  return current;
}

function matchesType(value, expected) {
  const types = Array.isArray(expected) ? expected : [expected];
  return types.some((type) => {
    if (type === "array") return Array.isArray(value);
    if (type === "integer") return Number.isInteger(value);
    if (type === "null") return value === null;
    if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
    return typeof value === type;
  });
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function formatType(type) {
  return Array.isArray(type) ? type.join(" or ") : type;
}

module.exports = {
  validateSchema
};
