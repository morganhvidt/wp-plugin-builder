/**
 * Morgan's WordPress Plugin Build File.
 * @version 2.0.1
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import * as esbuild from "esbuild";
import pluginsConfig from "./wp-plugins.config.js";

/**
 * Morgan's WordPress Plugin Build File.
 *
 * NOTE: DON"T EDIT THIS FILE DIRECTLY. SET UP PLUGINS IN plugins.config.js
 *
 * NOTE: Building requires you to install @wordpress/scripts in package.json
 *
 * If you come across this, please provide credits or say thanks @morganhvidt.
 */
async function start(mode = "build") {
	console.time("Total time");
	console.log("👋 Build Starting");
	const { plugins } = pluginsConfig;
	const arg = process.argv[2];

	try {
		await Promise.all(
			plugins.map(async (plugin) => {
				const pluginConfig = plugin;
				const sourceFolder = pluginConfig.sourceFolder || "src";
				const productionFolder =
					pluginConfig.productionFolder ||
					`production/plugins/${pluginConfig.slug}`;
				const zipPath = pluginConfig.zipFolder || "production/zip";

				if (mode === "clean" || mode === "build" || mode === "production") {
					console.log(`🧼 Cleaning up: ${pluginConfig.slug}`);
					await deleteInner(productionFolder);
				}

				if (mode === "build" || mode === "production") {
					console.log(`🧱 Creating Files & Replacements: ${pluginConfig.slug}`);
					await copyFilesAndFolders(
						sourceFolder,
						productionFolder,
						pluginConfig.excludePatterns,
						replacements(pluginConfig),
						pluginConfig,
					);
					console.log(`🎨 Compiling Scripts: ${pluginConfig.slug}`);
					await compileJS(pluginConfig);

					// Only generate translations after all files are copied and processed
					if (pluginConfig.translation) {
						console.log(`📝 Generating Translations: ${pluginConfig.slug}`);
						if (pluginConfig.translation.simple) {
							await runMakePotSimple();
						} else {
							await generateTranslations(pluginConfig);
						}
					}

					// Add CSS minification step
					if (pluginConfig.minify) {
						console.log(`📦 Minifying Files: ${pluginConfig.slug}`);
						await minifyFiles(pluginConfig);
					}
				}

				if (arg === "production") {
					console.log(`🤐 Zipping Plugin: ${pluginConfig.slug}`);
					await zipFolder(
						productionFolder,
						`${zipPath}/${pluginConfig.slug}-${pluginConfig.version}.zip`,
					);
				}
			}),
		);

		console.log("🎉 Build Finished");
	} catch (err) {
		console.log("🤬 Error during build:");
		console.log(err);
	} finally {
		console.timeEnd("Total time");
	}
}

let watcher;
let timeoutIds = {};

function watchPlugin(plugin) {
	const sourceFolder = plugin.sourceFolder || "src";
	const productionFolder =
		plugin.productionFolder || `production/${plugin.slug}`;

	watcher = fs.watch(
		sourceFolder,
		{ recursive: true },
		(eventType, filename) => {
			console.log(`📁 File ${filename} changed (${eventType})`);

			// Check if the changed file matches any of the exclude patterns
			if (
				defaultExcludePatterns.some((pattern) =>
					matchPattern(filename, pattern),
				)
			) {
				console.log(`⛔ Ignoring ${filename}`);
				return;
			}

			// Clear the previous timeout if it exists
			if (timeoutIds[plugin.slug]) {
				clearTimeout(timeoutIds[plugin.slug]);
			}

			// Set a new timeout
			timeoutIds[plugin.slug] = setTimeout(async () => {
				try {
					console.log(`🔄 Processing ${filename} in ${plugin.slug}`);
					await copyFilesAndFolders(
						sourceFolder,
						productionFolder,
						plugin.excludePatterns,
						replacements(plugin),
						plugin,
					);
				} catch (err) {
					console.error(
						`🤬 Error updating ${filename} in ${plugin.slug}:`,
						err,
					);
				}
			}, 2000); // 2 seconds delay
		},
	);
}

function watch() {
	console.log("👀 Watching for file changes");
	const { plugins } = pluginsConfig;

	plugins.forEach((plugin) => {
		watchPlugin(plugin);
	});
}

/**
 * Functions.
 */

const defaultExcludePatterns = [
	"example/readme.txt",
	// '**/readme.txt',
	"**/.git/**",
	"**.git**",
	"**/node_modules/**",
	"**/vendor/**",
	"**/dist/**",
	"**/production/**",
	"**/*.log",
	"**/*.tmp",
	"**/*.bak",
	"**/*.swp",
	"**/*.md",
	"**/composer.json",
	"**/*.DS_Store",
];

/**
 * Replace template parts through out the project.
 *
 * @param pluginConfig — array.
 * @return object.
 */
function replacements(pluginConfig) {
	const replace = [
		{
			match: "XPLUGIN_NAME",
			replacement: pluginConfig.name,
		},
		{
			match: "XPLUGIN_PREFIX_CAPITAL",
			replacement: pluginConfig.prefix_capital,
		},
		{
			match: "XPLUGIN_PREFIX",
			replacement: pluginConfig.prefix,
		},
		{
			match: "XPLUGIN_TEXT_DOMAIN",
			replacement: pluginConfig.text_domain,
		},
		{
			match: "XPLUGIN_VERSION",
			replacement: pluginConfig.version,
		},
		{
			match: "XPLUGIN_SLUG",
			replacement: pluginConfig.slug,
		},
		{
			match: "XPLUGIN_DESCRIPTION",
			replacement: pluginConfig.description,
		},
		{
			match: "XPLUGIN_EDD_ITEM_ID",
			replacement: pluginConfig.edd_item_id ? pluginConfig.edd_item_id : "",
		},
		{
			match: "XPLUGIN_EDD_STORE_URL",
			replacement: pluginConfig.edd_store_url ? pluginConfig.edd_store_url : "",
		},
		{
			match: "XPLUGIN_AUTHOR",
			replacement: pluginConfig.author ? pluginConfig.author : "",
		},
	];

	return replace;
}

async function deleteInner(dirPath) {
	if (fs.existsSync(dirPath)) {
		const files = fs.readdirSync(dirPath);

		// eslint-disable-next-line no-restricted-syntax
		for (const file of files) {
			const filePath = path.join(dirPath, file);
			const stat = fs.lstatSync(filePath);

			if (stat.isDirectory()) {
				// Recursively delete subdirectories
				// eslint-disable-next-line no-await-in-loop
				await deleteInner(filePath);
			} else {
				// Delete files
				fs.unlinkSync(filePath);
			}
		}

		// Delete the empty directory
		fs.rmdirSync(dirPath);
	}
}

/**
 * Recursively copies files and folders from a source directory to a destination directory,
 * excluding specified path patterns and files.
 *
 * @param {string} src - The path to the source directory.
 * @param {string} dist - The path to the destination directory.
 * @param {string[]} [excludePatterns=['classes/**', 'readme.txt']] - An array of path patterns (using glob syntax) to exclude from the copying process.
 * @returns {Promise<void>} - A promise that resolves when the copying process is complete.
 *
 * @example
 * // Exclude the 'classes' folder and 'readme.txt' file
 */
async function copyFilesAndFolders(
	src,
	dist,
	excludePatterns = [],
	replacements = [],
	pluginConfig,
) {
	excludePatterns = [...defaultExcludePatterns, ...excludePatterns];

	// Create the destination directory if it doesn't exist
	if (!fs.existsSync(dist)) {
		fs.mkdirSync(dist, { recursive: true });
	}

	// Get the list of files and folders in the source directory
	const files = fs.readdirSync(src);

	await Promise.all(
		files.map(async (file) => {
			const srcPath = path.join(src, file);
			let distPath = path.join(dist, file);

			const stat = fs.lstatSync(srcPath);

			if (excludePatterns.some((pattern) => matchPattern(srcPath, pattern))) {
				// Exclude files and folders matching the specified patterns
				return;
			}

			if (stat.isDirectory()) {
				// Recursively copy subdirectories
				await copyFilesAndFolders(
					srcPath,
					distPath,
					excludePatterns,
					replacements,
					pluginConfig,
				);
			} else {
				// Rename files if needed.
				if (file.includes("XPLUGIN-SLUG")) {
					distPath = distPath.replace("XPLUGIN-SLUG", pluginConfig.slug);
				}
				// Copy files
				fs.copyFileSync(srcPath, distPath);

				// Perform text replacements in the copied file
				if (replacements.length > 0) {
					// Perform text replacements in the copied file
					let fileContent = fs.readFileSync(distPath, "utf8");

					replacements.forEach((replacement) => {
						const regex = new RegExp(replacement.match, "g");
						fileContent = fileContent.replace(regex, replacement.replacement);
					});

					// Remove blocks of code depending on the plugin type
					if (pluginConfig.type === "free") {
						const blockRegex =
							/(\/\/ @if type = 'premium'\s[\s\S]*?\/\/ @endif\s)/g;
						fileContent = fileContent.replace(blockRegex, "");

						const commentRegex =
							/(\/\/ @if type = 'free'\s)([\s\S]*?)(\/\/ @endif\s)/g;
						fileContent = fileContent.replace(commentRegex, "$2");
					} else if (pluginConfig.type === "premium") {
						const blockRegex =
							/(\/\/ @if type = 'free'\s[\s\S]*?\/\/ @endif\s)/g;
						fileContent = fileContent.replace(blockRegex, "");

						const commentRegex =
							/(\/\/ @if type = 'premium'\s)([\s\S]*?)(\/\/ @endif\s)/g;
						fileContent = fileContent.replace(commentRegex, "$2");
					}

					fs.writeFileSync(distPath, fileContent, "utf8");
				}
			}
		}),
	);
}

function matchPattern(file, pattern) {
	// Convert glob pattern to regular expression
	pattern = pattern.split("/").join("\\/");
	pattern = pattern.split(".").join("\\.");
	pattern = pattern.split("*").join(".*");
	pattern = pattern.split("?").join(".");
	pattern = "^" + pattern + "$";

	const regex = new RegExp(pattern);

	return regex.test(file);
}

async function zipFolder(folderPath, outputFilePath) {
	// Convert relative paths to absolute paths
	folderPath = path.resolve(folderPath);
	outputFilePath = path.resolve(outputFilePath);

	const outputDir = path.dirname(outputFilePath);
	const folderToZip = path.basename(folderPath);
	const parentDir = path.dirname(folderPath);

	fs.mkdirSync(outputDir, { recursive: true });

	// console.log(`folderPath: ${folderPath}`);
	// console.log(`outputFilePath: ${outputFilePath}`);
	// console.log(`folderToZip: ${folderToZip}`);
	// console.log(`parentDir: ${parentDir}`);

	try {
		const zipProcess = spawn("zip", ["-r", "-q", outputFilePath, folderToZip], {
			cwd: parentDir,
		});

		zipProcess.on("error", (error) => {
			console.error(`Error: ${error}`);
			throw error;
		});

		await new Promise((resolve, reject) => {
			zipProcess.on("exit", (code) => {
				if (code === 0) {
					// console.log('Zip process completed successfully');
					resolve();
				} else {
					console.error(`Zip process exited with code ${code}`);
					reject(new Error(`Zip process exited with code ${code}`));
				}
			});
		});
	} catch (error) {
		console.error(`Failed to zip folder: ${error}`);
		throw error;
	}
}

function openFolderInFinder(relativePath) {
	const absolutePath = path.resolve(relativePath);
	console.log("Open folder", `file://${absolutePath}`);
}

async function compileJS(currentPlugin, mode = "production") {
	if (currentPlugin.compile) {
		const promises = currentPlugin.compile.map(async (config) => {
			const entry = path.resolve(process.cwd(), config.entry);
			const output = path.resolve(process.cwd(), config.output.path);
			const outputPath = path.join(output, config.output.filename);

			try {
				await esbuild.build({
					entryPoints: [entry],
					outfile: outputPath,
					bundle: true,
					minify: mode === "production",
					sourcemap: mode === "development",
					format: "iife",
					target: ["es2015"],
					loader: {
						".js": "jsx",
					},
					jsx: "transform",
				});
			} catch (error) {
				console.error(`Error bundling JavaScript file ${entry}:`, error);
				throw error;
			}
		});

		return Promise.all(promises);
	}
}

async function minifyFiles(currentPlugin) {
	if (!currentPlugin.minify) return;

	const promises = currentPlugin.minify.map(async (config) => {
		const inputPath = path.resolve(process.cwd(), config.entry);
		const outputPath = path.resolve(process.cwd(), config.output);
		const outputDir = path.dirname(outputPath);
		const ext = path.extname(inputPath);

		// Create output directory if it doesn't exist
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		try {
			const source = fs.readFileSync(inputPath, "utf8");

			// Minify with esbuild using appropriate loader
			const result = await esbuild.transform(source, {
				loader: ext.replace(".", ""), // "css" or "js"
				minify: true,
			});

			// Write minified output
			fs.writeFileSync(outputPath, result.code);

			// Log optimization stats
			const originalSize = Buffer.byteLength(source, "utf8");
			const minifiedSize = Buffer.byteLength(result.code, "utf8");
			const efficiency = ((originalSize - minifiedSize) / originalSize) * 100;

			console.log(
				`- ${path.basename(inputPath)} minified ${Math.round(efficiency)}%`,
			);
		} catch (error) {
			console.error(`Error minifying file ${inputPath}:`, error);
			throw error;
		}
	});

	return Promise.all(promises);
}

async function generateTranslations(plugin) {
	return new Promise((resolve, reject) => {
		const args = [
			"@wp-blocks/make-pot",
			plugin.translation.source,
			plugin.translation.destination,
			plugin.translation.headers
				? `--headers=${Object.entries(plugin.translation.headers)
					.map(([key, value]) => `${key}:${value}`)
					.join(",")}`
				: null,
			"--silent",
			"--skip-audit",
		].filter(Boolean); // Remove any nulls

		const proc = spawn("npx", args, {
			stdio: ["ignore", "pipe", "pipe"],
			shell: true,
		});

		let output = "";
		let errorOutput = "";

		proc.stdout.on("data", (data) => {
			output += data.toString();
		});
		proc.stderr.on("data", (data) => {
			errorOutput += data.toString();
		});

		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				console.error("makepot failed with code", code);
				if (output) console.error("stdout:", output.trim());
				if (errorOutput) console.error("stderr:", errorOutput.trim());
				reject(new Error(`makepot exited with code ${code}`));
			}
		});
	});
}

/**
 * Handle arguments.
 */
async function handleArgs() {
	const arg = process.argv[2];

	switch (arg) {
		case "clean":
			start("clean");
			break;
		case "build":
			start("build");
			break;
		case "production":
			start("production");
			break;
		case "watch":
			watch();
			break;
		case "dev":
			await start("build");
			watch();
			break;
		default:
			console.log("🤬 Error: Please provide a valid argument.");
	}
}

handleArgs();
