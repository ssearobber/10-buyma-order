const puppeteer = require('puppeteer');
const path = require('path');

// buyma 주문정보 상세 크롤링
async function buymaOrderDetail(transactionID) {
    
    const id = process.env.BUYMA_ID || buymaId;
    const password = process.env.BUYMA_PASSWORD || buymaPassword;
    let browser = {};
    let page = {};

    let orderDetailObject = {};

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
    await page.goto(`https://www.buyma.com/my/buyerorderdetail/?tid=${transactionID}`);

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
        console.log('로그인했습니다.')
    }

    // 본인 확인 작업 건너뛰기
    if (await page.$('#txtLoginPass')) {
        await page.evaluate((password) => {
            // 본인 확인 입력
            document.querySelector('#txtLoginPass').value = password;
            document.querySelector('#login_do').click();
        }, password);
        console.log('본인확인했습니다.')
    } else {
        console.log('이미 본인확인 되어있습니다.')
    }

    await page.waitForTimeout(20000); // 없으면 크롤링 안됨
    // 주문정보 상세 크롤링
    console.log('주문정보 상세 취득');
    orderDetailObject = await page.evaluate(() => {
        const orderDetailObject = {};
        let productId = document.querySelector("table tbody tr:nth-of-type(3) td").innerText.match(/\d{8}/g);
        let productCustomerNameArray = document.querySelector("table tbody tr:nth-of-type(7) td").innerText.split('\n');
        let productCustomerPostalCode = document.querySelector("table tbody tr:nth-of-type(9) td").innerText.split('\n');
        
        // 商品ID
        orderDetailObject.productId = productId;
        // お客様氏名（日本語）
        orderDetailObject.productCustomerJPName = productCustomerNameArray[0] + " " +productCustomerNameArray[1];
        // お客様氏名（英語）
        orderDetailObject.productCustomerENName = productCustomerNameArray[2];
        // 郵便番号
        orderDetailObject.productCustomerPostalCode = productCustomerPostalCode;
        return orderDetailObject;
    });

    // TODO 구글 시트(利益計算)에서 商品ID에 해당하는 row넘버, 이익 취득

    await page.close();
    await browser.close();
    console.log('주문정보 상세 크롤링 종료.');

    return orderDetailObject;
    }
    catch(e) {
        console.log(e);
        await page.close();
        await browser.close();
    } 
}

module.exports.buymaOrderDetail = buymaOrderDetail;