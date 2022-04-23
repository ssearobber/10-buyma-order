const puppeteer = require('puppeteer');
const path = require('path');
const { googleProfitSheet } = require('./googleProfitSheet');

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
    await page.goto(`https://www.buyma.com/my/buyerorderdetail/?tid=${transactionID}`);

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

    // 본인 확인 작업 건너뛰기
    if (await page.$('#txtLoginPass')) {
      await page.evaluate((password) => {
        // 본인 확인 입력
        document.querySelector('#txtLoginPass').value = password;
        document.querySelector('#login_do').click();
      }, password);
      console.log('바이머 상세화면에서 본인확인했습니다.');
    } else {
      console.log('바이머 상세화면에 이미 본인확인 되어있습니다.');
    }

    await page.waitForTimeout(20000); // 없으면 크롤링 안됨
    // 주문정보 상세 크롤링
    console.log('주문정보 상세 취득');
    orderDetailObject = await page.evaluate(() => {
      const orderDetailObject = {};
      let productId = document
        .querySelector('table tbody tr:nth-of-type(3) td')
        ?.innerText.match(/\d{8}/g);
      let productCustomerNameArray = document
        .querySelector('table tbody tr:nth-of-type(7) td')
        ?.innerText.split('\n');
      let productCustomerPostalCode = document
        .querySelector('table tbody tr:nth-of-type(9) td')
        ?.innerText.split('\n');
      let productCustomerJPAddress = document
        .querySelector('table tbody tr:nth-of-type(10) td dl:nth-of-type(1) dd')
        ?.innerText.split('\n');
      let productCustomerENAddress = document
        .querySelector('table tbody tr:nth-of-type(10) td dl:nth-of-type(2) dd')
        ?.innerText.split('\n');
      let productCustomerCellPhoneNumber = document
        .querySelector('table tbody tr:nth-of-type(11) td ')
        ?.innerText.match(/\d{2,4}-\d{2,4}-\d{2,4}/g);
      let productCount = document
        .querySelector('table tbody tr:nth-of-type(13) td')
        ?.innerText.match(/\d{1,2}/g);
      // 2021/10/14 update productOrderDate도 지불방식에 따라 테이블 갯수가 달라져서 분기처리
      // 2021/08/14 update 편의점 지불인 경우 분기처리
      let productOrderDate;
      let productColor;
      if (
        document.querySelector('table tbody tr:nth-of-type(14) td')?.innerHTML.match(/コンビニ/g)
      ) {
        productOrderDate = document
          .querySelector('table tbody tr:nth-of-type(17) td')
          ?.innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
        productColor = document.querySelector('table tbody tr:nth-of-type(18) td')?.innerText;
      } else if (
        document
          .querySelector('table tbody tr:nth-of-type(14) td')
          ?.innerHTML.match(/銀行振込（ペイジー）/g)
      ) {
        productOrderDate = document
          .querySelector('table tbody tr:nth-of-type(17) td')
          ?.innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
        productColor = document.querySelector('table tbody tr:nth-of-type(18) td')?.innerText;
      } else {
        productOrderDate = document
          .querySelector('table tbody tr:nth-of-type(16) td')
          ?.innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
        productColor = document.querySelector('table tbody tr:nth-of-type(17) td')?.innerText;
      }

      let productDeliveryMethod = document
        .querySelector('table tbody tr:nth-of-type(12) td')
        ?.innerText.match(/(?<=通常)\d{1,2}/g);

      // 2022/04/23 영어주소 나눠서 취득
      let productCustomerENAddress1;
      let productCustomerENAddress2;
      let productCustomerENAddress3;
      let productCustomerENAddress4;

      // 商品ID
      productId ? (orderDetailObject.productId = '00' + productId[0]) : null;
      // お客様氏名（日本語）
      productCustomerNameArray
        ? (orderDetailObject.productCustomerJPName =
            productCustomerNameArray[0] + ' ' + productCustomerNameArray[1])
        : null;
      // お客様氏名（英語）
      productCustomerNameArray
        ? (orderDetailObject.productCustomerENName = productCustomerNameArray[2])
        : null;
      // 郵便番号
      productCustomerPostalCode
        ? (orderDetailObject.productCustomerPostalCode = productCustomerPostalCode[0])
        : null;
      // 住所（日本語）
      productCustomerJPAddress
        ? (orderDetailObject.productCustomerJPAddress =
            productCustomerJPAddress[0] +
            ' ' +
            productCustomerJPAddress[1] +
            ' ' +
            productCustomerJPAddress[2])
        : null;
      // 住所（英語）
      productCustomerENAddress
        ? (orderDetailObject.productCustomerENAddress =
            productCustomerENAddress[3] +
            ' ' +
            productCustomerENAddress[2] +
            ' ' +
            productCustomerENAddress[1] +
            ' ' +
            productCustomerENAddress[0])
        : null;
      // 2022/04/23 영어주소 나눠서 취득
      // 住所1（英語）
      productCustomerENAddress1
        ? (orderDetailObject.productCustomerENAddress1 = productCustomerENAddress[3])
        : null;
      // 住所1（英語）
      productCustomerENAddress2
        ? (orderDetailObject.productCustomerENAddress2 = productCustomerENAddress[2])
        : null;
      // 住所1（英語）
      productCustomerENAddress3
        ? (orderDetailObject.productCustomerENAddress3 = productCustomerENAddress[1])
        : null;
      // 住所1（英語）
      productCustomerENAddress4
        ? (orderDetailObject.productCustomerENAddress4 = productCustomerENAddress[0])
        : null;
      // 携帯番号
      productCustomerCellPhoneNumber
        ? (orderDetailObject.productCustomerCellPhoneNumber = productCustomerCellPhoneNumber[0])
        : null;
      // 個数
      productCount ? (orderDetailObject.productCount = productCount[0]) : null;
      // 受注日
      productOrderDate ? (orderDetailObject.productOrderDate = productOrderDate[0]) : null;
      // カラー
      orderDetailObject.productColor = productColor;
      // 配送方法
      if (productDeliveryMethod) {
        if (productDeliveryMethod[0] == '4') orderDetailObject.productDeliveryMethod = '国内発送';
        else if (productDeliveryMethod[0] == '5') orderDetailObject.productDeliveryMethod = 'ems';
        else if (productDeliveryMethod[0] == '12')
          orderDetailObject.productDeliveryMethod = 'qxpress';
        else if (productDeliveryMethod[0] == '25')
          orderDetailObject.productDeliveryMethod = 'ems'; // 중국으로부터 오는 유리테이블
        else if (productDeliveryMethod[0] == '30') orderDetailObject.productDeliveryMethod = 'ship';
      }

      return orderDetailObject;
    });
    // 구글 시트(利益計算)에서 商品ID에 해당하는 row넘버, 이익 취득
    console.log('구글 시트(利益計算)에서 정보 취득');
    let googleProfitObject = await googleProfitSheet(orderDetailObject.productId);
    console.log('구글 시트(利益計算)에서 정보 취득 종료');
    // 구글 시트(利益計算)에서 商品ID에 해당하는 row넘버 셋팅
    orderDetailObject.rowNum = googleProfitObject.rowNum;
    // 상품 url 셋팅
    orderDetailObject.productURL = googleProfitObject.productURL;
    // 이익 셋팅
    if (orderDetailObject.productDeliveryMethod == '国内発送') orderDetailObject.productProfit = 0;
    else if (orderDetailObject.productDeliveryMethod == 'ems')
      orderDetailObject.productProfit =
        googleProfitObject.EMSProfit * orderDetailObject.productCount;
    else if (orderDetailObject.productDeliveryMethod == 'qxpress')
      orderDetailObject.productProfit =
        googleProfitObject.qxpressProfit * orderDetailObject.productCount;
    else if (orderDetailObject.productDeliveryMethod == 'ship')
      orderDetailObject.productProfit =
        googleProfitObject.shipProfit * orderDetailObject.productCount;

    // 取引ID
    orderDetailObject.transactionID = transactionID;

    await page.close();
    await browser.close();
    console.log('주문정보 상세 크롤링 종료.');

    return orderDetailObject;
  } catch (e) {
    console.log(e);
    await page.close();
    await browser.close();
  }
}

module.exports.buymaOrderDetail = buymaOrderDetail;
