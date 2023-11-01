const puppeteer = require('puppeteer');
const path = require('path');

// buyma 取引ID 크롤링
async function buymaOrderList() {
  const id = process.env.BUYMA_ID || buymaId;
  const password = process.env.BUYMA_PASSWORD || buymaPassword;
  let browser = {};
  let page = {};

  let transactionIDArray = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        // '--window-size=1920,1080',
        // '--disable-notifications',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      // slowMo : 1 ,
      //userDataDir: path.join(__dirname, '../UserData'), // 로그인 정보 쿠키 저장
    });
    page = await browser.newPage();
    // await page.setViewport({
    //     width: 1280,
    //     height: 1080,
    // });
    await page.setDefaultNavigationTimeout(0);
    await page.goto('https://www.buyma.com/my/buyerorders/?kw=&sts[]=0', { waitUntil: 'networkidle0' });
    // await page.goto('https://www.buyma.com/my/orders/search?statuses%5Bplaced%5D=true&statuses%5Bshipped%5D=false&statuses%5Bpre_order%5D=false&keyword=&memo_only=false&order_id=&brand_id=&shop_url=&stock_status=any&shipping_id=&placed_from=&placed_to=&shipped_from=&shipped_to=&claim_answers%5Bnot_arrived%5D=false&claim_answers%5Bothers%5D=false&repeater=false&speed_delivery=false&duties_on_shopper=false&rows=20&page=1&sort=placed_date&order=desc', {
    //   waitUntil: 'networkidle0'
    // });

    // 로그인 작업 건너뛰기
    if (await page.$('.user_name')) {
      console.log('이미 로그인 되어 있습니다.');
    } else {
      await page.evaluate(
        (id, password) => {
          // login
          document.querySelector('#txtLoginId').value = id;
          document.querySelector('#txtLoginPass').value = password;
          document.querySelector('#login_do').click();
        },
        id,
        password,
      );
      console.log('로그인했습니다.');
      await page.waitForTimeout(10000); // 로그인 로딩 기다림
      await page.goto('https://www.buyma.com/my/buyerorders/?kw=&sts[]=0', {
        waitUntil: 'networkidle0',
        timeout: 30000,
      }); // 로그인 후, 다시 해당 페이지 이동
    }

    await page.waitForTimeout(20000); // 없으면 크롤링 안됨
    // 取引ID 크롤링
    console.log('取引ID취득');
    transactionIDArray = await page.evaluate(() => {
      const tags = document.querySelectorAll('table tbody tr td:nth-of-type(4) p:nth-of-type(2) a');
      const transactionIDArray = [];
      tags.forEach((t) => {
        transactionIDArray.push({
          transactionID: t.textContent,
        });
      });
      return transactionIDArray;
    });
    await page.close();
    await browser.close();
    console.log('取引ID 크롤링 종료.');

    return transactionIDArray;
  } catch (e) {
    console.log(e);
    await page.close();
    await browser.close();
  }
}

module.exports.buymaOrderList = buymaOrderList;
