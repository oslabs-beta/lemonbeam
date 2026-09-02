#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runScan } from "../backend/src/pipelineManager.js";

const program = new Command();

program
    .name("lemonbeam")
    .description("CLI tool to scan repositories and generate AI-powered guides")
    .version("1.0.0")
    .argument(
        "[repositoryPath]",
        "Local directory path or GitHub URL to scan (defaults to current directory)",
    )
    .option(
        "-k, --key <apiKey>",
        "OpenRouter API key (defaults to OPENROUTER_API_KEY from .env)",
    )
    .action(async (repositoryPath, options) => {
        // Default to the current working directory if no path is provided
        const targetPath = repositoryPath || process.cwd();

        // Fallback chain: CLI option -> .env file / environment variable
        const openRouterApiKey = options.key || process.env.OPENROUTER_API_KEY;

        if (!openRouterApiKey) {
        console.error("❌ Error: OpenRouter API key is required.");
        console.error(
            "Please provide it via a .env file (OPENROUTER_API_KEY=your_key) or the --key flag.",
        );
        process.exit(1);
        }

        console.log(
        `🚀 Starting full LemonBeam scan pipeline for: ${targetPath}...`,
        );

        try {
        const result = await runScan({
            repositoryUrl: targetPath,
            openRouterApiKey,
        });

        console.log(
            `✅ Scan completed successfully! (Scan ID: ${result.scanId})`,
        );

        // Interactive prompt to give the user a choice
        const rl = readline.createInterface({ input, output });
        const answer = await rl.question(
            "📄 Would you like to save this generated guide as a markdown file in this project directory? (y/n): ",
        );
        rl.close();

        if (answer.trim().toLowerCase() === "y") {
            const repoName = result.repository?.name || path.basename(targetPath);
            const fileName = `${repoName}-guide.md`;
            const outputDir = /^https?:\/\//.test(targetPath)
                ? process.cwd()
                : path.resolve(targetPath);
            const outputPath = path.resolve(outputDir, fileName);

            await fs.writeFile(outputPath, result.guide.markdown, "utf-8");
            console.log(`✅ Generated guide saved to: ${outputPath}`);
        } else {
            console.log("\n--- GENERATED GUIDE PREVIEW ---\n");
            console.log(result.guide.markdown);
            console.log("\n-------------------------------\n");
            console.log(
            "👍 Guide preview displayed in terminal. No file was saved.",
            );
        }
        } catch (error: any) {
        console.error("❌ Scan failed:", error?.message || error);
        process.exit(1);
        }
    });

program.parse();
