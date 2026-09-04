import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "graphql";

const root = process.cwd();
const queryFiles = [
  "badges.graphql",
  "badge.graphql",
  "user.graphql",
  "users.graphql",
  "status.graphql",
  "auction.graphql",
  "orders.graphql",
  "auctionStatus.graphql",
  "lockTransactions.graphql",
  "communities.graphql",
  "community.graphql",
  "communityMembers.graphql",
  "communityActivities.graphql",
];

const documents = Object.fromEntries(
  queryFiles.map((file) => {
    const source = readFileSync(resolve(root, "src/queries", file), "utf8");
    const operations = parse(source).definitions.filter(
      (definition) => definition.kind === "OperationDefinition",
    );
    if (
      operations.length !== 1 ||
      operations[0].operation !== "query" ||
      !operations[0].name
    ) {
      throw new Error(`${file} must contain exactly one named query operation`);
    }

    return [operations[0].name.value, source];
  }),
);

const output = `// Generated from src/queries/*.graphql. Do not edit by hand.
import { parse, print } from "graphql";

const persistedSources = ${JSON.stringify(documents, null, 2)} as const;

export const PERSISTED_GRAPH_DOCUMENTS = new Map<string, string>(
  Object.entries(persistedSources).map(([name, source]) => [
    name,
    print(parse(source)),
  ]),
);
`;

writeFileSync(
  resolve(root, "src/lib/persisted-graphql.generated.ts"),
  output,
);
