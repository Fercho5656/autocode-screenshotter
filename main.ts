import { walk, WalkOptions } from "https://deno.land/std@0.170.0/fs/mod.ts";
import { parse } from "https://deno.land/std@0.170.0/flags/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import minimalArgs from "./utils/minimalArgs.ts";
import extensions from "./utils/extensions.ts";

const flags = parse(Deno.args, {
  string: ["out"],
  boolean: ["help"],
});

const { args } = Deno
const dirArg = args[0] ?? '.'
const outputDir = flags.out ?? './screenshots'

if (flags.help) {
  console.log(`Usage: deno run --allow-read --allow-write --allow-run --allow-env main.ts [dir] [options]`)
  console.log(`Options:`)
  console.log(`  --out [dir]  Output directory for screenshots (default: ./screenshots)`)
  Deno.exit(0)
}

if (!import.meta.main) Deno.exit(0)

console.log('Looking for screenshots folder...')
try {
  await Deno.mkdir(outputDir)
  console.log('Screenshots folder created')
} catch (_) {
  console.log('Screenshots folder already exists')
}

const options: WalkOptions = {
  exts: extensions,
  skip: [/node_modules/],
}

const files = []

for await (const e of walk(dirArg, options)) {
  if (e.isFile) {
    files.push({
      name: e.name,
      content: new TextDecoder().decode(await Deno.readFile(e.path))
    })
  }
}

const containerSelector = '#frame > div.drag-control-points'

const browser = await puppeteer.launch({
  headless: true,
  args: minimalArgs,
  userDataDir: './tmp',
});
const page = await browser.newPage();
await page.goto('https://www.ray.so/');
// remove controls from the code editor
await page.evaluate(`
  document.querySelector('#app > main > section').remove()
`)

for (const file of files) {
  //delete children from the code editor
  await page.click(containerSelector)
  await page.keyboard.down('Control')
  await page.keyboard.press('A')
  await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  // focus on the code editor and paste the code from the first file replacing four spaces with two
  await page.keyboard.type(file.content)
  // take a screenshot of the code editor
  const element = await page.$(containerSelector);
  await element?.screenshot({ path: `${outputDir}/${file.name}.jpg` });
}
await browser.close();