const { GoogleSpreadsheet } = require('google-spreadsheet');

async function googleProfitSheet(productId) {
  // 시트 url중 값
  // Initialize the sheet - doc ID is the long id in the sheets URL
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREAD_ID || googleSpreadId);

  // GOOGLE_API_KEY로 구글API다루는 방법. 읽는것만 가능.
  // doc.useApiKey(process.env.GOOGLE_API_KEY);

  // GOOGLE_SERVICE로 구글API다루는 방법. 편집 가능.
  // Initialize Auth - see more available options at https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || googleServiceAccountEmail,
    private_key: process.env.GOOGLE_PRIVATE_KEY || googlePrivateKey,
  });

  // loads document properties and worksheets
  await doc.loadInfo();

  // the buymaList 시트ID로 시트취득
  const sheet = doc.sheetsById[process.env.GOOGLE_PROFIT_SHEET_ID || googleProfitSheetId];

  // rows 취득
  const rows = await sheet.getRows();

  // 해당 商品ID의 row번호, url을 취득
  let googleProfitObject = {};
  console.log(`=== googleProfitSheet 검색 시작 ===`);
  console.log(`검색할 productId: ${productId}`);
  console.log(`전체 행 수: ${rows.length}`);
  
  for (i = 1; i < rows.length; i++) {
    // if (!rows[i].productId) continue;
    if (!rows[i].buymaProductId) continue;
    
    // 해당 商品ID가 존재하는 row
    // if (rows[i].productId.match(/\d{10}/g) == productId) {
    const extractedId = rows[i].buymaProductId.match(/\d{10}/g);
    
    // 매칭 디버깅 (처음 5개와 매칭된 경우만 출력)
    if (i <= 5 || (extractedId && extractedId[0] == productId)) {
      console.log(`${i}번째 행 buymaProductId: ${rows[i].buymaProductId}`);
      if (extractedId) {
        console.log(`  추출된 ID: ${extractedId[0]}, 검색 ID: ${productId}, 매칭: ${extractedId[0] == productId}`);
      }
    }
    
    if (extractedId && extractedId[0] == productId) {
      console.log(`매칭 성공! ${i}번째 행에서 productId ${productId} 발견`);
      googleProfitObject.rowNum = i + 2;
      googleProfitObject.peculiarities = rows[i].peculiarities;
      googleProfitObject.productURL = rows[i].productURL;
      
      // 각 profit 값이 존재하는지 확인 후 replace 호출
      if (rows[i].shipProfit) {
        googleProfitObject.shipProfit = rows[i].shipProfit.replace(/[^0-9]/g, '');
      } else {
        console.log(`shipProfit is undefined for productId: ${productId}`);
        googleProfitObject.shipProfit = 0;
      }

      if (rows[i].EMSProfit) {
        googleProfitObject.EMSProfit = rows[i].EMSProfit.replace(/[^0-9]/g, '');
      } else {
        console.log(`EMSProfit is undefined for productId: ${productId}`);
        googleProfitObject.EMSProfit = 0;
      }

      if (rows[i].qxpressProfit) {
        googleProfitObject.qxpressProfit = rows[i].qxpressProfit.replace(/[^0-9]/g, '');
      } else {
        console.log(`qxpressProfit is undefined for productId: ${productId}`);
        googleProfitObject.qxpressProfit = 0;
      }

      if (rows[i].buymaProfit) {
        googleProfitObject.buymaProfit = rows[i].buymaProfit.replace(/[^0-9]/g, '');
      } else {
        console.log(`buymaProfit is undefined for productId: ${productId}`);
        googleProfitObject.buymaProfit = 0;
      }

      if (rows[i].yamatoProfit) {
        googleProfitObject.yamatoProfit = rows[i].yamatoProfit.replace(/[^0-9]/g, '');
      } else {
        console.log(`yamatoProfit is undefined for productId: ${productId}`);
        googleProfitObject.yamatoProfit = 0;
      }
      
      // googleProfitObject.productTypeEN = rows[i].productTypeEN || '';
      // googleProfitObject.productPriceEN = rows[i].productPriceEN || '';
      // googleProfitObject.productWeight = rows[i].productWeight || '';
      // googleProfitObject.comment = rows[i].comment || '';
      
      console.log(`=== 매칭된 데이터 확인 ===`);
      console.log(`rowNum: ${googleProfitObject.rowNum}`);
      console.log(`peculiarities: ${googleProfitObject.peculiarities}`);
      console.log(`productURL: ${googleProfitObject.productURL}`);
      console.log(`buymaProfit: ${googleProfitObject.buymaProfit}`);
      console.log(`===============================`);
      
      break; // 매칭되면 루프 종료
    }
  }
  
  // 매칭되지 않은 경우 로그 출력
  if (!googleProfitObject.rowNum) {
    console.log(`⚠️  productId ${productId}에 해당하는 데이터를 찾을 수 없습니다!`);
    console.log(`구글 시트(이익계산)에 해당 상품ID가 있는지 확인해주세요.`);
  }

  return googleProfitObject;
}

module.exports.googleProfitSheet = googleProfitSheet;
