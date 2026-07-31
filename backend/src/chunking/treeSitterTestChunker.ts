import fs from "node:fs";
import Parser from "tree-sitter";
import TypeScriptPackage from "tree-sitter-typescript";

const TypeScript = TypeScriptPackage.typescript;

const source = fs.readFileSync("src/chunking/scratch.test.ts", "utf8");

const parser = new Parser();
parser.setLanguage(TypeScript);

const tree = parser.parse(source);

console.log(tree.rootNode.toString());