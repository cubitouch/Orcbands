// Enter the live camp through the same controls a player uses.
export async function enterCamp(page) {
  if (!await page.locator('#session-overlay').count()) return; // Earlier baseline players.
  await page.locator('#new-game').waitFor({state:'visible',timeout:180000});
  await page.waitForFunction(()=>!document.querySelector('#new-game').disabled,null,{timeout:180000});
  await page.locator('#settings-game').click();
  await page.locator('#music-enabled').uncheck();
  await page.locator('#settings-back').click();
  await page.locator('#new-game').click();
  if(await page.locator('#confirm-yes').isVisible())await page.locator('#confirm-yes').click();
  await page.locator('#intro-skip').click();
  await page.waitForFunction(()=>document.querySelector('#session-overlay').hidden,null,{timeout:60000});
}
