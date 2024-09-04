const puppeteer = require('puppeteer');
const path = require('path');

// 페이지 로드 함수
async function loadPage(browser, url, retries = 5) {
  const page = await browser.newPage();
  // await page.setViewport({
  //       width: 1280,
  //       height: 1080,
  //   });
  // User-Agent 설정 추가
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
  await page.setUserAgent(userAgent);
  // 페이지가 로드되기 전에 헤드리스 브라우저 감지 방지 설정 추가
  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'webdriver', {
  //     get: () => false,
  //   });
  // });

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
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // userDataDir: path.join(__dirname, '../UserData'), // 로그인 정보 쿠키 저장
    });

    // 로그인 페이지 로드
    page = await loadPage(browser, 'https://www.buyma.com/login/');
    // await page.setCacheEnabled(false);
    // await page.reload({ waitUntil: 'networkidle0' });
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
      const elementsInfo = await page.evaluate((id, password) => {
        const loginIdElement = document.querySelector('#txtLoginId');
        const loginPassElement = document.querySelector('#txtLoginPass');
        const loginButtonElement = document.querySelector('#login_do');
    
        if (loginIdElement && loginPassElement && loginButtonElement) {
            // loginIdElement.value = id;
            // loginPassElement.value = password;
            return {
                loginIdElementHtml: loginIdElement.outerHTML,
                loginPassElementHtml: loginPassElement.outerHTML,
                loginButtonElementHtml: loginButtonElement.outerHTML
            };
        } else {
            throw new Error('Login form elements not found');
        }
    }, id, password);
    
    console.log('Login form elements:', elementsInfo);

    // Type the login ID and password slowly
    await page.type('#txtLoginId', id, { delay: 150 }); // Typing ID with 100ms delay between keystrokes
    await page.waitForTimeout(1000); // Wait for 1 second before typing the password

    await page.type('#txtLoginPass', password, { delay: 150 }); // Typing password with 100ms delay between keystrokes

    console.log('Login ID and Password typed slowly.');

    // Wait for a few seconds before entering the password again
    await page.waitForTimeout(3000); // Wait for 3 seconds

    // Type the password again slowly with delay
    // await page.type('#txtLoginPass', password, { delay: 100 }); // Typing password again with 100ms delay between keystrokes

    // Now click the login button
    // await page.click('#login_do');

    // Enter the password again with the delay
  //   await page.evaluate((password) => {
  //     const loginPassElement = document.querySelector('#txtLoginPass');
  //     if (loginPassElement) {
  //         loginPassElement.value = password; // Second password entry
  //     }
  // }, password);
    
    // await page.evaluate(() => {
    //     const loginButtonElement = document.querySelector('#login_do');
    //     loginButtonElement.click();
    // });

      await page.evaluate(() => {
    const loginButtonElement = document.querySelector('#login_do');
    const rect = loginButtonElement.getBoundingClientRect();
    const x = rect.left + (rect.width / 2);
    const y = rect.top + (rect.height / 2);

    loginButtonElement.dispatchEvent(new MouseEvent('mousedown', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    }));

    loginButtonElement.dispatchEvent(new MouseEvent('mouseup', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    }));

    loginButtonElement.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    }));
    });

    // const loginButtonElement = await page.$('#login_do');
    // await loginButtonElement.click();
    // const loginButtonElement = await page.$('#login_do');
    // const boundingBox = await loginButtonElement.boundingBox();

    // await page.mouse.move(
    //     boundingBox.x + boundingBox.width / 2,
    //     boundingBox.y + boundingBox.height / 2
    // );
    // await page.mouse.down();
    // await page.mouse.up();

    // await page.evaluate(() => {
    //   const form = document.querySelector('form');
    //   form.submit();
    // });

    // const loginButtonElement = await page.$('#login_do');
    // await loginButtonElement.click();

    // await page.evaluate(() => {
    //   const loginButtonElement = document.querySelector('#login_do');
    //   if (loginButtonElement) {
    //       setTimeout(() => {
    //           loginButtonElement.click();
    //       }, Math.random() * 3000 + 1000);  // 1초에서 4초 사이의 지연 후 클릭
    //   } else {
    //       throw new Error('Login button not found');
    //   }
    // });
    
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 100000 });
    
        // Check for login error message
        const errElement = await page.$('.error_with_icon');
        if (errElement) {
            const errMessage = await page.evaluate(el => el.outerHTML, errElement);
            console.log('Login Error Element HTML:', errMessage);
        } else {
            console.log('Login successful, no error message found.');
        }
    } catch (error) {
        console.log('Error during login or navigation:', error);
    }

      // console.log('Login ID Element HTML:', elementsInfo.loginIdElementHtml);
      // console.log('Login Pass Element HTML:', elementsInfo.loginPassElementHtml);
      // console.log('Login Button Element HTML:', elementsInfo.loginButtonElementHtml);
      // console.log('로그인 버튼 클릭 완료, 결과 대기 중...');
    
  //   const elementsInfo = await page.evaluate(() => {
  //     const loginIdElement = document.querySelector('#txtLoginId');
  //     const loginPassElement = document.querySelector('#txtLoginPass');
  //     const loginButtonElement = document.querySelector('#login_do');
  
  //     if (loginIdElement && loginPassElement && loginButtonElement) {
  //         return {
  //             loginIdElementHtml: loginIdElement.outerHTML,
  //             loginPassElementHtml: loginPassElement.outerHTML,
  //             loginButtonElementHtml: loginButtonElement.outerHTML
  //         };
  //     } else {
  //         throw new Error('Login form elements not found');
  //     }
  // });
  
  // console.log('Login ID Element HTML:', elementsInfo.loginIdElementHtml);
  // console.log('Login Pass Element HTML:', elementsInfo.loginPassElementHtml);
  // console.log('Login Button Element HTML:', elementsInfo.loginButtonElementHtml);
  // console.log('로그인 정보 입력 중...');
  
  // // Step 1: ID 입력
  // await page.evaluate((id) => {
  //     const loginIdElement = document.querySelector('#txtLoginId');
  //     loginIdElement.value = id;
  // }, id);
  
  // // 잠시 대기 (1초 정도, 필요에 따라 조절)
  // await page.waitForTimeout(1000);
  
  // // Step 2: Password 입력
  // await page.evaluate((password) => {
  //     const loginPassElement = document.querySelector('#txtLoginPass');
  //     loginPassElement.value = password;
  // }, password);
  
  // // 잠시 대기 (1초 정도, 필요에 따라 조절)
  // await page.waitForTimeout(1000);
  
  // Step 3: 로그인 버튼 클릭
  // await page.evaluate(() => {
  //     const loginButtonElement = document.querySelector('#login_do');
  //     loginButtonElement.click();
  // });
//   await page.evaluate(() => {
//     const loginButtonElement = document.querySelector('#login_do');
//     const rect = loginButtonElement.getBoundingClientRect();
//     const x = rect.left + (rect.width / 2);
//     const y = rect.top + (rect.height / 2);

//     loginButtonElement.dispatchEvent(new MouseEvent('mousedown', {
//         view: window,
//         bubbles: true,
//         cancelable: true,
//         clientX: x,
//         clientY: y
//     }));

//     loginButtonElement.dispatchEvent(new MouseEvent('mouseup', {
//         view: window,
//         bubbles: true,
//         cancelable: true,
//         clientX: x,
//         clientY: y
//     }));

//     loginButtonElement.dispatchEvent(new MouseEvent('click', {
//         view: window,
//         bubbles: true,
//         cancelable: true,
//         clientX: x,
//         clientY: y
//     }));
// });
  
      // console.log('로그인 버튼 클릭 완료, 결과 대기 중...');
    }

    // await page.waitForSelector('.user_name', {
    //   visible: true,
    //   timeout: 300000 // 5분으로 타임아웃을 늘립니다.
    // });

    // 페이지 로드 대기
    // await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });

    // if (!(await page.$('.user_name'))) {
    //   console.error('로그인 실패: .user_name 요소를 찾을 수 없습니다.');
    //   return;
    // }

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