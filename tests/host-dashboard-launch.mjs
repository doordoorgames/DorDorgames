import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../artifacts/doordoor/dist/public/", import.meta.url));
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let content;
    try { content = await readFile(file); }
    catch { file = path.join(root, "index.html"); content = await readFile(file); }
    res.setHeader("Content-Type", file.endsWith(".js") ? "application/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
    res.end(content);
  } catch (error) { res.writeHead(500).end(String(error)); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const games = [
  ["charades", "Charades", "charades"], ["spy", "Spy", "spy"],
  ["tfadhloon", "Tfadhloon", "tfadhloon"], ["forehead", "Guess Your Word", "guessyourword"],
  ["guessthecharacter", "Guess the Character", "guessthecharacter"],
].map(([slug, title, domain]) => ({id:`game_${slug}`,slug,title,titleAr:title,status:"active",visible:true,route:`/${slug}`,externalUrl:`https://${domain}.dordor.games`}));
const account = {id:"test-host",role:"host",fullName:"Test Host",phone:"+447700900099",permanentTestAccess:true,remainingMinutes:0,activeSessionEndsAt:null};
const room = {id:"room-id",code:"DEMO99",hostPhone:account.phone,activeGameId:"game_charades",guests:[],open:true,expiresAt:null,activeGame:games[0]};
async function setup({existing=false,fail=false}={}) {
  const page=await browser.newPage();
  const created=[];
  await page.route("**/*", async route => {
    const url=new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      let body;
      if(url.pathname==="/api/auth/me")body=account;
      else if(url.pathname==="/api/games")body=games;
      else if(url.pathname==="/api/rooms" && route.request().method()==="POST") {
        created.push(route.request().postDataJSON());
        await route.fulfill({status:fail?503:201,json:fail?{error:"Room service unavailable"}:room});return;
      } else if(url.pathname==="/api/rooms")body=existing?[room]:[];
      else if(url.pathname==="/api/rooms/DEMO99")body=room;
      else throw Error(`Unexpected API request ${url.pathname}`);
      await route.fulfill({json:body}); return;
    }
    if(games.some(game=>url.origin===game.externalUrl)){await route.fulfill({contentType:"text/html",body:"<h1>Selected game opened</h1>"});return;}
    if(url.origin===origin){await route.continue();return;}
    await route.abort();
  });
  await page.goto(`${origin}/host/dashboard`);
  return {page,created};
}
try {
  browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL || "msedge"});
  for(const game of games) {
    const {page,created}=await setup();
    await page.getByRole("heading",{name:game.title,exact:true}).click();
    await page.getByRole("button",{name:/START FUN/}).click();
    await page.waitForURL(`${game.externalUrl}/`);
    assert.deepEqual(created,[{gameId:game.id}]);
    console.log(`PASS: Start Fun opens ${game.title} after room creation`);
    await page.close();
  }
  const {page:legacy}=await setup({existing:true});
  const open=legacy.getByRole("link",{name:/OPEN GAME/});
  assert.equal(await open.getAttribute("href"),games[0].externalUrl);
  await open.click();await legacy.waitForURL(`${games[0].externalUrl}/`);await legacy.close();
  console.log("PASS: Existing room can open its selected game");
  const {page:failed}=await setup({fail:true});
  await failed.getByRole("heading",{name:"Charades",exact:true}).click();
  await failed.getByRole("button",{name:/START FUN/}).click();
  await failed.getByText("Room service unavailable",{exact:true}).waitFor();
  assert.equal(new URL(failed.url()).pathname,"/host/dashboard");await failed.close();
  console.log("PASS: Failed room creation stays on the dashboard and displays the error");
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
