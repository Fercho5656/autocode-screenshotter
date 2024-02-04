import { walk, WalkOptions } from "https://deno.land/std@0.170.0/fs/mod.ts";
import { parse } from "https://deno.land/std@0.170.0/flags/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import minimalArgs from "./utils/minimalArgs.ts";
import extensions from "./utils/extensions.ts";

const flags = parse(Deno.args, {
  string: ['out'],
  boolean: ['help', 'dark', 'bg'],
});

const { args } = Deno
const dirArg = args[0] ?? '.'
const outputDir = flags.out ?? './screenshots'
let dir = dirArg

if (Deno.build.os === "windows") {
  dir += '\\'
}

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
  skip: [/node_modules/, /.nuxt/],
}

const files = []

for await (const e of walk(dir, options)) {
  if (e.isFile) {
    files.push({
      name: e.name,
      content: new TextDecoder().decode(await Deno.readFile(e.path)),
      path: e.path
    })
  }
}

const mainSelector = '#__next > div'
const baseSelector = `${mainSelector} > div:nth-child(2) > div > div:nth-child(3) > div > div`
const titleSelector = `${baseSelector} div input`
const containerSelector = `${baseSelector} textarea`
console.time('Task completed in ')
const browser = await puppeteer.launch({
  headless: true,
  args: minimalArgs,
  userDataDir: './tmp',
});
const page = await browser.newPage();
await page.goto('https://www.ray.so/');
// remove controls from the code editor and add dark mode if setted
console.log(mainSelector)
try {
  await page.evaluate(`
  document.querySelector('${mainSelector} > div:nth-child(1)').remove()
  document.querySelector('#__next > div').dataset.theme = "${flags.dark ? 'dark' : 'light'}"
`)
} catch (err) {
  console.log(`cannot clean page, ignoring theme: ${err.toString()}`)
}

for (const file of files) {
  const fileName = file.path.replace(dir, '').replaceAll('\\', '_')
  console.log(`Screenshotting ${file.name} at ${file.path} as ${fileName}`)
  // sets code title
  await page.click(titleSelector)
  await page.keyboard.down('Control')
  await page.keyboard.press('A')
  await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(file.name)
  // delete children from the code editor
  await page.click(containerSelector)
  await page.keyboard.down('Control')
  await page.keyboard.press('A')
  await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  // focus on the code editor and paste the code from the first file replacing four spaces with two
  await page.keyboard.type(file.content)
  // take a screenshot of the code editor
  const element = await page.$(containerSelector);
  await element?.screenshot({ path: `${outputDir}/${fileName}.png` });
}
await browser.close();
console.timeEnd('Task completed in ')
