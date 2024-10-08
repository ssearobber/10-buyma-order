const puppeteer = require('puppeteer');
const path = require('path');

// 페이지 로드 함수
async function loadPage(browser, url, retries = 5) {
  const page = await browser.newPage();
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      return page;
    } catch (error) {
      console.error('Retry loading:', i + 1);
      if (i === retries - 1) throw error;
    }
  }
}

// buyma 取引ID 크롤링 함수
async function buymaOrderList() {
  const id = process.env.BUYMA_ID || buymaId;
  const password = process.env.BUYMA_PASSWORD || buymaPassword;
  let browser = {};
  let page = {};
  let transactionIDArray = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      userDataDir: path.join(__dirname, '../UserData'), // 로그인 정보 쿠키 저장
    });

    // 로그인 페이지 로드
    page = await loadPage(browser, 'https://www.buyma.com/login/');
    if (await page.$('.user_name')) {
      console.log('이미 로그인 되어 있습니다.');
    } else {
      await page.evaluate((id, password) => {
        document.querySelector('#txtLoginId').value = id;
        document.querySelector('#txtLoginPass').value = password;
        document.querySelector('#login_do').click();
      }, id, password);
      console.log('로그인했습니다.');
      await page.waitForTimeout(10000); // 로그인 로딩 기다림
    }

    // 주문 페이지 재시도 로드
    page = await loadPage(browser, 'https://www.buyma.com/my/buyerorders/?kw=&sts[]=0');

    // 크롤링 로직
    console.log('取引ID 취득');
    transactionIDArray = await page.evaluate(() => {
      const tags = document.querySelectorAll('table tbody tr td:nth-of-type(4) p:nth-of-type(2) a');
      return Array.from(tags).map(t => ({ transactionID: t.textContent }));
    });

    console.log('取引ID 크롤링 종료.');
    console.log('취득한 取引ID : ', transactionIDArray);
    return transactionIDArray;
  } catch (e) {
    console.error(e);
  } finally {
    await page.close();
    await browser.close();
  }
}

module.exports.buymaOrderList = buymaOrderList;