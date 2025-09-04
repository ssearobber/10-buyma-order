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
  console.log(`구글 시트에서 상품ID ${productId} 검색 중...`);
  
  for (i = 1; i < rows.length; i++) {
    if (!rows[i].buymaProductId) continue;
    
    const extractedId = rows[i].buymaProductId.match(/\d{10}/g);
    
    if (extractedId && extractedId[0] == productId) {
      console.log(`✅ 상품ID ${productId} 매칭 성공 (${i+2}행)`);
      
      googleProfitObject.rowNum = i + 2;
      googleProfitObject.peculiarities = rows[i].peculiarities;
      googleProfitObject.productURL = rows[i].productURL;
      
      // 각 profit 값 설정
      googleProfitObject.shipProfit = rows[i].shipProfit ? rows[i].shipProfit.replace(/[^0-9]/g, '') : 0;
      googleProfitObject.EMSProfit = rows[i].EMSProfit ? rows[i].EMSProfit.replace(/[^0-9]/g, '') : 0;
      googleProfitObject.qxpressProfit = rows[i].qxpressProfit ? rows[i].qxpressProfit.replace(/[^0-9]/g, '') : 0;
      googleProfitObject.buymaProfit = rows[i].buymaProfit ? rows[i].buymaProfit.replace(/[^0-9]/g, '') : 0;
      googleProfitObject.yamatoProfit = rows[i].yamatoProfit ? rows[i].yamatoProfit.replace(/[^0-9]/g, '') : 0;
      
      // googleProfitObject.productTypeEN = rows[i].productTypeEN || '';
      // googleProfitObject.productPriceEN = rows[i].productPriceEN || '';
      // googleProfitObject.productWeight = rows[i].productWeight || '';
      // googleProfitObject.comment = rows[i].comment || '';
      
      break; // 매칭되면 루프 종료
    }
  }
  
  // 매칭되지 않은 경우 로그 출력
  if (!googleProfitObject.rowNum) {
    console.log(`❌ 상품ID ${productId}를 구글 시트에서 찾을 수 없습니다.`);
  }

  return googleProfitObject;
}

module.exports.googleProfitSheet = googleProfitSheet;
