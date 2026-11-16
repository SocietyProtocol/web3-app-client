// Executes the app's GraphQL documents against the entity store, using the
// checked-in API schema (schema.graphql). One generic resolver handles every
// query: lookups by id, collections with where / orderBy / first / skip,
// references between entities and the @derivedFrom relations.
import fs from "node:fs";
import path from "node:path";
import {
  buildSchema,
  graphql,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
} from "graphql";
import { REPO_DIR } from "../stack/config.mjs";
import { DERIVED_FIELDS } from "./store.mjs";

const NUMERIC_SCALARS = new Set(["BigInt", "BigDecimal", "Int", "Int8", "Float", "Timestamp"]);

/** Longest first, so "name_not_contains_nocase" is not read as "name_not" + rest. */
const FILTER_SUFFIXES = [
  "_not_starts_with_nocase",
  "_not_ends_with_nocase",
  "_not_contains_nocase",
  "_starts_with_nocase",
  "_ends_with_nocase",
  "_not_starts_with",
  "_contains_nocase",
  "_not_ends_with",
  "_not_contains",
  "_starts_with",
  "_ends_with",
  "_contains",
  "_not_in",
  "_not",
  "_gte",
  "_lte",
  "_gt",
  "_lt",
  "_in",
  "_",
];

function unwrap(type) {
  let current = type;
  let list = false;
  while (isNonNullType(current) || isListType(current)) {
    if (isListType(current)) list = true;
    current = current.ofType;
  }
  return { named: current, list };
}

function compareValues(left, right, numeric) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (numeric) {
    const a = Number(left);
    const b = Number(right);
    if (Number.isSafeInteger(a) && Number.isSafeInteger(b)) return a - b;
    try {
      const big = BigInt(left) - BigInt(right);
      return big < 0n ? -1 : big > 0n ? 1 : 0;
    } catch {
      return a - b;
    }
  }
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function createExecutor({ store, resolveMissing }) {
  const schema = buildSchema(fs.readFileSync(path.join(REPO_DIR, "schema.graphql"), "utf8"), {
    assumeValid: true,
  });

  /** Concrete entity types behind a (possibly interface) type name. */
  function concreteTypes(named) {
    if (isInterfaceType(named)) return schema.getPossibleTypes(named).map((type) => type.name);
    return [named.name];
  }

  function isEntityType(named) {
    return (isObjectType(named) || isInterfaceType(named)) && !named.name.startsWith("_");
  }

  function lookup(named, id) {
    if (id == null) return null;
    if (typeof id === "object") return id; // an inline entity in an overlay
    for (const typeName of concreteTypes(named)) {
      const found = store.get(typeName, String(id)) ?? resolveMissing?.(typeName, String(id));
      if (found) return { ...found, __typename: typeName };
    }
    return null;
  }

  function collection(named) {
    return concreteTypes(named).flatMap((typeName) =>
      store.all(typeName).map((entity) => ({ ...entity, __typename: typeName })),
    );
  }

  /** The raw stored value of a field: ids for references, including derived ones. */
  function rawField(typeName, entity, fieldName) {
    const derived = DERIVED_FIELDS[`${typeName}.${fieldName}`];
    if (!derived) return entity[fieldName];
    return store
      .all(derived.type)
      .filter((other) => {
        const value = other[derived.field];
        return Array.isArray(value) ? value.includes(entity.id) : value === entity.id;
      })
      .map((other) => other.id);
  }

  function fieldDefinition(typeName, fieldName) {
    const type = schema.getType(typeName);
    return type && "getFields" in type ? type.getFields()[fieldName] : undefined;
  }

  function splitFilterKey(typeName, key) {
    if (fieldDefinition(typeName, key)) return { field: key, suffix: "" };
    for (const suffix of FILTER_SUFFIXES) {
      if (!key.endsWith(suffix)) continue;
      const field = key.slice(0, -suffix.length);
      if (fieldDefinition(typeName, field)) return { field, suffix };
    }
    return undefined;
  }

  function matches(typeName, entity, where) {
    if (!where) return true;
    for (const [key, expected] of Object.entries(where)) {
      if (expected === undefined) continue;
      if (key === "_change_block") continue;
      if (key === "and") {
        if (!expected.every((part) => matches(typeName, entity, part))) return false;
        continue;
      }
      if (key === "or") {
        if (!expected.some((part) => matches(typeName, entity, part))) return false;
        continue;
      }
      const parsed = splitFilterKey(typeName, key);
      if (!parsed) throw new Error(`The subgraph fake does not know the filter "${key}" on ${typeName}`);
      const definition = fieldDefinition(typeName, parsed.field);
      const { named, list } = unwrap(definition.type);
      const actual = rawField(typeName, entity, parsed.field);
      if (!matchesFilter({ named, list, actual, suffix: parsed.suffix, expected })) return false;
    }
    return true;
  }

  function matchesFilter({ named, list, actual, suffix, expected }) {
    const numeric = NUMERIC_SCALARS.has(named.name);
    const lower = (value) => String(value ?? "").toLowerCase();

    if (suffix === "_") {
      // Nested filter on the referenced entity, or on any entity of a list.
      const targets = (list ? (actual ?? []) : [actual])
        .map((id) => lookup(named, id))
        .filter(Boolean);
      return targets.some((target) => matches(target.__typename, target, expected));
    }

    if (list) {
      const values = (actual ?? []).map(String);
      const wanted = (expected ?? []).map(String);
      const hasAll = (fold) =>
        wanted.every((item) => values.some((value) => (fold ? lower(value) === lower(item) : value === item)));
      switch (suffix) {
        case "":
          return values.length === wanted.length && hasAll(false);
        case "_not":
          return !(values.length === wanted.length && hasAll(false));
        case "_contains":
          return hasAll(false);
        case "_contains_nocase":
          return hasAll(true);
        case "_not_contains":
          return !hasAll(false);
        case "_not_contains_nocase":
          return !hasAll(true);
        default:
          throw new Error(`The subgraph fake does not support the list filter "${suffix}"`);
      }
    }

    const equal = (a, b) => (a == null || b == null ? a == b : compareValues(a, b, numeric) === 0);
    switch (suffix) {
      case "":
        return equal(actual, expected);
      case "_not":
        return !equal(actual, expected);
      case "_gt":
        return actual != null && compareValues(actual, expected, numeric) > 0;
      case "_gte":
        return actual != null && compareValues(actual, expected, numeric) >= 0;
      case "_lt":
        return actual != null && compareValues(actual, expected, numeric) < 0;
      case "_lte":
        return actual != null && compareValues(actual, expected, numeric) <= 0;
      case "_in":
        return expected.some((item) => equal(actual, item));
      case "_not_in":
        return !expected.some((item) => equal(actual, item));
      case "_contains":
        return actual != null && String(actual).includes(String(expected));
      case "_contains_nocase":
        return actual != null && lower(actual).includes(lower(expected));
      case "_not_contains":
        return actual == null || !String(actual).includes(String(expected));
      case "_not_contains_nocase":
        return actual == null || !lower(actual).includes(lower(expected));
      case "_starts_with":
        return actual != null && String(actual).startsWith(String(expected));
      case "_starts_with_nocase":
        return actual != null && lower(actual).startsWith(lower(expected));
      case "_not_starts_with":
        return actual == null || !String(actual).startsWith(String(expected));
      case "_not_starts_with_nocase":
        return actual == null || !lower(actual).startsWith(lower(expected));
      case "_ends_with":
        return actual != null && String(actual).endsWith(String(expected));
      case "_ends_with_nocase":
        return actual != null && lower(actual).endsWith(lower(expected));
      case "_not_ends_with":
        return actual == null || !String(actual).endsWith(String(expected));
      case "_not_ends_with_nocase":
        return actual == null || !lower(actual).endsWith(lower(expected));
      default:
        throw new Error(`The subgraph fake does not support the filter suffix "${suffix}"`);
    }
  }

  /** orderBy may reach through references: "createdBy__name". */
  function sortKey(entity, orderBy) {
    let typeName = entity.__typename;
    let current = entity;
    let numeric = false;
    const parts = orderBy.split("__");
    for (let index = 0; index < parts.length; index += 1) {
      if (current == null) return { value: null, numeric };
      const definition = fieldDefinition(typeName, parts[index]);
      if (!definition) throw new Error(`The subgraph fake cannot order ${typeName} by "${orderBy}"`);
      const { named } = unwrap(definition.type);
      const value = rawField(typeName, current, parts[index]);
      if (index === parts.length - 1) {
        numeric = NUMERIC_SCALARS.has(named.name);
        return { value: Array.isArray(value) ? value.length : value, numeric };
      }
      current = lookup(named, value);
      typeName = current?.__typename;
    }
    return { value: null, numeric };
  }

  function applyListArgs(items, args) {
    let result = items;
    if (args.where) result = result.filter((item) => matches(item.__typename, item, args.where));
    const orderBy = args.orderBy ?? "id";
    const direction = args.orderDirection === "desc" ? -1 : 1;
    result = [...result].sort((left, right) => {
      const a = sortKey(left, orderBy);
      const b = sortKey(right, orderBy);
      const primary = compareValues(a.value, b.value, a.numeric || b.numeric) * direction;
      return primary !== 0 ? primary : compareValues(left.id, right.id, false);
    });
    const skip = args.skip ?? 0;
    const first = args.first ?? 100;
    return result.slice(skip, skip + first);
  }

  function fieldResolver(source, args, context, info) {
    const { named, list } = unwrap(info.returnType);
    const parentName = info.parentType.name;

    if (parentName === "Query") {
      if (info.fieldName === "_meta") return context.meta;
      if (!isEntityType(named)) {
        throw new Error(`The subgraph fake does not implement Query.${info.fieldName}`);
      }
      if (list) return applyListArgs(collection(named), args);
      return lookup(named, args.id);
    }

    if (parentName.startsWith("_")) return source[info.fieldName];

    const raw = rawField(parentName, source, info.fieldName);
    if (!isEntityType(named)) return raw === undefined ? null : raw;
    if (list) {
      const entities = (raw ?? []).map((id) => lookup(named, id)).filter(Boolean);
      return applyListArgs(entities, args);
    }
    return lookup(named, raw);
  }

  return {
    /** Runs one request the way a subgraph endpoint would. meta is the _meta value. */
    async execute({ query, variables, operationName }, meta) {
      const result = await graphql({
        schema,
        source: query,
        variableValues: variables ?? {},
        operationName,
        contextValue: { meta },
        fieldResolver,
        typeResolver: (value) => value?.__typename,
      });
      return {
        ...(result.data !== undefined ? { data: result.data } : {}),
        ...(result.errors?.length
          ? { errors: result.errors.map((error) => ({ message: error.message, path: error.path })) }
          : {}),
      };
    },
  };
}
