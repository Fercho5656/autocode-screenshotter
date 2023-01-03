import { walk, WalkOptions } from "https://deno.land/std@0.170.0/fs/mod.ts";
import { parse } from "https://deno.land/std@0.170.0/flags/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

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

console.log('Creating screenshots folder...')
try {
  await Deno.mkdir(outputDir)
  console.log('Screenshots folder created')
} catch (_) {
  console.log('Screenshots folder already exists')
}

const options: WalkOptions = {
  exts: ['.ts', '.js', '.vue', '.astro'],
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

console.log(`Screenshoting ${files[0].name}`)

const minimal_args = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];
const containerSelector = '#export-container'
const carbonSelector = '#export-container > div > div.react-codemirror2.CodeMirror__container.window-theme__none > div > div.CodeMirror-scroll > div.CodeMirror-sizer > div > div > div > div.CodeMirror-code'

console.time('Screenshoting')
// speed up the screenshot time by using the same browser instance
console.time('Setting browser')
const browser = await puppeteer.launch({
  headless: true,
  args: minimal_args,
  userDataDir: './tmp',
});
const page = await browser.newPage();
await page.goto('https://carbon.now.sh/');
console.timeEnd('Setting browser')
for (const file of files) {
  //delete children from the code editor
  await page.click(carbonSelector)
  await page.keyboard.down('Control')
  await page.keyboard.press('A')
  await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  // focus on the code editor and paste the code from the first file replacing four spaces with two
  console.time('Searching guilty')
  await page.keyboard.type(file.content)
  console.timeEnd('Searching guilty')
  // take a screenshot of the code editor
  const element = await page.$(containerSelector);
  console.time(`Screenshoting ${file.name}`)
  await element?.screenshot({ path: `${outputDir}/${file.name}.jpg` });
  console.timeEnd(`Screenshoting ${file.name}`)
}
await browser.close();
console.timeEnd('Screenshoting')