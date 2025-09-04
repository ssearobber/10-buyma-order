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
      
      // 로그인 후 페이지 로딩 대기
      await page.waitForTimeout(3000);
    }

    // 본인 확인 작업 건너뛰기
    if (await page.$('#txtLoginPass')) {
      await page.evaluate((password) => {
        // 본인 확인 입력
        document.querySelector('#txtLoginPass').value = password;
        document.querySelector('#login_do').click();
      }, password);
      console.log('바이머 상세화면에서 본인확인했습니다.');
      
      // 본인 확인 후 페이지 로딩 대기
      await page.waitForTimeout(5000);
    } else {
      console.log('바이머 상세화면에 이미 본인확인 되어있습니다.');
    }
    
    // 현재 URL 확인 및 올바른 페이지로 이동
    const currentUrl = page.url();
    const expectedUrl = `https://www.buyma.com/my/buyerorderdetail/?tid=${transactionID}`;
    
    console.log('현재 URL:', currentUrl);
    console.log('예상 URL:', expectedUrl);
    
    if (!currentUrl.includes('buyerorderdetail')) {
      console.log('올바르지 않은 페이지입니다. 주문 상세 페이지로 이동합니다.');
      await page.goto(expectedUrl);
      await page.waitForTimeout(5000);
    }

    // 페이지 로딩 대기 시간 증가 및 요소 존재 확인
    await page.waitForTimeout(30000); // 30초로 증가
    
    // 주문정보 상세 크롤링
    console.log('주문정보 상세 취득');
    
    // 페이지에 필요한 요소가 있는지 확인 및 디버깅
    const pageInfo = await page.evaluate(() => {
      const table = document.querySelector('table');
      const tbody = document.querySelector('table tbody');
      const targetRow = document.querySelector('table tbody tr:nth-of-type(3) td');
      
      // 페이지의 모든 테이블 행 확인
      const allRows = document.querySelectorAll('table tbody tr');
      const rowsInfo = [];
      
      for (let i = 0; i < Math.min(10, allRows.length); i++) {
        const cells = allRows[i].querySelectorAll('td');
        if (cells.length > 0) {
          rowsInfo.push({
            rowIndex: i + 1,
            firstCellText: cells[0] ? cells[0].innerText.substring(0, 100) : 'empty'
          });
        }
      }
      
      return {
        hasTable: !!table,
        hasTbody: !!tbody,
        hasTargetRow: !!targetRow,
        totalRows: allRows.length,
        rowsInfo: rowsInfo,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('=== 페이지 구조 분석 ===');
    console.log('페이지 제목:', pageInfo.pageTitle);
    console.log('현재 URL:', pageInfo.url);
    console.log('테이블 존재:', pageInfo.hasTable);
    console.log('tbody 존재:', pageInfo.hasTbody);
    console.log('3번째 행 존재:', pageInfo.hasTargetRow);
    console.log('총 행 수:', pageInfo.totalRows);
    console.log('처음 10개 행 정보:');
    pageInfo.rowsInfo.forEach(row => {
      console.log(`  ${row.rowIndex}번째 행: ${row.firstCellText}`);
    });
    console.log('========================');
    
    if (!pageInfo.hasTargetRow) {
      console.log('필요한 요소를 찾을 수 없습니다. 페이지가 예상대로 로드되지 않았을 수 있습니다.');
      // 기본 객체 반환
      orderDetailObject = {
        productId: '',
        transactionID: transactionID,
        rowNum: 0,
        productURL: '',
        productProfit: 0,
        productDeliveryMethod: '',
        productCustomerJPName: '',
        productCustomerENName: '',
        productCustomerPostalCode: '',
        productCustomerJPAddress: '',
        productCustomerENAddress: '',
        productCustomerENAddress1: '',
        productCustomerENAddress2: '',
        productCustomerENAddress3: '',
        productCustomerENAddress4: '',
        productCustomerCellPhoneNumber: '',
        productCount: '',
        productOrderDate: '',
        productColor: '',
        productDeadlineDate: '',
        productTypeEN: '',
        productPriceEN: '',
        productWeight: '',
        comment: '',
        peculiarities: ''
      };
    } else {
      orderDetailObject = await page.evaluate(() => {
        const orderDetailObject = {};
        
        // 상품ID 추출 디버깅
        console.log('=== 상품ID 추출 디버깅 ===');
        const productIdElement = document.querySelector('table tbody tr:nth-of-type(3) td');
        console.log('3번째 행 td 요소:', productIdElement);
        console.log('3번째 행 내용:', productIdElement ? productIdElement.innerText : 'null');
        
        // 다른 가능한 위치들도 확인
        const allRows = document.querySelectorAll('table tbody tr');
        console.log('모든 행에서 상품ID 패턴 검색:');
        for (let i = 0; i < Math.min(15, allRows.length); i++) {
          const cells = allRows[i].querySelectorAll('td');
          if (cells.length > 0) {
            const text = cells[0].innerText;
            const hasProductId = text.match(/\d{8,10}/g);
            if (hasProductId) {
              console.log(`  ${i+1}번째 행에서 발견: ${text} -> ${hasProductId}`);
            }
          }
        }
        console.log('========================');
        
        let productId = productIdElement;
        // 8자리 또는 9자리 숫자 패턴 모두 매칭하도록 수정
        productId = productId ? productId.innerText.match(/\d{8,9}/g) : null;
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
        // 2023/11/23 update 쿠폰사용인 경우 분기처리
        let productOrderDate;
        let productColor;
        if (document.querySelector('table tbody tr:nth-of-type(14) th')?.innerHTML.match(/使用クーポン/g)) {
          if (
            document.querySelector('table tbody tr:nth-of-type(15) td')?.innerHTML.match(/コンビニ/g)
          ) {
            productOrderDate = document
              .querySelector('table tbody tr:nth-of-type(18) td')
              ?.innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
            productColor = document.querySelector('table tbody tr:nth-of-type(19) td')?.innerText;
          } else if (
            document
              .querySelector('table tbody tr:nth-of-type(15) td')
              ?.innerHTML.match(/銀行振込（ペイジー）/g)
          ) {
            productOrderDate = document
              .querySelector('table tbody tr:nth-of-type(18) td')
              ?.innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
            productColor = document.querySelector('table tbody tr:nth-of-type(19) td')?.innerText;
          } else {
            productOrderDate = document
              .querySelector('table tbody tr:nth-of-type(17) td')
              ?.innerText.match(/\d{4}\/\d{2}\/\d{2}/g);
            productColor = document.querySelector('table tbody tr:nth-of-type(18) td')?.innerText;
          }
        }else {
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
        }

        // 通常뒤의 숫자하나 취득
        let productDeliveryMethod = document
          .querySelector('table tbody tr:nth-of-type(12) td')
          ?.innerText.match(/(?<=通常)\d{1,2}/g);

        // ヤマト運輸, 韓国郵便局을 취득
        // 2023/9/26 ヤマト運輸, 韓国郵便局,kse을 취득
        let yamatoAndEmsAndKseDeliveryMethod = document
          .querySelector('table tbody tr:nth-of-type(12) td')
          ?.innerText.match(/(?<=配送方法：)\D{1,5}/g);

        // 発送期限日 취득
        let productDeadlineDate = document
          .querySelector('table tbody tr:nth-of-type(6) td')
          .innerText.match(/^\d{4}\/(0[1-9]|1[012])\/(0[1-9]|[12][0-9]|3[01])/g);

        // 商品ID - 8자리면 '00'을 붙이고, 9자리면 '0'을 붙여서 10자리로 만듦
        if (productId) {
          const idValue = productId[0];
          if (idValue.length === 8) {
            orderDetailObject.productId = '00' + idValue;
          } else if (idValue.length === 9) {
            orderDetailObject.productId = '0' + idValue;
          } else {
            orderDetailObject.productId = idValue; // 다른 자릿수의 경우 그대로 사용
          }
        }
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
        productCustomerENAddress[3]
          ? (orderDetailObject.productCustomerENAddress1 = productCustomerENAddress[3])
          : null;
        // 住所1（英語）
        productCustomerENAddress[2]
          ? (orderDetailObject.productCustomerENAddress2 = productCustomerENAddress[2])
          : null;
        // 住所1（英語）
        productCustomerENAddress[1]
          ? (orderDetailObject.productCustomerENAddress3 = productCustomerENAddress[1])
          : null;
        // 住所1（英語）
        productCustomerENAddress[0]
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
          else if (productDeliveryMethod[0] == '7' && yamatoAndEmsAndKseDeliveryMethod == '韓国郵便局')
            orderDetailObject.productDeliveryMethod = 'ems';
          else if (productDeliveryMethod[0] == '12')
            orderDetailObject.productDeliveryMethod = 'qxpress';
          else if (productDeliveryMethod[0] == '25')
            orderDetailObject.productDeliveryMethod = 'ems'; // 중국으로부터 오는 유리테이블
          else if (productDeliveryMethod[0] == '30') orderDetailObject.productDeliveryMethod = 'ship';
          else if (productDeliveryMethod[0] == '7' && yamatoAndEmsAndKseDeliveryMethod == 'ヤマト運輸')
            orderDetailObject.productDeliveryMethod = 'yamato';
          else if (productDeliveryMethod[0] == '7' && yamatoAndEmsAndKseDeliveryMethod == 'KSE e')
            orderDetailObject.productDeliveryMethod = 'KSE'; // 2023/9/26 KSE 추가
        }
        // 発送期限日
        productDeadlineDate ? (orderDetailObject.productDeadlineDate = productDeadlineDate[0]) : null;

        return orderDetailObject;
      });
      
      // transactionID 설정 확인
      if (!orderDetailObject.transactionID) {
        orderDetailObject.transactionID = transactionID;
      }
    }
    
    // 구글 시트(利益計算)에서 商品ID에 해당하는 row넘버, 이익 취득
    console.log('구글 시트(利益計算)에서 정보 취득');
    console.log(`크롤링된 productId: ${orderDetailObject.productId}`);
    let googleProfitObject;
    try {
      googleProfitObject = await googleProfitSheet(orderDetailObject.productId);
      console.log('구글 시트(利益計算)에서 정보 취득 종료');
    } catch (googleError) {
      if (googleError.message && googleError.message.includes('Quota exceeded')) {
        console.log('Google API 할당량 초과. 5초 후 재시도합니다...');
        // 5초 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
          googleProfitObject = await googleProfitSheet(orderDetailObject.productId);
          console.log('구글 시트(利益計算)에서 정보 취득 종료 (재시도 성공)');
        } catch (retryError) {
          console.error('Google API 재시도 실패:', retryError);
          // 기본값 설정
          googleProfitObject = {
            rowNum: 0,
            productURL: '',
            EMSProfit: 0,
            qxpressProfit: 0,
            shipProfit: 0,
            yamatoProfit: 0,
            buymaProfit: 0,
            productTypeEN: '',
            productPriceEN: '',
            productWeight: '',
            comment: '',
            peculiarities: ''
          };
        }
      } else {
        console.error('Google API 오류:', googleError);
        // 기본값 설정
        googleProfitObject = {
          rowNum: 0,
          productURL: '',
          EMSProfit: 0,
          qxpressProfit: 0,
          shipProfit: 0,
          yamatoProfit: 0,
          buymaProfit: 0,
          productTypeEN: '',
          productPriceEN: '',
          productWeight: '',
          comment: '',
          peculiarities: ''
        };
      }
    }
    
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
    else if (orderDetailObject.productDeliveryMethod == 'yamato')
      orderDetailObject.productProfit =
        googleProfitObject.yamatoProfit * orderDetailObject.productCount;
    else if (orderDetailObject.productDeliveryMethod == 'KSE')  // 2023/9/26 KSE 추가
        orderDetailObject.productProfit =
          googleProfitObject.buymaProfit * orderDetailObject.productCount;

    // 2022/04/23 商品種類(英語),価格(ドル),商品重さ(g),コメント를 취득
    orderDetailObject.productTypeEN = googleProfitObject.productTypeEN;
    orderDetailObject.productPriceEN = googleProfitObject.productPriceEN;
    orderDetailObject.productWeight = googleProfitObject.productWeight;
    orderDetailObject.comment = googleProfitObject.comment;

    // 2022/11/08 特異事項 추가
    orderDetailObject.peculiarities = googleProfitObject.peculiarities;

    try {
      // 페이지가 유효한지 먼저 확인
      if (page && page._client && page._client.connection && page._client.connection.closed !== true) {
        await page.close();
        page = null; // 페이지를 닫은 후 null로 설정
      }
    } catch (error) {
      console.log('페이지 닫기 중 오류 발생 (무시됨):', error.message);
      // 오류가 발생해도 계속 진행
    }
    await browser.close();
    browser = null; // 브라우저를 닫은 후 null로 설정
    console.log('주문정보 상세 크롤링 종료.');

    return orderDetailObject;
  } catch (e) {
    console.log('buymaOrderDetail 함수에서 오류 발생:', e);
    // 오류 발생 시에도 기본 객체 반환
    return {
      productId: '',
      transactionID: transactionID,
      rowNum: 0,
      productURL: '',
      productProfit: 0,
      productDeliveryMethod: '',
      productCustomerJPName: '',
      productCustomerENName: '',
      productCustomerPostalCode: '',
      productCustomerJPAddress: '',
      productCustomerENAddress: '',
      productCustomerENAddress1: '',
      productCustomerENAddress2: '',
      productCustomerENAddress3: '',
      productCustomerENAddress4: '',
      productCustomerCellPhoneNumber: '',
      productCount: '',
      productOrderDate: '',
      productColor: '',
      productDeadlineDate: '',
      productTypeEN: '',
      productPriceEN: '',
      productWeight: '',
      comment: '',
      peculiarities: ''
    };
  } finally {
    // 브라우저 리소스 정리 - 아직 닫히지 않은 경우에만 닫기
    if (page && page.close) {
      try {
        await page.close();
      } catch (e) {
        console.log('페이지 닫기 오류 (무시됨):', e.message);
      }
    }
    if (browser && browser.close) {
      try {
        await browser.close();
      } catch (e) {
        console.log('브라우저 닫기 오류 (무시됨):', e.message);
      }
    }
  }
}

module.exports.buymaOrderDetail = buymaOrderDetail;
