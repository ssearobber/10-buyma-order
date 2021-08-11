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
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
        // slowMo : 1 ,
        userDataDir: path.join(__dirname, '../UserData') // 로그인 정보 쿠키 저장
    });
    page = await browser.newPage();
    // await page.setViewport({
    //     width: 1280,
    //     height: 1080,
    // });
    await page.setDefaultNavigationTimeout(0);
    await page.goto('https://www.buyma.com/my/buyerorders/?kw=&sts[]=0');

    // 로그인 작업 건너뛰기
    if (await page.$('.user_name')) {
        console.log('이미 로그인 되어 있습니다.')
    } else {
        await page.evaluate((id,password) => {
            // login
            document.querySelector('#txtLoginId').value = id;
            document.querySelector('#txtLoginPass').value = password;
            document.querySelector('#login_do').click();
        }, id,password);
        console.log('로그인했습니다.');
        await page.waitForTimeout(10000); // 로그인 로딩 기다림
        await page.goto('https://www.buyma.com/my/buyerorders/?kw=&sts[]=0'); // 로그인 후, 다시 해당 페이지 이동
    }

    await page.waitForTimeout(20000); // 없으면 크롤링 안됨
    // 取引ID 크롤링
    console.log('取引ID취득');
    transactionIDArray = await page.evaluate(() => {
        const tags = document.querySelectorAll('table tbody tr td:nth-of-type(4) p:nth-of-type(2) a');
        const transactionIDArray = [];
        tags.forEach((t)=> {
            transactionIDArray.push({
                transactionID : t.textContent
            })
        });
        return transactionIDArray;
    });
    await page.close();
    await browser.close();
    console.log('取引ID 크롤링 종료.');

    return transactionIDArray;
    }
    catch(e) {
        console.log(e);
        await page.close();
        await browser.close();
    } 
}

module.exports.buymaOrderList = buymaOrderList;