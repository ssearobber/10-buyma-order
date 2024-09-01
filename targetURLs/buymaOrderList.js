const puppeteer = require('puppeteer');
const path = require('path');

// 페이지 로드 함수
async function loadPage(browser, url, retries = 5) {
  const page = await browser.newPage();
  // User-Agent 설정 추가
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
  await page.setUserAgent(userAgent);

  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 100000 });
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
      // userDataDir: path.join(__dirname, '../UserData'), // 로그인 정보 쿠키 저장
    });

    // 로그인 페이지 로드
    page = await loadPage(browser, 'https://www.buyma.com/login/');
    await page.setCacheEnabled(false);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#txtLoginId', {
      visible: true,
      timeout: 100000 // 100초 동안 해당 요소가 나타나길 기다립니다.
    });
    await page.waitForSelector('#txtLoginPass', {
      visible: true,
      timeout: 100000 // 100초 동안 해당 요소가 나타나길 기다립니다.
    });
    await page.waitForSelector('#login_do', {
      visible: true,
      timeout: 100000 // 100초 동안 해당 요소가 나타나길 기다립니다.
    });
    if (await page.$('.user_name')) {
      console.log('이미 로그인 되어 있습니다.');
    } else {
      console.log('로그인 시도...');
      const elementsInfo =await page.evaluate((id, password) => {
        const loginIdElement = document.querySelector('#txtLoginId');
        const loginPassElement = document.querySelector('#txtLoginPass');
        const loginButtonElement = document.querySelector('#login_do');
    
        if (loginIdElement && loginPassElement && loginButtonElement) {
            loginIdElement.value = id;
            loginPassElement.value = password;
            // 3초(3000ms) 후에 로그인 버튼을 클릭하도록 설정
            setTimeout(() => {
                  loginButtonElement.click();
            }, 3000);
            return {
              loginIdElementHtml: loginIdElement.outerHTML,
              loginPassElementHtml: loginPassElement.outerHTML,
              loginButtonElementHtml: loginButtonElement.outerHTML
          };
        } else {
            throw new Error('Login form elements not found');
        }
    }, id, password);
      console.log('Login ID Element HTML:', elementsInfo.loginIdElementHtml);
      console.log('Login Pass Element HTML:', elementsInfo.loginPassElementHtml);
      console.log('Login Button Element HTML:', elementsInfo.loginButtonElementHtml);
      console.log('로그인 버튼 클릭 완료, 결과 대기 중...');
    }

    await page.goto('https://www.buyma.com/my/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.user_name', {
      visible: true,
      timeout: 60000 // 1분 동안 해당 요소가 나타나길 기다립니다.
    });

    // 주문 페이지 재시도 로드
    page = await loadPage(browser, 'https://www.buyma.com/my/buyerorders/?kw=&sts[]=0');
    // await page.waitForTimeout(10000);  // 주문 로딩 기다림
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