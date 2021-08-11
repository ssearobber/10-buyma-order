const puppeteer = require('puppeteer');
const path = require('path');
const { buymaOrderDetail } = require('./buymaOrderDetail');

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
        let productCustomerJPAddress = document.querySelector("table tbody tr:nth-of-type(10) td dl:nth-of-type(1) dd").innerText.split('\n');
        let productCustomerENAddress = document.querySelector("table tbody tr:nth-of-type(10) td dl:nth-of-type(2) dd").innerText.split('\n');
        let productCustomerCellPhoneNumber = document.querySelector("table tbody tr:nth-of-type(11) td ").innerText.match(/\d{2,4}-\d{2,4}-\d{2,4}/g);
        let productCount = document.querySelector("table tbody tr:nth-of-type(13) td ").innerText.match(/\d{1,2}/g);
        let productOrderDate = document.querySelector("table tbody tr:nth-of-type(17) td ").innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
        let productColor = document.querySelector("table tbody tr:nth-of-type(18) td ").innerText;
        let productDeliveryMethod = document.querySelector("table tbody tr:nth-of-type(12) td ").innerText.match(/(?<=通常)\d{1}/g);;

        // 商品ID
        orderDetailObject.productId = productId;
        // お客様氏名（日本語）
        orderDetailObject.productCustomerJPName = productCustomerNameArray[0] + " " +productCustomerNameArray[1];
        // お客様氏名（英語）
        orderDetailObject.productCustomerENName = productCustomerNameArray[2];
        // 郵便番号
        orderDetailObject.productCustomerPostalCode = productCustomerPostalCode;
        // 住所（日本語）
        orderDetailObject.productCustomerJPAddress = productCustomerJPAddress[0] + " " + productCustomerJPAddress[1] + " " + productCustomerJPAddress[2]
        // 住所（英語）
        orderDetailObject.productCustomerENAddress = productCustomerENAddress[3] + " " + productCustomerENAddress[2] + " " + productCustomerENAddress[1] + " " + productCustomerENAddress[0]
        // 携帯番号
        orderDetailObject.productCustomerCellPhoneNumber = productCustomerCellPhoneNumber;
        // 個数
        orderDetailObject.productCount = productCount;
        // 受注日
        orderDetailObject.productOrderDate = productOrderDate;
        // カラー
        orderDetailObject.productColor = productColor;
        // 配送方法
        if (productDeliveryMethod == "4") productDeliveryMethod = "国内発送"
        else if (productDeliveryMethod == "5") productDeliveryMethod = "ems"
        else if (productDeliveryMethod == "12") productDeliveryMethod = "qxpress"
        else if (productDeliveryMethod == "30") productDeliveryMethod = "ship"

        orderDetailObject.productDeliveryMethod = productDeliveryMethod;
        
        return orderDetailObject;
    });

    // TODO 구글 시트(利益計算)에서 商品ID에 해당하는 row넘버, 이익 취득
    googleProfitSheet(orderDetailObject.productId);

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