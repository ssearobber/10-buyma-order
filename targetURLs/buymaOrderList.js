// const puppeteer = require('puppeteer');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

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
      args: [
        // '--window-size=1920,1080',
        // '--disable-notifications',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      // slowMo : 1 ,
      userDataDir: path.join(__dirname, '../UserData'), // 로그인 정보 쿠키 저장
    });
    page = await browser.newPage();
    // await page.setViewport({
    //     width: 1280,
    //     height: 1080,
    // });
    await page.setDefaultNavigationTimeout(0);
    // User-Agent 설정 추가 (브라우저 버전과 운영 체제를 일반적인 것으로 설정)
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
  await page.setUserAgent(userAgent);

  // 헤드리스 브라우저 감지 방지 설정
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  // 브라우저 언어 및 지역을 일본어로 설정
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ja-JP,ja;q=0.9'
  });

  // 일본 시간대 설정
  await page.emulateTimezone('Asia/Tokyo');

  // 브라우저 기능 숨기기: 크롤링 감지 방지를 위해서 navigator 속성 조작
  await page.evaluateOnNewDocument(() => {
    // navigator 속성 수정
    Object.defineProperty(navigator, 'language', { get: () => 'ja-JP' });
    Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

    // WebGL 감지 방지를 위해 랜덤 렌더러와 벤더 설정
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return 'Google Inc.'; // 웹GL vendor spoof
      }
      if (parameter === 37446) {
        return 'Google SwiftShader'; // 웹GL renderer spoof
      }
      return getParameter(parameter);
    };
  });
    await page.goto('https://www.buyma.com/my/buyerorders/?kw=&sts[]=0');

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
    }

    // 주문 페이지 재시도 로드
    await page.goto('https://www.buyma.com/my/buyerorders/?kw=&sts[]=0', { waitUntil: 'networkidle0', timeout: 100000 });
    await page.waitForTimeout(10000);  // 주문 로딩 기다림
    await page.waitForSelector('table tbody tr td:nth-of-type(4) p:nth-of-type(2) a', {
      visible: true,
      timeout: 30000 // 30초 동안 해당 요소가 나타나길 기다립니다.
    });

    // 크롤링 로직
    console.log('取引ID 취득 시작');
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